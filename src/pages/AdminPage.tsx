import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsSuperAdmin, useAdminOrganizations, useAdminUsers } from "@/hooks/useSuperAdmin";
import { useOrgModulesAdmin, useToggleModule } from "@/hooks/useOrgModules";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Json } from "@/integrations/supabase/types";

const tabs = [
  { key: "organizations", label: "Organisaties", icon: "🏢" },
  { key: "users", label: "Gebruikers", icon: "👥" },
  { key: "modules", label: "Module Beheer", icon: "🧩" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const toggleableModules = [
  { key: "mod_projects", label: "Projecten" },
  { key: "mod_quotes", label: "Offertes" },
  { key: "mod_invoices", label: "Facturen" },
  { key: "mod_contracts", label: "Contracten" },
  { key: "mod_subscriptions", label: "Abonnementen" },
  { key: "mod_content_calendar", label: "Content Kalender" },
  { key: "mod_whatsapp", label: "WhatsApp" },
  { key: "mod_email_accounts", label: "Email Accounts" },
  { key: "mod_outreach", label: "Outreach" },
  { key: "mod_lead_scoring", label: "Lead Scoring" },
  { key: "mod_data_sources", label: "Data Sources" },
  { key: "mod_website_scraping", label: "Website Scraping" },
  { key: "mod_demos", label: "Demo Generator" },
  { key: "mod_ai_agent", label: "AI Agent" },
  { key: "mod_webhooks", label: "Webhooks" },
  { key: "mod_portal", label: "Klantportaal" },
  { key: "mod_snelstart", label: "SnelStart" },
] as const;

export default function AdminPage() {
  const { data: isSuperAdmin, isLoading: adminLoading } = useIsSuperAdmin();
  const { data: orgs, isLoading: orgsLoading } = useAdminOrganizations();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const [activeTab, setActiveTab] = useState<TabKey>("organizations");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const { data: modules } = useOrgModulesAdmin(selectedOrgId);
  const toggleModule = useToggleModule();
  const { toast } = useToast();

  if (adminLoading) return <div className="text-sm text-erp-text3 py-12 text-center">Laden...</div>;
  if (!isSuperAdmin) return <div className="text-sm text-erp-text3 py-12 text-center">Geen toegang. Super admin vereist.</div>;

  const handleToggle = async (moduleKey: string, current: boolean) => {
    if (!selectedOrgId) return;
    try {
      await toggleModule.mutateAsync({ orgId: selectedOrgId, module: moduleKey, enabled: !current });
      toast({ title: `Module ${!current ? "ingeschakeld" : "uitgeschakeld"}` });
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    }
  };

  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMM yyyy", { locale: nl }) : "—";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-erp-text0">🛡️ Super Admin</h1>
        <p className="text-[13px] text-erp-text3 mt-1">Beheer alle organisaties, gebruikers en modules</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-erp-bg2 p-1 rounded-xl border border-erp-border0 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 flex-1 justify-center",
              activeTab === tab.key
                ? "bg-erp-bg3 text-erp-text0 shadow-sm border border-erp-border0"
                : "text-erp-text3 hover:text-erp-text1"
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Organizations Tab */}
      {activeTab === "organizations" && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 overflow-hidden">
          {orgsLoading ? (
            <div className="text-sm text-erp-text3 py-8 text-center">Laden...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-erp-border0 bg-erp-bg2">
                    {["Naam", "Slug", "Plan", "Leden", "Contacten", "Deals", "Projecten", "Facturen", "Aangemaakt"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-erp-text3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orgs?.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b border-erp-border0 hover:bg-erp-hover cursor-pointer transition-colors"
                      onClick={() => { setSelectedOrgId(org.id); setActiveTab("modules"); }}
                    >
                      <td className="px-4 py-3 font-medium text-erp-text0">{org.name}</td>
                      <td className="px-4 py-3 text-erp-text2">{org.slug}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-erp-blue/15 text-erp-blue font-medium">
                          {org.plan || "free"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-erp-text2">{org.member_count ?? 0}</td>
                      <td className="px-4 py-3 text-erp-text2">{org.contact_count ?? 0}</td>
                      <td className="px-4 py-3 text-erp-text2">{org.deal_count ?? 0}</td>
                      <td className="px-4 py-3 text-erp-text2">{org.project_count ?? 0}</td>
                      <td className="px-4 py-3 text-erp-text2">{org.invoice_count ?? 0}</td>
                      <td className="px-4 py-3 text-erp-text3">{formatDate(org.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 overflow-hidden">
          {usersLoading ? (
            <div className="text-sm text-erp-text3 py-8 text-center">Laden...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-erp-border0 bg-erp-bg2">
                    {["Naam", "Email", "Organisatie(s)", "Super Admin", "Laatste login", "Aangemaakt"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-erp-text3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => {
                    const orgList = (u.organizations as Json[] | null) ?? [];
                    const isSA = (u as any).is_super_admin;
                    return (
                      <tr key={u.id} className="border-b border-erp-border0 hover:bg-erp-hover transition-colors">
                        <td className="px-4 py-3 font-medium text-erp-text0">{u.full_name || "—"}</td>
                        <td className="px-4 py-3 text-erp-text2">{u.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {orgList.map((o: any, i: number) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-erp-bg4 text-erp-text2">
                                {o?.name ?? "?"} ({o?.role ?? "?"})
                              </span>
                            ))}
                            {orgList.length === 0 && <span className="text-erp-text3">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isSA && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-erp-orange/15 text-erp-orange font-medium">
                              Super Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-erp-text3">{formatDate(u.last_sign_in_at)}</td>
                        <td className="px-4 py-3 text-erp-text3">{formatDate(u.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modules Tab */}
      {activeTab === "modules" && (
        <div className="space-y-5">
          {/* Org selector */}
          <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
            <label className="block text-[12px] font-medium text-erp-text2 mb-2">Organisatie selecteren</label>
            <select
              value={selectedOrgId ?? ""}
              onChange={(e) => setSelectedOrgId(e.target.value || null)}
              className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            >
              <option value="">— Selecteer een organisatie —</option>
              {orgs?.map((o) => (
                <option key={o.id} value={o.id!}>{o.name} ({o.slug})</option>
              ))}
            </select>
          </div>

          {selectedOrgId && modules && (
            <>
              {/* Core modules */}
              <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
                <h3 className="text-[14px] font-semibold text-erp-text0 mb-3">Core Modules (altijd aan)</h3>
                <div className="space-y-2">
                  {["Contacten & Bedrijven", "Deals & Pipeline", "Activiteiten"].map((name) => (
                    <div key={name} className="flex items-center justify-between py-2">
                      <span className="text-[13px] text-erp-text1">{name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-erp-green/15 text-erp-green font-medium">Altijd aan</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggleable modules */}
              <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
                <h3 className="text-[14px] font-semibold text-erp-text0 mb-3">Togglebare Modules</h3>
                <div className="space-y-1">
                  {toggleableModules.map((mod) => {
                    const isEnabled = (modules as any)?.[mod.key] === true;
                    return (
                      <div key={mod.key} className="flex items-center justify-between py-2.5 border-b border-erp-border0 last:border-0">
                        <div>
                          <div className="text-[13px] font-medium text-erp-text0">{mod.label}</div>
                          <div className="text-[10px] text-erp-text3 font-mono">{mod.key}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggle(mod.key, isEnabled)}
                            disabled={toggleModule.isPending}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-erp-bg4 peer-focus:ring-1 peer-focus:ring-erp-blue rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-erp-text3 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-erp-blue peer-checked:after:bg-white" />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {selectedOrgId && !modules && (
            <div className="text-sm text-erp-text3 py-4 text-center">Modules laden...</div>
          )}
        </div>
      )}
    </div>
  );
}
