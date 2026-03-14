import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";
import SnelstartSettings from "@/components/erp/SnelstartSettings";
import ApiKeysSettings from "@/components/erp/ApiKeysSettings";
import TeamSettings from "@/components/erp/TeamSettings";
import OrgSettings from "@/components/erp/OrgSettings";
import ResendSettings from "@/components/erp/ResendSettings";
import LinkedInSettings from "@/components/erp/LinkedInSettings";
import WhatsAppSettings from "@/components/erp/WhatsAppSettings";
import NotificationSettings from "@/components/erp/NotificationSettings";
import GoogleSettings from "@/components/erp/GoogleSettings";
import IntegrationSettings from "@/components/erp/IntegrationSettings";
import McpApiKeySettings from "@/components/erp/McpApiKeySettings";

const allTabs = [
  { key: "algemeen", label: "Algemeen", icon: "⚙️", adminOnly: true },
  { key: "team", label: "Team", icon: "👥", adminOnly: true },
  { key: "api-keys", label: "API Keys", icon: "🔑", adminOnly: true },
  { key: "integraties", label: "Integraties", icon: "🔌", adminOnly: true },
  { key: "mcp", label: "MCP/API", icon: "🔗", adminOnly: true },
  { key: "email", label: "E-mail", icon: "✉️", adminOnly: true },
  { key: "snelstart", label: "Snelstart", icon: "🔗", adminOnly: true },
  { key: "linkedin", label: "LinkedIn", icon: "💼", adminOnly: false },
  { key: "google", label: "Google", icon: "📧", adminOnly: false },
  { key: "whatsapp", label: "WhatsApp", icon: "📱", adminOnly: true },
  { key: "notificaties", label: "Notificaties", icon: "🔔", adminOnly: false },
  { key: "account", label: "Account", icon: "👤", adminOnly: false },
] as const;

type TabKey = (typeof allTabs)[number]["key"];

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const role = org?.role as string | undefined;
  const isAdmin = role === "owner" || role === "admin";

  const tabs = useMemo(
    () => allTabs.filter((t) => !t.adminOnly || isAdmin),
    [isAdmin]
  );

  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    isAdmin ? "algemeen" : "account"
  );

  // If current tab is no longer allowed, reset
  const safeTab = tabs.some((t) => t.key === activeTab)
    ? activeTab
    : tabs[0]?.key ?? "account";

  if (safeTab !== activeTab) {
    setActiveTab(safeTab);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-erp-text0">Instellingen</h1>
        <p className="text-[13px] text-erp-text3 mt-1">Beheer je organisatie, integraties en voorkeuren</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-erp-bg2 p-1 rounded-xl border border-erp-border0 mb-6 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 whitespace-nowrap shrink-0",
              safeTab === tab.key
                ? "bg-erp-bg3 text-erp-text0 shadow-sm border border-erp-border0"
                : "text-erp-text3 hover:text-erp-text1"
            )}
          >
            <span className="text-[14px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content — admin-only panels only rendered for admins */}
      {isAdmin && safeTab === "algemeen" && <OrgSettings />}
      {isAdmin && safeTab === "team" && <TeamSettings />}
      {isAdmin && safeTab === "api-keys" && <ApiKeysSettings />}
      {isAdmin && safeTab === "email" && <ResendSettings />}
      {isAdmin && safeTab === "snelstart" && <SnelstartSettings />}
      {isAdmin && safeTab === "integraties" && <IntegrationSettings />}
      {isAdmin && safeTab === "mcp" && <McpApiKeySettings />}

      {safeTab === "linkedin" && <LinkedInSettings />}
      {safeTab === "google" && <GoogleSettings />}
      {isAdmin && safeTab === "whatsapp" && <WhatsAppSettings />}

      {safeTab === "notificaties" && <NotificationSettings />}

      {safeTab === "account" && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
          <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Account</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">E-mailadres</label>
              <input
                type="email"
                defaultValue={user?.email || ""}
                className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                disabled
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Wachtwoord</label>
              <input
                type="password"
                defaultValue="••••••••"
                className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                disabled
              />
              <p className="text-[11px] text-erp-text3 mt-1">Wachtwoord wijzigen via profiel → wachtwoord reset</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
