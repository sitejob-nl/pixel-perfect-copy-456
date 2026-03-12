import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgDetails } from "@/hooks/useOrgDetails";
import { useOrgModules } from "@/hooks/useOrgModules";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useOrgMembers,
  useOrgInvites,
  useMemberModuleOverrides,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  useDeleteInvite,
  useSetModuleOverride,
} from "@/hooks/useTeam";
import { useContracts } from "@/hooks/useContracts";
import { toast } from "sonner";
import { Eye, FileText, ExternalLink } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Eigenaar",
  admin: "Admin",
  member: "Lid",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-erp-orange/15 text-erp-orange",
  admin: "bg-erp-blue/15 text-erp-blue",
  member: "bg-erp-bg4 text-erp-text2",
};

const MODULE_LABELS: Record<string, string> = {
  mod_invoices: "Facturen",
  mod_snelstart: "Snelstart",
  mod_contracts: "Contracten",
  mod_content_calendar: "Content",
  mod_whatsapp: "WhatsApp",
  mod_email_accounts: "E-mail",
  mod_demos: "Demo's",
  mod_lead_scoring: "Lead scoring",
  mod_data_sources: "Data bronnen",
  mod_webhooks: "Webhooks",
  mod_outreach: "Outreach",
  mod_portal: "Portaal",
};

