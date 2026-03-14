import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: "Google OAuth niet geconfigureerd" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);

  // Step 1: Generate auth URL (POST)
  if (req.method === "POST") {
    const body = await req.json();
    const { organization_id, user_id, connection_level, redirect_url } = body;

    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const state = btoa(JSON.stringify({
      organization_id, user_id, connection_level,
      redirect_url: redirect_url || `${url.origin}/functions/v1/google-oauth-callback`,
    }));

    const callbackUrl = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", callbackUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return new Response(JSON.stringify({ auth_url: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 2: Handle OAuth callback (GET)
  if (req.method === "GET") {
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return redirectWithMessage("Google OAuth geweigerd: " + error, true);
    }

    if (!code || !stateParam) {
      return redirectWithMessage("Ongeldige OAuth callback", true);
    }

    let state: any;
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return redirectWithMessage("Ongeldige state parameter", true);
    }

    const callbackUrl = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokens);
      return redirectWithMessage("Token exchange mislukt", true);
    }

    // Get user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // Store connection
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const connectionData: any = {
      organization_id: state.organization_id,
      connection_level: state.connection_level,
      email: userInfo.email,
      display_name: userInfo.name || userInfo.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope?.split(" ") || [],
      is_active: true,
      connected_at: new Date().toISOString(),
    };

    if (state.connection_level === "user") {
      connectionData.user_id = state.user_id;
    }

    const { error: dbError } = await supabase
      .from("google_connections")
      .upsert(connectionData, { onConflict: "organization_id,connection_level,email" });

    if (dbError) {
      console.error("DB error:", dbError);
      return redirectWithMessage("Opslaan mislukt: " + dbError.message, true);
    }

    return redirectWithMessage("Google account succesvol gekoppeld!", false);
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});

function redirectWithMessage(message: string, isError: boolean) {
  // Redirect to frontend settings with status message
  const baseUrl = Deno.env.get("SITE_URL") || "https://pixel-perfect-copy-456.lovable.app";
  const params = new URLSearchParams({
    google_status: isError ? "error" : "success",
    google_message: message,
  });
  return new Response(null, {
    status: 302,
    headers: { Location: `${baseUrl}/settings?${params}` },
  });
}
