import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// --- Helpers ---

function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    // Support array index like items[0]
    const match = part.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      current = current[match[1]];
      if (Array.isArray(current)) current = current[parseInt(match[2])];
      else return undefined;
    } else {
      current = current[part];
    }
  }
  return current;
}

function applyTransform(value: any, transform: string): any {
  if (value == null) return value;
  const str = String(value);
  switch (transform) {
    case "lowercase":
      return str.toLowerCase();
    case "uppercase":
      return str.toUpperCase();
    case "trim":
      return str.trim();
    case "split_first":
      return str.split(/\s+/)[0] || str;
    case "split_last": {
      const parts = str.split(/\s+/);
      return parts.length > 1 ? parts.slice(1).join(" ") : str;
    }
    case "phone_nl": {
      let phone = str.replace(/[\s\-\(\)\.]/g, "");
      if (phone.startsWith("00")) phone = "+" + phone.slice(2);
      if (phone.startsWith("06")) phone = "+316" + phone.slice(2);
      if (phone.startsWith("0")) phone = "+31" + phone.slice(1);
      return phone;
    }
    case "to_number": {
      const n = Number(str);
      return isNaN(n) ? null : n;
    }
    case "to_boolean":
      return ["true", "1", "yes", "ja"].includes(str.toLowerCase());
    case "extract_email": {
      const emailMatch = str.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      return emailMatch ? emailMatch[0].toLowerCase() : null;
    }
    default:
      return value;
  }
}

function applyMappings(
  payload: any,
  fieldMappings: any[],
  defaultValues?: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};

  // Apply default values first
  if (defaultValues && typeof defaultValues === "object") {
    Object.assign(result, defaultValues);
  }

  for (const mapping of fieldMappings) {
    const { source_path, target_field, transform, default_value } = mapping;
    if (!source_path || !target_field) continue;

    let value = getNestedValue(payload, source_path);

    if (value == null && default_value != null) {
      value = default_value;
    }

    if (value != null && transform && transform !== "none") {
      value = applyTransform(value, transform);
    }

    if (value != null) {
      result[target_field] = value;
    }
  }

  return result;
}

