import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { KoppelSleutel, ActionType, ReferenceKey } = body;

    console.log("Snelstart webhook received:", { ActionType, ReferenceKey, hasKoppelSleutel: !!KoppelSleutel });

    if (!ReferenceKey) {
      return new Response(JSON.stringify({ error: "Missing ReferenceKey" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (ActionType === "Create" || ActionType === "Regenerate") {
      if (!KoppelSleutel) {
        return new Response(JSON.stringify({ error: "Missing KoppelSleutel" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("snelstart_config")
        .upsert(
          {
            organization_id: ReferenceKey,
            koppel_sleutel: KoppelSleutel,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id" }
        );

      if (error) {
        console.error("Upsert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Snelstart coupling ${ActionType}d for org ${ReferenceKey}`);
    } else if (ActionType === "Delete") {
      const { error } = await supabase
        .from("snelstart_config")
        .update({
          koppel_sleutel: null,
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", ReferenceKey);

      if (error) {
        console.error("Delete error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Snelstart coupling deleted for org ${ReferenceKey}`);
    } else {
      console.warn("Unknown ActionType:", ActionType);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200, // Return 200 anyway — Snelstart doesn't retry
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
