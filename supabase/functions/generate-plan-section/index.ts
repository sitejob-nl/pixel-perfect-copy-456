import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent een projectplan-schrijver voor SiteJob, een custom software development bedrijf in Best, Nederland. Je schrijft professionele, concrete projectplannen voor MKB-klanten.

Schrijfstijl:
- Nuchter en direct, geen buzzwords of vage beloftes
- Concreet: noem specifieke functionaliteiten, geen algemeenheden
- Professioneel maar toegankelijk
- Nederlands
- Gebruik HTML formatting: <h3>, <h4>, <p>, <ul><li>, <ol><li>, <table>, <strong>
- Geen markdown, alleen HTML

Over SiteJob:
- Custom software voor MKB (10-100 medewerkers, €1-20M omzet)
- Tech stack: React, TypeScript, Supabase (PostgreSQL), Vercel
- Specialisatie: ERP/CRM systemen, workflow automatisering, klantportalen
- Gevestigd in Best, Nederland. KvK: 94498083
- Eigenaar: Kas van de Meulengraaf`;

function buildSectionPrompt(
  sectionType: string,
  title: string,
  ctx: any,
  plan: any,
  existing?: { type: string; content: string }[],
  extraInstructions?: string
): string {
  const c = ctx.company || {};
  const contact = ctx.contacts?.[0];
  const companyInfo = `
Klant: ${c.name || "Onbekend"}
Branche: ${c.industry || c.sbi_description || "Onbekend"}
Locatie: ${c.city || "Onbekend"}
Omvang: ${c.company_size || c.employee_count_range || "Onbekend"}
Website: ${c.website || "Geen"}
${ctx.websiteAnalysis?.summary ? `Website analyse: ${ctx.websiteAnalysis.summary}` : ""}
${ctx.enrichment?.ai_company_summary ? `Bedrijfsprofiel: ${ctx.enrichment.ai_company_summary}` : ""}
${ctx.enrichment?.ai_pain_points ? `Pijnpunten: ${ctx.enrichment.ai_pain_points}` : ""}
${ctx.prospect?.fit_summary ? `Fit analyse: ${ctx.prospect.fit_summary}` : ""}
${ctx.deal?.description ? `Deal context: ${ctx.deal.description}` : ""}
${c.notes ? `Notities: ${c.notes}` : ""}
Contactpersoon: ${contact ? `${contact.first_name} ${contact.last_name}, ${contact.job_title || ""}` : "Onbekend"}`.trim();

  const planInfo = `
Projecttitel: ${plan.title || "Onbekend"}
${plan.totalAmount ? `Budget: €${plan.totalAmount}` : ""}
${plan.estimatedWeeks ? `Doorlooptijd: ${plan.estimatedWeeks} weken` : ""}`.trim();

  const previousContext = existing?.length
    ? `\n\nEerder gegenereerde secties van dit plan:\n${existing.map(s => `[${s.type}]: ${s.content.substring(0, 500)}`).join("\n")}`
    : "";

  const extra = extraInstructions ? `\n\nExtra instructies van de gebruiker: ${extraInstructions}` : "";

  const prompts: Record<string, string> = {
    description: `Schrijf een projectomschrijving voor het volgende project. Beschrijf het doel, de aanleiding en de gewenste situatie. Maak het specifiek voor deze klant — verwijs naar hun branche, huidige situatie en behoeften. 2-3 alinea's in HTML.\n\n${companyInfo}\n${planInfo}${previousContext}${extra}`,

    scope: `Schrijf de functionele scope voor dit project. Beschrijf per module/onderdeel:
- Wat het doet (concreet, geen vage beschrijvingen)
- Welke functionaliteiten erin zitten (als <ul> lijst)
- Wat NIET inbegrepen is

Baseer de modules op wat deze klant nodig heeft gezien hun branche en situatie. Gebruik <h4> per module. Typische modules: Website/CMS, CRM, ERP, Klantportaal, Integraties, Dashboard, Automatiseringen — maar alleen wat relevant is.

${companyInfo}
${planInfo}${previousContext}${extra}`,

    timeline: `Maak een planning/fasering voor dit project. Gebruik een HTML tabel met kolommen: Fase, Omschrijving, Duur, Deliverables. Typische fasen: Kick-off & ontwerp, Ontwikkeling fase 1, Ontwikkeling fase 2, Testen & feedback, Oplevering & training. Maak het realistisch voor de geschatte doorlooptijd.\n\n${companyInfo}\n${planInfo}${previousContext}${extra}`,

    investment: `Schrijf de investering-sectie. Benoem:
- Het totaalbedrag (of "Nader te bepalen na scopebepaling" als er geen bedrag is)
- Het betaalschema als tabel
- Wat inbegrepen is (ontwikkeling, testen, oplevering, 30 dagen garantie)
- Wat apart geoffreerd wordt (hosting, onderhoud, meerwerk)
- Optioneel maandelijks abonnement voor hosting/support
- "Alle bedragen zijn exclusief 21% BTW"

${companyInfo}
${planInfo}
${plan.paymentStructure ? `Betaalschema: ${JSON.stringify(plan.paymentStructure)}` : "Betaalschema: 50% bij opstart, 50% bij oplevering"}${previousContext}${extra}`,

    deliverables: `Maak een lijst van concrete op te leveren items voor dit project. Denk aan:
- Functionele applicatie (beschrijf kort)
- Broncode (repository)
- Technische documentatie
- Gebruikersdocumentatie / handleiding
- Testrapportage
- Hosting & deployment
- Training (X sessies)
- 30 dagen garantieperiode
Maak het specifiek voor wat in de scope staat.

${companyInfo}
${planInfo}${previousContext}${extra}`,

    parties: `Schrijf de partijen-sectie met twee kolommen in nette HTML met <h4> kopjes:

Opdrachtgever:
${c.name || "[Bedrijfsnaam]"}
${c.address_line1 || ""}, ${c.postal_code || ""} ${c.city || ""}
KvK: ${c.kvk_number || "[in te vullen]"}
Vertegenwoordigd door: ${contact ? `${contact.first_name} ${contact.last_name}` : "[in te vullen]"}

Opdrachtnemer:
SiteJob
Best, Nederland
KvK: 94498083
Vertegenwoordigd door: Kas van de Meulengraaf`,

    assumptions: `Schrijf de uitgangspunten en randvoorwaarden voor dit project. Maak ze specifiek voor deze klant en branche. Typische punten:
- Content aanlevering door klant
- Feedbacktermijnen
- Vast aanspreekpunt
- Toegang tot systemen
- Scope afbakening
- Beschikbaarheid voor afstemming
Maak het een <ul> lijst, 6-8 punten.

${companyInfo}
${planInfo}${previousContext}${extra}`,
  };

  return prompts[sectionType] || `Schrijf de sectie "${title}" voor het volgende projectplan:\n\n${companyInfo}\n${planInfo}${previousContext}${extra}`;
}

serve(async (req) => {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { section_type, section_title, client_context, plan_meta, existing_sections, extra_instructions } = await req.json();

    const userPrompt = buildSectionPrompt(
      section_type,
      section_title,
      client_context || {},
      plan_meta || {},
      existing_sections,
      extra_instructions
    );

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content, model: "google/gemini-2.5-flash" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan-section error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