async function verifyApiKey(
  supabase: any,
  apiKey: string
): Promise<any | null> {
  // Look up by prefix (first 8 chars)
  const prefix = apiKey.substring(0, 8);

  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("*")
    .eq("api_key_prefix", prefix)
    .eq("is_active", true);

  if (!endpoints || endpoints.length === 0) return null;

  // Import bcrypt for hash comparison
  const { compare } = await import("https://deno.land/x/bcrypt@v0.4.1/mod.ts");

  for (const ep of endpoints) {
    if (ep.api_key_hash && (await compare(apiKey, ep.api_key_hash))) {
      return ep;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extract endpoint key from URL path: /webhook-receiver/{endpoint_key}
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const endpointKey = pathParts[pathParts.length - 1];

  // Get API key from header
  const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let endpoint: any = null;

    // Try to find endpoint by key first
    if (endpointKey && endpointKey !== "webhook-receiver") {
      const { data } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .eq("endpoint_key", endpointKey)
        .eq("is_active", true)
        .single();
      endpoint = data;
    }

    // If not found by key, try API key auth
    if (!endpoint && apiKey) {
      endpoint = await verifyApiKey(supabase, apiKey);
    }

    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Unauthorized or endpoint not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If endpoint has API key configured, require it
    if (endpoint.api_key_hash && !apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    // Update received count
    await supabase
      .from("webhook_endpoints")
      .update({
        total_received: (endpoint.total_received || 0) + 1,
        last_received_at: new Date().toISOString(),
      })
      .eq("id", endpoint.id);

    // Apply field mappings
    const fieldMappings = endpoint.field_mappings || endpoint.field_mapping || [];
    if (!Array.isArray(fieldMappings) || fieldMappings.length === 0) {
      // Log but still accept - no mappings configured
      await supabase.from("webhook_logs").insert({
        endpoint_id: endpoint.id,
        organization_id: endpoint.organization_id,
        payload,
        status: "no_mapping",
        error_message: "No field mappings configured",
        ip_address: ipAddress,
        processing_time_ms: Date.now() - startTime,
        source_platform: endpoint.source_platform,
      });

      return new Response(JSON.stringify({ status: "received", message: "No field mappings configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mappedData = applyMappings(payload, fieldMappings, endpoint.default_values);

    // Add organization_id
    mappedData.organization_id = endpoint.organization_id;

    // Add default_source/status/temperature if configured
    if (endpoint.default_source && !mappedData.source) mappedData.source = endpoint.default_source;
    if (endpoint.default_status && !mappedData.status) mappedData.status = endpoint.default_status;
    if (endpoint.default_temperature && !mappedData.temperature) mappedData.temperature = endpoint.default_temperature;
    if (endpoint.auto_assign_to && !mappedData.assigned_to) mappedData.assigned_to = endpoint.auto_assign_to;

    const targetTable = endpoint.target_table || "contacts";

    // Test mode - don't insert, just log
    if (endpoint.test_mode) {
      await supabase.from("webhook_logs").insert({
        endpoint_id: endpoint.id,
        organization_id: endpoint.organization_id,
        payload,
        mapped_data: mappedData,
        mapped_to_table: targetTable,
        status: "test",
        is_test: true,
        ip_address: ipAddress,
        processing_time_ms: Date.now() - startTime,
        source_platform: endpoint.source_platform,
      });

      return new Response(
        JSON.stringify({ status: "test", mapped_data: mappedData, target_table: targetTable }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplication check
    let isDuplicate = false;
    let existingId: string | null = null;

    if (endpoint.dedup_field && mappedData[endpoint.dedup_field]) {
      const { data: existing } = await supabase
        .from(targetTable)
        .select("id")
        .eq("organization_id", endpoint.organization_id)
        .eq(endpoint.dedup_field, mappedData[endpoint.dedup_field])
        .maybeSingle();

      if (existing) {
        isDuplicate = true;
        existingId = existing.id;

        if (endpoint.dedup_action === "skip") {
          await supabase.from("webhook_logs").insert({
            endpoint_id: endpoint.id,
            organization_id: endpoint.organization_id,
            payload,
            mapped_data: mappedData,
            mapped_to_table: targetTable,
            mapped_to_id: existingId,
            status: "skipped_duplicate",
            is_duplicate: true,
            ip_address: ipAddress,
            processing_time_ms: Date.now() - startTime,
            source_platform: endpoint.source_platform,
          });

          await supabase
            .from("webhook_endpoints")
            .update({ total_processed: (endpoint.total_processed || 0) + 1 })
            .eq("id", endpoint.id);

          return new Response(
            JSON.stringify({ status: "skipped", reason: "duplicate", existing_id: existingId }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (endpoint.dedup_action === "update") {
          // Remove organization_id from update payload
          const { organization_id: _oid, ...updateData } = mappedData;
          const { error } = await supabase
            .from(targetTable)
            .update(updateData)
            .eq("id", existingId);

          if (error) throw error;

          await supabase.from("webhook_logs").insert({
            endpoint_id: endpoint.id,
            organization_id: endpoint.organization_id,
            payload,
            mapped_data: mappedData,
            mapped_to_table: targetTable,
            mapped_to_id: existingId,
            status: "updated",
            is_duplicate: true,
            ip_address: ipAddress,
            processing_time_ms: Date.now() - startTime,
            source_platform: endpoint.source_platform,
          });

          await supabase
            .from("webhook_endpoints")
            .update({ total_processed: (endpoint.total_processed || 0) + 1 })
            .eq("id", endpoint.id);

          return new Response(
            JSON.stringify({ status: "updated", id: existingId }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // dedup_action === "create_duplicate" falls through to insert
      }
    }

    // Insert new record
    const { data: inserted, error: insertError } = await supabase
      .from(targetTable)
      .insert(mappedData)
      .select("id")
      .single();

    if (insertError) throw insertError;

    const logEntry: Record<string, any> = {
      endpoint_id: endpoint.id,
      organization_id: endpoint.organization_id,
      payload,
      mapped_data: mappedData,
      mapped_to_table: targetTable,
      mapped_to_id: inserted.id,
      status: "processed",
      is_duplicate: isDuplicate,
      ip_address: ipAddress,
      processing_time_ms: Date.now() - startTime,
      source_platform: endpoint.source_platform,
    };

    // Set typed FK fields on log
    if (targetTable === "contacts") logEntry.contact_id = inserted.id;
    if (targetTable === "companies") logEntry.company_id = inserted.id;
    if (targetTable === "deals") logEntry.deal_id = inserted.id;

    await supabase.from("webhook_logs").insert(logEntry);

    await supabase
      .from("webhook_endpoints")
      .update({ total_processed: (endpoint.total_processed || 0) + 1 })
      .eq("id", endpoint.id);

    return new Response(
      JSON.stringify({ status: "processed", id: inserted.id, table: targetTable }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("webhook-receiver error:", msg);

    // Try to log the failure
    try {
      const payload = {}; // We may not have it if JSON parsing failed
      if (endpointKey) {
        const { data: ep } = await supabase
          .from("webhook_endpoints")
          .select("id, organization_id, total_failed")
          .eq("endpoint_key", endpointKey)
          .single();

        if (ep) {
          await supabase.from("webhook_logs").insert({
            endpoint_id: ep.id,
            organization_id: ep.organization_id,
            payload,
            status: "failed",
            error_message: msg,
          });

          await supabase
            .from("webhook_endpoints")
            .update({ total_failed: (ep.total_failed || 0) + 1 })
            .eq("id", ep.id);
        }
      }
    } catch (_) {
      // Ignore logging errors
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
