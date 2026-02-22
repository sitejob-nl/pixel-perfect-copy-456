const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MCP_URL =
  "https://mcp.apify.com/?tools=actors,docs,experimental,runs,storage,apify/rag-web-browser,compass/crawler-google-places,apify/instagram-scraper,apify/website-content-crawler,clockworks/tiktok-scraper,streamers/youtube-scraper,dev_fusion/Linkedin-Profile-Scraper,code_crafter/leads-finder,nikita-sviridenko/trustpilot-reviews-scraper,apify/facebook-ads-scraper,apify/facebook-pages-scraper,apify/facebook-posts-scraper,apify/instagram-profile-scraper,apify/instagram-post-scraper,apify/web-scraper";

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(response.body, {
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
