import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Parser: Google Places results → companies + contacts ──────────────
interface CompanyInsert {
    organization_id: string;
    name: string;
    website?: string;
    phone?: string;
    email?: string;
    industry?: string;
    address_line1?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    google_place_id?: string;
    google_rating?: number;
    google_review_count?: number;
    latitude?: number;
    longitude?: number;
}

interface ContactInsert {
    organization_id: string;
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    source?: string;
    lifecycle_stage: string;
    lead_status: string;
    temperature: string;
    company_id?: string;
    data_source_id?: string;
}

function parseGooglePlaces(items: any[], orgId: string): { companies: CompanyInsert[], contacts: ContactInsert[] } {
    const companies: CompanyInsert[] = [];
    const contacts: ContactInsert[] = [];

    for (const item of items) {
        if (!item.title && !item.name) continue;

        const companyName = item.title || item.name || "Unknown";
        const company: CompanyInsert = {
            organization_id: orgId,
            name: companyName,
            website: item.website || item.url || null,
            phone: item.phone || item.phoneNumber || null,
            email: item.email || null,
            industry: item.categoryName || item.category || null,
            address_line1: item.address || item.street || null,
            city: item.city || null,
            postal_code: item.postalCode || item.zipCode || null,
            country: item.countryCode || "NL",
            google_place_id: item.placeId || null,
            google_rating: item.totalScore || item.rating || null,
            google_review_count: item.reviewsCount || item.reviews || null,
            latitude: item.location?.lat || item.latitude || null,
            longitude: item.location?.lng || item.longitude || null,
        };
        companies.push(company);

        contacts.push({
            organization_id: orgId,
            first_name: companyName,
            phone: company.phone || undefined,
            email: company.email || undefined,
            source: "google_places",
            lifecycle_stage: "lead",
            lead_status: "new",
            temperature: "cold",
        });
    }

    return { companies, contacts };
}

function parseLeadsFinder(items: any[], orgId: string): { companies: CompanyInsert[], contacts: ContactInsert[] } {
    const companies: CompanyInsert[] = [];
    const contacts: ContactInsert[] = [];

    for (const item of items) {
        const name = item.name || item.company || item.title || null;
        if (!name) continue;

        companies.push({
            organization_id: orgId,
            name,
            website: item.website || item.url || null,
            phone: item.phone || null,
            email: item.email || null,
            industry: item.industry || item.category || null,
            city: item.city || item.location || null,
            country: "NL",
        });

        if (item.contactName || item.email) {
            const parts = (item.contactName || name).split(" ");
            contacts.push({
                organization_id: orgId,
                first_name: parts[0] || name,
                last_name: parts.slice(1).join(" ") || undefined,
                email: item.email || undefined,
                phone: item.phone || undefined,
                source: "leads_finder",
                lifecycle_stage: "lead",
                lead_status: "new",
                temperature: "cold",
            });
        }
    }

    return { companies, contacts };
}

function parseGeneric(items: any[], orgId: string): { companies: CompanyInsert[], contacts: ContactInsert[] } {
    const companies: CompanyInsert[] = [];
    const contacts: ContactInsert[] = [];

    for (const item of items) {
        const name = item.title || item.name || item.company || item.username || null;
        if (!name) continue;

        if (item.website || item.phone || item.address || item.industry) {
            companies.push({
                organization_id: orgId,
                name,
                website: item.website || item.url || null,
                phone: item.phone || null,
                email: item.email || null,
                industry: item.industry || item.category || null,
                city: item.city || item.location || null,
                country: "NL",
            });
        }

        contacts.push({
            organization_id: orgId,
            first_name: name,
            email: item.email || undefined,
            phone: item.phone || undefined,
            source: "apify_scraper",
            lifecycle_stage: "lead",
            lead_status: "new",
            temperature: "cold",
        });
    }

    return { companies, contacts };
}

function selectParser(actorId: string) {
    if (actorId.includes("google-places")) return parseGooglePlaces;
    if (actorId.includes("leads-finder")) return parseLeadsFinder;
    return parseGeneric;
}

