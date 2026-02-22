const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MCP_URL =
  "https://mcp.apify.com/?tools=actors,docs,experimental,runs,storage,apify/rag-web-browser,compass/crawler-google-places,apify/instagram-scraper,apify/website-content-crawler,clockworks/tiktok-scraper,streamers/youtube-scraper,dev_fusion/Linkedin-Profile-Scraper,code_crafter/leads-finder,nikita-sviridenko/trustpilot-reviews-scraper,apify/facebook-ads-scraper,apify/facebook-pages-scraper,apify/facebook-posts-scraper,apify/instagram-profile-scraper,apify/instagram-post-scraper,apify/web-scraper";

const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_COMMENT = new TextEncoder().encode(": keepalive\n\n");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!APIFY_TOKEN) {
      return new Response(
        JSON.stringify({ error: "APIFY_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, system } = await req.json();

    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      stream: true,
      messages,
      mcp_servers: [
        {
          type: "url",
          url: MCP_URL,
          name: "apify",
          authorization_token: APIFY_TOKEN,
        },
      ],
    };

    if (system) {
      body.system = system;
    }

    const startTime = Date.now();
    console.log("[ai-agent] Starting Anthropic API call...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[ai-agent] Anthropic responded in ${elapsed}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-agent] Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.body) {
      return new Response(
        JSON.stringify({ error: "No response body from Anthropic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[ai-agent] Starting heartbeat stream proxy...");

    // Create a TransformStream that injects keepalive comments during idle periods
    const upstream = response.body.getReader();
    let heartbeatTimer: number | undefined;
    let lastDataTime = Date.now();

    const readable = new ReadableStream({
      async start(controller) {
        // Start heartbeat interval
        heartbeatTimer = setInterval(() => {
          const idleMs = Date.now() - lastDataTime;
          if (idleMs >= HEARTBEAT_INTERVAL_MS) {
            try {
              controller.enqueue(HEARTBEAT_COMMENT);
              console.log(`[ai-agent] Sent keepalive after ${Math.round(idleMs / 1000)}s idle`);
            } catch {
              // Stream already closed
              clearInterval(heartbeatTimer);
            }
          }
        }, HEARTBEAT_INTERVAL_MS) as unknown as number;

        try {
          while (true) {
            const { done, value } = await upstream.read();
            if (done) {
              console.log(`[ai-agent] Upstream stream ended. Total time: ${Date.now() - startTime}ms`);
              clearInterval(heartbeatTimer);
              controller.close();
              break;
            }
            lastDataTime = Date.now();
            controller.enqueue(value);
          }
        } catch (err) {
          console.error("[ai-agent] Stream read error:", err);
          clearInterval(heartbeatTimer);
          controller.error(err);
        }
      },
      cancel() {
        console.log("[ai-agent] Client disconnected");
        clearInterval(heartbeatTimer);
        upstream.cancel();
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("ai-agent error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
