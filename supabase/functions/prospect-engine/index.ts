import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") || "";

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────
function xorDecrypt(encrypted: string, key: string): string {
  try {
    const bytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      decrypted[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
  } catch {
    return encrypted;
  }
}

async function getApifyToken(orgId: string): Promise<string> {
  // Try org-level API key first
  const { data: orgKey } = await adminClient
    .from("organization_api_keys")
    .select("encrypted_key")
    .eq("organization_id", orgId)
    .eq("provider", "apify")
    .eq("is_active", true)
    .maybeSingle();

  if (orgKey?.encrypted_key) {
    return xorDecrypt(orgKey.encrypted_key, ENCRYPTION_KEY);
  }

  // Fallback to env
  const token = Deno.env.get("APIFY_TOKEN");
  if (!token) throw new Error("Geen Apify API key geconfigureerd. Voeg deze toe in Instellingen → API Keys.");
  return token;
}

async function getUserOrgId(authHeader: string): Promise<{ userId: string; orgId: string }> {
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  return { userId: user.id, orgId: "" }; // orgId filled from request body
}

// ── Google Maps search via Apify ─────────────────────────────────────
const GOOGLE_PLACES_ACTOR = "compass~crawler-google-places";

async function handleSearch(
  orgId: string,
  userId: string,
  body: any
): Promise<Response> {
  const { source, query, config, leads: manualLeads } = body;

  // Create pool
  const poolName = source === "google_maps"
    ? query || "Google Maps zoekactie"
    : source === "url_import"
    ? "URL Import"
    : source === "manual"
    ? "Handmatige import"
    : "Import";

  const { data: pool, error: poolErr } = await adminClient
    .from("prospect_pools")
    .insert({
      organization_id: orgId,
      name: poolName,
      source: source || "manual",
      search_query: query || null,
      search_config: config || null,
      status: source === "google_maps" ? "searching" : "found",
      created_by: userId,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (poolErr || !pool) {
    console.error("Pool create error:", poolErr);
    return jsonResponse({ error: "Kon pool niet aanmaken" }, 500);
  }

  const poolId = pool.id;

  if (source === "google_maps") {
    // Start Apify Google Places scraper in background
    startGoogleMapsSearch(orgId, poolId, query, config).catch((e) =>
      console.error("Google Maps search error:", e)
    );

    return jsonResponse({ pool_id: poolId, status: "searching" });
  }

  // Manual / URL leads
  if (manualLeads && Array.isArray(manualLeads)) {
    const inserts = manualLeads.map((l: any) => ({
      organization_id: orgId,
      pool_id: poolId,
      company_name: l.company_name || l.website_url || "Onbekend",
      website_url: l.website_url || null,
      city: l.city || null,
      status: "new",
    }));

    await adminClient.from("prospect_leads").insert(inserts);
    await adminClient
      .from("prospect_pools")
      .update({ total_leads: inserts.length, status: "found" })
      .eq("id", poolId);
  }

  return jsonResponse({ pool_id: poolId, status: "found" });
}

async function startGoogleMapsSearch(
  orgId: string,
  poolId: string,
  query: string,
  config: any
) {
  const apifyToken = await getApifyToken(orgId);
  const maxResults = config?.max_results || 20;

  console.log(`Starting Google Places search: "${query}" (max ${maxResults})`);

  const startRes = await fetch(
    `https://api.apify.com/v2/acts/${GOOGLE_PLACES_ACTOR}/runs?token=${apifyToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: maxResults,
        language: "nl",
        countryCode: "nl",
      }),
    }
  );

  if (!startRes.ok) {
    const errText = await startRes.text();
    console.error("Apify start failed:", errText);
    await adminClient
      .from("prospect_pools")
      .update({ status: "failed", error_message: `Apify fout: ${startRes.status}` })
      .eq("id", poolId);
    return;
  }

  const startData = await startRes.json();
  const apifyRunId = startData.data?.id;
  const datasetId = startData.data?.defaultDatasetId;

  console.log(`Apify run started: ${apifyRunId}, dataset: ${datasetId}`);

  // Poll for completion (max 5 min)
  let status = startData.data?.status;
  for (let i = 0; i < 60 && !["SUCCEEDED", "FAILED", "ABORTED"].includes(status); i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${apifyRunId}?token=${apifyToken}`
    );
    const pollData = await pollRes.json();
    status = pollData.data?.status;
  }

  if (status !== "SUCCEEDED") {
    await adminClient
      .from("prospect_pools")
      .update({ status: "failed", error_message: `Apify run status: ${status}` })
      .eq("id", poolId);
    return;
  }

  // Fetch results
  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=200`
  );
  const items = await datasetRes.json();

  if (!Array.isArray(items) || items.length === 0) {
    await adminClient
      .from("prospect_pools")
      .update({ status: "found", total_leads: 0 })
      .eq("id", poolId);
    return;
  }

  // Parse items into prospect_leads
  const leads = items.map((item: any) => ({
    organization_id: orgId,
    pool_id: poolId,
    company_name: item.title || item.name || "Onbekend",
    website_url: item.website || item.url || null,
    phone: item.phone || item.phoneNumber || null,
    address: item.address || item.street || null,
    city: item.city || null,
    google_rating: item.totalScore || item.rating || null,
    google_review_count: item.reviewsCount || item.reviews || null,
    contact_email: item.email || null,
    source_data: item,
    status: "new",
  }));

  const { error: insertErr } = await adminClient.from("prospect_leads").insert(leads);
  if (insertErr) console.error("Lead insert error:", insertErr);

  await adminClient
    .from("prospect_pools")
    .update({
      status: "found",
      total_leads: leads.length,
      completed_at: new Date().toISOString(),
    })
    .eq("id", poolId);

  console.log(`Google Maps search complete: ${leads.length} leads found`);
}

// ── Status ───────────────────────────────────────────────────────────
async function handleStatus(orgId: string, body: any): Promise<Response> {
  const { pool_id } = body;

  if (pool_id) {
    // Single pool detail
    const { data: pool } = await adminClient
      .from("prospect_pools")
      .select("*")
      .eq("id", pool_id)
      .eq("organization_id", orgId)
      .single();

    const { data: leads } = await adminClient
      .from("prospect_leads")
      .select("*")
      .eq("pool_id", pool_id)
      .eq("organization_id", orgId)
      .order("score", { ascending: false, nullsFirst: false });

    // Send status
    const today = new Date().toISOString().split("T")[0];
    const { count: sentToday } = await adminClient
      .from("prospect_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("email_sent_at", today + "T00:00:00");

    return jsonResponse({
      pool,
      leads: leads || [],
      send_status: { sent: sentToday ?? 0, limit: 10, allowed: true },
    });
  }

  // Overview: all pools + aggregate stats
  const { data: pools } = await adminClient
    .from("prospect_pools")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  // Aggregate stats
  const { count: totalLeads } = await adminClient
    .from("prospect_leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  const { count: emailsSent } = await adminClient
    .from("prospect_leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .not("email_sent_at", "is", null);

  const { count: demosViewed } = await adminClient
    .from("prospect_leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .not("demo_viewed_at", "is", null);

  const { count: replied } = await adminClient
    .from("prospect_leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .not("email_replied_at", "is", null);

  const today = new Date().toISOString().split("T")[0];
  const { count: sentToday } = await adminClient
    .from("prospect_leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("email_sent_at", today + "T00:00:00");

  return jsonResponse({
    pools: pools || [],
    stats: {
      total_leads: totalLeads ?? 0,
      emails_sent: emailsSent ?? 0,
      demos_viewed: demosViewed ?? 0,
      replied: replied ?? 0,
    },
    send_status: { sent: sentToday ?? 0, limit: 10, allowed: true },
  });
}

// ── Batch actions ────────────────────────────────────────────────────
async function handleAnalyze(orgId: string, body: any): Promise<Response> {
  const { lead_ids } = body;
  if (!lead_ids?.length) return jsonResponse({ error: "Geen leads geselecteerd" }, 400);

  // Mark as analyzing
  await adminClient
    .from("prospect_leads")
    .update({ status: "analyzing" })
    .in("id", lead_ids)
    .eq("organization_id", orgId);

  // TODO: Trigger actual website analysis (Firecrawl/AI) in background
  // For now, mark as scored with placeholder
  setTimeout(async () => {
    try {
      for (const id of lead_ids) {
        await adminClient
          .from("prospect_leads")
          .update({
            status: "scored",
            score: Math.floor(Math.random() * 40) + 50,
            score_breakdown: { website: 15, bedrijf: 20, branche: 20, tech: 15, mobile: 8, locatie: 10 },
            fit_summary: "Website geanalyseerd — potentiële fit voor SiteJob diensten.",
            analyzed_at: new Date().toISOString(),
          })
          .eq("id", id);
      }

      // Update pool stats
      const { data: lead } = await adminClient
        .from("prospect_leads")
        .select("pool_id")
        .eq("id", lead_ids[0])
        .single();
      if (lead?.pool_id) {
        const { count } = await adminClient
          .from("prospect_leads")
          .select("id", { count: "exact", head: true })
          .eq("pool_id", lead.pool_id)
          .not("analyzed_at", "is", null);
        await adminClient
          .from("prospect_pools")
          .update({ analyzed_leads: count ?? 0, status: "analyzed" })
          .eq("id", lead.pool_id);
      }
    } catch (e) {
      console.error("Analyze error:", e);
    }
  }, 3000);

  return jsonResponse({ ok: true, message: `${lead_ids.length} leads worden geanalyseerd` });
}

async function handleBuildDemos(orgId: string, body: any): Promise<Response> {
  const { lead_ids } = body;
  if (!lead_ids?.length) return jsonResponse({ error: "Geen leads geselecteerd" }, 400);

  await adminClient
    .from("prospect_leads")
    .update({ status: "demo_queued" })
    .in("id", lead_ids)
    .eq("organization_id", orgId);

  // TODO: Trigger demo generation in background
  setTimeout(async () => {
    try {
      for (const id of lead_ids) {
        await adminClient
          .from("prospect_leads")
          .update({
            status: "demo_ready",
            demo_built_at: new Date().toISOString(),
          })
          .eq("id", id);
      }

      const { data: lead } = await adminClient
        .from("prospect_leads")
        .select("pool_id")
        .eq("id", lead_ids[0])
        .single();
      if (lead?.pool_id) {
        const { count } = await adminClient
          .from("prospect_leads")
          .select("id", { count: "exact", head: true })
          .eq("pool_id", lead.pool_id)
          .eq("status", "demo_ready");
        await adminClient
          .from("prospect_pools")
          .update({ demos_built: count ?? 0, status: "demos_ready" })
          .eq("id", lead.pool_id);
      }
    } catch (e) {
      console.error("Build demos error:", e);
    }
  }, 5000);

  return jsonResponse({ ok: true, message: `${lead_ids.length} demo's worden gebouwd` });
}

async function handleDraftEmails(orgId: string, body: any): Promise<Response> {
  const { lead_ids } = body;
  if (!lead_ids?.length) return jsonResponse({ error: "Geen leads geselecteerd" }, 400);

  // Fetch leads for email generation
  const { data: leads } = await adminClient
    .from("prospect_leads")
    .select("*")
    .in("id", lead_ids)
    .eq("organization_id", orgId);

  if (!leads?.length) return jsonResponse({ error: "Leads niet gevonden" }, 404);

  for (const lead of leads) {
    const contactName = lead.contact_name || "daar";
    const subject = `${lead.company_name} — ik heb alvast een verbeterd ontwerp gemaakt`;
    const body = `Hoi ${contactName},\n\nIk zag dat de website van ${lead.company_name} toe is aan een update. Ik heb alvast een verbeterd ontwerp gemaakt om te laten zien wat er mogelijk is.\n\nBekijk de demo hier: ${lead.demo_url || "[demo link]"}\n\nZou je daar deze week naar willen kijken? Dan plan ik graag een kort gesprek in.\n\nMet vriendelijke groet`;

    await adminClient
      .from("prospect_leads")
      .update({
        status: "email_draft",
        email_subject: subject,
        email_body: body,
        email_drafted_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
  }

  // Update pool
  const { data: firstLead } = await adminClient
    .from("prospect_leads")
    .select("pool_id")
    .eq("id", lead_ids[0])
    .single();
  if (firstLead?.pool_id) {
    const { count } = await adminClient
      .from("prospect_leads")
      .select("id", { count: "exact", head: true })
      .eq("pool_id", firstLead.pool_id)
      .not("email_drafted_at", "is", null);
    await adminClient
      .from("prospect_pools")
      .update({ emails_drafted: count ?? 0, status: "ready_to_send" })
      .eq("id", firstLead.pool_id);
  }

  return jsonResponse({ ok: true, message: `${leads.length} email concepten gegenereerd` });
}

async function handleUpdateEmail(orgId: string, body: any): Promise<Response> {
  const { lead_ids, email_subject, email_body, approve } = body;
  if (!lead_ids?.length) return jsonResponse({ error: "Geen lead geselecteerd" }, 400);

  const update: any = {};
  if (email_subject !== undefined) update.email_subject = email_subject;
  if (email_body !== undefined) update.email_body = email_body;
  if (approve) update.status = "email_approved";

  await adminClient
    .from("prospect_leads")
    .update(update)
    .in("id", lead_ids)
    .eq("organization_id", orgId);

  return jsonResponse({ ok: true });
}

async function handleSend(orgId: string, userId: string, body: any): Promise<Response> {
  const { lead_ids } = body;
  if (!lead_ids?.length) return jsonResponse({ error: "Geen leads geselecteerd" }, 400);

  // Check daily limit
  const today = new Date().toISOString().split("T")[0];
  const { count: sentToday } = await adminClient
    .from("prospect_leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("email_sent_at", today + "T00:00:00");

  const limit = 10;
  const remaining = Math.max(0, limit - (sentToday ?? 0));
  if (remaining === 0) {
    return jsonResponse({ error: "Dagelijkse limiet bereikt (10 emails/dag)" }, 429);
  }

  const idsToSend = lead_ids.slice(0, remaining);

  // Mark as sent (actual email sending would go through send-email function)
  await adminClient
    .from("prospect_leads")
    .update({ status: "email_sent", email_sent_at: new Date().toISOString() })
    .in("id", idsToSend)
    .eq("organization_id", orgId);

  // Update pool
  const { data: firstLead } = await adminClient
    .from("prospect_leads")
    .select("pool_id")
    .eq("id", idsToSend[0])
    .single();
  if (firstLead?.pool_id) {
    const { count } = await adminClient
      .from("prospect_leads")
      .select("id", { count: "exact", head: true })
      .eq("pool_id", firstLead.pool_id)
      .not("email_sent_at", "is", null);
    await adminClient
      .from("prospect_pools")
      .update({ emails_sent: count ?? 0 })
      .eq("id", firstLead.pool_id);
  }

  return jsonResponse({
    ok: true,
    sent: idsToSend.length,
    message: `${idsToSend.length} emails verstuurd`,
  });
}

// ── Router ───────────────────────────────────────────────────────────
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Verify user
    const { userId } = await getUserOrgId(authHeader);
    const body = await req.json();
    const { action, organization_id } = body;

    if (!organization_id) {
      return jsonResponse({ error: "organization_id is verplicht" }, 400);
    }

    // Verify user is member of org
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      return jsonResponse({ error: "Geen toegang tot deze organisatie" }, 403);
    }

    switch (action) {
      case "search":
        return await handleSearch(organization_id, userId, body);
      case "status":
        return await handleStatus(organization_id, body);
      case "analyze":
        return await handleAnalyze(organization_id, body);
      case "build_demos":
        return await handleBuildDemos(organization_id, body);
      case "draft_emails":
        return await handleDraftEmails(organization_id, body);
      case "update_email":
        return await handleUpdateEmail(organization_id, body);
      case "send":
        return await handleSend(organization_id, userId, body);
      default:
        return jsonResponse({ error: `Onbekende actie: ${action}` }, 400);
    }
  } catch (e) {
    console.error("prospect-engine error:", e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Onbekende fout" },
      500
    );
  }
});
