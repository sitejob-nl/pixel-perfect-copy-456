import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SNELSTART_ECHO_URL = "https://b2bapi.snelstart.nl/echo/resource";
const SNELSTART_BASE_URL = "https://b2bapi.snelstart.nl/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    // Get user's organization
    const { data: membership, error: memError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (memError || !membership) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = membership.organization_id;

    // Get Snelstart config using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config, error: configError } = await adminClient
      .from("snelstart_config")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();

    if (configError) {
      return new Response(JSON.stringify({ error: "Failed to load config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config?.subscription_key || !config?.koppel_sleutel) {
      return new Response(
        JSON.stringify({ error: "Snelstart niet geconfigureerd. Stel eerst de Subscription Key in en activeer de koppeling." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    const snelstartHeaders = {
      "Ocp-Apim-Subscription-Key": config.subscription_key,
      "Authorization": `Bearer ${config.koppel_sleutel}`,
      "Content-Type": "application/json",
    };

    // ─── test_connection ───
    if (action === "test_connection") {
      try {
        const echoRes = await fetch(`${SNELSTART_ECHO_URL}?param1=test`, {
          method: "GET",
          headers: snelstartHeaders,
        });

        if (echoRes.ok) {
          return new Response(
            JSON.stringify({ success: true, message: "Verbinding met Snelstart is actief." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const errorText = await echoRes.text();
          console.error("Snelstart echo failed:", echoRes.status, errorText);
          return new Response(
            JSON.stringify({ success: false, message: `Verbinding mislukt (status ${echoRes.status})`, details: errorText }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (fetchErr) {
        console.error("Snelstart echo fetch error:", fetchErr);
        return new Response(
          JSON.stringify({ success: false, message: "Kan Snelstart API niet bereiken." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── sync actions ───
    if (["sync_klanten", "sync_facturen", "sync_offertes"].includes(action)) {
      const entityMap: Record<string, string> = {
        sync_klanten: "relaties",
        sync_facturen: "verkoopfacturen",
        sync_offertes: "offertes",
      };
      const entity = entityMap[action];

      // Log start
      const { data: logEntry } = await adminClient
        .from("snelstart_sync_log")
        .insert({
          organization_id: orgId,
          entity_type: entity,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      try {
        // Fetch first page from Snelstart
        const apiRes = await fetch(`${SNELSTART_BASE_URL}/${entity}`, {
          method: "GET",
          headers: snelstartHeaders,
        });

        if (!apiRes.ok) {
          const errorText = await apiRes.text();
          console.error(`Snelstart ${entity} fetch failed:`, apiRes.status, errorText);

          if (logEntry) {
            await adminClient
              .from("snelstart_sync_log")
              .update({
                status: "error",
                finished_at: new Date().toISOString(),
                error_message: `API ${apiRes.status}: ${errorText.substring(0, 500)}`,
              })
              .eq("id", logEntry.id);
          }

          return new Response(
            JSON.stringify({ success: false, message: `Sync mislukt voor ${entity} (status ${apiRes.status})` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const records = await apiRes.json();
        const count = Array.isArray(records) ? records.length : 0;

        // Update log with success
        if (logEntry) {
          await adminClient
            .from("snelstart_sync_log")
            .update({
              status: "success",
              finished_at: new Date().toISOString(),
              records_synced: count,
            })
            .eq("id", logEntry.id);
        }

        return new Response(
          JSON.stringify({ success: true, message: `${count} ${entity} opgehaald van Snelstart.`, count }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (syncErr) {
        console.error(`Sync error for ${entity}:`, syncErr);

        if (logEntry) {
          await adminClient
            .from("snelstart_sync_log")
            .update({
              status: "error",
              finished_at: new Date().toISOString(),
              error_message: String(syncErr).substring(0, 500),
            })
            .eq("id", logEntry.id);
        }

        return new Response(
          JSON.stringify({ success: false, message: `Sync fout: ${String(syncErr)}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: `Onbekende actie: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Snelstart sync error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
