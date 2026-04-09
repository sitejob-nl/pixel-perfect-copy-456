import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Auth helper: extract user from JWT (optional for public actions) ──
async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data } = await supabase.auth.getUser(token);
  return data?.user || null;
}

// ── Model routing per demo category ──
// Websites → Gemini 3.1 Pro (best voor UI/visual design)
// Platforms/portals → Claude Opus 4.6 (best voor complexe dashboards)
const MODEL_MAP: Record<string, { provider: "gemini" | "claude"; model: string }> = {
  website: { provider: "gemini", model: "gemini-3.1-pro-preview" },
  platform: { provider: "claude", model: "claude-opus-4-6" },
  portal: { provider: "claude", model: "claude-opus-4-6" },
};

function getModelForCategory(category: string): { provider: "gemini" | "claude"; model: string } {
  return MODEL_MAP[category] || MODEL_MAP.website;
}

// ── Claude API call ──
async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  model = "claude-opus-4-6",
  maxTokens = 16000
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Claude API error:", res.status, err);
    throw new Error(`Claude API error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ── Gemini API call ──
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  model = "gemini-2.5-pro",
  maxTokens = 16000
): Promise<string> {
  if (!GOOGLE_GEMINI_API_KEY) {
    console.warn("No GOOGLE_GEMINI_API_KEY, falling back to Claude");
    return callClaude(systemPrompt, userPrompt, "claude-sonnet-4-6", maxTokens);
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Gemini API error:", res.status, err);
    // Fallback to Claude on Gemini failure
    console.warn("Gemini failed, falling back to Claude");
    return callClaude(systemPrompt, userPrompt, "claude-sonnet-4-6", maxTokens);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── Unified LLM call: routes to the right provider ──
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  category = "website",
  maxTokens = 16000
): Promise<{ text: string; model: string }> {
  const { provider, model } = getModelForCategory(category);

  const text = provider === "gemini"
    ? await callGemini(systemPrompt, userPrompt, model, maxTokens)
    : await callClaude(systemPrompt, userPrompt, model, maxTokens);

  return { text, model };
}

// ── Fetch template data from DB ──
async function getTemplateContext(demoType: string, industry?: string) {
  // Platform type config
  const { data: platformType } = await supabase
    .from("demo_platform_types")
    .select("*")
    .eq("id", demoType)
    .single();

  // Website type patterns (for website category)
  const { data: websiteTypes } = await supabase
    .from("demo_website_types")
    .select("*")
    .eq("id", demoType);

  // Industry modules
  let modules: any[] = [];
  if (industry) {
    const { data: industryModules } = await supabase
      .from("demo_industry_modules")
      .select("module_ids")
      .eq("demo_type", demoType)
      .eq("industry", industry);

    if (industryModules?.length) {
      const moduleIds = industryModules.flatMap((m: any) => m.module_ids || []);
      if (moduleIds.length) {
        const { data: dashboardModules } = await supabase
          .from("demo_dashboard_modules")
          .select("*")
          .in("id", moduleIds);
        modules = dashboardModules || [];
      }
    }
  }

  return { platformType, websiteType: websiteTypes?.[0] || null, modules };
}

// ── Build generation system prompt ──
function buildSystemPrompt(
  templateCtx: { platformType: any; websiteType: any; modules: any[] },
  branding: any,
  pageConfig: { title: string; slug: string; description: string }[]
): string {
  const { platformType, websiteType, modules } = templateCtx;
  const category = platformType?.categorie || "website";
  const primary = branding?.primary_color || "#1a56db";
  const secondary = branding?.secondary_color || "#f3f4f6";
  const accent = branding?.accent_color || "#dc2626";
  const images: any[] = branding?.images || [];
  const slug = (branding?.industry || "bedrijf").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  let prompt = `Je bent een award-winning webdesigner die websites en applicaties bouwt die eruitzien alsof ze tienduizenden euro's hebben gekost. Je output is production-ready HTML die direct als verkooptool wordt ingezet — de ontvanger moet denken "dit wil ik hebben, bel me nu".

ABSOLUTE REGELS:
- GEEN emoji's, nergens in de output
- GEEN lorem ipsum of "Lorem dolor sit amet" — alle tekst is realistisch en branche-specifiek
- GEEN stockfoto-placeholder teksten zoals "Uw tekst hier" of "[Afbeelding]" of "Placeholder"
- GEEN generieke AI-template look — elk ontwerp is uniek voor dit specifieke bedrijf
- Elke pagina moet minimaal 2000px aan verticale content hebben
- Toon: ${branding?.tone || "professioneel"}

TECHNISCHE BASIS:
- Volledig HTML document (<!DOCTYPE html> tot </html>)
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Tailwind config inline voor brand kleuren:
  <script>
  tailwindcss.config = {
    theme: {
      extend: {
        colors: {
          primary: { DEFAULT: '${primary}', light: '${primary}15' },
          secondary: { DEFAULT: '${secondary}' },
          accent: { DEFAULT: '${accent}' }
        },
        fontFamily: {
          sans: ['${branding?.font || "Inter"}', 'system-ui', 'sans-serif']
        }
      }
    }
  }
  </script>
- Lucide icons: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  Gebruik: <i data-lucide="phone"></i> en onderaan voor </body>: <script>lucide.createIcons()</script>
${branding?.font ? `- Google Font: <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(branding.font)}:wght@400;500;600;700&display=swap" rel="stylesheet">` : "- Google Font: <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">"}
- Volledig responsive (mobile-first: sm: md: lg: breakpoints)
- Mobile hamburger menu met werkende toggle (inline JS)

`;

  // Image instructions
  if (images.length > 0) {
    prompt += `AFBEELDINGEN — gebruik deze ECHTE foto's van het bedrijf:
${images.map((img: any) => `- ${img.url} (${img.category}: ${img.alt || "foto"})`).join("\n")}

Gebruik <img> tags met class="w-full h-full object-cover" en een bg-gray-100 fallback.
Match images op context: hero-categorie voor hero secties, team voor over-ons pagina, product voor diensten.
Als er niet genoeg afbeeldingen zijn voor een sectie, gebruik dan https://picsum.photos/seed/${slug}-extra/{breedte}/{hoogte} als aanvulling.

`;
  } else {
    prompt += `AFBEELDINGEN — gebruik picsum.photos met consistente seeds:
- Hero: <img src="https://picsum.photos/seed/${slug}-hero/1400/600" class="w-full h-full object-cover">
- Team: <img src="https://picsum.photos/seed/${slug}-team/800/600" class="w-full h-full object-cover">
- Producten/diensten: /seed/${slug}-1/600/400, /seed/${slug}-2/600/400, /seed/${slug}-3/600/400
- Sfeer/achtergrond: /seed/${slug}-bg/1920/1080
Zelfde seed = zelfde foto, dus gebruik unieke seeds per afbeelding.

`;
  }

  prompt += `KLEURGEBRUIK:
De kleuren primary (${primary}), secondary (${secondary}) en accent (${accent}) komen van het bedrijf.
- Primary: CTA buttons, links, actieve navigatie, section accenten, hover states
- Secondary: lichte achtergrond secties, card borders, subtiele gebieden
- Accent: speciale highlights, badges, urgente CTAs
- Gebruik Tailwind classes: bg-primary, text-primary, bg-primary-light, border-accent, hover:bg-primary/90
- Zorg voor contrast: witte tekst op donkere primary achtergrond, donkere tekst op lichte backgrounds

VISUELE KWALITEIT:
- Genereuze whitespace: secties met py-20 md:py-28 lg:py-32
- Visuele hierarchie: H1 = text-4xl md:text-5xl lg:text-6xl font-bold, H2 = text-2xl md:text-3xl font-semibold, body = text-base md:text-lg text-gray-600
- Subtiele depth: shadow-sm op kaarten, shadow-lg op hover (transition-shadow duration-300)
- Smooth hover transitions: transition-all duration-300 op alle interactieve elementen
- Gradient accenten: bg-gradient-to-r from-primary to-accent voor hero overlays of CTA secties

ANIMATIES (inline <script> onderaan, voor lucide.createIcons()):
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('animate-in'); observer.unobserve(e.target); }});
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

