import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/** Simple SHA-256 hex hash */
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate 6-digit code */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── GET action=get ─────────────────────────────────────────────────
async function handleGet(token: string) {
  const sb = serviceClient();

  const { data: session, error: sErr } = await sb
    .from("contract_signing_sessions")
    .select("*, contracts(*)")
    .eq("session_token", token)
    .single();

  if (sErr || !session) return json({ error: "Ongeldige of verlopen link" }, 404);

  // Check expiry
  if (new Date(session.expires_at) < new Date()) {
    return json({ error: "Deze ondertekeningslink is verlopen" }, 410);
  }

  const contract = session.contracts;
  delete session.contracts;

  // Strip sensitive fields from session
  const safeSession = {
    id: session.id,
    signer_name: session.signer_name,
    signer_email: session.signer_email,
    signer_phone: session.signer_phone
      ? session.signer_phone.replace(/(\+31|0031|0)(\d{1})(\d+)(\d{2})/, "$1$2*****$4")
      : null,
    signer_role: session.signer_role,
    status: session.status,
    signed_at: session.signed_at,
    sms_verified_at: session.sms_verified_at,
    verification_attempts: session.verification_attempts || 0,
  };

  // Write audit log
  await sb.from("contract_audit_logs").insert({
    contract_id: contract.id,
    organization_id: contract.organization_id,
    session_id: session.id,
    action: "contract_viewed",
    event_type: "view",
    signer_name: session.signer_name,
    signer_email: session.signer_email,
  });

  return json({ contract, session: safeSession });
}

// ─── GET action=send_sms ────────────────────────────────────────────
async function handleSendSms(token: string) {
  const sb = serviceClient();

  const { data: session, error } = await sb
    .from("contract_signing_sessions")
    .select("id, signer_phone, signer_name, signer_email, contract_id, organization_id, sms_sent_at, status")
    .eq("session_token", token)
    .single();

  if (error || !session) return json({ error: "Sessie niet gevonden" }, 404);
  if (session.status === "signed") return json({ error: "Contract is al ondertekend" }, 400);

  // Rate limit: max 1 SMS per 60 seconds
  if (session.sms_sent_at) {
    const diff = Date.now() - new Date(session.sms_sent_at).getTime();
    if (diff < 60000) {
      return json({ error: "Wacht even voordat u opnieuw een code aanvraagt", retry_after: Math.ceil((60000 - diff) / 1000) }, 429);
    }
  }

  const code = generateCode();
  const codeHash = await sha256(code);

  // Update session with new code hash
  await sb
    .from("contract_signing_sessions")
    .update({
      sms_code_hash: codeHash,
      sms_sent_at: new Date().toISOString(),
      verification_attempts: 0,
    })
    .eq("id", session.id);

  // Send SMS via Twilio connector gateway
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
  const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

  if (!LOVABLE_API_KEY) return json({ error: "Server configuratiefout: LOVABLE_API_KEY ontbreekt" }, 500);
  if (!TWILIO_API_KEY) return json({ error: "Server configuratiefout: TWILIO_API_KEY ontbreekt" }, 500);
  if (!TWILIO_FROM_NUMBER) return json({ error: "Server configuratiefout: TWILIO_FROM_NUMBER ontbreekt" }, 500);

  try {
    const smsRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: session.signer_phone,
        From: TWILIO_FROM_NUMBER,
        Body: `Uw verificatiecode voor contractondertekening: ${code}. Geldig voor 10 minuten.`,
      }),
    });

    if (!smsRes.ok) {
      const errBody = await smsRes.text();
      console.error(`Twilio SMS failed [${smsRes.status}]:`, errBody);
      return json({ error: "SMS kon niet worden verzonden. Probeer het later opnieuw." }, 502);
    }

    console.log("SMS sent via Twilio successfully");
  } catch (e) {
    console.error("Twilio SMS send error:", e);
    return json({ error: "SMS kon niet worden verzonden door een serverfout." }, 500);
  }

  // Audit log
  await sb.from("contract_audit_logs").insert({
    contract_id: session.contract_id,
    organization_id: session.organization_id,
    session_id: session.id,
    action: "sms_code_sent",
    event_type: "verification",
    signer_name: session.signer_name,
    signer_email: session.signer_email,
  });

  return json({ success: true, message: "Verificatiecode verzonden" });
}

