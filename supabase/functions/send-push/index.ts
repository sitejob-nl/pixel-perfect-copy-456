import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generatePushHTTPRequest,
  ApplicationServerKeys,
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

    // Get all push subscriptions for org members who want this notification
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

    // Filter by user preference and exclude triggering user
    const filteredSubs = [];
    for (const sub of subscriptions) {
      if (exclude_user_id && sub.user_id === exclude_user_id) continue;

      // Check preference
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

    // Load VAPID keys
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const applicationServerKeys = await ApplicationServerKeys.fromJSON({
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
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
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        };

        const { headers, body: reqBody, endpoint } =
          await generatePushHTTPRequest({
            applicationServerKeys,
            payload: new TextEncoder().encode(payload),
            target: pushSubscription,
            adminContact: "mailto:info@sitejob.nl",
            ttl: 60 * 60, // 1 hour
          });

        const resp = await fetch(endpoint, {
          method: "POST",
          headers,
          body: reqBody,
        });

        if (resp.status === 201 || resp.status === 200) {
          sent++;
        } else if (resp.status === 404 || resp.status === 410) {
          // Subscription expired/invalid, remove it
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          failed.push(sub.id);
        } else {
          console.error(
            `Push failed for ${sub.id}: ${resp.status} ${await resp.text()}`
          );
          failed.push(sub.id);
        }
      } catch (err) {
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
