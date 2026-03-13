import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function encrypt(text: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const textBytes = new TextEncoder().encode(text);
  const result = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...result));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || serviceKey.slice(0, 32);
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID")!;
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;
  const redirectUri = `${supabaseUrl}/functions/v1/linkedin-oauth?action=callback`;

  // ── Action: start → redirect user to LinkedIn authorize page ──
  if (action === "start") {
    const state = url.searchParams.get("state") || "";
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "openid profile w_member_social email");
    authUrl.searchParams.set("state", state);
    return Response.redirect(authUrl.toString(), 302);
  }

  // ── Action: callback → exchange code for tokens ──
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") || "";
    const error = url.searchParams.get("error");

    // Parse state: userId|orgId|returnUrl
    const [userId, orgId, returnUrl] = state.split("|");

    if (error || !code) {
      const dest = returnUrl || "/settings";
      return Response.redirect(`${dest}?linkedin=error&reason=${error || "no_code"}`, 302);
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Token exchange failed:", errText);
        return Response.redirect(`${returnUrl || "/settings"}?linkedin=error&reason=token_exchange`, 302);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in; // seconds
      const refreshToken = tokenData.refresh_token || null;

      // Get user profile via /v2/userinfo (OpenID)
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await profileRes.json();

      const linkedinUserId = profile.sub;
      const linkedinName = profile.name || `${profile.given_name || ""} ${profile.family_name || ""}`.trim();
      const linkedinAvatar = profile.picture || null;

      // Encrypt tokens
      const accessTokenEncrypted = encrypt(accessToken, encryptionKey);
      const refreshTokenEncrypted = refreshToken ? encrypt(refreshToken, encryptionKey) : null;

      const tokenExpiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;

      // Save to database
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { error: dbError } = await adminClient
        .from("linkedin_connections")
        .upsert({
          organization_id: orgId,
          user_id: userId,
          linkedin_user_id: linkedinUserId,
          access_token_encrypted: accessTokenEncrypted,
          refresh_token_encrypted: refreshTokenEncrypted,
          token_expires_at: tokenExpiresAt,
          linkedin_name: linkedinName,
          linkedin_avatar_url: linkedinAvatar,
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id,user_id" });

      if (dbError) {
        console.error("DB save error:", dbError);
        return Response.redirect(`${returnUrl || "/settings"}?linkedin=error&reason=db_save`, 302);
      }

      return Response.redirect(`${returnUrl || "/settings"}?linkedin=success`, 302);
    } catch (err) {
      console.error("OAuth callback error:", err);
      return Response.redirect(`${returnUrl || "/settings"}?linkedin=error&reason=unknown`, 302);
    }
  }

  // ── Action: disconnect → remove connection ──
  if (action === "disconnect") {
    try {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const authHeader = req.headers.get("Authorization") || "";
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const body = await req.json();
      const orgId = body.organization_id;

      const adminClient = createClient(supabaseUrl, serviceKey);
      await adminClient
        .from("linkedin_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("organization_id", orgId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
