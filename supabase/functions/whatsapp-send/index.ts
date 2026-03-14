import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v25.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claims.claims.sub as string;

  try {
    const body = await req.json();
    const { action } = body;

    // Get user's organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = membership.organization_id;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "register_tenant") {
      // Register with SiteJob Connect
      const connectApiKey = Deno.env.get("CONNECT_API_KEY");
      if (!connectApiKey) {
        return new Response(JSON.stringify({ error: "CONNECT_API_KEY not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

      const registerRes = await fetch(
        "https://xeshjkznwdrxjjhbpisn.supabase.co/functions/v1/whatsapp-register-tenant",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": connectApiKey,
          },
          body: JSON.stringify({
            name: body.tenant_name || "SiteJob CRM",
            webhook_url: webhookUrl,
          }),
        }
      );

      if (!registerRes.ok) {
        const errText = await registerRes.text();
        console.error("Register tenant failed:", registerRes.status, errText);
        return new Response(JSON.stringify({ error: `Registration failed: ${errText}` }), {
          status: registerRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const registerData = await registerRes.json();
      const { tenant_id, webhook_secret } = registerData;

      // Create the whatsapp_accounts record
      const { data: account, error: insertErr } = await serviceClient
        .from("whatsapp_accounts")
        .insert({
          organization_id: orgId,
          tenant_id,
          connect_webhook_secret: webhook_secret,
          phone_number_id: "pending",
          access_token: "pending",
          waba_id: "pending",
          is_active: false, // Not active until OAuth completes
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Return the setup URL
      const setupUrl = `https://connect.sitejob.nl/whatsapp-setup?tenant_id=${tenant_id}`;
      return new Response(JSON.stringify({ success: true, setup_url: setupUrl, tenant_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      const { error } = await serviceClient
        .from("whatsapp_accounts")
        .update({ is_active: false })
        .eq("organization_id", orgId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_message") {
      const { to, message, message_type = "text", template_name, template_params, contact_id } = body;

      // Get active WhatsApp account
      const { data: account, error: accErr } = await serviceClient
        .from("whatsapp_accounts")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .single();

      if (accErr || !account) {
        return new Response(JSON.stringify({ error: "No active WhatsApp account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build Meta API payload
      let metaPayload: Record<string, unknown>;

      if (message_type === "template" && template_name) {
        metaPayload = {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: template_name,
            language: { code: body.template_language || "nl" },
            ...(template_params ? { components: template_params } : {}),
          },
        };
      } else if (message_type === "read_receipt") {
        metaPayload = {
          messaging_product: "whatsapp",
          status: "read",
          message_id: body.message_id,
        };
      } else {
        metaPayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: message, preview_url: true },
        };
      }

      // Send to Meta API
      const metaRes = await fetch(
        `${META_API}/${account.phone_number_id}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metaPayload),
        }
      );

      const metaData = await metaRes.json();

      if (!metaRes.ok) {
        console.error("Meta API error:", metaRes.status, JSON.stringify(metaData));

        // Store failed message
        await serviceClient.from("whatsapp_messages").insert({
          account_id: account.id,
          organization_id: orgId,
          contact_id: contact_id || null,
          phone_number: to,
          direction: "outbound",
          message_type: message_type === "template" ? "template" : "text",
          content: message || template_name || "",
          template_name: template_name || null,
          status: "failed",
          error_message: metaData?.error?.message || "Unknown Meta API error",
        });

        return new Response(JSON.stringify({ error: metaData?.error?.message || "Send failed" }), {
          status: metaRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const whatsappMsgId = metaData?.messages?.[0]?.id;

      // Store outbound message
      if (message_type !== "read_receipt") {
        await serviceClient.from("whatsapp_messages").insert({
          account_id: account.id,
          organization_id: orgId,
          contact_id: contact_id || null,
          phone_number: to,
          direction: "outbound",
          message_type: message_type === "template" ? "template" : "text",
          content: message || template_name || "",
          template_name: template_name || null,
          whatsapp_msg_id: whatsappMsgId,
          status: "sent",
        });
      }

      return new Response(JSON.stringify({ success: true, message_id: whatsappMsgId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("WhatsApp send error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