// ── Scoring engine ────────────────────────────────────────────────────
async function applyScoring(orgId: string) {
    const { data: rules } = await supabase
        .from("scoring_rules")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("sort_order");

    if (!rules || rules.length === 0) return 0;

    const { data: contacts } = await supabase
        .from("contacts")
        .select("id, email, phone, lead_score, company_id")
        .eq("organization_id", orgId)
        .eq("lead_status", "new");

    if (!contacts || contacts.length === 0) return 0;

    let highScoreCount = 0;

    for (const contact of contacts) {
        let score = 0;

        let company: any = null;
        if (contact.company_id) {
            const { data } = await supabase
                .from("companies")
                .select("*")
                .eq("id", contact.company_id)
                .single();
            company = data;
        }

        for (const rule of rules) {
            const fieldValue = (contact as any)[rule.field_path] ?? (company ? (company as any)[rule.field_path] : null);

            let match = false;
            switch (rule.operator) {
                case "exists":
                    match = fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
                    break;
                case "not_exists":
                    match = fieldValue === null || fieldValue === undefined || fieldValue === "";
                    break;
                case "equals":
                    match = String(fieldValue) === rule.value;
                    break;
                case "not_equals":
                    match = String(fieldValue) !== rule.value;
                    break;
                case "contains":
                    match = String(fieldValue || "").toLowerCase().includes((rule.value || "").toLowerCase());
                    break;
                case "gt":
                    match = Number(fieldValue) > Number(rule.value);
                    break;
                case "lt":
                    match = Number(fieldValue) < Number(rule.value);
                    break;
                case "in":
                    match = (rule.value || "").split(",").map((s: string) => s.trim()).includes(String(fieldValue));
                    break;
            }

            if (match) score += rule.score_delta;
        }

        const tier = score >= 50 ? "hot" : score >= 25 ? "warm" : "cold";
        if (tier === "hot") highScoreCount++;

        await supabase
            .from("contacts")
            .update({ lead_score: score, score_tier: tier, temperature: tier })
            .eq("id", contact.id);
    }

    return highScoreCount;
}

