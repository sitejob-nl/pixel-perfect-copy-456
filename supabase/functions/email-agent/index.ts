import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await req.json();

    // Authenticated actions from the frontend
    if (body.action) {
      return await handleAction(req, supabase, body);
    }

    // Gmail Pub/Sub push notification
    if (body.message?.data) {
      return await handleGmailPush(supabase, body);
    }

    return new Response(JSON.stringify({ error: "Unknown request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("email-agent error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Frontend actions ────────────────────────────────────────────
async function handleAction(req: Request, supabase: any, body: any) {
  // Verify auth for frontend actions
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: authError } = await userSupabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { action } = body;

  if (action === "send-draft") {
    const { inbox_id } = body;
    const { data: inbox } = await supabase
      .from("email_inbox")
      .select("*")
      .eq("id", inbox_id)
      .single();
    if (!inbox?.draft_body && !inbox?.draft_gmail_id) {
      return jsonRes({ error: "No draft found" }, 400);
    }

    const gmailToken = await getGmailToken(supabase, inbox.organization_id);

    let draftGmailId = inbox.draft_gmail_id;

    // If we have a draft_body but no Gmail draft yet, create it first
    if (!draftGmailId && inbox.draft_body) {
      const draft = await createGmailDraft(gmailToken, {
        threadId: inbox.gmail_thread_id,
        to: inbox.from_email,
        subject: `Re: ${inbox.subject || ""}`,
        html: formatDraftHtml(inbox.draft_body),
      });
      draftGmailId = draft.id;
    }

    if (!draftGmailId) {
      return jsonRes({ error: "Failed to create draft" }, 500);
    }

    const res = await fetch(`${GMAIL_API}/drafts/${draftGmailId}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${gmailToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: draftGmailId }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gmail send draft error:", err);
      return jsonRes({ error: "Failed to send draft" }, 500);
    }

    await supabase
      .from("email_inbox")
      .update({
        draft_status: "sent",
        draft_gmail_id: draftGmailId,
        reviewed_by: userData.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", inbox_id);

    return jsonRes({ ok: true, status: "sent" });
  }

  if (action === "reject-draft") {
    const { inbox_id } = body;
    const { data: inbox } = await supabase
      .from("email_inbox")
      .select("*")
      .eq("id", inbox_id)
      .single();

    if (inbox?.draft_gmail_id) {
      const gmailToken = await getGmailToken(supabase, inbox.organization_id);
      await fetch(`${GMAIL_API}/drafts/${inbox.draft_gmail_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${gmailToken}` },
      });
    }

    await supabase
      .from("email_inbox")
      .update({
        draft_status: "rejected",
        reviewed_by: userData.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", inbox_id);

    return jsonRes({ ok: true, status: "rejected" });
  }

  if (action === "process-manual") {
    const { organization_id, connection_id } = body;
    const gmailToken = await getGmailToken(supabase, organization_id, connection_id);

    // Fetch recent messages
    const listRes = await fetch(`${GMAIL_API}/messages?maxResults=10&labelIds=INBOX`, {
      headers: { Authorization: `Bearer ${gmailToken}` },
    });
    const list = await listRes.json();
    const messages = list.messages || [];

    let processed = 0;
    for (const msg of messages) {
      const { data: existing } = await supabase
        .from("email_inbox")
        .select("id")
        .eq("gmail_id", msg.id)
        .eq("organization_id", organization_id)
        .maybeSingle();

      if (existing) continue;

      const msgRes = await fetch(`${GMAIL_API}/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${gmailToken}` },
      });
      const email = await msgRes.json();
      await processEmail(supabase, email, organization_id, gmailToken);
      processed++;
    }

    return jsonRes({ ok: true, processed });
  }

  return jsonRes({ error: "Unknown action" }, 400);
}

// ─── Gmail Push Handler ──────────────────────────────────────────
async function handleGmailPush(supabase: any, body: any) {
  const pushData = JSON.parse(atob(body.message.data));
  console.log("Gmail push:", JSON.stringify(pushData));

  // Find the google connection for this email
  const { data: connections } = await supabase
    .from("google_connections")
    .select("*")
    .eq("email", pushData.emailAddress)
    .eq("is_active", true)
    .limit(1);

  const connection = connections?.[0];
  if (!connection) {
    console.log("No active google connection for", pushData.emailAddress);
    return new Response("OK", { status: 200 });
  }

  const orgId = connection.organization_id;
  const gmailToken = await getGmailToken(supabase, orgId, connection.id);

  // Get new messages via history
  const historyRes = await fetch(
    `${GMAIL_API}/history?startHistoryId=${pushData.historyId}&historyTypes=messageAdded&labelId=INBOX`,
    { headers: { Authorization: `Bearer ${gmailToken}` } }
  );
  const history = await historyRes.json();

  if (!history.history?.length) {
    return new Response("No new messages", { status: 200 });
  }

  for (const h of history.history) {
    for (const added of h.messagesAdded || []) {
      const messageId = added.message?.id;
      if (!messageId) continue;

      const { data: existing } = await supabase
        .from("email_inbox")
        .select("id")
        .eq("gmail_id", messageId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (existing) continue;

      const msgRes = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
        headers: { Authorization: `Bearer ${gmailToken}` },
      });
      const email = await msgRes.json();
      await processEmail(supabase, email, orgId, gmailToken);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Core email processing ───────────────────────────────────────
async function processEmail(supabase: any, email: any, orgId: string, gmailToken: string) {
  const from = parseFrom(email);
  const subject = getHeader(email, "Subject") || "(geen onderwerp)";
  const bodyText = extractPlainText(email);
  const snippet = email.snippet || bodyText.slice(0, 200);

  // Check rules
  const { data: rules } = await supabase
    .from("email_rules")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  let matchedRule: any = null;
  const fromLower = from.email.toLowerCase();

  for (const rule of rules || []) {
    const fromMatch = rule.match_from?.some((s: string) => fromLower.includes(s.toLowerCase()));
    const subjectMatch = rule.match_subject?.some((s: string) =>
      subject.toLowerCase().includes(s.toLowerCase())
    );
    if (fromMatch || subjectMatch) {
      matchedRule = rule;
      break;
    }
  }

  // Get context for AI
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, domain, phone")
    .eq("organization_id", orgId);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, company_id, description")
    .eq("organization_id", orgId)
    .in("status", ["active", "in_progress", "planning"]);

  // AI classification
  const aiResponse = await callClaude({
    from,
    subject,
    body: bodyText.slice(0, 3000),
    matchedRule,
    companies,
    projects,
  });

  // Label in Gmail
  const labelName = matchedRule?.label || aiResponse.label || "ongesorteerd";
  try {
    const labelId = await getOrCreateGmailLabel(gmailToken, labelName);
    if (aiResponse.category === "reclame" || aiResponse.category === "spam") {
      await archiveGmailMessage(gmailToken, email.id);
    } else {
      await modifyGmailLabels(gmailToken, email.id, [labelId], []);
    }
  } catch (e) {
    console.error("Label error (non-fatal):", e.message);
  }

  // Create draft if needed
  let draftId: string | null = null;
  let draftStatus = aiResponse.draft ? "pending" : "none";

  if (aiResponse.action === "reply_needed" && aiResponse.draft) {
    try {
      const draft = await createGmailDraft(gmailToken, {
        threadId: email.threadId,
        to: from.email,
        subject: `Re: ${subject}`,
        html: formatDraftHtml(aiResponse.draft),
        inReplyTo: getHeader(email, "Message-ID"),
        references: getHeader(email, "References"),
      });
      draftId = draft.id;
      draftStatus = "pending";
    } catch (e) {
      console.error("Draft creation error:", e.message);
    }
  }

  // Save to email_inbox
  await supabase.from("email_inbox").insert({
    organization_id: orgId,
    gmail_id: email.id,
    gmail_thread_id: email.threadId,
    from_email: from.email,
    from_name: from.name,
    subject,
    body_text: bodyText.slice(0, 5000),
    body_snippet: snippet,
    gmail_date: new Date(parseInt(email.internalDate)).toISOString(),
    category: aiResponse.category,
    confidence: aiResponse.confidence,
    ai_summary: aiResponse.summary,
    ai_action: aiResponse.action,
    ai_sentiment: aiResponse.sentiment,
    company_id: matchedRule?.company_id || aiResponse.company_id || null,
    project_id: aiResponse.project_id || null,
    gmail_label: labelName,
    draft_gmail_id: draftId,
    draft_status: draftStatus,
    draft_body: aiResponse.draft || null,
  });

  // Urgent notification
  if (aiResponse.sentiment === "urgent" || aiResponse.action === "urgent") {
    await sendUrgentNotification({
      from,
      subject,
      summary: aiResponse.summary,
      category: aiResponse.category,
    });
  }
}

// ─── AI Classification ───────────────────────────────────────────
async function callClaude(opts: {
  from: { name: string; email: string };
  subject: string;
  body: string;
  matchedRule: any;
  companies: any[];
  projects: any[];
}) {
  const companyList =
    opts.companies?.map((c: any) => `- ${c.name} (${c.domain || ""})`).join("\n") ||
    "Geen bedrijven gevonden";
  const projectList =
    opts.projects
      ?.map((p: any) => `- ${p.name} (status: ${p.status}, bedrijf: ${p.company_id})`)
      .join("\n") || "Geen actieve projecten";
  const preClass = opts.matchedRule
    ? `\nBekende afzender: ${opts.matchedRule.label} (${opts.matchedRule.category})`
    : "";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Je bent de email-assistent van SiteJob, een custom software development bedrijf in Eindhoven. Team: Kas (eigenaar/developer), Thomas (COO/operations), Jens (stagiair). Telefoonnummer: +31 40 304 15 39. Website: sitejob.nl`,
        messages: [
          {
            role: "user",
            content: `Analyseer deze email:

Van: ${opts.from.name} <${opts.from.email}>
Onderwerp: ${opts.subject}
${preClass}

Inhoud:
${opts.body}

Bekende bedrijven:
${companyList}

Actieve projecten:
${projectList}

Antwoord in dit exacte JSON format:
{
  "category": "klant|lead|reclame|factuur|intern|project|spam",
  "confidence": 0.0-1.0,
  "label": "klant/naam of categorie",
  "summary": "1-2 zinnen wat deze mail inhoudt",
  "action": "reply_needed|fyi_only|ignore|urgent",
  "sentiment": "positief|neutraal|negatief|urgent",
  "company_id": "uuid of null als niet te matchen",
  "project_id": "uuid of null als niet te matchen",
  "draft": "concept antwoord in het Nederlands, professioneel maar direct. Onderteken met 'Team SiteJob'. null als geen reply nodig."
}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Claude error:", e);
    return {
      category: opts.matchedRule?.category || "onbekend",
      confidence: 0.5,
      label: opts.matchedRule?.label || "ongesorteerd",
      summary: "Kon niet automatisch classificeren",
      action: "reply_needed",
      sentiment: "neutraal",
      company_id: null,
      project_id: null,
      draft: null,
    };
  }
}

// ─── Gmail Helpers ───────────────────────────────────────────────
async function getGmailToken(supabase: any, orgId: string, connectionId?: string): Promise<string> {
  let query = supabase
    .from("google_connections")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (connectionId) {
    query = query.eq("id", connectionId);
  }

  const { data } = await query.limit(1).single();
  if (!data?.refresh_token) throw new Error("No Gmail OAuth connection found");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await res.json();
  if (!tokens.access_token) throw new Error("Failed to refresh Gmail token");
  return tokens.access_token;
}

function getHeader(email: any, name: string): string {
  return (
    email.payload?.headers?.find(
      (h: any) => h.name.toLowerCase() === name.toLowerCase()
    )?.value || ""
  );
}

function parseFrom(email: any) {
  const raw = getHeader(email, "From");
  const match = raw.match(/(?:"?([^"]*)"?\s)?<?([^>]+@[^>]+)>?/);
  return {
    name: match?.[1]?.trim() || raw,
    email: match?.[2]?.trim() || raw,
  };
}

function extractPlainText(email: any): string {
  function findPart(part: any): string {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
    if (part.parts) {
      for (const p of part.parts) {
        const result = findPart(p);
        if (result) return result;
      }
    }
    return "";
  }
  return findPart(email.payload) || email.snippet || "";
}

async function getOrCreateGmailLabel(token: string, name: string): Promise<string> {
  const res = await fetch(`${GMAIL_API}/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { labels } = await res.json();
  const existing = labels?.find((l: any) => l.name === name);
  if (existing) return existing.id;

  const createRes = await fetch(`${GMAIL_API}/labels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });
  const newLabel = await createRes.json();
  return newLabel.id;
}

async function modifyGmailLabels(
  token: string,
  messageId: string,
  add: string[],
  remove: string[]
) {
  await fetch(`${GMAIL_API}/messages/${messageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
  });
}

async function archiveGmailMessage(token: string, messageId: string) {
  await modifyGmailLabels(token, messageId, [], ["INBOX"]);
}

async function createGmailDraft(
  token: string,
  opts: {
    threadId: string;
    to: string;
    subject: string;
    html: string;
    inReplyTo?: string;
    references?: string;
  }
) {
  const headers = [
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
  ];
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);

  const rawMessage = headers.join("\r\n") + "\r\n\r\n" + opts.html;
  const encoded = btoa(rawMessage)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(`${GMAIL_API}/drafts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { threadId: opts.threadId, raw: encoded },
    }),
  });
  return res.json();
}

function formatDraftHtml(text: string): string {
  const lines = text.split("\n").map((line: string) => `<p>${line}</p>`).join("");
  return `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">${lines}<br/><p style="color: #666; font-size: 12px; margin-top: 20px;">—<br/>Team SiteJob<br/>KICK Offices, Philips Stadion, Eindhoven<br/>+31 40 304 15 39 · <a href="https://www.sitejob.nl">www.sitejob.nl</a></p></div>`;
}

async function sendUrgentNotification(data: {
  from: { name: string; email: string };
  subject: string;
  summary: string;
  category: string;
}) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SiteJob Alert <alert@sitejob.nl>",
        to: ["kas@sitejob.nl"],
        subject: `⚡ URGENT: ${data.subject}`,
        html: `<h3>Urgente mail ontvangen</h3><p><strong>Van:</strong> ${data.from.name} (${data.from.email})</p><p><strong>Samenvatting:</strong> ${data.summary}</p><p><a href="https://mail.google.com">Open Gmail</a></p>`,
      }),
    });
  } catch (e) {
    console.error("Urgent notification error:", e);
  }
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
