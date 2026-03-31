import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (!membership) throw new Error("No organization");
    const orgId = membership.organization_id;

    const { action, endpoint, params } = await req.json();

    // Get encrypted tokens
    const { data: config } = await admin
      .from("meta_config")
      .select("*")
      .eq("organization_id", orgId)
      .single();

    if (!config) throw new Error("Meta niet gekoppeld");

    const userToken = config.user_access_token_encrypted
      ? decrypt(config.user_access_token_encrypted, ENC_KEY)
      : null;
    const pageToken = config.page_access_token_encrypted
      ? decrypt(config.page_access_token_encrypted, ENC_KEY)
      : null;

    if (!userToken) throw new Error("Geen Meta access token beschikbaar");

    // ── CAMPAIGNS ──
    if (action === "campaigns") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const res = await fetch(
        `https://graph.facebook.com/v25.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,updated_time&limit=50&access_token=${userToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(JSON.stringify({ campaigns: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INSIGHTS ──
    if (action === "insights") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const datePreset = params?.date_preset || "last_30d";
      const level = params?.level || "account";
      const res = await fetch(
        `https://graph.facebook.com/v25.0/${adAccountId}/insights?fields=impressions,clicks,spend,cpc,ctr,reach,actions,cost_per_action_type,frequency&date_preset=${datePreset}&level=${level}&limit=100&access_token=${userToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(JSON.stringify({ insights: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CAMPAIGN INSIGHTS ──
    if (action === "campaign_insights") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const datePreset = params?.date_preset || "last_30d";
      const res = await fetch(
        `https://graph.facebook.com/v25.0/${adAccountId}/insights?fields=campaign_name,campaign_id,impressions,clicks,spend,cpc,ctr,reach,actions&date_preset=${datePreset}&level=campaign&limit=100&access_token=${userToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(JSON.stringify({ insights: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PAGE POSTS ──
    if (action === "page_posts") {
      const pageId = config.page_id;
      if (!pageId || !pageToken) throw new Error("Geen Facebook pagina gekoppeld");

      const res = await fetch(
        `https://graph.facebook.com/v25.0/${pageId}/posts?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true)&limit=25&access_token=${pageToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(JSON.stringify({ posts: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INSTAGRAM MEDIA ──
    if (action === "instagram_media") {
      const igId = config.instagram_account_id;
      if (!igId) throw new Error("Geen Instagram account gekoppeld");

      const res = await fetch(
        `https://graph.facebook.com/v25.0/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=25&access_token=${userToken}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      return new Response(JSON.stringify({ media: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LEADS ──
    if (action === "leads") {
      const { data: leads } = await admin
        .from("meta_leads")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);

      return new Response(JSON.stringify({ leads: leads || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── IMPORT LEAD AS CONTACT ──
    if (action === "import_lead") {
      const { lead_id } = params || {};
      if (!lead_id) throw new Error("lead_id vereist");

      const { data: lead } = await admin
        .from("meta_leads")
        .select("*")
        .eq("id", lead_id)
        .eq("organization_id", orgId)
        .single();

      if (!lead) throw new Error("Lead niet gevonden");

      const fields = lead.fields as Record<string, string>;
      const fullName = fields.full_name || fields.name || "";
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { data: contact, error: contactErr } = await admin
        .from("contacts")
        .insert({
          organization_id: orgId,
          first_name: firstName,
          last_name: lastName,
          email: fields.email || null,
          phone: fields.phone_number || fields.phone || null,
          source: "meta_lead_ads",
          status: "new",
        })
        .select("id")
        .single();

      if (contactErr) throw contactErr;

      await admin
        .from("meta_leads")
        .update({ contact_id: contact.id, status: "imported", processed_at: new Date().toISOString() })
        .eq("id", lead_id);

      return new Response(
        JSON.stringify({ success: true, contact_id: contact.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("connect-meta-api error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
