import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

function buildCommunicationContext(ctx: any): { callContext: string; emailContext: string; whatsappContext: string; instruction: string } {
  let callContext = "";
  if (ctx.calls?.length) {
    const callSummaries = ctx.calls
      .filter((c: any) => c.ai_summary || c.transcription_summary || c.transcription_text)
      .map((c: any) => {
        const date = new Date(c.started_at).toLocaleDateString("nl-NL");
        const duration = c.duration_seconds ? `${Math.round(c.duration_seconds / 60)} min` : "";
        const summary = c.ai_summary || c.transcription_summary || (c.transcription_text?.substring(0, 1000) ?? "");
        const actions = c.ai_action_items ? JSON.stringify(c.ai_action_items) : "";
        const sentiment = c.sentiment || "";
        const notes = c.notes || "";
        return `[${date}, ${duration}${sentiment ? ", sentiment: " + sentiment : ""}]\nSamenvatting: ${summary}${actions ? "\nActiepunten: " + actions : ""}${notes ? "\nNotities: " + notes : ""}`;
      });
    if (callSummaries.length) {
      callContext = `\n\nTelefoongesprekken met deze klant (${callSummaries.length} gesprekken):\n${callSummaries.join("\n---\n")}`;
    }
  }

  let emailContext = "";
  if (ctx.emails?.length) {
    const emailSummaries = ctx.emails
      .slice(0, 10)
      .map((e: any) => {
        const date = new Date(e.received_at).toLocaleDateString("nl-NL");
        const dir = e.direction === "inbound" ? "←" : "→";
        return `${dir} [${date}] ${e.subject || "(geen onderwerp)"}${e.ai_summary ? " — " + e.ai_summary : ""}`;
      });
    emailContext = `\n\nEmail communicatie (laatste ${emailSummaries.length}):\n${emailSummaries.join("\n")}`;
  }

  let whatsappContext = "";
  if (ctx.whatsapp?.length) {
    const waMsgs = ctx.whatsapp
      .slice(0, 10)
      .map((w: any) => {
        const date = new Date(w.created_at).toLocaleDateString("nl-NL");
        const dir = w.direction === "inbound" ? "←" : "→";
        return `${dir} [${date}] ${(w.content || "").substring(0, 200)}`;
      });
    whatsappContext = `\n\nWhatsApp berichten (laatste ${waMsgs.length}):\n${waMsgs.join("\n")}`;
  }

  const hasCommunication = callContext || emailContext || whatsappContext;
  const instruction = hasCommunication
    ? `\n\nBELANGRIJK: Gebruik de informatie uit de telefoongesprekken, emails en WhatsApp-berichten om het projectplan zo specifiek mogelijk te maken. Verwijs naar concrete behoeften, afspraken, pijnpunten of wensen die in deze communicatie naar voren kwamen. Als er in gesprekken specifieke functionaliteiten of problemen zijn besproken, neem die op in de scope.`
    : "";

  return { callContext, emailContext, whatsappContext, instruction };
}

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
${ctx.enrichment?.tech_stack ? `Huidige tech: ${ctx.enrichment.tech_stack}` : ""}
${ctx.enrichment?.has_crm ? `Heeft al CRM: ${ctx.enrichment.has_crm}` : ""}
${ctx.enrichment?.has_erp ? `Heeft al ERP: ${ctx.enrichment.has_erp}` : ""}
${ctx.prospect?.fit_summary ? `Fit analyse: ${ctx.prospect.fit_summary}` : ""}
${ctx.deal?.description ? `Deal context: ${ctx.deal.description}` : ""}
${c.notes ? `Notities: ${c.notes}` : ""}
Contactpersoon: ${contact ? `${contact.first_name} ${contact.last_name}, ${contact.job_title || ""}` : "Onbekend"}`.trim();

  const planInfo = `
