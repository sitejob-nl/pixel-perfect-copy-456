import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const body = await req.json();
  const { action, connection_id, organization_id, ...params } = body;

  try {
    // Get connection and refresh if needed
    const { data: conn, error: connErr } = await supabase
      .from("google_connections")
      .select("*")
      .eq("id", connection_id)
      .single();

    if (connErr || !conn) {
      return json({ error: "Verbinding niet gevonden" }, 404);
    }

    let accessToken = conn.access_token;

    // Refresh token if expired
    if (new Date(conn.token_expires_at) <= new Date()) {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: conn.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshRes.json();
      if (!refreshRes.ok) {
        // Mark connection as inactive
        await supabase.from("google_connections").update({ is_active: false }).eq("id", connection_id);
        return json({ error: "Token vernieuwen mislukt. Koppel opnieuw.", needs_reauth: true }, 401);
      }

      accessToken = refreshData.access_token;
      await supabase.from("google_connections").update({
        access_token: refreshData.access_token,
        token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
      }).eq("id", connection_id);
    }

    // Handle actions
    switch (action) {
      case "list_messages": return await listMessages(accessToken, supabase, conn, params);
      case "get_message": return await getMessage(accessToken, params);
      case "send_email": return await sendEmail(accessToken, params);
      case "list_events": return await listEvents(accessToken, params);
      case "create_event": return await createEvent(accessToken, params);
      case "sync_emails": return await syncEmails(accessToken, supabase, conn, params);
      case "sync_calendar": return await syncCalendar(accessToken, supabase, conn, params);
      default:
        return json({ error: "Onbekende actie: " + action }, 400);
    }
  } catch (err: any) {
    console.error("Google API error:", err);
    return json({ error: err.message }, 500);
  }
});

async function listMessages(token: string, supabase: any, conn: any, params: any) {
  const { max_results = 20, query = "", page_token } = params;
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("maxResults", String(max_results));
  if (query) url.searchParams.set("q", query);
  if (page_token) url.searchParams.set("pageToken", page_token);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message || "Gmail API fout" }, res.status);

  // Fetch details for each message
  const messages = [];
  for (const msg of (data.messages || []).slice(0, max_results)) {
    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const detailData = await detail.json();
    if (detail.ok) {
      const headers = detailData.payload?.headers || [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
      messages.push({
        id: detailData.id,
        threadId: detailData.threadId,
        snippet: detailData.snippet,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        to: getHeader("To"),
        date: getHeader("Date"),
        labelIds: detailData.labelIds,
        isRead: !(detailData.labelIds || []).includes("UNREAD"),
      });
    }
  }

  return json({ messages, nextPageToken: data.nextPageToken, resultSizeEstimate: data.resultSizeEstimate });
}

async function getMessage(token: string, params: any) {
  const { message_id } = params;
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message_id}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message }, res.status);

  const headers = data.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  // Extract body
  let bodyHtml = "";
  let bodyText = "";
  function extractBody(part: any) {
    if (part.mimeType === "text/html" && part.body?.data) {
      bodyHtml = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    } else if (part.mimeType === "text/plain" && part.body?.data) {
      bodyText = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }
    if (part.parts) part.parts.forEach(extractBody);
  }
  extractBody(data.payload);

  return json({
    id: data.id,
    threadId: data.threadId,
    subject: getHeader("Subject"),
    from: getHeader("From"),
    to: getHeader("To"),
    cc: getHeader("Cc"),
    date: getHeader("Date"),
    bodyHtml,
    bodyText,
    snippet: data.snippet,
    labelIds: data.labelIds,
  });
}

