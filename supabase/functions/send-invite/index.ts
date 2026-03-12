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

function buildInviteHtml(params: {
  orgName: string;
  inviterName: string;
  role: string;
  actionUrl: string;
  logoUrl: string | null;
  primaryColor: string | null;
}): string {
  const { orgName, inviterName, role, actionUrl, logoUrl, primaryColor } = params;
  const color = primaryColor || "#32C5FF";
  const gradientEnd = primaryColor ? adjustColor(primaryColor, -20) : "#1E90FF";

  const roleDutch: Record<string, string> = {
    owner: "Eigenaar",
    admin: "Beheerder",
    member: "Teamlid",
  };
  const roleLabel = roleDutch[role] || role;

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:40px;max-width:180px;object-fit:contain;" />`
    : `<div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-block;text-align:center;line-height:36px;">
          <span style="color:#fff;font-size:18px;font-weight:bold;">${orgName.charAt(0).toUpperCase()}</span>
        </div>
        <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:-0.3px;">${orgName}</span>
      </div>`;

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,${color} 0%,${gradientEnd} 100%);padding:32px 40px;text-align:center;">
        ${logoHtml}
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 40px 32px 40px;">
        <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.3;">
          Je bent uitgenodigd! 🎉
        </h1>
        <p style="margin:0 0 24px 0;font-size:15px;color:#6b7280;line-height:1.6;">
          <strong style="color:#1a1a2e;">${inviterName}</strong> heeft je uitgenodigd om lid te worden van
          <strong style="color:#1a1a2e;">${orgName}</strong> als <strong style="color:${color};">${roleLabel}</strong>.
        </p>

        <!-- Info card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
          <tr><td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#9ca3af;padding-bottom:6px;">Organisatie</td>
                <td style="font-size:13px;color:#9ca3af;padding-bottom:6px;text-align:right;">Rol</td>
              </tr>
              <tr>
                <td style="font-size:15px;font-weight:600;color:#1a1a2e;">${orgName}</td>
                <td style="font-size:15px;font-weight:600;color:${color};text-align:right;">${roleLabel}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${actionUrl}" target="_blank" style="display:inline-block;background:${color};color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.2px;">
              Uitnodiging accepteren
            </a>
          </td></tr>
        </table>

        <p style="margin:24px 0 0 0;font-size:13px;color:#9ca3af;line-height:1.5;text-align:center;">
          Na het klikken kun je een wachtwoord instellen voor je account.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 40px 28px 40px;border-top:1px solid #f0f0f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#c4c4c8;line-height:1.5;">
          Deze uitnodiging is 7 dagen geldig.<br>
          Als je deze uitnodiging niet verwachtte, kun je deze e-mail negeren.
        </p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Darken/lighten a hex color */
