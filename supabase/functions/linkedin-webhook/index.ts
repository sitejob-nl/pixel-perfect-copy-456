import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return hexEncode(sig);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
  if (!clientSecret) {
    return new Response(JSON.stringify({ error: "Missing client secret" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  // ── GET: Challenge-response validation ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challengeCode = url.searchParams.get("challengeCode");

    if (!challengeCode) {
      return new Response(
        JSON.stringify({ error: "Missing challengeCode" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const challengeResponse = await hmacSha256(clientSecret, challengeCode);

    return new Response(
      JSON.stringify({ challengeCode, challengeResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  }

  // ── POST: Receive webhook notifications ──
  if (req.method === "POST") {
    const bodyText = await req.text();

    // Verify X-LI-Signature
    const signature = req.headers.get("X-LI-Signature");
    if (signature) {
      const expectedSig = "hmacsha256=" + (await hmacSha256(clientSecret, bodyText));
      if (signature !== expectedSig) {
        console.error("LinkedIn webhook signature mismatch");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 403,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Process each event in the payload
    // LinkedIn sends events with a unique notification ID
    const events = Array.isArray(payload) ? payload : [payload];

    for (const event of events) {
      const notificationId =
        event.id || event.notificationId || crypto.randomUUID();
      const eventType = event.eventType || event.type || "unknown";
      const resourceType = event.resourceType || event.entity || null;
      const linkedinUserId =
        event.resourceOwner || event.owner || event.actorUrn || null;

      // Look up org by linkedin_user_id
      let organizationId: string | null = null;
      if (linkedinUserId) {
        const cleanId = linkedinUserId.replace("urn:li:person:", "");
        const { data: conn } = await supabase
          .from("linkedin_connections")
          .select("organization_id")
          .eq("linkedin_user_id", cleanId)
          .limit(1)
          .single();
        if (conn) organizationId = conn.organization_id;
      }

      // Insert with dedup (ON CONFLICT DO NOTHING)
      const { error } = await supabase.from("linkedin_webhook_events").insert({
        notification_id: notificationId,
        event_type: eventType,
        resource_type: resourceType,
        payload: event,
        linkedin_user_id: linkedinUserId,
        organization_id: organizationId,
      });

      if (error && !error.message?.includes("duplicate")) {
        console.error("Failed to store webhook event:", error);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