function InviteEmailPreview({ orgName, logoUrl, primaryColor, inviterName, roleLabel }: {
  orgName: string; logoUrl: string | null; primaryColor: string; inviterName: string; roleLabel: string;
}) {
  const color = primaryColor || "#32C5FF";
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:40px;max-width:180px;object-fit:contain;" />`
    : `<div style="display:inline-flex;align-items:center;gap:8px;"><div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-block;text-align:center;line-height:36px;"><span style="color:#fff;font-size:18px;font-weight:bold;">${orgName.charAt(0)}</span></div><span style="color:#ffffff;font-size:20px;font-weight:bold;">${orgName}</span></div>`;

  const html = `<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:${color};padding:32px 40px;text-align:center;">${logoHtml}</td></tr>
    <tr><td style="padding:40px 40px 32px 40px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#1a1a2e;">Je bent uitgenodigd! 🎉</h1>
      <p style="margin:0 0 24px 0;font-size:15px;color:#6b7280;line-height:1.6;">
        <strong style="color:#1a1a2e;">${inviterName}</strong> heeft je uitgenodigd om lid te worden van
        <strong style="color:#1a1a2e;">${orgName}</strong> als <strong style="color:${color};">${roleLabel}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="font-size:13px;color:#9ca3af;padding-bottom:6px;">Organisatie</td><td style="font-size:13px;color:#9ca3af;padding-bottom:6px;text-align:right;">Rol</td></tr>
            <tr><td style="font-size:15px;font-weight:600;color:#1a1a2e;">${orgName}</td><td style="font-size:15px;font-weight:600;color:${color};text-align:right;">${roleLabel}</td></tr>
          </table>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="#" style="display:inline-block;background:${color};color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Uitnodiging accepteren</a>
      </td></tr></table>
      <p style="margin:24px 0 0 0;font-size:13px;color:#9ca3af;text-align:center;">Na het klikken kun je een wachtwoord instellen voor je account.</p>
    </td></tr>
    <tr><td style="padding:20px 40px 28px 40px;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#c4c4c8;">Deze uitnodiging is 7 dagen geldig.<br>Als je deze uitnodiging niet verwachtte, kun je deze e-mail negeren.</p>
    </td></tr>
  </table>
</td></tr></table></body>`;

  return <div className="rounded-lg overflow-hidden border border-erp-border0" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function TeamSettings() {
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const { data: members, isLoading: membersLoading } = useOrgMembers();
  const { data: invites } = useOrgInvites();
  const { data: modules } = useOrgModules();
  const { data: orgDetails } = useOrgDetails();
  const { data: overrides } = useMemberModuleOverrides();

  const inviteMember = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const deleteInvite = useDeleteInvite();
  const setOverride = useSetModuleOverride();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const currentUserRole = org?.role;
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";

  // Get active org modules
  const activeModules = modules
    ? Object.entries(modules)
        .filter(([key, val]) => key.startsWith("mod_") && val === true)
        .map(([key]) => key)
    : [];

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Uitnodiging verstuurd naar ${inviteEmail}`);
      setInviteEmail("");
    } catch (e: any) {
      toast.error(e.message || "Kon uitnodiging niet versturen");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateRole.mutateAsync({ memberId, role: newRole });
      toast.success("Rol bijgewerkt");
    } catch (e: any) {
      toast.error(e.message || "Kon rol niet wijzigen");
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Weet je zeker dat je ${name} wilt verwijderen?`)) return;
    try {
      await removeMember.mutateAsync(memberId);
      toast.success("Lid verwijderd");
    } catch (e: any) {
      toast.error(e.message || "Kon lid niet verwijderen");
    }
  };

  const getOverride = (userId: string, moduleKey: string) => {
    return overrides?.find((o) => o.user_id === userId && o.module_key === moduleKey);
  };

  const handleModuleToggle = async (userId: string, moduleKey: string) => {
    const existing = getOverride(userId, moduleKey);
    let newVal: boolean | null;

    if (!existing) {
      // No override → set to disabled
      newVal = false;
    } else if (existing.is_enabled === false) {
      // Was disabled → set to enabled
      newVal = true;
    } else {
      // Was enabled → remove override (inherit)
      newVal = null;
    }

    try {
      await setOverride.mutateAsync({ userId, moduleKey, isEnabled: newVal });
    } catch (e: any) {
      toast.error("Kon module-instelling niet wijzigen");
    }
  };

  const getModuleState = (userId: string, moduleKey: string): "inherit" | "granted" | "denied" => {
    const override = getOverride(userId, moduleKey);
    if (!override) return "inherit";
    return override.is_enabled ? "granted" : "denied";
  };

  const activeMembers = members?.filter((m) => m.is_active) || [];
  const inactiveMembers = members?.filter((m) => !m.is_active) || [];

  return (
    <div className="space-y-6">
      {/* Invite section */}
      {isAdmin && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-erp-text0">Teamlid uitnodigen</h3>
            <button
              onClick={() => setShowEmailPreview(true)}
              className="flex items-center gap-1.5 text-[12px] text-erp-text3 hover:text-erp-blue transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Mail preview
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="e-mailadres"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="flex-1 bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            >
              <option value="member">Lid</option>
              <option value="admin">Admin</option>
              {currentUserRole === "owner" && <option value="owner">Eigenaar</option>}
            </select>
            <button
              onClick={handleInvite}
              disabled={inviteMember.isPending || !inviteEmail.trim()}
              className="bg-erp-blue hover:bg-erp-blue-light text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {inviteMember.isPending ? "..." : "Uitnodigen"}
            </button>
          </div>
        </div>
      )}

      {/* Pending invites */}
      {invites && invites.length > 0 && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
          <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">
            Openstaande uitnodigingen
            <span className="ml-2 text-[12px] text-erp-text3 font-normal">({invites.length})</span>
          </h3>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-erp-bg2 border border-erp-border0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-erp-bg4 flex items-center justify-center text-[12px] text-erp-text3">
                    ✉️
                  </div>
                  <div>
                    <div className="text-[13px] text-erp-text0">{invite.email}</div>
                    <div className="text-[11px] text-erp-text3">
                      Verstuurd op {new Date(invite.created_at).toLocaleDateString("nl-NL")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", ROLE_COLORS[invite.role])}>
                    {ROLE_LABELS[invite.role] || invite.role}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => deleteInvite.mutate(invite.id)}
                      className="text-erp-text3 hover:text-erp-red text-[12px] transition-colors px-2"
                      title="Intrekken"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">
          Teamleden
          <span className="ml-2 text-[12px] text-erp-text3 font-normal">({activeMembers.length})</span>
        </h3>

        {membersLoading ? (
          <div className="text-[13px] text-erp-text3 py-4 text-center">Laden...</div>
        ) : (
          <div className="space-y-1">
            {activeMembers.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const isOwner = member.role === "owner";
              const isExpanded = expandedMember === member.id;
              const displayName = member.profiles?.full_name || "Naamloos";

              return (
                <div key={member.id} className="rounded-lg border border-erp-border0 overflow-hidden">
                  {/* Member row */}
                  <div
                    className={cn(
                      "flex items-center justify-between py-3 px-3 cursor-pointer hover:bg-erp-bg2 transition-colors",
                      isExpanded && "bg-erp-bg2"
                    )}
                    onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-erp-bg4 flex items-center justify-center text-[13px] font-medium text-erp-text1 uppercase">
                        {displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-erp-text0">
                          {displayName}
                          {isCurrentUser && (
                            <span className="text-[11px] text-erp-text3 ml-1.5">(jij)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-erp-text3">
                          Lid sinds{" "}
                          {member.joined_at
                            ? new Date(member.joined_at).toLocaleDateString("nl-NL")
                            : "onbekend"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && !isCurrentUser && !isOwner ? (
                        <select
                          value={member.role}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleRoleChange(member.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-erp-bg2 border border-erp-border0 rounded-lg px-2 py-1 text-[12px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                        >
                          <option value="member">Lid</option>
                          <option value="admin">Admin</option>
                          {currentUserRole === "owner" && <option value="owner">Eigenaar</option>}
                        </select>
                      ) : (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-medium",
                            ROLE_COLORS[member.role]
                          )}
                        >
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      )}

                      <span className="text-erp-text3 text-[12px]">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded: Module overrides */}
                  {isExpanded && isAdmin && activeModules.length > 0 && (
                    <div className="px-4 pb-4 pt-1 border-t border-erp-border0 bg-erp-bg2">
                      <div className="text-[11px] font-medium text-erp-text2 mb-2 uppercase tracking-wider">
                        Module toegang
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {activeModules.map((mod) => {
                          const state = getModuleState(member.user_id, mod);
                          return (
                            <button
                              key={mod}
                              onClick={() => handleModuleToggle(member.user_id, mod)}
                              disabled={isOwner}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border",
                                state === "inherit" &&
                                  "bg-erp-bg3 border-erp-border0 text-erp-text1 hover:border-erp-border1",
                                state === "granted" &&
                                  "bg-erp-green/10 border-erp-green/30 text-erp-green",
                                state === "denied" &&
                                  "bg-erp-red/10 border-erp-red/30 text-erp-red",
                                isOwner && "opacity-50 cursor-not-allowed"
                              )}
                              title={
                                state === "inherit"
                                  ? "Erft van organisatie-instellingen"
                                  : state === "granted"
                                  ? "Expliciet toegekend"
                                  : "Expliciet geweigerd"
                              }
                            >
                              <span>
                                {state === "inherit" ? "○" : state === "granted" ? "✓" : "✕"}
                              </span>
                              <span>{MODULE_LABELS[mod] || mod}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-erp-text3 mt-2">
                        ○ = erft van org · ✓ = expliciet aan · ✕ = expliciet uit
                      </div>

                      {/* Remove button */}
                      {!isCurrentUser && !isOwner && (
                        <button
                          onClick={() => handleRemove(member.id, displayName)}
                          className="mt-3 text-[12px] text-erp-red hover:text-erp-red/80 transition-colors"
                        >
                          Verwijder uit team
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expanded: Signed contracts for this member */}
                  {isExpanded && (
                    <MemberContracts memberName={displayName} memberEmail={member.profiles?.full_name ? undefined : undefined} memberUserId={member.user_id} />
                  )}

                  {/* Expanded but not admin: just show modules read-only */}
                  {isExpanded && !isAdmin && activeModules.length > 0 && (
                    <div className="px-4 pb-4 pt-1 border-t border-erp-border0 bg-erp-bg2">
                      <div className="text-[11px] font-medium text-erp-text2 mb-2 uppercase tracking-wider">
                        Module toegang
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {activeModules.map((mod) => {
                          const state = getModuleState(member.user_id, mod);
                          return (
                            <div
                              key={mod}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border",
                                state === "denied"
                                  ? "bg-erp-red/10 border-erp-red/30 text-erp-red"
                                  : "bg-erp-bg3 border-erp-border0 text-erp-text1"
                              )}
                            >
                              <span>{state === "denied" ? "✕" : "✓"}</span>
                              <span>{MODULE_LABELS[mod] || mod}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inactive members */}
      {inactiveMembers.length > 0 && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5 opacity-60">
          <h3 className="text-[15px] font-semibold text-erp-text0 mb-3">
            Inactieve leden
            <span className="ml-2 text-[12px] text-erp-text3 font-normal">({inactiveMembers.length})</span>
          </h3>
          <div className="space-y-2">
            {inactiveMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-erp-bg2 border border-erp-border0"
              >
                <div className="w-8 h-8 rounded-full bg-erp-bg4 flex items-center justify-center text-[12px] text-erp-text3">
                  {(member.profiles?.full_name || "?").charAt(0)}
                </div>
                <div className="text-[13px] text-erp-text3">
                  {member.profiles?.full_name || "Naamloos"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-erp-bg3 border-erp-border0">
          <DialogHeader>
            <DialogTitle className="text-erp-text0">Uitnodigingsmail preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[13px] text-erp-text2">
              Zo ziet de uitnodigingsmail eruit die naar nieuwe teamleden wordt gestuurd. Logo en kleuren worden overgenomen uit <strong>Instellingen → Algemeen → Huisstijl</strong>.
            </p>
            <InviteEmailPreview
              orgName={orgDetails?.name || org?.organizations?.name || "Jouw organisatie"}
              logoUrl={orgDetails?.logo_url || null}
              primaryColor={orgDetails?.primary_color || "#32C5FF"}
              inviterName={user?.user_metadata?.full_name || "Jij"}
              roleLabel={ROLE_LABELS[inviteRole] || "Teamlid"}
            />
            <div className="bg-erp-bg2 rounded-lg p-3 text-[12px] text-erp-text2 space-y-1">
              <div><strong>Logo & kleuren:</strong> Instellingen → Algemeen → Huisstijl</div>
              <div><strong>Verzending:</strong> Resend API key nodig in Instellingen → API Keys</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