Voeg CSS toe in <style>:
.fade-up { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
.fade-up.animate-in { opacity: 1; transform: translateY(0); }

Voeg class="fade-up" toe aan secties en kaarten.

NAVIGATIE:
- Sticky header: <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
- Links werken via: onclick="window.parent.postMessage({type:'demo-nav',page:'SLUG'},'*');return false;"
- Beschikbare pagina's: ${pageConfig.map((p) => `${p.title} (slug: ${p.slug})`).join(", ")}
- Active state: text-primary font-semibold op de huidige pagina link
`;

  // Category-specific instructions
  if (category === "platform") {
    prompt += `
DASHBOARD DESIGN — PREMIUM MAATWERK:
- Dit is een applicatie-interface, GEEN publieke website
- Sidebar: bg-slate-900 text-white, 260px breed, fixed left
  - Bovenaan: bedrijfsnaam in font-bold text-lg
  - Navigatie: Lucide iconen + labels, active state = bg-primary/15 text-primary rounded-lg
  - Onderaan: user avatar (bg-primary text-white rounded-full w-8 h-8 met initialen) + naam + rol
- Top bar: bg-white border-b, zoekbalk, notification bell met rode badge, user dropdown
- KPI kaarten: grid grid-cols-4, elk met border-l-4 border-primary (varieer kleuren per KPI), groot nummer text-3xl font-bold, trend pijl + percentage, korte label
- Data tables: bg-white rounded-xl shadow-sm, header bg-gray-50, hover:bg-gray-50 op rijen, status badges met bg-green-100 text-green-800 / bg-amber-100 text-amber-800 / bg-red-100 text-red-800
- Charts: inline SVG bar charts en line charts met primary kleur, axis labels, grid lines
- Alle data REALISTISCH en branche-specifiek: Nederlandse namen, echte bedragen (EUR 1.234,56), datums (15 jan 2026), Nederlandse steden
- Als het een installatiebedrijf is: werkbonnen, projecten, klanten. Accountant: facturen, dossiers. Etc.
`;
  } else if (category === "portal") {
    prompt += `
PORTAAL DESIGN — PREMIUM MAATWERK:
- Self-service klantportaal met clean interface
- Header navigatie met bedrijfslogo/naam, tabs voor secties, user dropdown rechts
- Dashboard: welkomstbericht met klantnaam, statuskaarten, recente activiteit
- Overzichtelijke content: documentenlijst, formulieren, berichtensysteem
- Primary kleur als accent door het hele portaal
- Alle data realistisch en in het Nederlands
`;
  } else {
    prompt += `
WEBSITE DESIGN — PREMIUM MAATWERK:
- Hero: full-width, min-h-[80vh], achtergrondafbeelding met gradient overlay (from-black/60 to-transparent), grote witte kop text-5xl md:text-6xl font-bold, korte subkop, prominente CTA button bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-lg
- Social proof: klantlogo's in grayscale rij, testimonials met naam + functie + bedrijf, review sterren
- Diensten: grid grid-cols-1 md:grid-cols-3 gap-8, kaarten met Lucide icoon, titel, beschrijving, hover:shadow-lg transition
- Statistieken: bg-primary text-white py-20, grote nummers text-5xl font-bold met counter animatie
- CTA secties: minimaal 2 per pagina op wisselende achtergronden
- Footer: bg-gray-900 text-white, 4 kolommen (over, diensten, contact, social), copyright onderaan

BRANCHE-INTELLIGENTIE:
Analyseer de branche "${branding?.industry || "onbekend"}" en diensten "${branding?.services || "onbekend"}" en bouw automatisch de juiste elementen:

- Producten/retail: product grid met prijzen, "In winkelwagen" buttons, categorie filters, "Populair" badges
- Installateur/zonnepanelen/financieel: interactieve calculator sectie met range sliders en live berekening (werkende inline JS)
- Restaurant/catering/bakkerij: menukaart met categorien en prijzen, reserveringswidget, openingstijden
- Bouw/installatie/techniek: projecten portfolio grid, certificeringen/keurmerken rij, grote statistieken
- Advocaat/accountant/consultant: expertisegebieden kaarten, team grid met specialisaties, kennisbank preview
- Zorg/beauty/welzijn: behandelingen grid met prijzen, online booking CTA, warme zachte uitstraling
- SaaS/tech: feature grid, pricing table, "Start gratis" CTA, integratie logo's

Bouw interactieve elementen WERKEND met inline JavaScript: calculators, tabbladen, accordeons, formulieren.
`;
  }

  // Add platform type specific prompt from DB
  if (platformType?.generation_prompt) {
    prompt += `\nSPECIFIEKE INSTRUCTIES:\n${platformType.generation_prompt}\n`;
  }

  // Add UI guidelines from DB
  if (platformType?.ui_guidelines) {
    const guidelines = typeof platformType.ui_guidelines === "string"
      ? platformType.ui_guidelines
      : JSON.stringify(platformType.ui_guidelines, null, 2);
    prompt += `\nUI RICHTLIJNEN:\n${guidelines}\n`;
  }

  // Add website type patterns from DB
  if (websiteType) {
    const parts: string[] = [];
    if (websiteType.secties?.length) parts.push(`Vereiste secties: ${websiteType.secties.join(", ")}`);
    if (websiteType.must_have?.length) parts.push(`Must-have: ${websiteType.must_have.join(", ")}`);
    if (websiteType.conversion_elements?.length) parts.push(`Conversie: ${websiteType.conversion_elements.join(", ")}`);
    if (websiteType.ui_patterns?.length) parts.push(`UI patronen: ${websiteType.ui_patterns.join(", ")}`);
    if (parts.length) prompt += `\nWEBSITE TYPE VEREISTEN:\n${parts.join("\n")}\n`;
  }

  // Add dashboard modules from DB
  if (modules.length) {
    prompt += `\nBESCHIKBARE DASHBOARD MODULES:\n`;
    for (const mod of modules) {
      prompt += `- ${mod.naam}: ${mod.beschrijving || ""}`;
      if (mod.kpis?.length) prompt += ` | KPIs: ${mod.kpis.join(", ")}`;
      if (mod.acties?.length) prompt += ` | Acties: ${mod.acties.join(", ")}`;
      prompt += "\n";
    }
  }

  return prompt;
}

// ── ACTION: generate ──
async function handleGenerate(params: any) {
  const {
    company_name,
    website_url,
    demo_type = "website",
    model,
    organization_id,
    page_config = [],
    extra_instructions,
    branding = {},
    contact_id,
  } = params;

  if (!organization_id || !company_name) {
    return json({ error: "organization_id en company_name zijn verplicht" }, 400);
  }

  // Create demo record
  const slug = `${company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
  const { data: demo, error: demoErr } = await supabase
    .from("demos")
    .insert({
      organization_id,
      title: `${company_name} — ${demo_type}`,
      company_name,
      demo_type,
      model_used: model || "auto",
      branding,
      generation_status: "generating",
      generation_started_at: new Date().toISOString(),
      is_public: true,
      public_slug: slug,
      is_multipage: page_config.length > 1,
      page_config,
      pages: page_config,
      share_settings: { allow_feedback: true },
      contact_id: contact_id || null,
    })
    .select()
    .single();

  if (demoErr) {
    console.error("Failed to create demo:", demoErr);
    return json({ error: "Kon demo niet aanmaken: " + demoErr.message }, 500);
  }

  // Create demo_pages rows with pending status
  const pageRows = page_config.map((p: any, i: number) => ({
    demo_id: demo.id,
    slug: p.slug,
    title: p.title,
    description: p.description || "",
    generation_status: "pending",
    sort_order: i,
    is_active: true,
  }));

  if (pageRows.length) {
    await supabase.from("demo_pages").insert(pageRows);
  }

  // Fetch template context from DB
  const templateCtx = await getTemplateContext(demo_type, branding.industry);
  const systemPrompt = buildSystemPrompt(templateCtx, branding, page_config);

  // Determine model routing based on category
  const category = templateCtx.platformType?.categorie || "website";
  const autoModel = getModelForCategory(category);
  console.log(`Demo generation: type=${demo_type}, category=${category}, provider=${autoModel.provider}, model=${autoModel.model}`);

  // Update model_used with the actual model
  await supabase.from("demos").update({ model_used: autoModel.model }).eq("id", demo.id);

  // Return demo_id immediately — pages generate in background
  // The frontend polls demo_pages every 3 seconds to track progress
  const backgroundTask = async () => {
    const generatedPages: any[] = [];
    const startTime = Date.now();
    let sharedHeader = "";
    let sharedFooter = "";
    const images: any[] = branding.images || [];

    for (const page of page_config) {
      await supabase
        .from("demo_pages")
        .update({ generation_status: "generating" })
        .eq("demo_id", demo.id)
        .eq("slug", page.slug);

      // Match images to this page's context
      const pageSlugLower = page.slug.toLowerCase();
      const isHome = pageSlugLower === "home" || pageSlugLower === "index";
      const isAbout = pageSlugLower.includes("over") || pageSlugLower.includes("about") || pageSlugLower.includes("team");
      const isContact = pageSlugLower.includes("contact");
      const isServices = pageSlugLower.includes("dienst") || pageSlugLower.includes("service") || pageSlugLower.includes("product");

      let imageHint = "";
      if (images.length > 0) {
        const heroImgs = images.filter((i: any) => i.category === "hero");
        const teamImgs = images.filter((i: any) => i.category === "team");
        const productImgs = images.filter((i: any) => i.category === "product" || i.category === "gallery");

        if (isHome && heroImgs.length) imageHint = `Gebruik voor de hero sectie: ${heroImgs[0].url}`;
        else if (isAbout && teamImgs.length) imageHint = `Gebruik voor team foto's: ${teamImgs.map((i: any) => i.url).join(", ")}`;
        else if (isServices && productImgs.length) imageHint = `Gebruik voor diensten/producten: ${productImgs.map((i: any) => i.url).join(", ")}`;
      }

      const userPrompt = `Genereer de "${page.title}" pagina voor ${company_name}.

OVER DIT BEDRIJF:
- Bedrijfsnaam: ${company_name}
- Branche: ${branding.industry || "onbekend"}
- Locatie: ${branding.location || "Nederland"}
- Diensten: ${branding.services || "niet opgegeven"}
- USP's: ${branding.usps || "niet opgegeven"}
- Beschrijving: ${branding.description || "niet opgegeven"}
- Doelgroep: ${branding.target_audience || "niet opgegeven"}
${website_url ? `- Huidige website: ${website_url}` : ""}

DEZE PAGINA: ${page.description || page.title}
${imageHint ? `\nAFBEELDINGEN VOOR DEZE PAGINA:\n${imageHint}` : ""}
${isHome ? "\nDit is de HOMEPAGE — maak maximale indruk. Hero sectie moet adembenemend zijn. Voeg social proof, diensten overzicht, statistieken en een sterke CTA toe." : ""}
${isContact ? "\nVoeg een contactformulier toe (naam, email, telefoon, bericht velden met inline styling), adresgegevens met Lucide iconen (map-pin, phone, mail), en openingstijden als relevant." : ""}
${sharedHeader ? `\nGEBRUIK EXACT DEZE HEADER (kopieer letterlijk, pas alleen de active state aan voor "${page.title}"):\n${sharedHeader}` : ""}
${sharedFooter ? `\nGEBRUIK EXACT DEZE FOOTER (kopieer letterlijk):\n${sharedFooter}` : ""}
${extra_instructions ? `\nEXTRA INSTRUCTIES: ${extra_instructions}` : ""}

Genereer ALLEEN de volledige HTML code. Begin met <!DOCTYPE html> en eindig met </html>. Geen uitleg, geen markdown.`;

      try {
        const { text: html } = await callLLM(systemPrompt, userPrompt, category);

        let cleanHtml = html
          .replace(/^```html?\n?/i, "")
          .replace(/\n?```$/i, "")
          .trim();

        if (cleanHtml.startsWith("```")) {
          cleanHtml = cleanHtml.replace(/^```[^\n]*\n/, "").replace(/\n```$/, "").trim();
        }

        // Extract shared header/footer from first page for consistency
        if (!sharedHeader && cleanHtml) {
          const headerMatch = cleanHtml.match(/<header[\s\S]*?<\/header>/i);
          const footerMatch = cleanHtml.match(/<footer[\s\S]*?<\/footer>/i);
          if (headerMatch) sharedHeader = headerMatch[0];
          if (footerMatch) sharedFooter = footerMatch[0];
        }

        await supabase
          .from("demo_pages")
          .update({ html_content: cleanHtml, generation_status: "completed" })
          .eq("demo_id", demo.id)
          .eq("slug", page.slug);

        generatedPages.push({ slug: page.slug, html_content: cleanHtml });

        // Update demo status after each page so frontend can detect completion
        const allDone = generatedPages.length === page_config.length;
        if (allDone || generatedPages.length === 1) {
          await supabase.from("demos").update({
            generation_status: allDone ? "completed" : "generating",
            demo_html: generatedPages[0]?.html_content || null,
            ...(allDone ? { generation_duration_seconds: Math.round((Date.now() - startTime) / 1000) } : {}),
          }).eq("id", demo.id);
        }
      } catch (err) {
        console.error(`Failed to generate page ${page.slug}:`, err);
        await supabase
          .from("demo_pages")
          .update({ generation_status: "failed" })
          .eq("demo_id", demo.id)
          .eq("slug", page.slug);
      }
    }

    // Final status update
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    const firstPageHtml = generatedPages[0]?.html_content || "";

    await supabase
      .from("demos")
      .update({
        generation_status: generatedPages.length > 0 ? "completed" : "failed",
        generation_duration_seconds: durationSeconds,
        demo_html: firstPageHtml || null,
        generation_error: generatedPages.length === page_config.length
          ? null
          : `${page_config.length - generatedPages.length} pagina('s) mislukt`,
      })
      .eq("id", demo.id);

    if (firstPageHtml) {
      await supabase.from("demo_versions").insert({
        demo_id: demo.id,
        organization_id,
        version_number: 1,
        html_content: firstPageHtml,
        change_description: "Initiële generatie",
        model_used: autoModel.model,
      });
    }
  };

  // Run generation in background — response returns immediately
  // EdgeRuntime.waitUntil keeps the function alive after responding
  (globalThis as any).EdgeRuntime?.waitUntil?.(backgroundTask()) ?? backgroundTask();

  return json({
    demo_id: demo.id,
    id: demo.id,
    public_slug: slug,
    is_public: true,
    generation_status: "generating",
  });
}

// ── ACTION: edit ──
async function handleEdit(params: any) {
  const { demo_id, instruction, page_slug } = params;

  if (!demo_id || !instruction) {
    return json({ error: "demo_id en instruction zijn verplicht" }, 400);
  }

  // Fetch current demo and page
  const { data: demo } = await supabase
    .from("demos")
    .select("*")
    .eq("id", demo_id)
    .single();

  if (!demo) return json({ error: "Demo niet gevonden" }, 404);

  let currentHtml: string;
  let targetSlug = page_slug;

  if (page_slug) {
    const { data: page } = await supabase
      .from("demo_pages")
      .select("*")
      .eq("demo_id", demo_id)
      .eq("slug", page_slug)
      .single();
    currentHtml = page?.html_content || demo.demo_html || "";
  } else {
    // Edit the first page or demo_html
    const { data: pages } = await supabase
      .from("demo_pages")
      .select("*")
      .eq("demo_id", demo_id)
      .eq("is_active", true)
      .order("sort_order")
      .limit(1);
    currentHtml = pages?.[0]?.html_content || demo.demo_html || "";
    targetSlug = pages?.[0]?.slug;
  }

  const systemPrompt = `Je bent een expert webdesigner. Je krijgt een bestaande HTML pagina en een instructie om deze aan te passen.
Pas de HTML aan volgens de instructie. Behoud de bestaande structuur en stijl tenzij de instructie anders aangeeft.
Retourneer ALLEEN de volledige aangepaste HTML code, geen uitleg of markdown. Begin met <!DOCTYPE html> en eindig met </html>.`;

  const userPrompt = `HUIDIGE HTML:
${currentHtml}

INSTRUCTIE: ${instruction}

Pas de HTML aan volgens bovenstaande instructie. Retourneer de volledige aangepaste HTML.`;

  // Route edit to same model as the demo's category
  const { data: platformType } = await supabase
    .from("demo_platform_types")
    .select("categorie")
    .eq("id", demo.demo_type)
    .single();
  const category = platformType?.categorie || "website";
  const { text: newHtml, model: usedModel } = await callLLM(systemPrompt, userPrompt, category);

  const cleanHtml = newHtml
    .replace(/^```html?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  // Update page
  if (targetSlug) {
    await supabase
      .from("demo_pages")
      .update({ html_content: cleanHtml })
      .eq("demo_id", demo_id)
      .eq("slug", targetSlug);
  }

  // Update demo_html if it's the first page
  await supabase
    .from("demos")
    .update({ demo_html: cleanHtml })
    .eq("id", demo_id);

  // Get current version count
  const { count } = await supabase
    .from("demo_versions")
    .select("*", { count: "exact", head: true })
    .eq("demo_id", demo_id);

  // Create new version
  await supabase.from("demo_versions").insert({
    demo_id,
    organization_id: demo.organization_id,
    version_number: (count || 0) + 1,
    html_content: cleanHtml,
    change_description: instruction,
    model_used: usedModel,
    chat_history: [{ role: "user", content: instruction }],
  });

  return json({ success: true, html: cleanHtml, page_slug: targetSlug, model: usedModel });
}

// ── ACTION: crawl-start ──
async function handleCrawlStart(params: any) {
  const { url, organization_id, page_limit = 15, depth = 3 } = params;

  if (!url) return json({ error: "url is verplicht" }, 400);

  if (!FIRECRAWL_API_KEY) {
    // Fallback: single-page fetch + AI analysis
    return await handleAnalyze({ url, organization_id });
  }

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/crawl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        limit: page_limit,
        maxDepth: depth,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Firecrawl error:", err);
      // Fallback to simple fetch
      return await handleAnalyze({ url, organization_id });
    }

    const data = await res.json();
    const crawlJobId = data.id;

    // Store crawl job reference
    await supabase.from("crawl_jobs").insert({
      organization_id,
      url,
      cf_job_id: crawlJobId,
      status: "crawling",
      page_limit: page_limit,
      depth,
    }).select().single().catch(() => null);

    return json({ crawl_job_id: crawlJobId, status: "crawling", page_limit });
  } catch (err) {
    console.error("Crawl start error:", err);
    return await handleAnalyze({ url, organization_id });
  }
}

// ── ACTION: crawl-status ──
async function handleCrawlStatus(params: any) {
  const { crawl_job_id } = params;

  if (!crawl_job_id || !FIRECRAWL_API_KEY) {
    return json({ status: "failed", error: "Geen crawl job ID of API key" }, 400);
  }

  try {
    const res = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawl_job_id}`, {
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
    });

    if (!res.ok) {
      return json({ status: "failed", error: "Kon crawl status niet ophalen" });
    }

    const data = await res.json();

    if (data.status === "completed" && data.data?.length) {
      // Extract image URLs directly from Firecrawl response
      const rawImages: string[] = [];
      for (const page of data.data.slice(0, 10)) {
        if (page.metadata?.ogImage) rawImages.push(page.metadata.ogImage);
        for (const match of (page.markdown || "").matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
          if (match[2]) rawImages.push(match[2]);
        }
      }
      const crawledImages = [...new Set(rawImages)].filter((url: string) =>
        url.startsWith("http") &&
        !url.includes("tracking") && !url.includes("pixel") && !url.includes("favicon") &&
        !url.includes("data:") && !url.includes("1x1") && !url.endsWith(".svg") &&
        !url.includes("wp-emoji") && !url.includes("gravatar")
      ).slice(0, 20);

      // Analyze the crawled content with AI
      const pagesContent = data.data
        .slice(0, 10)
        .map((p: any) => `URL: ${p.metadata?.url || "unknown"}\n${(p.markdown || "").substring(0, 2000)}`)
        .join("\n\n---\n\n");

      const analysisPrompt = `Analyseer de volgende website content en extraheer de bedrijfsinformatie.

${pagesContent}

${crawledImages.length > 0 ? `De volgende afbeelding-URLs zijn gevonden op de website:
${crawledImages.join("\n")}

Categoriseer de meest bruikbare afbeeldingen (max 10). Sla tracking pixels, iconen en kleine decoratieve elementen over.
Categorieën: hero (grote banner/header afbeelding), logo (bedrijfslogo), team (mensen/team foto's), product (producten/diensten), gallery (portfolio/projecten), background (sfeerbeelden).
` : ""}

Retourneer een JSON object met:
{
  "company_name": "naam van het bedrijf",
  "industry": "branche",
  "location": "locatie/stad",
  "description": "korte beschrijving van het bedrijf (max 200 woorden)",
  "services": ["dienst 1", "dienst 2"],
  "usps": ["usp 1", "usp 2"],
  "target_audience": "doelgroep beschrijving",
  "primary_color": "#hexkleur (hoofdkleur van de website)",
  "secondary_color": "#hexkleur",
  "accent_color": "#hexkleur",
  "font": "naam van het hoofdfont als herkenbaar",
  "nav_items": [{"label": "Menu item", "description": "beschrijving"}],
  "images": [{"url": "https://...", "category": "hero|logo|team|product|gallery|background", "alt": "korte beschrijving"}]
}

Retourneer ALLEEN het JSON object, geen markdown of uitleg.`;

      const analysisText = await callClaude(
        "Je bent een website-analist. Extraheer bedrijfsinformatie en categoriseer afbeeldingen. Retourneer alleen valid JSON.",
        analysisPrompt,
        undefined,
        4000
      );

      let analysis;
      try {
        const cleaned = analysisText.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
        analysis = JSON.parse(cleaned);
      } catch {
        analysis = { company_name: "Onbekend", error: "Kon analyse niet parsen" };
      }

      // Ensure images are always present (fallback to raw crawled images)
      if (!analysis.images?.length && crawledImages.length) {
        analysis.images = crawledImages.slice(0, 10).map((url: string) => ({
          url, category: "gallery", alt: "Website afbeelding",
        }));
      }

      return json({
        status: "completed",
        pages_found: data.data.length,
        page_limit: data.total || data.data.length,
        analysis,
      });
    }

    return json({
      status: data.status || "crawling",
      pages_found: data.data?.length || data.completed || 0,
      page_limit: data.total || 15,
    });
  } catch (err) {
    console.error("Crawl status error:", err);
    return json({ status: "failed", error: "Crawl status check mislukt" });
  }
}

// ── ACTION: crawl-analyze ──
async function handleCrawlAnalyze(params: any) {
  // Same as crawl-status but forces analysis
  return handleCrawlStatus(params);
}

// ── ACTION: analyze (single-page fallback) ──
async function handleAnalyze(params: any) {
  const { url } = params;

  if (!url) return json({ error: "url is verplicht" }, 400);

  // Strategy 1: Use Firecrawl /v1/scrape (headless browser, beats Cloudflare)
  if (FIRECRAWL_API_KEY) {
    try {
      console.log("Analyze: trying Firecrawl scrape for", url);
      const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
        }),
      });

      if (scrapeRes.ok) {
        const scrapeData = await scrapeRes.json();
        const markdown = scrapeData.data?.markdown || "";
        const metadata = scrapeData.data?.metadata || {};

        if (markdown.length > 100) {
          // Extract images from markdown
          const rawImages: string[] = [];
          if (metadata.ogImage) rawImages.push(metadata.ogImage);
          for (const match of markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
            if (match[2]) rawImages.push(match[2]);
          }
          const crawledImages = [...new Set(rawImages)].filter((u: string) =>
            u.startsWith("http") && !u.includes("pixel") && !u.includes("favicon") &&
            !u.includes("data:") && !u.endsWith(".svg") && !u.includes("1x1")
          ).slice(0, 20);

          const analysisPrompt = `Analyseer de volgende website content van ${url} en extraheer de bedrijfsinformatie.

${markdown.substring(0, 10000)}

${crawledImages.length > 0 ? `Gevonden afbeeldingen:\n${crawledImages.join("\n")}\n\nCategoriseer de meest bruikbare (max 10): hero, logo, team, product, gallery, background.` : ""}

Retourneer een JSON object met:
{
  "company_name": "naam",
  "industry": "branche",
  "location": "locatie",
  "description": "korte beschrijving (max 200 woorden)",
  "services": ["dienst 1", "dienst 2"],
  "usps": ["usp 1", "usp 2"],
  "target_audience": "doelgroep",
  "primary_color": "#hexkleur (hoofdkleur van de website)",
  "secondary_color": "#hexkleur",
  "accent_color": "#hexkleur",
  "font": "font naam als herkenbaar",
  "nav_items": [{"label": "Menu item", "description": "beschrijving"}],
  "images": [{"url": "https://...", "category": "hero|logo|team|product|gallery|background", "alt": "beschrijving"}]
}

Retourneer ALLEEN valid JSON.`;

          const text = await callClaude(
            "Je bent een website-analist. Extraheer bedrijfsinformatie en categoriseer afbeeldingen. Retourneer alleen valid JSON.",
            analysisPrompt,
            undefined,
            4000
          );

          let analysis;
          try {
            const cleaned = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
            analysis = JSON.parse(cleaned);
          } catch {
            analysis = { company_name: metadata.title || "", error: "Kon analyse niet parsen" };
          }

          if (!analysis.images?.length && crawledImages.length) {
            analysis.images = crawledImages.slice(0, 10).map((u: string) => ({
              url: u, category: "gallery", alt: "Website afbeelding",
            }));
          }

          return json({ status: "completed", analysis, pages_found: 1, page_limit: 1 });
        }
      } else {
        const errText = await scrapeRes.text();
        console.error("Firecrawl scrape failed:", scrapeRes.status, errText);
        return json({ status: "completed", analysis: { company_name: "", error: `Firecrawl scrape failed: ${scrapeRes.status} - ${errText.substring(0, 200)}` } });
      }
    } catch (err: any) {
      console.error("Firecrawl scrape error:", err);
      return json({ status: "completed", analysis: { company_name: "", error: `Firecrawl scrape exception: ${err.message}` } });
    }
  }

  // Strategy 2: Direct fetch (works for sites without Cloudflare)
  try {
    console.log("Analyze: trying direct fetch for", url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return json({
        status: "completed",
        analysis: { company_name: "", error: "Kon website niet bereiken (HTTP " + res.status + ")" },
      });
    }

    const html = await res.text();
    const truncated = html.substring(0, 15000);

    const analysisPrompt = `Analyseer de volgende HTML van ${url} en extraheer de bedrijfsinformatie.

${truncated}

Retourneer een JSON object met:
{
  "company_name": "naam",
  "industry": "branche",
  "location": "locatie",
  "description": "korte beschrijving",
  "services": ["dienst 1", "dienst 2"],
  "usps": ["usp 1"],
  "target_audience": "doelgroep",
  "primary_color": "#hex",
  "secondary_color": "#hex",
  "accent_color": "#hex",
  "font": "font naam",
  "nav_items": [{"label": "item", "description": ""}],
  "images": [{"url": "https://...", "category": "hero|logo|team|product|gallery|background", "alt": "beschrijving"}]
}

Retourneer ALLEEN valid JSON.`;

    const text = await callClaude(
      "Je bent een website-analist. Extraheer bedrijfsinformatie uit HTML. Retourneer alleen valid JSON.",
      analysisPrompt,
      undefined,
      4000
    );

    let analysis;
    try {
      const cleaned = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { company_name: "", error: "Kon website niet analyseren" };
    }

    return json({ status: "completed", analysis, pages_found: 1, page_limit: 1 });
  } catch (err) {
    console.error("Direct fetch error:", err);
    return json({
      status: "completed",
      analysis: { company_name: "", error: "Website niet bereikbaar. Vul de gegevens handmatig in." },
    });
  }
}

