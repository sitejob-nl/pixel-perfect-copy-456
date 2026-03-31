import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sitejob-signature, x-sitejob-integration, x-sitejob-tenant",
};

function encrypt(text: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const textBytes = new TextEncoder().encode(text);
  const result = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...result));
}

function decrypt(encoded: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const data = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(result);
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === expectedHex;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const ENC_KEY = Deno.env.get("ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(0, 32);

  try {
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);

    const tenantId = body.tenant_id || req.headers.get("x-sitejob-tenant");
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Missing tenant_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up connection by tenant ID
    const { data: conn } = await admin
      .from("meta_connections")
      .select("organization_id, webhook_secret_encrypted")
      .eq("sitejob_tenant_id", tenantId)
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ error: "Unknown tenant" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC signature
    const signature = req.headers.get("x-sitejob-signature") || "";
    const webhookSecret = decrypt(conn.webhook_secret_encrypted, ENC_KEY);
    const isValid = await verifySignature(bodyText, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid signature for tenant:", tenantId);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = conn.organization_id;

    // ── CREDENTIAL PUSH ──
    if (body.event === "meta_marketing_credentials") {
      console.log("Received Meta credentials for org:", orgId);

      const configData: Record<string, any> = {
        organization_id: orgId,
        page_id: body.page_id || null,
        page_name: body.page_name || null,
        instagram_account_id: body.instagram_id || null,
        instagram_username: body.instagram_username || null,
        ad_account_id: body.ad_account_id || null,
        ad_account_name: body.ad_account_name || null,
        business_id: body.business_id || null,
        token_expires_at: body.token_expires_at || null,
        granted_scopes: body.granted_scopes || null,
        updated_at: new Date().toISOString(),
      };

      // Encrypt tokens
      if (body.page_access_token) {
        configData.page_access_token_encrypted = encrypt(body.page_access_token, ENC_KEY);
      }
      if (body.user_access_token) {
        configData.user_access_token_encrypted = encrypt(body.user_access_token, ENC_KEY);
      }

      // Upsert config
      const { error: upsertErr } = await admin
        .from("meta_config")
        .upsert(configData, { onConflict: "organization_id" });

      if (upsertErr) {
        console.error("Failed to upsert meta_config:", upsertErr.message);
        throw upsertErr;
      }

      // Update connection status to active
      await admin
        .from("meta_connections")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("sitejob_tenant_id", tenantId);

      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // ── DISCONNECT ──
    if (body.event === "meta_marketing_disconnected") {
      console.log("Meta disconnected for org:", orgId);

      await admin
        .from("meta_config")
        .update({
          page_access_token_encrypted: null,
          user_access_token_encrypted: null,
          ad_account_id: null,
          token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", orgId);

      await admin
        .from("meta_connections")
        .update({ status: "disconnected", updated_at: new Date().toISOString() })
        .eq("sitejob_tenant_id", tenantId);

      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // ── META WEBHOOK EVENTS (forwarded by Connect) ──

    // Lead Ads
    if (body.object === "page" && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          if (change.field === "leadgen") {
            await processNewLead(admin, orgId, change.value.leadgen_id, ENC_KEY);
          }
        }
      }
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Instagram events
    if (body.object === "instagram" && body.entry) {
      // Log for now - can be expanded later
      console.log("Instagram webhook event for org:", orgId, JSON.stringify(body).slice(0, 500));
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Ad account events
    if (body.object === "ad_account" && body.entry) {
      console.log("Ad account webhook event for org:", orgId, JSON.stringify(body).slice(0, 500));
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    console.log("Unknown webhook event:", body.event || body.object);
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("connect-meta-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Process Lead Ads ──
async function processNewLead(admin: any, orgId: string, leadgenId: string, encKey: string) {
  try {
    // Get Meta config for access token
    const { data: config } = await admin
      .from("meta_config")
      .select("user_access_token_encrypted")
      .eq("organization_id", orgId)
      .single();

    if (!config?.user_access_token_encrypted) {
      console.error("No user access token for org:", orgId);
      return;
    }

    const token = decrypt(config.user_access_token_encrypted, encKey);

    // Fetch lead data from Meta Graph API
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${leadgenId}?access_token=${token}`
    );
    const lead = await res.json();

    if (lead.error) {
      console.error("Meta API error fetching lead:", lead.error.message);
      return;
    }

    // Check for duplicate
    const { data: existing } = await admin
      .from("meta_leads")
      .select("id")
      .eq("meta_lead_id", leadgenId)
      .maybeSingle();

    if (existing) return;

    // Parse field_data into a readable object
    const fields: Record<string, string> = {};
    for (const f of lead.field_data || []) {
      fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
    }

    await admin.from("meta_leads").insert({
      organization_id: orgId,
      meta_lead_id: lead.id,
      form_id: lead.form_id || null,
      ad_id: lead.ad_id || null,
      fields,
      raw_data: lead,
      status: "new",
    });

    console.log("New Meta lead saved:", lead.id, "for org:", orgId);
  } catch (err) {
    console.error("Error processing lead:", err);
  }
}
