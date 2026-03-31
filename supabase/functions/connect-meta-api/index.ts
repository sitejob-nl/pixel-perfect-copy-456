import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function encrypt(text: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const textBytes = new TextEncoder().encode(text);
  const result = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...result));
}

function decrypt(encoded: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const data = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(result);
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function graphFetch(url: string) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    const code = data.error.code;
    const msg = data.error.message || "Graph API error";
    if (code === 190) throw new Error("TOKEN_EXPIRED:" + msg);
    throw new Error(msg);
  }
  return data;
}

async function graphPost(url: string, body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.error) {
    const code = data.error.code;
    const msg = data.error.message || "Graph API error";
    if (code === 190) throw new Error("TOKEN_EXPIRED:" + msg);
    throw new Error(msg);
  }
  return data;
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

    const GV = "v25.0";

    // ── HEALTH CHECK ──
    if (action === "health") {
      const tokenExpiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null;
      const now = new Date();
      const daysUntilExpiry = tokenExpiresAt ? Math.floor((tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      return ok({
        connected: true,
        token_health: {
          expires_at: config.token_expires_at,
          days_until_expiry: daysUntilExpiry,
          is_expired: daysUntilExpiry !== null && daysUntilExpiry <= 0,
          is_expiring_soon: daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7,
          last_refreshed: config.last_refreshed_at || null,
          refresh_count: config.refresh_count || 0,
          last_webhook: config.updated_at,
        },
        assets: {
          page: config.page_id ? { id: config.page_id, name: config.page_name } : null,
          ad_account: config.ad_account_id ? { id: config.ad_account_id, name: config.ad_account_name } : null,
          instagram: config.instagram_account_id ? { id: config.instagram_account_id, username: config.instagram_username } : null,
          business_id: config.business_id || null,
        },
        granted_scopes: config.granted_scopes ? config.granted_scopes.split(",").map((s: string) => s.trim()) : [],
      });
    }

    // ── AVAILABLE ASSETS ──
    if (action === "assets") {
      const [pagesData, adAccountsData] = await Promise.all([
        graphFetch(`https://graph.facebook.com/${GV}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${userToken}`),
        graphFetch(`https://graph.facebook.com/${GV}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=100&access_token=${userToken}`),
      ]);

      const pages = (pagesData.data || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        has_page_token: !!page.access_token,
        instagram_account_id: page.instagram_business_account?.id || null,
        instagram_username: page.instagram_business_account?.username || null,
      }));

      const instagramAccounts = pages
        .filter((p: any) => p.instagram_account_id)
        .map((p: any) => ({
          id: p.instagram_account_id,
          username: p.instagram_username,
          page_id: p.id,
          page_name: p.name,
        }));

      const adAccounts = (adAccountsData.data || []).map((a: any) => ({
        id: a.id, name: a.name, account_status: a.account_status,
        currency: a.currency || null, timezone_name: a.timezone_name || null,
      }));

      return ok({ pages, instagram_accounts: instagramAccounts, ad_accounts: adAccounts });
    }

    // ── SELECT ASSETS ──
    if (action === "select_assets") {
      const selectedPageId = params?.page_id || null;
      const selectedInstagramId = params?.instagram_account_id || null;
      const selectedAdAccountId = params?.ad_account_id || null;

      const pagesData = await graphFetch(`https://graph.facebook.com/${GV}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${userToken}`);
      const adAccountsData = await graphFetch(`https://graph.facebook.com/${GV}/me/adaccounts?fields=id,name&limit=100&access_token=${userToken}`);

      const pages = pagesData.data || [];
      const adAccounts = adAccountsData.data || [];

      const selectedPage = selectedPageId ? pages.find((p: any) => p.id === selectedPageId) : null;
      const selectedInstagram = selectedInstagramId
        ? pages.map((p: any) => ({ id: p.instagram_business_account?.id, username: p.instagram_business_account?.username, page_id: p.id })).find((a: any) => a.id === selectedInstagramId)
        : null;
      const selectedAdAccount = selectedAdAccountId ? adAccounts.find((a: any) => a.id === selectedAdAccountId) : null;

      const updatedFields: Record<string, any> = {
        updated_at: new Date().toISOString(),
        page_id: selectedPage?.id || null,
        page_name: selectedPage?.name || null,
        instagram_account_id: selectedInstagram?.id || null,
        instagram_username: selectedInstagram?.username || null,
        ad_account_id: selectedAdAccount?.id || null,
        ad_account_name: selectedAdAccount?.name || null,
      };

      if (selectedPage?.access_token) {
        updatedFields.page_access_token_encrypted = encrypt(selectedPage.access_token, ENC_KEY);
      }

      const { error: updateError } = await admin.from("meta_config").update(updatedFields).eq("organization_id", orgId);
      if (updateError) throw updateError;

      return ok({ success: true, config: updatedFields });
    }

    // ── CAMPAIGNS ──
    if (action === "campaigns") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const data = await graphFetch(`https://graph.facebook.com/${GV}/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,updated_time&limit=50&access_token=${userToken}`);
      return ok({ campaigns: data.data || [] });
    }

    // ── UPDATE CAMPAIGN STATUS ──
    if (action === "update_campaign_status") {
      const campaignId = params?.campaign_id;
      const status = params?.status; // ACTIVE or PAUSED
      if (!campaignId || !status) throw new Error("campaign_id en status vereist");

      const data = await graphPost(`https://graph.facebook.com/${GV}/${campaignId}?access_token=${userToken}`, { status });
      return ok({ success: true, result: data });
    }

    // ── INSIGHTS ──
    if (action === "insights") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const datePreset = params?.date_preset || "last_30d";
      const level = params?.level || "account";
      const data = await graphFetch(`https://graph.facebook.com/${GV}/${adAccountId}/insights?fields=impressions,clicks,spend,cpc,ctr,reach,actions,cost_per_action_type,frequency&date_preset=${datePreset}&level=${level}&limit=100&access_token=${userToken}`);
      return ok({ insights: data.data || [] });
    }

    // ── CAMPAIGN INSIGHTS ──
    if (action === "campaign_insights") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const datePreset = params?.date_preset || "last_30d";
      const data = await graphFetch(`https://graph.facebook.com/${GV}/${adAccountId}/insights?fields=campaign_name,campaign_id,impressions,clicks,spend,cpc,ctr,reach,actions&date_preset=${datePreset}&level=campaign&limit=100&access_token=${userToken}`);
      return ok({ insights: data.data || [] });
    }

    // ── PAGE POSTS ──
    if (action === "page_posts") {
      const pageId = config.page_id;
      if (!pageId || !pageToken) throw new Error("Geen Facebook pagina gekoppeld");

      const data = await graphFetch(`https://graph.facebook.com/${GV}/${pageId}/posts?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true)&limit=25&access_token=${pageToken}`);
      return ok({ posts: data.data || [] });
    }

    // ── CREATE PAGE POST ──
    if (action === "create_page_post") {
      const pageId = config.page_id;
      if (!pageId || !pageToken) throw new Error("Geen Facebook pagina gekoppeld");

      const message = params?.message;
      if (!message) throw new Error("Bericht is vereist");

      const data = await graphPost(`https://graph.facebook.com/${GV}/${pageId}/feed?access_token=${pageToken}`, { message });
      return ok({ success: true, post_id: data.id });
    }

    // ── INSTAGRAM MEDIA ──
    if (action === "instagram_media") {
      const igId = config.instagram_account_id;
      if (!igId) throw new Error("Geen Instagram account gekoppeld");

      const data = await graphFetch(`https://graph.facebook.com/${GV}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=25&access_token=${userToken}`);
      return ok({ media: data.data || [] });
    }

    // ── INSTAGRAM INSIGHTS ──
    if (action === "instagram_insights") {
      const igId = config.instagram_account_id;
      if (!igId) throw new Error("Geen Instagram account gekoppeld");

      const data = await graphFetch(`https://graph.facebook.com/${GV}/${igId}/insights?metric=impressions,reach,profile_views&period=week&access_token=${userToken}`);
      return ok({ insights: data.data || [] });
    }

    // ── INSTAGRAM PUBLISH ──
    if (action === "instagram_publish") {
      const igId = config.instagram_account_id;
      if (!igId) throw new Error("Geen Instagram account gekoppeld");

      const imageUrl = params?.image_url;
      const caption = params?.caption || "";
      if (!imageUrl) throw new Error("image_url is vereist");

      // Step 1: Create container
      const container = await graphPost(
        `https://graph.facebook.com/${GV}/${igId}/media?access_token=${userToken}`,
        { image_url: imageUrl, caption }
      );
      if (!container.id) throw new Error("Kon media container niet aanmaken");

      // Step 2: Publish
      const published = await graphPost(
        `https://graph.facebook.com/${GV}/${igId}/media_publish?access_token=${userToken}`,
        { creation_id: container.id }
      );
      return ok({ success: true, media_id: published.id });
    }

    // ── LEAD FORMS ──
    if (action === "lead_forms") {
      const pageId = config.page_id;
      if (!pageId || !pageToken) throw new Error("Geen Facebook pagina gekoppeld");

      const data = await graphFetch(`https://graph.facebook.com/${GV}/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time,questions,privacy_policy_url&limit=50&access_token=${pageToken}`);
      return ok({ forms: data.data || [] });
    }

    // ── CREATE LEAD FORM ──
    if (action === "create_lead_form") {
      const pageId = config.page_id;
      if (!pageId || !pageToken) throw new Error("Geen Facebook pagina gekoppeld");

      const { name, questions, privacy_policy_url, follow_up_action_url } = params || {};
      if (!name || !questions || !Array.isArray(questions) || questions.length === 0) throw new Error("name en questions vereist");
      if (!privacy_policy_url) throw new Error("privacy_policy_url vereist");

      const body: Record<string, unknown> = {
        name,
        questions,
        privacy_policy: { url: privacy_policy_url },
      };
      if (follow_up_action_url) body.follow_up_action_url = follow_up_action_url;

      const data = await graphPost(
        `https://graph.facebook.com/${GV}/${pageId}/leadgen_forms?access_token=${pageToken}`,
        body
      );
      return ok({ success: true, form_id: data.id });
    }

    // ── SYNC LEADS (Bulk read from Graph API) ──
    if (action === "sync_leads") {
      const pageId = config.page_id;
      if (!pageId || !pageToken) throw new Error("Geen Facebook pagina gekoppeld");

      // Get all lead forms
      const formsData = await graphFetch(`https://graph.facebook.com/${GV}/${pageId}/leadgen_forms?fields=id,name&limit=50&access_token=${pageToken}`);
      const forms = formsData.data || [];

      let totalSynced = 0;
      let totalNew = 0;

      for (const form of forms) {
        // Fetch leads for each form
        const leadsData = await graphFetch(`https://graph.facebook.com/${GV}/${form.id}/leads?fields=id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name,form_id&limit=100&access_token=${pageToken}`);
        const leads = leadsData.data || [];

        for (const lead of leads) {
          // Convert field_data array to object
          const fields: Record<string, string> = {};
          if (Array.isArray(lead.field_data)) {
            for (const fd of lead.field_data) {
              fields[fd.name] = Array.isArray(fd.values) ? fd.values[0] : fd.values;
            }
          }

          // Check if lead already exists by meta_lead_id
          const { data: existing } = await admin
            .from("meta_leads")
            .select("id")
            .eq("organization_id", orgId)
            .eq("meta_lead_id", lead.id)
            .maybeSingle();

          if (!existing) {
            await admin.from("meta_leads").insert({
              organization_id: orgId,
              meta_lead_id: lead.id,
              form_id: lead.form_id || form.id,
              form_name: form.name,
              ad_id: lead.ad_id || null,
              ad_name: lead.ad_name || null,
              campaign_id: lead.campaign_id || null,
              campaign_name: lead.campaign_name || null,
              fields,
              status: "new",
              created_at: lead.created_time || new Date().toISOString(),
            });
            totalNew++;
          }
          totalSynced++;
        }
      }

      return ok({ success: true, total_checked: totalSynced, new_leads: totalNew, forms_checked: forms.length });
    }

    // ── LEADS (from DB) ──
    if (action === "leads") {
      const { data: leads } = await admin
        .from("meta_leads")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);

      return ok({ leads: leads || [] });
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

      return ok({ success: true, contact_id: contact.id });
    }

    // ── CONVERSATIONS (Messenger) ──
    if (action === "conversations") {
      const pageId = config.page_id;
      if (!pageId || !pageToken) throw new Error("Geen Facebook pagina gekoppeld");

      const data = await graphFetch(`https://graph.facebook.com/${GV}/${pageId}/conversations?fields=id,snippet,updated_time,participants,message_count&limit=25&access_token=${pageToken}`);
      return ok({ conversations: data.data || [] });
    }

    // ── CONVERSATION MESSAGES ──
    if (action === "conversation_messages") {
      const conversationId = params?.conversation_id;
      if (!conversationId || !pageToken) throw new Error("conversation_id vereist");

      const data = await graphFetch(`https://graph.facebook.com/${GV}/${conversationId}/messages?fields=id,message,from,created_time&limit=50&access_token=${pageToken}`);
      return ok({ messages: data.data || [] });
    }

    // ── SEND MESSAGE ──
    if (action === "send_message") {
      const pageId = config.page_id;
      if (!pageId || !pageToken) throw new Error("Geen Facebook pagina gekoppeld");

      const recipientId = params?.recipient_id;
      const message = params?.message;
      if (!recipientId || !message) throw new Error("recipient_id en message vereist");

      const data = await graphPost(`https://graph.facebook.com/${GV}/${pageId}/messages?access_token=${pageToken}`, {
        recipient: { id: recipientId },
        message: { text: message },
      });
      return ok({ success: true, message_id: data.message_id });
    }

    // ── CREATE CAMPAIGN ──
    if (action === "create_campaign") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const { name, objective, status: campStatus } = params || {};
      if (!name || !objective) throw new Error("name en objective vereist");

      const data = await graphPost(
        `https://graph.facebook.com/${GV}/${adAccountId}/campaigns?access_token=${userToken}`,
        { name, objective, status: campStatus || "PAUSED" }
      );
      return ok({ success: true, campaign_id: data.id });
    }

    // ── CREATE AD SET ──
    if (action === "create_adset") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const { name, campaign_id, daily_budget, targeting_countries, optimization_goal, billing_event, bid_strategy, start_time, end_time } = params || {};
      if (!name || !campaign_id || !daily_budget) throw new Error("name, campaign_id en daily_budget vereist");

      const budgetCents = Math.round(Number(daily_budget) * 100);
      const countries = targeting_countries || ["NL"];

      const body: Record<string, unknown> = {
        name,
        campaign_id,
        daily_budget: budgetCents,
        targeting: { geo_locations: { countries } },
        optimization_goal: optimization_goal || "LINK_CLICKS",
        billing_event: billing_event || "IMPRESSIONS",
        bid_strategy: bid_strategy || "LOWEST_COST_WITHOUT_CAP",
        status: "PAUSED",
      };
      if (start_time) body.start_time = start_time;
      if (end_time) body.end_time = end_time;

      const data = await graphPost(
        `https://graph.facebook.com/${GV}/${adAccountId}/adsets?access_token=${userToken}`,
        body
      );
      return ok({ success: true, adset_id: data.id });
    }

    // ── UPLOAD AD VIDEO ──
    if (action === "upload_advideo") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const { video_url, title } = params || {};
      if (!video_url) throw new Error("video_url vereist");

      const body: Record<string, unknown> = { file_url: video_url };
      if (title) body.title = title;

      const data = await graphPost(
        `https://graph.facebook.com/${GV}/${adAccountId}/advideos?access_token=${userToken}`,
        body
      );
      return ok({ success: true, video_id: data.id });
    }

    // ── CREATE AD CREATIVE ──
    if (action === "create_adcreative") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const pageId = config.page_id;
      if (!pageId) throw new Error("Geen Facebook pagina gekoppeld (nodig voor ad creative)");

      const { name, creative_type, message, link, image_url, cta_type, video_id, thumbnail_url, link_description, child_attachments } = params || {};
      if (!name) throw new Error("name vereist");

      const type = creative_type || "link";
      const body: Record<string, unknown> = { name };

      if (type === "video") {
        // Video ad creative
        if (!video_id) throw new Error("video_id vereist voor video creative");
        const videoData: Record<string, unknown> = {
          video_id,
          image_url: thumbnail_url || "",
        };
        if (message) videoData.message = message;
        if (link_description) videoData.link_description = link_description;
        if (cta_type && link) {
          videoData.call_to_action = { type: cta_type, value: { link } };
        }
        body.object_story_spec = { page_id: pageId, video_data: videoData };

      } else if (type === "carousel") {
        // Carousel ad creative
        if (!child_attachments || !Array.isArray(child_attachments) || child_attachments.length < 2) {
          throw new Error("Minimaal 2 child_attachments vereist voor carousel");
        }
        if (!link) throw new Error("link vereist voor carousel");
        const linkData: Record<string, unknown> = {
          child_attachments: child_attachments.map((ca: any) => {
            const item: Record<string, unknown> = { link: ca.link };
            if (ca.name) item.name = ca.name;
            if (ca.description) item.description = ca.description;
            if (ca.image_url) item.picture = ca.image_url;
            if (ca.image_hash) item.image_hash = ca.image_hash;
            if (ca.video_id) item.video_id = ca.video_id;
            if (ca.call_to_action) item.call_to_action = ca.call_to_action;
            return item;
          }),
          link,
        };
        if (message) linkData.message = message;
        body.object_story_spec = { page_id: pageId, link_data: linkData };

      } else {
        // Standard link ad creative (existing behavior)
        if (!message || !link) throw new Error("message en link vereist voor link creative");
        const linkData: Record<string, unknown> = {
          message,
          link,
          call_to_action: { type: cta_type || "LEARN_MORE" },
        };
        if (image_url) linkData.picture = image_url;
        body.object_story_spec = { page_id: pageId, link_data: linkData };
      }

      const data = await graphPost(
        `https://graph.facebook.com/${GV}/${adAccountId}/adcreatives?access_token=${userToken}`,
        body
      );
      return ok({ success: true, creative_id: data.id });
    }

    // ── CREATE AD ──
    if (action === "create_ad") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const { name, adset_id, creative_id, status: adStatus } = params || {};
      if (!name || !adset_id || !creative_id) throw new Error("name, adset_id en creative_id vereist");

      const data = await graphPost(
        `https://graph.facebook.com/${GV}/${adAccountId}/ads?access_token=${userToken}`,
        { name, adset_id, creative: { creative_id }, status: adStatus || "PAUSED" }
      );
      return ok({ success: true, ad_id: data.id });
    }

    // ── AD PREVIEW ──
    if (action === "ad_preview") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const { creative_id, ad_format } = params || {};
      if (!creative_id) throw new Error("creative_id vereist");

      const format = ad_format || "DESKTOP_FEED_STANDARD";
      const data = await graphFetch(
        `https://graph.facebook.com/${GV}/${adAccountId}/generatepreviews?creative={"creative_id":"${creative_id}"}&ad_format=${format}&access_token=${userToken}`
      );
      return ok({ previews: data.data || [] });
    }

    // ── DELETE PAGE POST ──
    if (action === "delete_page_post") {
      const { post_id } = params || {};
      if (!post_id || !pageToken) throw new Error("post_id vereist");

      const res = await fetch(`https://graph.facebook.com/${GV}/${post_id}?access_token=${pageToken}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "Kon bericht niet verwijderen");
      return ok({ success: true });
    }

    // ── UPDATE CAMPAIGN ──
    if (action === "update_campaign") {
      const { campaign_id, ...rest } = params || {};
      if (!campaign_id) throw new Error("campaign_id vereist");

      const body: Record<string, unknown> = {};
      if (rest.name) body.name = rest.name;
      if (rest.status) body.status = rest.status;
      if (rest.daily_budget) body.daily_budget = Math.round(Number(rest.daily_budget) * 100);
      if (rest.lifetime_budget) body.lifetime_budget = Math.round(Number(rest.lifetime_budget) * 100);
      if (rest.end_time) body.end_time = rest.end_time;

      const data = await graphPost(`https://graph.facebook.com/${GV}/${campaign_id}?access_token=${userToken}`, body);
      return ok({ success: true, result: data });
    }

    // ── UPDATE AD SET ──
    if (action === "update_adset") {
      const { adset_id, ...rest } = params || {};
      if (!adset_id) throw new Error("adset_id vereist");

      const body: Record<string, unknown> = {};
      if (rest.name) body.name = rest.name;
      if (rest.status) body.status = rest.status;
      if (rest.daily_budget) body.daily_budget = Math.round(Number(rest.daily_budget) * 100);
      if (rest.lifetime_budget) body.lifetime_budget = Math.round(Number(rest.lifetime_budget) * 100);
      if (rest.end_time) body.end_time = rest.end_time;
      if (rest.bid_amount) body.bid_amount = rest.bid_amount;

      const data = await graphPost(`https://graph.facebook.com/${GV}/${adset_id}?access_token=${userToken}`, body);
      return ok({ success: true, result: data });
    }

    // ── UPDATE AD ──
    if (action === "update_ad") {
      const { ad_id, ...rest } = params || {};
      if (!ad_id) throw new Error("ad_id vereist");

      const body: Record<string, unknown> = {};
      if (rest.name) body.name = rest.name;
      if (rest.status) body.status = rest.status;

      const data = await graphPost(`https://graph.facebook.com/${GV}/${ad_id}?access_token=${userToken}`, body);
      return ok({ success: true, result: data });
    }

    // ── AD SETS ──
    if (action === "adsets") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const campaignId = params?.campaign_id;
      let url = `https://graph.facebook.com/${GV}/${adAccountId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting,start_time,end_time&limit=50&access_token=${userToken}`;
      if (campaignId) url += `&filtering=[{"field":"campaign.id","operator":"EQUAL","value":"${campaignId}"}]`;

      const data = await graphFetch(url);
      return ok({ adsets: data.data || [] });
    }

    // ── ADS ──
    if (action === "ads") {
      const adAccountId = config.ad_account_id;
      if (!adAccountId) throw new Error("Geen ad account gekoppeld");

      const adsetId = params?.adset_id;
      const campaignId = params?.campaign_id;
      let url = `https://graph.facebook.com/${GV}/${adAccountId}/ads?fields=id,name,status,creative{id,thumbnail_url,body,title,link_url}&limit=50&access_token=${userToken}`;
      const filters = [];
      if (adsetId) filters.push(`{"field":"adset.id","operator":"EQUAL","value":"${adsetId}"}`);
      if (campaignId) filters.push(`{"field":"campaign.id","operator":"EQUAL","value":"${campaignId}"}`);
      if (filters.length) url += `&filtering=[${filters.join(",")}]`;

      const data = await graphFetch(url);
      return ok({ ads: data.data || [] });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("connect-meta-api error:", msg);
    const isTokenExpired = msg.startsWith("TOKEN_EXPIRED:");
    return new Response(
      JSON.stringify({ error: isTokenExpired ? msg.replace("TOKEN_EXPIRED:", "") : msg, token_expired: isTokenExpired }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
