import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONNECT_BASE = "https://xeshjkznwdrxjjhbpisn.supabase.co/functions/v1";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const ENC_KEY = Deno.env.get("ENCRYPTION_KEY") || SERVICE_KEY.slice(0, 32);

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Get org
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (!membership) throw new Error("No organization");
    const orgId = membership.organization_id;

    const { action } = await req.json();

    // ── REGISTER: create tenant at SiteJob Connect ──
    if (action === "register") {
      // Check if already connected
      const { data: existing } = await admin
        .from("meta_connections")
        .select("id, status")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (existing) {
        throw new Error("Meta koppeling bestaat al. Ontkoppel eerst voordat je opnieuw koppelt.");
      }

      // Get org name
      const { data: org } = await admin
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();

      const webhookUrl = `${SUPABASE_URL}/functions/v1/connect-meta-webhook`;

      const res = await fetch(`${CONNECT_BASE}/meta-marketing-register-tenant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: org?.name || "Organization",
          webhook_url: webhookUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SiteJob Connect registratie mislukt: ${err}`);
      }

      const result = await res.json();
      const tenant = result.tenant;

      // Encrypt webhook secret and store
      const secretEncrypted = encrypt(tenant.webhook_secret, ENC_KEY);

      await admin.from("meta_connections").insert({
        organization_id: orgId,
        sitejob_tenant_id: tenant.id,
        webhook_secret_encrypted: secretEncrypted,
        connect_url: tenant.connect_url,
        status: "pending",
      });

      return new Response(
        JSON.stringify({
          success: true,
          tenant_id: tenant.id,
          connect_url: tenant.connect_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DISCONNECT ──
    if (action === "disconnect") {
      const { data: conn } = await admin
        .from("meta_connections")
        .select("sitejob_tenant_id")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (conn) {
        // Call SiteJob Connect disconnect
        try {
          await fetch(`${CONNECT_BASE}/meta-marketing-disconnect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenant_id: conn.sitejob_tenant_id }),
          });
        } catch (_) {
          // Continue even if disconnect call fails
        }

        await admin.from("meta_connections").delete().eq("organization_id", orgId);
        await admin.from("meta_config").delete().eq("organization_id", orgId);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── STATUS: validate tenant ──
    if (action === "status") {
      const { data: conn } = await admin
        .from("meta_connections")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!conn) {
        return new Response(
          JSON.stringify({ connected: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: config } = await admin
        .from("meta_config")
        .select("page_id, page_name, ad_account_id, ad_account_name, instagram_account_id, instagram_username, token_expires_at, granted_scopes, business_id")
        .eq("organization_id", orgId)
        .maybeSingle();

      // Validate with SiteJob Connect
      let checks = null;
      try {
        const res = await fetch(`${CONNECT_BASE}/meta-marketing-validate-tenant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: conn.sitejob_tenant_id }),
        });
        if (res.ok) {
          const validation = await res.json();
          checks = validation.checks;
        }
      } catch (_) {}

      return new Response(
        JSON.stringify({
          connected: true,
          status: conn.status,
          connect_url: conn.connect_url,
          config: config || null,
          checks,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET_CONFIG: return config without tokens ──
    if (action === "get_config") {
      const { data: config } = await admin
        .from("meta_config")
        .select("page_id, page_name, ad_account_id, ad_account_name, instagram_account_id, instagram_username, token_expires_at, granted_scopes, business_id")
        .eq("organization_id", orgId)
        .maybeSingle();

      return new Response(
        JSON.stringify({ config: config || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("connect-meta-manage error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