// ── ACTION: feedback ──
async function handleFeedback(params: any) {
  const { demo_id, page_slug, feedback_type, name, email, message } = params;

  if (!demo_id || !feedback_type) {
    return json({ error: "demo_id en feedback_type zijn verplicht" }, 400);
  }

  const { error } = await supabase.from("demo_feedback").insert({
    demo_id,
    page_slug: page_slug || null,
    feedback_type,
    visitor_name: name || null,
    visitor_email: email || null,
    message: message || null,
  });

  if (error) {
    console.error("Feedback insert error:", error);
    return json({ error: "Kon feedback niet opslaan" }, 500);
  }

  return json({ success: true });
}

// ── ACTION: track-view ──
async function handleTrackView(params: any) {
  const { demo_id, referrer } = params;

  if (!demo_id) return json({ error: "demo_id is verplicht" }, 400);

  // Insert view record
  await supabase.from("demo_views").insert({
    demo_id,
    referrer: referrer || null,
    visitor_hash: crypto.randomUUID().substring(0, 8),
  });

  // Increment view counter on demos table
  const { data: demo } = await supabase
    .from("demos")
    .select("views")
    .eq("id", demo_id)
    .single();

  await supabase
    .from("demos")
    .update({
      views: (demo?.views || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq("id", demo_id);

  return json({ success: true });
}

// ── ACTION: verify-password ──
async function handleVerifyPassword(params: any) {
  const { demo_id, password } = params;

  if (!demo_id || !password) {
    return json({ error: "demo_id en password zijn verplicht" }, 400);
  }

  const { data: demo } = await supabase
    .from("demos")
    .select("password_hash")
    .eq("id", demo_id)
    .single();

  if (!demo) return json({ error: "Demo niet gevonden" }, 404);

  // For now: direct comparison (existing demos stored plaintext in password_hash)
  // TODO: migrate to bcrypt hashing
  const valid = demo.password_hash === password;

  return json({ valid });
}

// ── Main router ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    // Actions that require authentication
    const protectedActions = ["generate", "edit"];
    if (protectedActions.includes(action)) {
      const user = await getUser(req);
      if (!user) {
        return json({ error: "Niet geautoriseerd" }, 401);
      }
    }

    switch (action) {
      case "generate":
        return await handleGenerate(params);
      case "edit":
        return await handleEdit(params);
      case "crawl-start":
        return await handleCrawlStart(params);
      case "crawl-status":
        return await handleCrawlStatus(params);
      case "crawl-analyze":
        return await handleCrawlAnalyze(params);
      case "analyze":
        return await handleAnalyze(params);
      case "feedback":
        return await handleFeedback(params);
      case "track-view":
        return await handleTrackView(params);
      case "verify-password":
        return await handleVerifyPassword(params);
      case "debug-scrape": {
        // Temporary debug: test Firecrawl scrape directly and return raw response
        const { url: debugUrl } = params;
        if (!FIRECRAWL_API_KEY) return json({ error: "No FIRECRAWL_API_KEY" });
        try {
          const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
            body: JSON.stringify({ url: debugUrl, formats: ["markdown"] }),
          });
          const status = r.status;
          const body = await r.text();
          return json({ firecrawl_status: status, body_length: body.length, body_preview: body.substring(0, 1000) });
        } catch (e: any) {
          return json({ error: e.message });
        }
      }
      default:
        return json({ error: `Onbekende actie: ${action}` }, 400);
    }
  } catch (err) {
    console.error("demo-service error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Interne fout" },
      500
    );
  }
});
