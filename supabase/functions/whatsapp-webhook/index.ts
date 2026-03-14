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

    // Find the account by webhook secret
    const { data: account, error: accErr } = await supabase
      .from("whatsapp_accounts")
      .select("id, organization_id, phone_number_id, access_token")
      .eq("connect_webhook_secret", webhookSecret)
      .eq("is_active", true)
      .single();

    if (accErr || !account) {
      console.error("No account found for webhook secret");
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const entry = body; // SiteJob Connect forwards the entry directly

    // Log the webhook
    await supabase.from("whatsapp_webhook_logs").insert({
      account_id: account.id,
      organization_id: account.organization_id,
      event_type: "incoming",
      payload: body,
      processed: false,
    });

    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value;
      if (!value) continue;

      // Handle incoming messages
      if (value.messages) {
        for (const msg of value.messages) {
          const contact = value.contacts?.[0];
          const fromNumber = msg.from;

          // Try to find matching CRM contact by phone
          let contactId: string | null = null;
          const { data: crmContact } = await supabase
            .from("contacts")
            .select("id")
            .eq("organization_id", account.organization_id)
            .or(`phone.eq.${fromNumber},mobile.eq.${fromNumber},phone.eq.+${fromNumber},mobile.eq.+${fromNumber}`)
            .limit(1)
            .single();

          if (crmContact) contactId = crmContact.id;

          // Extract content based on message type
          let content: string | null = null;
          let mediaUrl: string | null = null;

          switch (msg.type) {
            case "text":
              content = msg.text?.body || null;
              break;
            case "image":
            case "video":
            case "audio":
            case "document":
            case "sticker":
              content = msg[msg.type]?.caption || `[${msg.type}]`;
              mediaUrl = msg[msg.type]?.id || null; // media ID for later download
              break;
            case "location":
              content = `📍 ${msg.location?.name || ""} (${msg.location?.latitude}, ${msg.location?.longitude})`;
              break;
            case "contacts":
              content = `👤 ${msg.contacts?.[0]?.name?.formatted_name || "Contact"}`;
              break;
            case "reaction":
              content = `${msg.reaction?.emoji || "👍"} reactie`;
              break;
            case "interactive":
              content = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[interactive]";
              break;
            case "button":
              content = msg.button?.text || "[button]";
              break;
            default:
              content = `[${msg.type}]`;
          }

          // Store the message
          await supabase.from("whatsapp_messages").insert({
            account_id: account.id,
            organization_id: account.organization_id,
            contact_id: contactId,
            phone_number: fromNumber,
            direction: "inbound",
            message_type: msg.type || "text",
            content,
            media_url: mediaUrl,
            whatsapp_msg_id: msg.id,
            status: "received",
            metadata: {
              contact_name: contact?.profile?.name,
              phone_number_id: value.metadata?.phone_number_id,
              timestamp: msg.timestamp,
            },
          });
        }
      }

      // Handle status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          // Update existing outbound message status
          const updateData: Record<string, unknown> = { status: status.status };
          if (status.status === "failed" && status.errors?.length) {
            updateData.error_message = status.errors[0].message || status.errors[0].title;
          }

          await supabase
            .from("whatsapp_messages")
            .update(updateData)
            .eq("whatsapp_msg_id", status.id)
            .eq("account_id", account.id);
        }
      }
    }

    // Mark webhook as processed
    await supabase
      .from("whatsapp_webhook_logs")
      .update({ processed: true })
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    // Always return 200 to prevent retries
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
