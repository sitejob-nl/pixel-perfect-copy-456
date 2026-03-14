import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { organization_id } = await req.json();
    if (!organization_id) throw new Error("Missing organization_id");

    const adminClient = createClient(SUPABASE_URL, serviceKey);

    // Verify membership
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership) throw new Error("Not a member of this organization");

    // Get secrets
    const { data: secrets } = await adminClient
      .from("integration_secrets")
      .select("secret_key, secret_value")
      .eq("organization_id", organization_id)
      .eq("provider", "cloudflare");

    const accountId = secrets?.find((s: any) => s.secret_key === "account_id")?.secret_value;
    const apiToken = secrets?.find((s: any) => s.secret_key === "api_token")?.secret_value;

    if (!accountId || !apiToken) {
      return new Response(JSON.stringify({ success: false, error: "Account ID of API Token niet geconfigureerd" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const data = await res.json();

    return new Response(JSON.stringify({ success: data.success === true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