// ─── GET action=verify_sms ──────────────────────────────────────────
async function handleVerifySms(token: string, code: string) {
  const sb = serviceClient();

  const { data: session, error } = await sb
    .from("contract_signing_sessions")
    .select("id, sms_code_hash, verification_attempts, contract_id, organization_id, signer_name, signer_email, sms_sent_at")
    .eq("session_token", token)
    .single();

  if (error || !session) return json({ error: "Sessie niet gevonden" }, 404);

  // Max 5 attempts
  const attempts = (session.verification_attempts || 0) + 1;
  if (attempts > 5) {
    return json({ error: "Te veel pogingen. Vraag een nieuwe code aan." }, 429);
  }

  // Update attempt count
  await sb
    .from("contract_signing_sessions")
    .update({ verification_attempts: attempts })
    .eq("id", session.id);

  // Check if code expired (10 minutes)
  if (session.sms_sent_at) {
    const diff = Date.now() - new Date(session.sms_sent_at).getTime();
    if (diff > 600000) {
      return json({ error: "Code verlopen. Vraag een nieuwe code aan." }, 400);
    }
  }

  // Verify hash
  const inputHash = await sha256(code);
  if (inputHash !== session.sms_code_hash) {
    return json({ error: `Ongeldige code. ${5 - attempts} pogingen resterend.`, attempts_remaining: 5 - attempts }, 400);
  }

  // Mark verified
  await sb
    .from("contract_signing_sessions")
    .update({ sms_verified_at: new Date().toISOString(), status: "verified" })
    .eq("id", session.id);

  // Audit log
  await sb.from("contract_audit_logs").insert({
    contract_id: session.contract_id,
    organization_id: session.organization_id,
    session_id: session.id,
    action: "sms_verified",
    event_type: "verification",
    signer_name: session.signer_name,
    signer_email: session.signer_email,
  });

  return json({ success: true, verified: true });
}

// ─── POST action=sign ───────────────────────────────────────────────
async function handleSign(req: Request) {
  const body = await req.json();
  const { token, signature_data, signature_type, consent_accepted, geolocation } = body;

  if (!token || !signature_data || !consent_accepted) {
    return json({ error: "Ontbrekende verplichte velden" }, 400);
  }

  const sb = serviceClient();

  const { data: session, error } = await sb
    .from("contract_signing_sessions")
    .select("*, contracts(*)")
    .eq("session_token", token)
    .single();

  if (error || !session) return json({ error: "Sessie niet gevonden" }, 404);
  if (session.status === "signed") return json({ error: "Contract is al ondertekend" }, 400);
  if (!session.sms_verified_at) return json({ error: "SMS verificatie vereist" }, 403);

  const contract = session.contracts;
  const now = new Date().toISOString();

  // Generate document hash
  const docContent = contract.rendered_html || contract.content || "";
  const documentHash = await sha256(docContent + signature_data + now);

  // Get user agent from request
  const userAgent = req.headers.get("user-agent") || "";

  // Update signing session
  await sb
    .from("contract_signing_sessions")
    .update({
      status: "signed",
      signed_at: now,
      signature_data: signature_data,
      signature_type: signature_type || "draw",
      signed_document_hash: documentHash,
      consent_accepted_at: now,
      consent_text: "Ik verklaar dat ik het contract heb gelezen en ga akkoord met de inhoud. Elektronische handtekening conform artikel 3:15a BW en eIDAS.",
      geolocation: geolocation || null,
      user_agent: userAgent,
    })
    .eq("id", session.id);

  // Check if all sessions for this contract are signed
  const { data: allSessions } = await sb
    .from("contract_signing_sessions")
    .select("id, status")
    .eq("contract_id", contract.id);

  const allSigned = allSessions?.every((s: any) => s.status === "signed" || s.id === session.id);

  // Update contract status
  const contractUpdate: Record<string, unknown> = {
    status: allSigned ? "signed" : "partially_signed",
    signed_at: allSigned ? now : contract.signed_at,
    signed_hash: documentHash,
  };

  if (allSigned) {
    contractUpdate.completed_at = now;
    
    // Trigger PDF generation asynchronously
    try {
      const signPdfUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/sign-pdf";
      fetch(signPdfUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contract.id }),
      }).catch((e) => console.error("sign-pdf trigger error:", e));
    } catch (e) {
      console.error("Failed to trigger sign-pdf:", e);
    }
  }

  await sb
    .from("contracts")
    .update(contractUpdate)
    .eq("id", contract.id);

  // Audit log
  await sb.from("contract_audit_logs").insert({
    contract_id: contract.id,
    organization_id: contract.organization_id,
    session_id: session.id,
    action: "contract_signed",
    event_type: "signature",
    signer_name: session.signer_name,
    signer_email: session.signer_email,
    document_hash: documentHash,
    geolocation: geolocation || null,
    user_agent: userAgent,
    metadata: {
      signature_type: signature_type || "draw",
      all_signed: allSigned,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
    },
  });

  return json({
    success: true,
    document_hash: documentHash,
    all_signed: allSigned,
    signed_at: now,
  });
}

// ─── Router ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";
    const token = url.searchParams.get("token") || "";

    if (req.method === "GET") {
      switch (action) {
        case "get":
          return await handleGet(token);
        case "send_sms":
          return await handleSendSms(token);
        case "verify_sms": {
          const code = url.searchParams.get("code") || "";
          return await handleVerifySms(token, code);
        }
        default:
          return json({ error: "Onbekende actie" }, 400);
      }
    }

    if (req.method === "POST") {
      return await handleSign(req);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error("contract-signing error:", e);
    return json({ error: "Interne serverfout" }, 500);
  }
});