// ── Main handler ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { data_source_id, actor_input, organization_id, triggered_by } = await req.json();

        if (!data_source_id || !organization_id) {
            return new Response(
                JSON.stringify({ error: "data_source_id and organization_id are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 1. Fetch data source config
        const { data: dataSource, error: dsError } = await supabase
            .from("data_sources")
            .select("*")
            .eq("id", data_source_id)
            .single();

        if (dsError || !dataSource) {
            return new Response(
                JSON.stringify({ error: "Data source not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const actorId = dataSource.provider_config?.actorId;
        if (!actorId) {
            return new Response(
                JSON.stringify({ error: "Data source has no actorId configured" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Create scrape_run record
        const { data: scrapeRun, error: runError } = await supabase
            .from("scrape_runs")
            .insert({
                organization_id,
                data_source_id,
                triggered_by: triggered_by || null,
                trigger_type: "manual",
                status: "running",
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (runError) {
            console.error("Failed to create scrape_run:", runError);
            return new Response(
                JSON.stringify({ error: "Failed to create scrape run", detail: runError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const runId = scrapeRun.id;

        // 3. Start async processing
        (async () => {
            try {
                console.log(`Starting Apify actor: ${actorId}`);
                const startRes = await fetch(
                    `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(actor_input || {}),
                    }
                );

                if (!startRes.ok) {
                    const errText = await startRes.text();
                    throw new Error(`Apify start failed: ${startRes.status} ${errText}`);
                }

                const startData = await startRes.json();
                const apifyRunId = startData.data?.id;
                const datasetId = startData.data?.defaultDatasetId;

                await supabase.from("scrape_runs").update({
                    provider_run_id: apifyRunId,
                    provider_dataset_id: datasetId,
                }).eq("id", runId);

                // Poll for completion (max 5 minutes)
                let status = startData.data?.status;
                const maxPolls = 60;
                for (let i = 0; i < maxPolls && status !== "SUCCEEDED" && status !== "FAILED" && status !== "ABORTED"; i++) {
                    await new Promise(r => setTimeout(r, 5000));
                    const pollRes = await fetch(
                        `https://api.apify.com/v2/actor-runs/${apifyRunId}?token=${APIFY_TOKEN}`
                    );
                    const pollData = await pollRes.json();
                    status = pollData.data?.status;
                }

                if (status !== "SUCCEEDED") {
                    await supabase.from("scrape_runs").update({
                        status: "failed",
                        error_message: `Apify run ended with status: ${status}`,
                        completed_at: new Date().toISOString(),
                    }).eq("id", runId);
                    return;
                }

                // Fetch dataset items
                const datasetRes = await fetch(
                    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=200`
                );
                const items = await datasetRes.json();

                if (!Array.isArray(items) || items.length === 0) {
                    await supabase.from("scrape_runs").update({
                        status: "completed",
                        raw_results_count: 0,
                        completed_at: new Date().toISOString(),
                    }).eq("id", runId);
                    return;
                }

                // Parse results
                const parser = selectParser(actorId);
                const { companies, contacts } = parser(items, organization_id);

                // Insert companies (upsert by name + org)
                const companyIdMap: Record<string, string> = {};
                for (const company of companies) {
                    const { data: existing } = await supabase
                        .from("companies")
                        .select("id")
                        .eq("organization_id", organization_id)
                        .eq("name", company.name)
                        .maybeSingle();

                    if (existing) {
                        companyIdMap[company.name] = existing.id;
                        await supabase.from("companies").update({
                            website: company.website || undefined,
                            phone: company.phone || undefined,
                            google_rating: company.google_rating || undefined,
                            google_review_count: company.google_review_count || undefined,
                            google_place_id: company.google_place_id || undefined,
                        }).eq("id", existing.id);
                    } else {
                        const { data: inserted } = await supabase
                            .from("companies")
                            .insert(company)
                            .select("id")
                            .single();
                        if (inserted) companyIdMap[company.name] = inserted.id;
                    }
                }

                // Insert contacts, linking to companies
                let newContactsCount = 0;
                for (const contact of contacts) {
                    const companyId = companyIdMap[contact.first_name] || null;

                    const { data: existing } = await supabase
                        .from("contacts")
                        .select("id")
                        .eq("organization_id", organization_id)
                        .eq("first_name", contact.first_name)
                        .maybeSingle();

                    if (!existing) {
                        await supabase.from("contacts").insert({
                            ...contact,
                            company_id: companyId,
                            data_source_id: data_source_id,
                        });
                        newContactsCount++;
                    }
                }

                // Apply scoring
                const highScoreCount = await applyScoring(organization_id);

                // Fetch Apify run stats for cost
                const runStatsRes = await fetch(
                    `https://api.apify.com/v2/actor-runs/${apifyRunId}?token=${APIFY_TOKEN}`
                );
                const runStats = await runStatsRes.json();
                const costUsd = runStats.data?.usageTotalUsd || 0;

                // Update scrape_run with final stats
                await supabase.from("scrape_runs").update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    raw_results_count: items.length,
                    after_dedup_count: companies.length,
                    new_contacts_count: newContactsCount,
                    high_score_count: highScoreCount,
                    cost_euros: costUsd,
                }).eq("id", runId);

                // Update data source stats
                await supabase.from("data_sources").update({
                    total_runs: (dataSource.total_runs || 0) + 1,
                    total_leads_found: (dataSource.total_leads_found || 0) + items.length,
                    total_leads_imported: (dataSource.total_leads_imported || 0) + newContactsCount,
                    last_run_at: new Date().toISOString(),
                }).eq("id", data_source_id);

                console.log(`Scrape run ${runId} completed: ${items.length} results, ${newContactsCount} new contacts, ${highScoreCount} hot leads`);

            } catch (err) {
                console.error("Background processing error:", err);
                await supabase.from("scrape_runs").update({
                    status: "failed",
                    error_message: err instanceof Error ? err.message : String(err),
                    completed_at: new Date().toISOString(),
                }).eq("id", runId);
            }
        })();

        // Return immediately with the run ID
        return new Response(
            JSON.stringify({
                success: true,
                scrape_run_id: runId,
                message: "Scrape run started. Poll for status updates.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("Request error:", err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
