import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ApplicationServer,
  importVapidKeys,
  PushMessageError,
} from "jsr:@negrel/webpush@0.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const {
      organization_id,
      event_type,
      title,
      body,
      url,
      exclude_user_id,
    } = await req.json();

    if (!organization_id || !event_type || !title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("organization_id", organization_id);

    if (subErr) {
      console.error("Error fetching subscriptions:", subErr);
      throw subErr;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filteredSubs = [];
    for (const sub of subscriptions) {
      if (exclude_user_id && sub.user_id === exclude_user_id) continue;

      const { data: wantsPush } = await supabase.rpc("user_wants_push", {
        p_user_id: sub.user_id,
        p_org_id: organization_id,
        p_event: event_type,
      });

      if (wantsPush !== false) {
        filteredSubs.push(sub);
      }
    }

    if (filteredSubs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    // Import VAPID keys as CryptoKeyPair
    const vapidKeys = await importVapidKeys({
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    });

    // Create ApplicationServer instance
    const appServer = await ApplicationServer.new({
      contactInformation: "mailto:info@sitejob.nl",
      vapidKeys,
    });

    const payload = JSON.stringify({
      title,
      body: body || "",
      url: url || "/",
      event_type,
    });

    let sent = 0;
    const failed: string[] = [];

    for (const sub of filteredSubs) {
      try {
        // Create a PushSubscription-like object
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        };

        // Subscribe and send message
        const subscriber = appServer.subscribe(pushSubscription);
        await subscriber.pushTextMessage(payload, { ttl: 3600 });
        sent++;
      } catch (err) {
        if (err instanceof PushMessageError && err.isGone()) {
          // Subscription expired, clean up
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
        console.error(`Push error for ${sub.id}:`, err);
        failed.push(sub.id);
      }
    }

    return new Response(
      JSON.stringify({ sent, failed: failed.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
