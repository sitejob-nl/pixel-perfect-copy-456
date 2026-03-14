import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent SiteJob AI — een intelligente assistent ingebouwd in het SiteJob CRM/ERP platform.

Je kunt helpen met:
- Overzichten en samenvattingen van het dashboard, pipeline, projecten en klanten
- Antwoorden op vragen over bedrijfsdata
- Actiepunten en suggesties genereren
- E-mails opstellen voor follow-ups
- Lead scoring uitleg
- Meeting voorbereidingen

Je antwoordt altijd in het Nederlands tenzij anders gevraagd.
Wees beknopt, concreet en actiegericht. Gebruik markdown voor formatting.
Als je context over de organisatie krijgt, gebruik die dan in je antwoorden.`;

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
    const { messages, conversation_id, action, entity_type, entity_id, org_id } = await req.json();

    // Get org_id from user membership
    let orgId = org_id;
    if (!orgId) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .single();
      orgId = membership?.organization_id;
    }

    // Handle specific actions (non-streaming)
    if (action === "summarize" && entity_type && entity_id) {
      return await handleSummarize(supabase, orgId, entity_type, entity_id, userId);
    }

    if (action === "suggest_actions") {
      return await handleSuggestActions(supabase, orgId);
    }

    if (action === "analyze_call") {
      return await handleAnalyzeCall(supabase, orgId, entity_id);
    }

    if (action === "smart_digest") {
      return await handleSmartDigest(supabase, orgId);
    }

    // Default: streaming chat
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch org context for enriching
    let contextStr = "";
    if (orgId) {
      try {
        const { data: digest } = await supabase.rpc("fn_daily_digest", { p_org_id: orgId });
        if (digest) {
          contextStr = `\n\nHuidige organisatie context:\n${JSON.stringify(digest, null, 2)}`;
        }
      } catch { /* ignore */ }
    }

    const enrichedMessages = [
      { role: "system", content: SYSTEM_PROMPT + contextStr },
      ...(messages || []),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: enrichedMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits op, voeg credits toe aan je workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway fout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-sitejob error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(prompt: string, systemPrompt?: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt || SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`AI error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAIWithTools(prompt: string, tools: any[], toolChoice: any) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      tools,
      tool_choice: toolChoice,
    }),
  });

  if (!response.ok) throw new Error(`AI error: ${response.status}`);
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    return JSON.parse(toolCall.function.arguments);
  }
  return null;
}

async function handleSummarize(supabase: any, orgId: string, entityType: string, entityId: string, userId: string) {
  try {
    const { data: context } = await supabase.rpc("fn_get_entity_context", {
      p_entity_type: entityType,
      p_entity_id: entityId,
    });

    const summary = await callAI(
      `Maak een beknopte samenvatting (max 3 zinnen) van dit ${entityType}. Focus op: huidige status, openstaande acties, en belangrijkste aandachtspunten.\n\nContext: ${JSON.stringify(context)}`,
      "Je bent een zakelijke assistent. Geef beknopte samenvattingen in het Nederlands."
    );

    // Cache it
    await supabase.from("ai_summaries").upsert({
      organization_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      summary: summary.trim(),
      key_points: [],
      generated_at: new Date().toISOString(),
      generated_by: userId,
      is_stale: false,
    }, { onConflict: "entity_type,entity_id" });

    return new Response(JSON.stringify({ summary: summary.trim(), cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize error:", e);
    return new Response(JSON.stringify({ error: "Samenvatting kon niet worden gegenereerd" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleSuggestActions(supabase: any, orgId: string) {
  try {
    const { data: digest } = await supabase.rpc("fn_daily_digest", { p_org_id: orgId });

    const tools = [{
      type: "function",
      function: {
        name: "suggest_actions",
        description: "Return 3-5 actionable suggestions for the organization.",
        parameters: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["warning", "opportunity", "reminder", "insight"] },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  action_label: { type: "string" },
                  action_url: { type: "string" },
                },
                required: ["type", "priority", "title", "description"],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        },
      },
    }];

    const result = await callAIWithTools(
      `Analyseer deze organisatiedata en geef 3-5 concrete actiepunten. Focus op rode klanten, overdue taken, pipeline risico's en openstaande facturen.\n\nData: ${JSON.stringify(digest)}`,
      tools,
      { type: "function", function: { name: "suggest_actions" } }
    );

    return new Response(JSON.stringify(result || { suggestions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest error:", e);
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleAnalyzeCall(supabase: any, orgId: string, callId: string) {
  try {
    const { data: call } = await supabase.from("call_log").select("*").eq("id", callId).single();
    if (!call) throw new Error("Call not found");

    const tools = [{
      type: "function",
      function: {
        name: "analyze_call",
        description: "Analyze a phone call and return structured analysis.",
        parameters: {
          type: "object",
          properties: {
            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
            summary: { type: "string" },
            action_items: { type: "array", items: { type: "string" } },
            follow_up_suggestion: { type: "string" },
          },
          required: ["sentiment", "summary", "action_items"],
          additionalProperties: false,
        },
      },
    }];

    const result = await callAIWithTools(
      `Analyseer dit telefoongesprek:\n\nRichting: ${call.direction}\nDuur: ${call.duration_seconds}s\nBeller: ${call.caller_name || call.caller_number}\nTranscriptie: ${call.transcription_text || "Niet beschikbaar"}\n\nGeef een analyse in het Nederlands.`,
      tools,
      { type: "function", function: { name: "analyze_call" } }
    );

    if (result) {
      // Save analysis
      await supabase.from("call_log").update({
        sentiment: result.sentiment,
        ai_summary: result.summary,
        ai_action_items: result.action_items,
      }).eq("id", callId);
    }

    return new Response(JSON.stringify(result || {}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze call error:", e);
    return new Response(JSON.stringify({ error: "Analyse mislukt" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleSmartDigest(supabase: any, orgId: string) {
  try {
    const { data: digest } = await supabase.rpc("fn_daily_digest", { p_org_id: orgId });

    const rodeKlanten = Array.isArray(digest?.rode_klanten) ? digest.rode_klanten.length : 0;
    const overdueTaken = Array.isArray(digest?.overdue_checklist) ? digest.overdue_checklist.length : 0;
    const openFacturen = Array.isArray(digest?.openstaande_facturen) ? digest.openstaande_facturen.length : 0;
    const dealsInPipeline = Array.isArray(digest?.deals_in_pipeline) ? digest.deals_in_pipeline.length : 0;

    // Get today's bookings
    const today = new Date().toISOString().split("T")[0];
    const { count: bookingsToday } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("start_at", today + "T00:00:00")
      .lte("start_at", today + "T23:59:59")
      .eq("status", "confirmed");

    // Get missed calls today
    const { count: missedCalls } = await supabase
      .from("call_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "missed")
      .gte("started_at", today + "T00:00:00");

    return new Response(JSON.stringify({
      rode_klanten: rodeKlanten,
      overdue_taken: overdueTaken,
      open_facturen: openFacturen,
      deals_in_pipeline: dealsInPipeline,
      boekingen_vandaag: bookingsToday ?? 0,
      gemiste_gesprekken: missedCalls ?? 0,
      pipeline_waarde: digest?.pipeline_waarde ?? 0,
      mrr: digest?.mrr ?? 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart digest error:", e);
    return new Response(JSON.stringify({}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