async function sendEmail(token: string, params: any) {
  const { to, subject, body_html, cc, bcc, reply_to_message_id } = params;

  let rawHeaders = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=UTF-8\r\n`;
  if (cc) rawHeaders += `Cc: ${cc}\r\n`;
  if (bcc) rawHeaders += `Bcc: ${bcc}\r\n`;
  if (reply_to_message_id) rawHeaders += `In-Reply-To: ${reply_to_message_id}\r\nReferences: ${reply_to_message_id}\r\n`;
  rawHeaders += `\r\n${body_html}`;

  const encodedMessage = btoa(rawHeaders).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const url = reply_to_message_id
    ? `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
    : `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message }, res.status);
  return json({ success: true, messageId: data.id });
}

async function listEvents(token: string, params: any) {
  const { time_min, time_max, max_results = 50, calendar_id = "primary" } = params;
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`);
  if (time_min) url.searchParams.set("timeMin", time_min);
  if (time_max) url.searchParams.set("timeMax", time_max);
  url.searchParams.set("maxResults", String(max_results));
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message }, res.status);
  return json({ events: data.items || [], nextPageToken: data.nextPageToken });
}

async function createEvent(token: string, params: any) {
  const { calendar_id = "primary", summary, description, location, start, end, attendees } = params;
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`;

  const eventBody: any = { summary, description, location, start, end };
  if (attendees?.length) {
    eventBody.attendees = attendees.map((email: string) => ({ email }));
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(eventBody),
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message }, res.status);
  return json({ success: true, event: data });
}

async function syncEmails(token: string, supabase: any, conn: any, params: any) {
  const { max_results = 50 } = params;
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("maxResults", String(max_results));

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message }, res.status);

  let synced = 0;
  for (const msg of (data.messages || [])) {
    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const d = await detail.json();
    if (!detail.ok) continue;

    const headers = d.payload?.headers || [];
    const getH = (n: string) => headers.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value || "";
    const fromEmail = extractEmail(getH("From"));
    const toEmails = getH("To").split(",").map((e: string) => extractEmail(e.trim())).filter(Boolean);

    // Try to match contact
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, company_id")
      .eq("organization_id", conn.organization_id)
      .or(`email.eq.${fromEmail},email.in.(${toEmails.join(",")})`)
      .limit(1)
      .maybeSingle();

    await supabase.from("google_emails").upsert({
      organization_id: conn.organization_id,
      connection_id: conn.id,
      gmail_message_id: d.id,
      thread_id: d.threadId,
      subject: getH("Subject"),
      snippet: d.snippet,
      from_email: fromEmail,
      from_name: extractName(getH("From")),
      to_emails: toEmails,
      cc_emails: getH("Cc") ? getH("Cc").split(",").map((e: string) => extractEmail(e.trim())).filter(Boolean) : [],
      received_at: new Date(parseInt(d.internalDate || "0")).toISOString(),
      is_read: !(d.labelIds || []).includes("UNREAD"),
      labels: d.labelIds || [],
      contact_id: contact?.id || null,
      company_id: contact?.company_id || null,
    }, { onConflict: "connection_id,gmail_message_id" });

    synced++;
  }

  // Update last_sync_at
  await supabase.from("google_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);

  return json({ success: true, synced });
}

async function syncCalendar(token: string, supabase: any, conn: any, params: any) {
  const now = new Date();
  const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", "250");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message }, res.status);

  let synced = 0;
  for (const ev of (data.items || [])) {
    const startTime = ev.start?.dateTime || ev.start?.date;
    const endTime = ev.end?.dateTime || ev.end?.date;
    if (!startTime || !endTime) continue;

    await supabase.from("google_calendar_events").upsert({
      organization_id: conn.organization_id,
      connection_id: conn.id,
      google_event_id: ev.id,
      calendar_id: "primary",
      summary: ev.summary || "(Geen titel)",
      description: ev.description || null,
      location: ev.location || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      all_day: !!ev.start?.date,
      status: ev.status || "confirmed",
      attendees: ev.attendees || null,
      html_link: ev.htmlLink || null,
    }, { onConflict: "connection_id,google_event_id" });
    synced++;
  }

  await supabase.from("google_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);
  return json({ success: true, synced });
}

function extractEmail(str: string): string {
  const match = str.match(/<(.+?)>/) || str.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase() : str.toLowerCase().trim();
}

function extractName(str: string): string {
  const match = str.match(/^"?(.+?)"?\s*</);
  return match ? match[1].trim() : "";
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}
