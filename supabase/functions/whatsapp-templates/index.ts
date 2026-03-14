import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API = "https://graph.facebook.com/v25.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  try {
    const body = await req.json();
    const { action } = body;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = membership.organization_id;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get WhatsApp account
    const { data: account } = await serviceClient
      .from("whatsapp_accounts")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .single();

    if (!account) {
      return new Response(JSON.stringify({ error: "No active WhatsApp account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaHeaders = {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
    };

    // ─── LIST templates ───
    if (action === "list") {
      let url = `${META_API}/${account.waba_id}/message_templates?limit=100`;
      if (body.status) url += `&status=${body.status.toLowerCase()}`;
      const res = await fetch(url, { headers: metaHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to list templates");
      return new Response(JSON.stringify({ templates: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE template ───
    if (action === "create") {
      const { name, category, language, parameter_format, components } = body;
      if (!name || !category || !language || !components) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload: Record<string, unknown> = {
        name,
        category,
        language,
        parameter_format: parameter_format || "positional",
        components,
      };

      const res = await fetch(
        `${META_API}/${account.waba_id}/message_templates`,
        {
          method: "POST",
          headers: metaHeaders,
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to create template");
      return new Response(JSON.stringify({ success: true, template: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DELETE template ───
    if (action === "delete") {
      const { name: tplName, template_id } = body;
      if (!tplName) {
        return new Response(JSON.stringify({ error: "Template name required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let url = `${META_API}/${account.waba_id}/message_templates?name=${encodeURIComponent(tplName)}`;
      if (template_id) url += `&hsm_id=${template_id}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: metaHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete template");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── BROWSE LIBRARY (just returns existing approved templates) ───
    if (action === "browse_library") {
      const res = await fetch(
        `${META_API}/${account.waba_id}/message_templates?fields=name,category,status,components,language&status=approved&limit=50`,
        { headers: metaHeaders }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to browse library");
      return new Response(JSON.stringify({ templates: data.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("WhatsApp templates error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
