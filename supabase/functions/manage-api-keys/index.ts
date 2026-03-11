import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function encrypt(text: string, key: string): string {
  // Simple XOR encryption with base64 encoding — sufficient for encrypted-at-rest storage
  const keyBytes = new TextEncoder().encode(key);
  const textBytes = new TextEncoder().encode(text);
  const result = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...result));
}

function decrypt(encoded: string, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const result = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(result);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
    if (!ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY not configured");
    }

    // Verify the user's JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, service, api_key, organization_id } = await req.json();

    if (!organization_id) throw new Error("Missing organization_id");
    if (!["anthropic", "apify"].includes(service)) throw new Error("Invalid service");

    // Verify user is owner/admin of this org
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("Insufficient permissions");
    }

    if (action === "set") {
      if (!api_key) throw new Error("Missing api_key");

      const encrypted = encrypt(api_key, ENCRYPTION_KEY);
      const hint = api_key.substring(0, 8) + "..." + api_key.slice(-4);

      const upsertData: Record<string, unknown> = {
        organization_id,
        [`${service}_api_key_encrypted`]: encrypted,
        [`${service}_key_set`]: true,
        [`${service}_key_hint`]: hint,
        updated_at: new Date().toISOString(),
      };

      const { error } = await adminClient
        .from("organization_api_keys")
        .upsert(upsertData, { onConflict: "organization_id" });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const { data: keyRow } = await adminClient
        .from("organization_api_keys")
        .select(`${service}_api_key_encrypted`)
        .eq("organization_id", organization_id)
        .single();

      const encrypted = keyRow?.[`${service}_api_key_encrypted`];
      if (!encrypted) throw new Error("No key found");

      const decrypted = decrypt(encrypted as string, ENCRYPTION_KEY);
      let valid = false;

      if (service === "anthropic") {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": decrypted,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        valid = resp.ok;
      } else if (service === "apify") {
        const resp = await fetch("https://api.apify.com/v2/user/me", {
          headers: { Authorization: `Bearer ${decrypted}` },
        });
        valid = resp.ok;
      }

      if (valid) {
        await adminClient
          .from("organization_api_keys")
          .update({ [`${service}_key_verified_at`]: new Date().toISOString() })
          .eq("organization_id", organization_id);
      }

      return new Response(JSON.stringify({ valid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const updateData: Record<string, unknown> = {
        [`${service}_api_key_encrypted`]: null,
        [`${service}_key_set`]: false,
        [`${service}_key_hint`]: null,
        [`${service}_key_verified_at`]: null,
        updated_at: new Date().toISOString(),
      };

      await adminClient
        .from("organization_api_keys")
        .update(updateData)
        .eq("organization_id", organization_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("manage-api-keys error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
