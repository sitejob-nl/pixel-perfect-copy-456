import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    const { invite_token } = await req.json();
    if (!invite_token) {
      return new Response(JSON.stringify({ error: "invite_token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for all DB operations
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find invite
    const { data: invite, error: invErr } = await admin
      .from("organization_invites")
      .select("*")
      .eq("token", invite_token)
      .is("accepted_at", null)
      .single();

    if (invErr || !invite) {
      return new Response(
        JSON.stringify({ error: "Uitnodiging niet gevonden of al geaccepteerd" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Deze uitnodiging is verlopen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    if (invite.email.toLowerCase() !== userEmail?.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Deze uitnodiging is niet voor jouw account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert membership (handles both new and reactivation)
    const { error: memberErr } = await admin
      .from("organization_members")
      .insert({
        organization_id: invite.organization_id,
        user_id: userId,
        role: invite.role,
        is_active: true,
        joined_at: new Date().toISOString(),
      });

    if (memberErr) {
      if (memberErr.message?.includes("duplicate") || memberErr.message?.includes("unique")) {
        // Reactivate existing membership
        await admin
          .from("organization_members")
          .update({ is_active: true, role: invite.role, joined_at: new Date().toISOString() })
          .eq("organization_id", invite.organization_id)
          .eq("user_id", userId);
      } else {
        console.error("Member insert error:", memberErr);
        return new Response(
          JSON.stringify({ error: "Kon lidmaatschap niet aanmaken" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Mark invite as accepted
    await admin
      .from("organization_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ success: true, organization_id: invite.organization_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Accept invite error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
