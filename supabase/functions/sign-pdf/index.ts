import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Decrypt XOR-encrypted API key
 */
function decryptKey(encrypted: string, encKey: string): string {
  const raw = atob(encrypted);
  let result = "";
  for (let i = 0; i < raw.length; i++) {
    result += String.fromCharCode(raw.charCodeAt(i) ^ encKey.charCodeAt(i % encKey.length));
  }
  return result;
}

/**
 * Convert base64 data URL to Uint8Array
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid data URL");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a basic PDF from HTML content (simplified — uses text extraction)
 */
async function createPdfFromHtml(html: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Strip HTML tags and decode entities
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = text.split("\n");
  const pageWidth = 595; // A4
  const pageHeight = 842;
  const margin = 50;
  const lineHeight = 14;
  const maxWidth = pageWidth - 2 * margin;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      y -= lineHeight;
      if (y < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      continue;
    }

    // Word-wrap
    const words = trimmed.split(/\s+/);
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, 10);
      if (width > maxWidth && currentLine) {
        page.drawText(currentLine, { x: margin, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
        y -= lineHeight;
        if (y < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x: margin, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight;
      if (y < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    }
  }

  return pdfDoc.save();
}

/**
 * Embed signatures into PDF
 */
async function embedSignaturesInPdf(
  pdfBytes: Uint8Array,
  sessions: any[],
  signatureFields: any[] | null,
  contract_id: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width: pageWidth, height: pageHeight } = lastPage.getSize();

  // If there are positioned signature fields, use those
  if (signatureFields && signatureFields.length > 0) {
    for (const field of signatureFields) {
      const session = sessions[field.signerIndex || 0];
      if (!session || session.status !== "signed") continue;

      const targetPage = pages[field.page || 0] || lastPage;
      const { width: pw, height: ph } = targetPage.getSize();

      const x = (field.x / 100) * pw;
      const y = ph - (field.y / 100) * ph - (field.height / 100) * ph;
      const fieldW = (field.width / 100) * pw;
      const fieldH = (field.height / 100) * ph;

      if (field.type === "signature" && session.signature_data) {
        if (session.signature_type === "draw" && session.signature_data.startsWith("data:image")) {
          try {
            const imgBytes = dataUrlToBytes(session.signature_data);
            const img = await pdfDoc.embedPng(imgBytes);
            const dims = img.scaleToFit(fieldW, fieldH);
            targetPage.drawImage(img, {
              x: x + (fieldW - dims.width) / 2,
              y: y + (fieldH - dims.height) / 2,
              width: dims.width,
              height: dims.height,
            });
          } catch (e) {
            console.error("Failed to embed drawn signature:", e);
            // Fallback to text
            targetPage.drawText(session.signer_name || "Getekend", {
              x, y: y + fieldH / 3, size: 12, font, color: rgb(0.1, 0.1, 0.3),
            });
          }
        } else {
          // Typed signature
          targetPage.drawText(session.signature_data, {
            x, y: y + fieldH / 3, size: 14, font, color: rgb(0.1, 0.1, 0.3),
          });
        }
      } else if (field.type === "name") {
        targetPage.drawText(session.signer_name || "", {
          x, y: y + 4, size: 10, font, color: rgb(0.1, 0.1, 0.1),
        });
      } else if (field.type === "date") {
        const dateStr = session.signed_at
          ? new Date(session.signed_at).toLocaleDateString("nl-NL")
          : new Date().toLocaleDateString("nl-NL");
        targetPage.drawText(dateStr, {
          x, y: y + 4, size: 10, font, color: rgb(0.1, 0.1, 0.1),
        });
      } else if (field.type === "initials") {
        const initials = (session.signer_name || "")
          .split(" ")
          .map((w: string) => w[0]?.toUpperCase() || "")
          .join("");
        targetPage.drawText(initials, {
          x, y: y + 4, size: 12, fontBold, color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  } else {
    // No positioned fields — append signature block at bottom of last page or new page
    let y = 120;
    const needsNewPage = pageHeight - 100 < y + sessions.length * 80;
    const sigPage = needsNewPage ? pdfDoc.addPage([pageWidth, pageHeight]) : lastPage;
    if (needsNewPage) y = pageHeight - 80;

    // Separator line
    sigPage.drawLine({
      start: { x: 50, y: y + 20 },
      end: { x: pageWidth - 50, y: y + 20 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    sigPage.drawText("Ondertekeningen", {
      x: 50, y: y + 30, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1),
    });

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (s.status !== "signed") continue;

      const blockY = y - i * 80;

      // Signer info
      sigPage.drawText(`${s.signer_name} (${s.signer_role || "Ondertekenaar"})`, {
        x: 50, y: blockY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1),
      });

      const dateStr = s.signed_at
        ? new Date(s.signed_at).toLocaleDateString("nl-NL", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "";
      sigPage.drawText(`Getekend op: ${dateStr}`, {
        x: 50, y: blockY - 14, size: 8, font, color: rgb(0.4, 0.4, 0.4),
      });

      // Embed signature image or typed name
      if (s.signature_type === "draw" && s.signature_data?.startsWith("data:image")) {
        try {
          const imgBytes = dataUrlToBytes(s.signature_data);
          const img = await pdfDoc.embedPng(imgBytes);
          const dims = img.scaleToFit(150, 50);
          sigPage.drawImage(img, {
            x: 50,
            y: blockY - 14 - dims.height - 4,
            width: dims.width,
            height: dims.height,
          });
        } catch {
          sigPage.drawText(s.signer_name, {
            x: 50, y: blockY - 30, size: 14, font, color: rgb(0.1, 0.1, 0.3),
          });
        }
      } else if (s.signature_data) {
        sigPage.drawText(s.signature_data, {
          x: 50, y: blockY - 30, size: 14, font, color: rgb(0.1, 0.1, 0.3),
        });
      }
    }
  }

  // ─── Audit Trail Page ─────────────────────────────────────────────
  const auditSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: auditLogs } = await auditSb
    .from("contract_audit_logs")
    .select("*")
    .eq("contract_id", contract_id)
    .order("created_at", { ascending: true });

  // Re-fetch sessions with IP/fingerprint data
  const { data: fullSessions } = await auditSb
    .from("contract_signing_sessions")
    .select("*")
    .eq("contract_id", contract_id)
    .eq("status", "signed");

  const auditFont = font;
  const auditFontBold = fontBold;

  let currentAuditPage = pdfDoc.addPage([595, 842]);
  let ay = 800;

  const drawOnAudit = (text: string, x: number, size: number, f: any, c: any) => {
    if (ay < 50) {
      currentAuditPage = pdfDoc.addPage([595, 842]);
      ay = 800;
    }
    currentAuditPage.drawText(text.substring(0, 120), { x, y: ay, size, font: f, color: c });
    ay -= size + 3;
  };

  drawOnAudit("Audit Trail — Bewijs van Ondertekening", 50, 14, auditFontBold, rgb(0.1, 0.1, 0.15));
  ay -= 4;
  currentAuditPage.drawLine({ start: { x: 50, y: ay + 8 }, end: { x: 545, y: ay + 8 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  ay -= 8;

  // Contract info
  const auditInfo = [
    ["Contracttitel", contract.title || "—"],
    ["Contractnummer", contract.contract_number || "—"],
    ["PDF gegenereerd", new Date().toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "medium" })],
  ];
  for (const [label, value] of auditInfo) {
    drawOnAudit(`${label}:  ${value}`, 50, 8, auditFont, rgb(0.2, 0.2, 0.2));
  }
  ay -= 6;

  // Signer details
  drawOnAudit("Ondertekenaars", 50, 11, auditFontBold, rgb(0.1, 0.1, 0.15));
  ay -= 4;

  for (const s of (fullSessions || signedSessions)) {
    drawOnAudit(`${s.signer_name} (${s.signer_role || "Ondertekenaar"})`, 50, 9, auditFontBold, rgb(0.1, 0.1, 0.2));

    const details: [string, string][] = [
      ["E-mail", s.signer_email || "—"],
      ["Telefoon", s.signer_phone || "—"],
      ["Ondertekend op", s.signed_at ? new Date(s.signed_at).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "medium" }) : "—"],
      ["Handtekening", s.signature_type === "draw" ? "Getekend (canvas)" : "Getypt"],
      ["SMS geverifieerd", s.sms_verified_at ? new Date(s.sms_verified_at).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "medium" }) : "—"],
      ["IP-adres", s.ip_address || "—"],
      ["User agent", (s.user_agent || s.browser_fingerprint || "—").substring(0, 90)],
      ["Document hash", s.signed_document_hash ? s.signed_document_hash.substring(0, 48) + "..." : "—"],
    ];

    // Geolocation
    if (s.geolocation && typeof s.geolocation === "object") {
      const geo = s.geolocation as Record<string, any>;
      if (geo.latitude && geo.longitude) {
        details.push(["Locatie", `${geo.latitude}, ${geo.longitude} (±${geo.accuracy || "?"}m)`]);
      }
    }

    for (const [label, value] of details) {
      if (ay < 50) { currentAuditPage = pdfDoc.addPage([595, 842]); ay = 800; }
      currentAuditPage.drawText(`${label}:`, { x: 60, y: ay, size: 7, font: auditFont, color: rgb(0.4, 0.4, 0.4) });
      currentAuditPage.drawText(value, { x: 155, y: ay, size: 7, font: auditFont, color: rgb(0.15, 0.15, 0.15) });
      ay -= 11;
    }
    ay -= 8;
  }

  // Event log
  if (auditLogs && auditLogs.length > 0) {
    drawOnAudit("Gebeurtenissenlog", 50, 11, auditFontBold, rgb(0.1, 0.1, 0.15));
    ay -= 2;

    for (const log of auditLogs) {
      if (ay < 50) { currentAuditPage = pdfDoc.addPage([595, 842]); ay = 800; }
      const ts = log.created_at ? new Date(log.created_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "medium" }) : "";
      const ip = log.ip_address || (log.metadata as any)?.ip_address || "";
      const line = `${ts}  |  ${log.action}  |  ${log.signer_name || "systeem"}${ip ? `  |  IP: ${ip}` : ""}`;
      currentAuditPage.drawText(line.substring(0, 110), { x: 50, y: ay, size: 6.5, font: auditFont, color: rgb(0.3, 0.3, 0.3) });
      ay -= 10;
    }
  }

  // Legal footer
  currentAuditPage.drawText("Dit document is elektronisch ondertekend conform artikel 3:15a BW en de Europese eIDAS-verordening (EU 910/2014).", {
    x: 50, y: 20, size: 6.5, font: auditFont, color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}

// ─── Main handler ───────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { contract_id } = body;

    if (!contract_id) {
      return json({ error: "contract_id is vereist" }, 400);
    }

    const sb = serviceClient();

    // Fetch contract with sessions
    const { data: contract, error: cErr } = await sb
      .from("contracts")
      .select("*, contract_signing_sessions(*), contract_templates(*)")
      .eq("id", contract_id)
      .single();

    if (cErr || !contract) {
      return json({ error: "Contract niet gevonden" }, 404);
    }

    const sessions = contract.contract_signing_sessions || [];
    const signedSessions = sessions.filter((s: any) => s.status === "signed");

    if (signedSessions.length === 0) {
      return json({ error: "Geen ondertekende sessies gevonden" }, 400);
    }

    // Step 1: Generate base PDF from contract HTML
    const htmlContent = contract.rendered_html || contract.content || "";
    const basePdfBytes = await createPdfFromHtml(htmlContent);

    // Step 2: Embed signatures
    const signatureFields = contract.signature_fields || null;
    const signedPdfBytes = await embedSignaturesInPdf(
      new Uint8Array(basePdfBytes),
      signedSessions,
      signatureFields,
      contract_id
    );

    // Step 3: Generate document hash
    const docHash = await sha256(
      new TextDecoder().decode(signedPdfBytes).substring(0, 10000) +
        contract_id +
        new Date().toISOString()
    );

    // Step 4: Upload to Supabase Storage
    const fileName = `${contract.contract_number || contract_id}_signed_${Date.now()}.pdf`;
    const filePath = `${contract.organization_id}/${fileName}`;

    const { error: uploadErr } = await sb.storage
      .from("signed-contracts")
      .upload(filePath, signedPdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return json({ error: "PDF upload mislukt: " + uploadErr.message }, 500);
    }

    // Get public URL
    const { data: urlData } = sb.storage.from("signed-contracts").getPublicUrl(filePath);
    const pdfUrl = urlData?.publicUrl || "";

    // Step 5: Update contract record
    await sb
      .from("contracts")
      .update({
        signed_pdf_url: pdfUrl,
        signed_hash: docHash,
        certificate_fingerprint: docHash.substring(0, 16),
      })
      .eq("id", contract_id);

    // Step 6: Write audit log
    await sb.from("contract_audit_logs").insert({
      contract_id,
      organization_id: contract.organization_id,
      action: "pdf_generated",
      event_type: "document",
      document_hash: docHash,
      metadata: {
        file_path: filePath,
        pdf_url: pdfUrl,
        signed_sessions: signedSessions.length,
        total_sessions: sessions.length,
      },
    });

    // Step 7: Send confirmation email to all signed parties
    try {
      const { data: apiKeyRow } = await sb
        .from("organization_api_keys")
        .select("resend_api_key_encrypted")
        .eq("organization_id", contract.organization_id)
        .single();

      if (apiKeyRow?.resend_api_key_encrypted) {
        const encKey = Deno.env.get("ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(0, 32);
        const resendKey = decryptKey(apiKeyRow.resend_api_key_encrypted, encKey);

        for (const session of signedSessions) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "noreply@sitejob.nl",
              to: [session.signer_email],
              subject: `Bevestiging ondertekening: ${contract.title}`,
              html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;">
                  <h2 style="color:#1e40af;">Ondertekening bevestigd ✅</h2>
                  <p>Beste ${session.signer_name},</p>
                  <p>Uw ondertekening van <strong>${contract.title}</strong> is succesvol verwerkt.</p>
                  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Contractnummer</td><td style="padding:8px 0;font-weight:600;">${contract.contract_number || "—"}</td></tr>
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Getekend op</td><td style="padding:8px 0;font-weight:600;">${session.signed_at ? new Date(session.signed_at).toLocaleDateString("nl-NL", { year: "numeric", month: "long", day: "numeric" }) : "—"}</td></tr>
                    <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Document hash</td><td style="padding:8px 0;font-family:monospace;font-size:12px;">${docHash.substring(0, 24)}...</td></tr>
                  </table>
                  ${pdfUrl ? `<p><a href="${pdfUrl}" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Download getekend contract</a></p>` : ""}
                  <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Dit contract is elektronisch ondertekend conform artikel 3:15a BW en de Europese eIDAS-verordening.</p>
                </div>
              `,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.error("Confirmation email error:", emailErr);
      // Non-fatal — PDF is already generated
    }

    return json({
      success: true,
      pdf_url: pdfUrl,
      document_hash: docHash,
      file_path: filePath,
    });
  } catch (e) {
    console.error("sign-pdf error:", e);
    return json({ error: "Interne serverfout: " + (e as Error).message }, 500);
  }
});
