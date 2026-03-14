import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API = "https://graph.facebook.com/v25.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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
    const { action, message_id, emoji } = await req.json();

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

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: account } = await serviceClient
      .from("whatsapp_accounts")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .eq("is_active", true)
      .single();

    if (!account) {
      return new Response(JSON.stringify({ error: "No active WhatsApp account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message_id) {
      return new Response(JSON.stringify({ error: "Missing message_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // React with emoji
    if (action === "react") {
      // Look up the original message to get the phone number
      const { data: msg } = await serviceClient
        .from("whatsapp_messages")
        .select("phone_number")
        .eq("whatsapp_msg_id", message_id)
        .eq("organization_id", membership.organization_id)
        .limit(1)
        .single();

      if (!msg) {
        return new Response(JSON.stringify({ error: "Message not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const waBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: msg.phone_number,
        type: "reaction",
        reaction: {
          message_id,
          emoji: emoji || "👍",
        },
      };

      const waResponse = await fetch(`${META_API}/${account.phone_number_id}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waBody),
      });

      const waResult = await waResponse.json();
      if (!waResponse.ok) throw new Error(waResult?.error?.message || JSON.stringify(waResult));

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: mark as read
    const waBody = {
      messaging_product: "whatsapp",
      status: "read",
      message_id,
    };

    const waResponse = await fetch(`${META_API}/${account.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(waBody),
    });

    const waResult = await waResponse.json();
    if (!waResponse.ok) {
      console.warn("Meta mark-as-read failed (non-critical):", JSON.stringify(waResult));
    }

    // Update local status
    await serviceClient
      .from("whatsapp_messages")
      .update({ status: "read" })
      .eq("whatsapp_msg_id", message_id)
      .eq("organization_id", membership.organization_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Mark read/react error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
