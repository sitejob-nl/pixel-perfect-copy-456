import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, organization_id } = await req.json();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get KVK API key from integration_secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: secret } = await sb
      .from("integration_secrets")
      .select("secret_value")
      .eq("organization_id", organization_id)
      .eq("provider", "kvk")
      .eq("secret_key", "api_key")
      .single();

    if (!secret?.secret_value) {
      return new Response(
        JSON.stringify({ error: "Geen KVK API key geconfigureerd. Ga naar Instellingen → Integraties." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine if query is a KVK number (8 digits) or a name
    const isKvkNumber = /^\d{8}$/.test(query.trim());
    const searchParam = isKvkNumber
      ? `kvkNummer=${encodeURIComponent(query.trim())}`
      : `handelsnaam=${encodeURIComponent(query.trim())}`;

    const kvkRes = await fetch(
      `https://api.kvk.nl/api/v1/zoeken?${searchParam}&resultatenPerPagina=8`,
      { headers: { apikey: secret.secret_value } }
    );

    if (!kvkRes.ok) {
      const errText = await kvkRes.text();
      console.error("KVK API error:", kvkRes.status, errText);
      return new Response(
        JSON.stringify({ error: `KVK API fout (${kvkRes.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const kvkData = await kvkRes.json();
    const resultaten = kvkData?.resultaten ?? [];

    const results = resultaten.map((r: any) => {
      const adres = r.adres ?? r.vestigendeActiviteiten?.[0]?.adres ?? {};
      return {
        kvk_number: r.kvkNummer ?? null,
        name: r.handelsnaam ?? r.naam ?? "",
        city: adres.plaats ?? null,
        postal_code: adres.postcode ?? null,
        address_line1: adres.volledigAdres ?? ([adres.straatnaam, adres.huisnummer].filter(Boolean).join(" ") || null),
        industry: r.spiActiviteiten?.[0]?.sbiOmschrijving ?? null,
        sbi_code: r.spiActiviteiten?.[0]?.sbiCode ?? null,
        legal_form: r.rechtsvorm ?? null,
      };
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("kvk-search error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
