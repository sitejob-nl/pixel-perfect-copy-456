import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function decrypt(encoded: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(result);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || serviceKey.slice(0, 32);

    // Authenticate user
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id, text } = await req.json();
    if (!text || !organization_id) {
      return new Response(JSON.stringify({ error: "text and organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get LinkedIn connection
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: conn, error: connErr } = await adminClient
      .from("linkedin_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "LinkedIn niet gekoppeld. Ga naar Instellingen → LinkedIn." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check token expiry
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "LinkedIn token verlopen. Koppel opnieuw via Instellingen." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = decrypt(conn.access_token_encrypted, encryptionKey);

    // Post to LinkedIn using v2 Posts API
    const postRes = await fetch("https://api.linkedin.com/v2/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
      },
      body: JSON.stringify({
        author: `urn:li:person:${conn.linkedin_user_id}`,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
      }),
    });

    if (!postRes.ok) {
      const errBody = await postRes.text();
      console.error("LinkedIn post error:", postRes.status, errBody);
      return new Response(JSON.stringify({ error: "LinkedIn post mislukt", details: errBody }), {
        status: postRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LinkedIn returns 201 with x-restli-id header
    const postId = postRes.headers.get("x-restli-id") || "unknown";

    return new Response(JSON.stringify({ success: true, post_id: postId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("linkedin-post error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
