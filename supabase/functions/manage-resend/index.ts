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

async function getResendKey(adminClient: any, orgId: string, encryptionKey: string): Promise<string> {
  const { data } = await adminClient
    .from("organization_api_keys")
    .select("resend_api_key_encrypted")
    .eq("organization_id", orgId)
    .single();

  const encrypted = data?.resend_api_key_encrypted;
  if (!encrypted) throw new Error("Resend API key niet ingesteld. Ga naar Instellingen → API Keys.");
  return decrypt(encrypted as string, encryptionKey);
}

async function resendFetch(apiKey: string, path: string, method: string, body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };
  if (body && method !== "GET" && method !== "DELETE") {
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(`https://api.resend.com${path}`, opts);
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Resend API error (${resp.status}): ${text}`);
  }
  return text ? JSON.parse(text) : { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
    if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, organization_id, payload } = await req.json();
    if (!organization_id) throw new Error("Missing organization_id");
    if (!action) throw new Error("Missing action");

    // Verify membership
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

    const apiKey = await getResendKey(adminClient, organization_id, ENCRYPTION_KEY);

    // Route actions
    const [resource, method] = action.split(".");
    let result: unknown;

    if (resource === "webhooks") {
      switch (method) {
        case "list":
          result = await resendFetch(apiKey, "/webhooks", "GET");
          break;
        case "create":
          result = await resendFetch(apiKey, "/webhooks", "POST", payload);
          break;
        case "get":
          result = await resendFetch(apiKey, `/webhooks/${payload.id}`, "GET");
          break;
        case "update":
          result = await resendFetch(apiKey, `/webhooks/${payload.id}`, "PUT", payload);
          break;
        case "delete":
          result = await resendFetch(apiKey, `/webhooks/${payload.id}`, "DELETE");
          break;
        default:
          throw new Error(`Unknown webhooks method: ${method}`);
      }
    } else if (resource === "templates") {
      switch (method) {
        case "list":
          result = await resendFetch(apiKey, "/templates", "GET");
          break;
        case "create":
          result = await resendFetch(apiKey, "/templates", "POST", payload);
          break;
        case "get":
          result = await resendFetch(apiKey, `/templates/${payload.id}`, "GET");
          break;
        case "update":
          result = await resendFetch(apiKey, `/templates/${payload.id}`, "PATCH", payload);
          break;
        case "publish":
          result = await resendFetch(apiKey, `/templates/${payload.id}/publish`, "POST");
          break;
        case "duplicate":
          result = await resendFetch(apiKey, `/templates/${payload.id}/duplicate`, "POST");
          break;
        case "delete":
          result = await resendFetch(apiKey, `/templates/${payload.id}`, "DELETE");
          break;
        default:
          throw new Error(`Unknown templates method: ${method}`);
      }
    } else if (resource === "broadcasts") {
      switch (method) {
        case "list":
          result = await resendFetch(apiKey, "/broadcasts", "GET");
          break;
        case "create":
          result = await resendFetch(apiKey, "/broadcasts", "POST", payload);
          break;
        case "get":
          result = await resendFetch(apiKey, `/broadcasts/${payload.id}`, "GET");
          break;
        case "update":
          result = await resendFetch(apiKey, `/broadcasts/${payload.id}`, "PATCH", payload);
          break;
        case "send":
          result = await resendFetch(apiKey, `/broadcasts/${payload.id}/send`, "POST", payload);
          break;
        case "delete":
          result = await resendFetch(apiKey, `/broadcasts/${payload.id}`, "DELETE");
          break;
        default:
          throw new Error(`Unknown broadcasts method: ${method}`);
      }
    } else {
      throw new Error(`Unknown resource: ${resource}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("manage-resend error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
