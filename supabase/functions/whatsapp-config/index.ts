import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const webhookSecret = req.headers.get("X-Webhook-Secret");
    if (!webhookSecret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();

    // Handle disconnect
    if (body.action === "disconnect") {
      const { error } = await supabase
        .from("whatsapp_accounts")
        .update({ is_active: false })
        .eq("tenant_id", body.tenant_id)
        .eq("connect_webhook_secret", webhookSecret);

      if (error) {
        console.error("Disconnect error:", error);
        return new Response(JSON.stringify({ error: "Failed to disconnect" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle config push (credentials from SiteJob Connect after OAuth)
    const { tenant_id, phone_number_id, access_token, display_phone, waba_id } = body;

    if (!tenant_id || !phone_number_id || !access_token || !waba_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the account by tenant_id and webhook secret
    const { data: existing } = await supabase
      .from("whatsapp_accounts")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("connect_webhook_secret", webhookSecret)
      .single();

    if (existing) {
      // Update existing account with new credentials
      const { error } = await supabase
        .from("whatsapp_accounts")
        .update({
          phone_number_id,
          access_token,
          display_phone: display_phone || null,
          waba_id,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      console.error("No account found for tenant_id + webhook_secret combo");
      return new Response(JSON.stringify({ error: "Unknown tenant" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Config error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
