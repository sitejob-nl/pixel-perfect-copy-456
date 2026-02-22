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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = req.headers.get("apikey") || "";
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, slug } = await req.json();
    if (!name || !slug) {
      return new Response(JSON.stringify({ error: "Name and slug are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already has an org
    const { data: existing } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "User already has an organization" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check slug uniqueness
    const { data: slugCheck } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (slugCheck && slugCheck.length > 0) {
      return new Response(JSON.stringify({ error: "Slug already taken" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create organization
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({ name, slug })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add user as owner
    const { error: memberError } = await admin
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
        joined_at: new Date().toISOString(),
      });

    if (memberError) throw memberError;

    // Create default pipeline stages
    const stages = [
      { name: "Lead", sort_order: 0, probability: 10, color: "#6B7280" },
      { name: "Kennismaking", sort_order: 1, probability: 25, color: "#3B82F6" },
      { name: "Offerte", sort_order: 2, probability: 50, color: "#F59E0B" },
      { name: "Onderhandeling", sort_order: 3, probability: 75, color: "#8B5CF6" },
      { name: "Gewonnen", sort_order: 4, probability: 100, color: "#10B981", is_won: true },
      { name: "Verloren", sort_order: 5, probability: 0, color: "#EF4444", is_lost: true },
    ];

    const { error: stagesError } = await admin
      .from("pipeline_stages")
      .insert(stages.map((s) => ({ ...s, organization_id: org.id })));

    if (stagesError) throw stagesError;

    return new Response(JSON.stringify({ organization: org }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