Projecttitel: ${plan.title || "Onbekend"}
${plan.totalAmount ? `Budget: €${plan.totalAmount}` : ""}
${plan.estimatedWeeks ? `Doorlooptijd: ${plan.estimatedWeeks} weken` : ""}`.trim();

  const { callContext, emailContext, whatsappContext, instruction: communicationInstruction } = buildCommunicationContext(ctx);
  const communicationContext = callContext + emailContext + whatsappContext;

  const previousContext = existing?.length
    ? `\n\nEerder gegenereerde secties van dit plan:\n${existing.map(s => `[${s.type}]: ${s.content.substring(0, 500)}`).join("\n")}`
    : "";

  const extra = extraInstructions ? `\n\nExtra instructies van de gebruiker: ${extraInstructions}` : "";

  const prompts: Record<string, string> = {
    description: `Schrijf een projectomschrijving voor het volgende project. Beschrijf het doel, de aanleiding en de gewenste situatie. Maak het specifiek voor deze klant — verwijs naar hun branche, huidige situatie en behoeften. Als er in gesprekken of berichten specifieke problemen of wensen zijn besproken, verwijs daar concreet naar als aanleiding. 2-3 alinea's in HTML.

${companyInfo}
${planInfo}${communicationContext}${communicationInstruction}${previousContext}${extra}`,

    scope: `Schrijf de functionele scope voor dit project. Beschrijf per module/onderdeel:
- Wat het doet (concreet, geen vage beschrijvingen)
- Welke functionaliteiten erin zitten (als <ul> lijst)
- Wat NIET inbegrepen is

Baseer de modules op wat deze klant nodig heeft gezien hun branche, situatie en wat er in telefoongesprekken en berichten is besproken. Als de klant in een gesprek specifieke functionaliteiten heeft genoemd of problemen heeft beschreven, neem die concreet op. Gebruik <h4> per module. Typische modules: Website/CMS, CRM, ERP, Klantportaal, Integraties, Dashboard, Automatiseringen — maar alleen wat relevant is.

${companyInfo}
${planInfo}${communicationContext}${communicationInstruction}${previousContext}${extra}`,

    timeline: `Maak een planning/fasering voor dit project. Gebruik een HTML tabel met kolommen: Fase, Omschrijving, Duur, Deliverables. Typische fasen: Kick-off & ontwerp, Ontwikkeling fase 1, Ontwikkeling fase 2, Testen & feedback, Oplevering & training. Maak het realistisch voor de geschatte doorlooptijd. Als er in gesprekken deadlines of urgentie is besproken, houd daar rekening mee.

${companyInfo}
${planInfo}${communicationContext}${previousContext}${extra}`,

    investment: `Schrijf de investering-sectie. Benoem:
- Het totaalbedrag (of "Nader te bepalen na scopebepaling" als er geen bedrag is)
- Het betaalschema als tabel
- Wat inbegrepen is (ontwikkeling, testen, oplevering, 30 dagen garantie)
- Wat apart geoffreerd wordt (hosting, onderhoud, meerwerk)
- Optioneel maandelijks abonnement voor hosting/support
- "Alle bedragen zijn exclusief 21% BTW"

${companyInfo}
${planInfo}
${plan.paymentStructure ? `Betaalschema: ${JSON.stringify(plan.paymentStructure)}` : "Betaalschema: 50% bij opstart, 50% bij oplevering"}${communicationContext}${previousContext}${extra}`,

    deliverables: `Maak een lijst van concrete op te leveren items voor dit project. Denk aan:
- Functionele applicatie (beschrijf kort)
- Broncode (repository)
- Technische documentatie
- Gebruikersdocumentatie / handleiding
- Testrapportage
- Hosting & deployment
- Training (X sessies)
- 30 dagen garantieperiode
Maak het specifiek voor wat in de scope staat. Als er in gesprekken specifieke deliverables zijn afgesproken, neem die op.

${companyInfo}
${planInfo}${communicationContext}${communicationInstruction}${previousContext}${extra}`,

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

    assumptions: `Schrijf de uitgangspunten en randvoorwaarden voor dit project. Maak ze specifiek voor deze klant en branche. Als er in gesprekken afspraken zijn gemaakt over aanlevering, beschikbaarheid of werkwijze, neem die als uitgangspunten op. Typische punten:
- Content aanlevering door klant
- Feedbacktermijnen
- Vast aanspreekpunt
- Toegang tot systemen
- Scope afbakening
- Beschikbaarheid voor afstemming
Maak het een <ul> lijst, 6-8 punten.

${companyInfo}
${planInfo}${communicationContext}${communicationInstruction}${previousContext}${extra}`,
  };

  return prompts[sectionType] || `Schrijf de sectie "${title}" voor het volgende projectplan:\n\n${companyInfo}\n${planInfo}${communicationContext}${previousContext}${extra}`;
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
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit bereikt. Probeer het over een minuut opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits op. Voeg credits toe in Lovable workspace instellingen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
