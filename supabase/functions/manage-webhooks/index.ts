import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
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
    case "lowercase": return str.toLowerCase();
    case "uppercase": return str.toUpperCase();
    case "trim": return str.trim();
    case "split_first": return str.split(/\s+/)[0] || str;
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
    case "to_number": { const n = Number(str); return isNaN(n) ? null : n; }
    case "to_boolean": return ["true", "1", "yes", "ja"].includes(str.toLowerCase());
    case "extract_email": {
      const m = str.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      return m ? m[0].toLowerCase() : null;
    }
    default: return value;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, endpoint_id } = await req.json();
    if (!endpoint_id) throw new Error("Missing endpoint_id");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get endpoint and verify org membership
    const { data: endpoint, error: epError } = await adminClient
      .from("webhook_endpoints")
      .select("*")
      .eq("id", endpoint_id)
      .single();

    if (epError || !endpoint) throw new Error("Endpoint not found");

    const { data: membership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", endpoint.organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership) throw new Error("Not a member of this organization");

    // --- ACTION: generate_api_key ---
    if (action === "generate_api_key") {
      // Generate random key
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const apiKey = "whk_" + Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

      // Hash with bcrypt
      const { hash } = await import("https://deno.land/x/bcrypt@v0.4.1/mod.ts");
      const apiKeyHash = await hash(apiKey);
      const prefix = apiKey.substring(0, 8);

      await adminClient
        .from("webhook_endpoints")
        .update({
          api_key_hash: apiKeyHash,
          api_key_prefix: prefix,
          updated_at: new Date().toISOString(),
        })
        .eq("id", endpoint_id);

      return new Response(
        JSON.stringify({ api_key: apiKey, message: "Sla deze key veilig op — hij wordt niet meer getoond." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACTION: test_webhook ---
    if (action === "test_webhook") {
      const samplePayload = endpoint.sample_payload;
      if (!samplePayload) throw new Error("No sample payload configured");

      const fieldMappings = endpoint.field_mappings || endpoint.field_mapping || [];
      if (!Array.isArray(fieldMappings) || fieldMappings.length === 0) {
        throw new Error("No field mappings configured");
      }

      const mappedResult: Record<string, any> = {};

      if (endpoint.default_values && typeof endpoint.default_values === "object") {
        Object.assign(mappedResult, endpoint.default_values);
      }

      for (const mapping of fieldMappings) {
        const { source_path, target_field, transform, default_value } = mapping;
        if (!source_path || !target_field) continue;

        let value = getNestedValue(samplePayload, source_path);
        if (value == null && default_value != null) value = default_value;
        if (value != null && transform && transform !== "none") {
          value = applyTransform(value, transform);
        }
        mappedResult[target_field] = value ?? null;
      }

      return new Response(
        JSON.stringify({
          test_payload: samplePayload,
          mapped_result: mappedResult,
          target_table: endpoint.target_table || "contacts",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("manage-webhooks error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
