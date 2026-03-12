import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get token from header or query param
  const url = new URL(req.url);
  const token =
    req.headers.get("x-portal-token") || url.searchParams.get("token") || "";
  const body = req.method === "POST" ? await req.json() : {};
  const action = body.action || url.searchParams.get("action") || "";

  // ─── Actions that don't need a session ───
  if (action === "verify_password") {
    if (!token) return err("Token vereist", 401);
    const { data: session } = await supabase
      .from("portal_sessions")
      .select("id, password_hash, password_required")
      .eq("access_token", token)
      .eq("is_active", true)
      .single();
    if (!session) return err("Portaal niet gevonden", 404);
    if (!session.password_required) return json({ ok: true });

    // Simple password comparison (hash stored as plain bcrypt or sha256)
    // For MVP we do a direct compare; production should use bcrypt
    if (session.password_hash !== body.password) {
      return err("Onjuist wachtwoord", 403);
    }
    return json({ ok: true });
  }

  // ─── Validate session for all other actions ───
  if (!token) return err("Token vereist", 401);

  const { data: portal } = await supabase
    .from("portal_sessions")
    .select(
      `*, contacts(first_name, last_name, email, phone, company_id),
       companies(name, website, phone, email),
       projects(name, project_number, status)`
    )
    .eq("access_token", token)
    .eq("is_active", true)
    .single();

  if (!portal) return err("Portaal niet gevonden of inactief", 404);

  // Check expiry
  if (portal.expires_at && new Date(portal.expires_at) < new Date()) {
    return err("Dit portaal is verlopen", 403);
  }

  const orgId = portal.organization_id;

  // Log activity
  const logActivity = async (actionName: string, details: any = {}) => {
    await supabase.from("portal_activity_log").insert({
      portal_session_id: portal.id,
      organization_id: orgId,
      action: actionName,
      details,
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    });
  };

  // Update last accessed
  await supabase
    .from("portal_sessions")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", portal.id);

  // ─── GET PORTAL ───
  if (action === "get_portal") {
    await logActivity("portal_viewed");

    // Get org branding
    const { data: org } = await supabase
      .from("organizations")
      .select("name, slug, logo_url, primary_color, secondary_color")
      .eq("id", orgId)
      .single();

    // Get unread messages count
    const { count: unreadCount } = await supabase
      .from("portal_messages")
      .select("*", { count: "exact", head: true })
      .eq("portal_session_id", portal.id)
      .eq("sender_type", "admin")
      .eq("is_read", false);

    // Get summary counts
    const enabledSections = portal.enabled_sections || [];

    let contractCount = 0;
    let invoiceCount = 0;
    let unpaidInvoiceCount = 0;
    let quoteCount = 0;

    if (enabledSections.includes("contracts") && portal.contact_id) {
      const { count } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("contact_id", portal.contact_id)
        .eq("visible_in_portal", true);
      contractCount = count || 0;
    }

    if (enabledSections.includes("invoices") && portal.contact_id) {
      const { data: invs } = await supabase
        .from("invoices")
        .select("id, payment_status")
        .eq("organization_id", orgId)
        .eq("contact_id", portal.contact_id)
        .eq("visible_in_portal", true);
      invoiceCount = invs?.length || 0;
      unpaidInvoiceCount = invs?.filter((i: any) => i.payment_status !== "paid").length || 0;
    }

    if (enabledSections.includes("quotes") && portal.contact_id) {
      const { count } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("contact_id", portal.contact_id)
        .eq("visible_in_portal", true);
      quoteCount = count || 0;
    }

    return json({
      portal: {
        id: portal.id,
        portal_name: portal.portal_name,
        welcome_message: portal.welcome_message,
        enabled_sections: portal.enabled_sections,
        custom_links: portal.custom_links,
        branding: portal.branding,
        password_required: portal.password_required,
        contact: portal.contacts,
        company: portal.companies,
        project: portal.projects,
      },
      organization: org,
      summary: {
        contracts: contractCount,
        invoices: invoiceCount,
        unpaid_invoices: unpaidInvoiceCount,
        quotes: quoteCount,
        unread_messages: unreadCount || 0,
      },
    });
  }

  // ─── GET CONTRACTS ───
  if (action === "get_contracts") {
    if (!portal.contact_id) return json({ contracts: [] });
    const { data } = await supabase
      .from("contracts")
      .select("id, title, status, contract_number, contract_type, created_at, signed_at, expires_at, rendered_html, content")
      .eq("organization_id", orgId)
      .eq("contact_id", portal.contact_id)
      .eq("visible_in_portal", true)
      .order("created_at", { ascending: false });
    await logActivity("contracts_viewed");
    return json({ contracts: data || [] });
  }

  // ─── GET INVOICES ───
  if (action === "get_invoices") {
    if (!portal.contact_id) return json({ invoices: [] });
    const { data } = await supabase
      .from("invoices")
      .select("id, invoice_number, customer_name, total_amount, status, payment_status, payment_url, due_date, paid_at, created_at")
      .eq("organization_id", orgId)
      .eq("contact_id", portal.contact_id)
      .eq("visible_in_portal", true)
      .order("created_at", { ascending: false });
    await logActivity("invoices_viewed");
    return json({ invoices: data || [] });
  }

  // ─── GET INVOICE DETAIL ───
  if (action === "get_invoice_detail") {
    const { data } = await supabase
      .from("invoices")
      .select("*, invoice_lines(*)")
      .eq("id", body.invoice_id)
      .eq("organization_id", orgId)
      .eq("visible_in_portal", true)
      .single();
    if (!data) return err("Factuur niet gevonden", 404);
    await logActivity("invoice_detail_viewed", { invoice_id: body.invoice_id });
    return json({ invoice: data });
  }

  // ─── GET QUOTES ───
  if (action === "get_quotes") {
    if (!portal.contact_id) return json({ quotes: [] });
    const { data } = await supabase
      .from("quotes")
      .select("id, quote_number, total_amount, status, valid_until, accepted_at, declined_at, decline_reason, created_at")
      .eq("organization_id", orgId)
      .eq("contact_id", portal.contact_id)
      .eq("visible_in_portal", true)
      .order("created_at", { ascending: false });
    await logActivity("quotes_viewed");
    return json({ quotes: data || [] });
  }

  // ─── GET QUOTE DETAIL ───
  if (action === "get_quote_detail") {
    const { data } = await supabase
      .from("quotes")
      .select("*, quote_lines(*)")
      .eq("id", body.quote_id)
      .eq("organization_id", orgId)
      .eq("visible_in_portal", true)
      .single();
    if (!data) return err("Offerte niet gevonden", 404);
    await logActivity("quote_detail_viewed", { quote_id: body.quote_id });
    return json({ quote: data });
  }

  // ─── RESPOND TO QUOTE ───
  if (action === "respond_quote") {
    const accepted = body.accepted === true;
    const updates: any = accepted
      ? {
          accepted_at: new Date().toISOString(),
          accepted_by: portal.contacts?.first_name || "Klant",
          status: "accepted",
        }
      : {
          declined_at: new Date().toISOString(),
          decline_reason: body.reason || null,
          status: "declined",
        };

    const { error: updateErr } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", body.quote_id)
      .eq("organization_id", orgId)
      .eq("visible_in_portal", true);
    if (updateErr) return err(updateErr.message, 500);
    await logActivity(accepted ? "quote_accepted" : "quote_declined", { quote_id: body.quote_id });
    return json({ ok: true });
  }

  // ─── GET MESSAGES ───
  if (action === "get_messages") {
    const { data } = await supabase
      .from("portal_messages")
      .select("*")
      .eq("portal_session_id", portal.id)
      .order("created_at");

    // Mark admin messages as read
    await supabase
      .from("portal_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("portal_session_id", portal.id)
      .eq("sender_type", "admin")
      .eq("is_read", false);

    return json({ messages: data || [] });
  }

  // ─── SEND MESSAGE ───
  if (action === "send_message") {
    if (!body.message?.trim()) return err("Bericht mag niet leeg zijn");
    const { error: insertErr } = await supabase.from("portal_messages").insert({
      organization_id: orgId,
      portal_session_id: portal.id,
      sender_type: "client",
      sender_name: portal.contacts
        ? `${portal.contacts.first_name} ${portal.contacts.last_name || ""}`.trim()
        : portal.client_name || "Klant",
      message: body.message.trim().slice(0, 5000),
    });
    if (insertErr) return err(insertErr.message, 500);
    await logActivity("message_sent");
    return json({ ok: true });
  }

  // ─── GET ONBOARDING ───
  if (action === "get_onboarding") {
    const { data: questions } = await supabase
      .from("onboarding_questions")
      .select("*")
      .eq("portal_session_id", portal.id)
      .order("sort_order");

    const qIds = (questions || []).map((q: any) => q.id);
    let responses: any[] = [];
    if (qIds.length > 0) {
      const { data: resp } = await supabase
        .from("onboarding_responses")
        .select("*")
        .in("question_id", qIds);
      responses = resp || [];
    }

    const respMap: Record<string, any> = {};
    responses.forEach((r: any) => {
      respMap[r.question_id] = r;
    });

    const merged = (questions || []).map((q: any) => ({
      ...q,
      response: respMap[q.id] || null,
    }));

    await logActivity("onboarding_viewed");
    return json({ questions: merged });
  }

  // ─── SUBMIT ONBOARDING ───
  if (action === "submit_onboarding") {
    const answers = body.answers || [];
    if (!Array.isArray(answers)) return err("Ongeldige antwoorden");

    for (const answer of answers) {
      if (!answer.question_id) continue;

      // Get question to find project_id
      const { data: question } = await supabase
        .from("onboarding_questions")
        .select("project_id")
        .eq("id", answer.question_id)
        .single();

      if (!question) continue;

      // Upsert response
      const { error: upsertErr } = await supabase
        .from("onboarding_responses")
        .upsert(
          {
            question_id: answer.question_id,
            project_id: question.project_id,
            response_text: answer.response_text || null,
            response_files: answer.response_files || [],
            organization_id: orgId,
          },
          { onConflict: "question_id,project_id" }
        );
      if (upsertErr) {
        // If upsert fails, try insert (might not have unique constraint)
        await supabase.from("onboarding_responses").insert({
          question_id: answer.question_id,
          project_id: question.project_id,
          response_text: answer.response_text || null,
          response_files: answer.response_files || [],
          organization_id: orgId,
        });
      }
    }

    await logActivity("onboarding_submitted", { answers_count: answers.length });
    return json({ ok: true });
  }

  // ─── GET FILE REQUESTS ───
  if (action === "get_file_requests") {
    const { data } = await supabase
      .from("portal_file_requests")
      .select("*")
      .eq("portal_session_id", portal.id)
      .order("sort_order");
    await logActivity("files_viewed");
    return json({ file_requests: data || [] });
  }

  // ─── GET UPLOAD URL ───
  if (action === "upload_url") {
    const fileName = body.file_name || "upload";
    const fileType = body.file_type || "application/octet-stream";
    const path = `${orgId}/${portal.id}/${Date.now()}_${fileName}`;

    const { data: signedData, error: signErr } = await supabase.storage
      .from("portal-uploads")
      .createSignedUploadUrl(path);
    if (signErr) return err(signErr.message, 500);

    return json({
      upload_url: signedData.signedUrl,
      path,
      token: signedData.token,
    });
  }

  // ─── CONFIRM UPLOAD ───
  if (action === "confirm_upload") {
    const { file_request_id, path } = body;
    if (!file_request_id || !path) return err("file_request_id en path vereist");

    const { error: updateErr } = await supabase
      .from("portal_file_requests")
      .update({ status: "uploaded", uploaded_file_id: path })
      .eq("id", file_request_id)
      .eq("portal_session_id", portal.id);
    if (updateErr) return err(updateErr.message, 500);

    await logActivity("file_uploaded", { file_request_id, path });
    return json({ ok: true });
  }

  return err("Onbekende actie: " + action, 400);
});