function adjustColor(hex: string, amount: number): string {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const num = parseInt(c, 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  let b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY") || serviceKey.slice(0, 32);

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Niet ingelogd");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get caller's org membership
    const { data: membership } = await adminClient
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (!membership) throw new Error("Geen organisatie gevonden");

    if (!["owner", "admin"].includes(membership.role)) {
      throw new Error("Alleen admins en eigenaren kunnen uitnodigen");
    }

    const orgId = membership.organization_id;
    const body = await req.json();
    const { email, role, redirect_url } = body;

    if (!email) throw new Error("E-mailadres is vereist");
    const inviteRole = role || "member";

    // Get org details (name, logo, colors)
    const { data: orgData } = await adminClient
      .from("organizations")
      .select("name, logo_url, primary_color")
      .eq("id", orgId)
      .single();
    const orgName = orgData?.name || "Organisatie";
    const logoUrl = orgData?.logo_url || null;
    const primaryColor = orgData?.primary_color || null;

    // Get inviter name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const inviterName = profile?.full_name || user.email || "Een teamlid";

    // Create invite record
    const { data: invite, error: inviteErr } = await adminClient
      .from("organization_invites")
      .insert({
        organization_id: orgId,
        email,
        role: inviteRole,
        invited_by: user.id,
      })
      .select()
      .single();
    if (inviteErr) throw inviteErr;

    // Generate Supabase invite link or handle existing user
    const baseRedirect = redirect_url || body.origin || "https://pixel-perfect-copy-456.lovable.app";
    const redirectTo = `${baseRedirect}/accept-invite?invite_token=${invite.token}`;

    let actionLink: string | null = null;
    let existingUser = false;

    // First try invite link (for new users)
    const { data: linkData, error: linkErr } =
      await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo,
          data: { full_name: "" },
        },
      });

    if (linkErr) {
      // If user already exists, check if they're already in this org
      if (linkErr.message?.includes("already been registered") || (linkErr as any).code === "email_exists") {
        existingUser = true;

        // Look up existing user
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = usersData?.users?.find((u: any) => u.email === email);

        if (existingAuthUser) {
          // Check if already a member of this org
          const { data: existingMember } = await adminClient
            .from("organization_members")
            .select("id, is_active")
            .eq("organization_id", orgId)
            .eq("user_id", existingAuthUser.id)
            .maybeSingle();

          if (existingMember?.is_active) {
            // Already active member — clean up invite and inform
            await adminClient.from("organization_invites").delete().eq("id", invite.id);
            throw new Error("Deze gebruiker is al lid van je organisatie");
          }

          if (existingMember && !existingMember.is_active) {
            // Re-activate existing membership
            await adminClient
              .from("organization_members")
              .update({ is_active: true, role: inviteRole, joined_at: new Date().toISOString() })
              .eq("id", existingMember.id);
          } else {
            // Add as new member
            await adminClient.from("organization_members").insert({
              organization_id: orgId,
              user_id: existingAuthUser.id,
              role: inviteRole,
              is_active: true,
              joined_at: new Date().toISOString(),
            });
          }

          // Mark invite as accepted
          await adminClient
            .from("organization_invites")
            .update({ accepted_at: new Date().toISOString() })
            .eq("id", invite.id);

          // Generate a magic link so they can sign in
          const { data: magicData } = await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${baseRedirect}/dashboard` },
          });
          actionLink = magicData?.properties?.action_link || null;
        } else {
          throw new Error("Gebruiker niet gevonden ondanks bestaande registratie");
        }
      } else {
        throw linkErr;
      }
    } else {
      actionLink = linkData?.properties?.action_link || linkData?.properties?.hashed_token || null;
    }

    if (!actionLink && !existingUser) throw new Error("Kon geen uitnodigingslink genereren");

    // Get Resend key
    const { data: apiKeys } = await adminClient
      .from("organization_api_keys")
      .select("resend_api_key_encrypted")
      .eq("organization_id", orgId)
      .single();

    const resendEncrypted = apiKeys?.resend_api_key_encrypted;
    if (!resendEncrypted) {
      return new Response(
        JSON.stringify({
          success: true,
          invite_id: invite.id,
          action_link: actionLink,
          email_sent: false,
          message:
            "Resend API key niet ingesteld. Deel de link handmatig of configureer Resend in Instellingen → API Keys.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = decrypt(resendEncrypted as string, encryptionKey);

    // Build and send email with branding
    const html = buildInviteHtml({
      orgName,
      inviterName,
      role: inviteRole,
      actionUrl: actionLink,
      logoUrl,
      primaryColor,
    });

    // Fetch verified domain from Resend to use as sender
    let fromAddress = `${orgName} <onboarding@resend.dev>`;
    try {
      const domainsRes = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${resendKey}` },
      });
      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        const verifiedDomain = domainsData?.data?.find((d: any) => d.status === "verified");
        if (verifiedDomain) {
          fromAddress = `${orgName} <noreply@${verifiedDomain.name}>`;
        }
      }
    } catch (domainErr) {
      console.warn("Could not fetch Resend domains, using fallback:", domainErr);
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: `${inviterName} nodigt je uit voor ${orgName}`,
        html,
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok)
      throw new Error(emailData?.message || "Kon uitnodigingsmail niet versturen");

    return new Response(
      JSON.stringify({
        success: true,
        invite_id: invite.id,
        email_sent: true,
        resend_id: emailData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
