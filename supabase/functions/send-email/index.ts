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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || serviceKey.slice(0, 32);

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Niet ingelogd");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get org
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (!membership) throw new Error("Geen organisatie gevonden");
    const orgId = membership.organization_id;

    const body = await req.json();
    const { action, ...params } = body;

    if (!action) throw new Error("Actie vereist");

    const resendKey = await getResendKey(adminClient, orgId, encryptionKey);

    const json = (r: Response) => r.json();

    // ─── SEND ───
    if (action === "send" || action === "send-template") {
      const { to, subject, html_content, from, reply_to, contact_id, template_id, send_type, scheduled_for } = params;
      if (!to || !subject || !html_content) throw new Error("to, subject en html_content zijn vereist");

      const fromAddr = from || `noreply@${orgId}.resend.dev`;
      const emailPayload: any = {
        from: fromAddr,
        to: [to],
        subject,
        html: html_content,
      };
      if (reply_to) emailPayload.reply_to = reply_to;
      if (scheduled_for) {
        emailPayload.scheduled_at = scheduled_for;
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });
      const resData = await json(res);
      if (!res.ok) throw new Error(resData?.message || "Resend fout");

      // Log in email_sends
      await adminClient.from("email_sends").insert({
        organization_id: orgId,
        to_address: to,
        from_address: fromAddr,
        subject,
        html_content,
        resend_id: resData.id,
        status: scheduled_for ? "queued" : "sent",
        sent_at: scheduled_for ? null : new Date().toISOString(),
        scheduled_for: scheduled_for || null,
        contact_id: contact_id || null,
        template_id: template_id || null,
        send_type: send_type || "manual",
        reply_to: reply_to || null,
      });

      return new Response(JSON.stringify({ success: true, id: resData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── SEND TEST ───
    if (action === "send-test") {
      const { subject, html_content, from } = params;
      const fromAddr = from || `noreply@${orgId}.resend.dev`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromAddr, to: [user.email], subject: `[TEST] ${subject}`, html: html_content }),
      });
      const resData = await json(res);
      if (!res.ok) throw new Error(resData?.message || "Resend fout");
      return new Response(JSON.stringify({ success: true, id: resData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── GET STATS ───
    if (action === "get-stats") {
      const { data: stats } = await adminClient
        .from("email_sends")
        .select("status")
        .eq("organization_id", orgId);

      const counts = { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 };
      for (const row of stats || []) {
        counts.total++;
        const s = row.status as keyof typeof counts;
        if (s in counts) counts[s]++;
      }
      return new Response(JSON.stringify(counts), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── SEND OUTREACH ───
    if (action === "send-outreach") {
      const { to, subject, html_content, from, reply_to, contact_id, template_id } = params;
      if (!to || !subject || !html_content) throw new Error("to, subject en html_content zijn vereist");
      const fromAddr = from || `noreply@${orgId}.resend.dev`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromAddr, to: [to], subject, html: html_content, reply_to: reply_to || undefined }),
      });
      const resData = await json(res);
      if (!res.ok) throw new Error(resData?.message || "Resend fout");

      await adminClient.from("email_sends").insert({
        organization_id: orgId,
        to_address: to,
        from_address: fromAddr,
        subject,
        html_content,
        resend_id: resData.id,
        status: "sent",
        sent_at: new Date().toISOString(),
        contact_id: contact_id || null,
        template_id: template_id || null,
        send_type: "outreach",
        reply_to: reply_to || null,
      });

      return new Response(JSON.stringify({ success: true, id: resData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Onbekende actie: ${action}`);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
