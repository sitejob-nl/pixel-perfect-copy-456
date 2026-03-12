import { useState } from "react";
import { cn } from "@/lib/utils";
import SnelstartSettings from "@/components/erp/SnelstartSettings";
import ApiKeysSettings from "@/components/erp/ApiKeysSettings";
import TeamSettings from "@/components/erp/TeamSettings";
import OrgSettings from "@/components/erp/OrgSettings";

const tabs = [
  { key: "algemeen", label: "Algemeen", icon: "⚙️" },
  { key: "team", label: "Team", icon: "👥" },
  { key: "api-keys", label: "API Keys", icon: "🔑" },
  { key: "snelstart", label: "Snelstart", icon: "🔗" },
  { key: "notificaties", label: "Notificaties", icon: "🔔" },
  { key: "account", label: "Account", icon: "👤" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("algemeen");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-erp-text0">Instellingen</h1>
        <p className="text-[13px] text-erp-text3 mt-1">Beheer je organisatie, integraties en voorkeuren</p>
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

      {/* Tab Content */}
      {activeTab === "team" && <TeamSettings />}

      {activeTab === "api-keys" && <ApiKeysSettings />}

      {activeTab === "snelstart" && <SnelstartSettings />}

      {activeTab === "algemeen" && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
          <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Organisatie</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Organisatie naam</label>
              <input
                type="text"
                defaultValue="SiteJob B.V."
                className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Tijdzone</label>
              <select className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue">
                <option>Europe/Amsterdam</option>
                <option>Europe/London</option>
                <option>America/New_York</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Taal</label>
              <select className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue">
                <option>Nederlands</option>
                <option>English</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === "notificaties" && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
          <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Notificatie voorkeuren</h3>
          <div className="space-y-3">
            {[
              { label: "E-mail notificaties", desc: "Ontvang updates per e-mail", default: true },
              { label: "Nieuwe deals", desc: "Melding bij nieuwe pipeline deals", default: true },
              { label: "Sync fouten", desc: "Melding bij mislukte Snelstart sync", default: true },
              { label: "Wekelijks rapport", desc: "Wekelijks overzicht van activiteiten", default: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-erp-border0 last:border-0">
                <div>
                  <div className="text-[13px] font-medium text-erp-text0">{item.label}</div>
                  <div className="text-[11px] text-erp-text3">{item.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={item.default} className="sr-only peer" />
                  <div className="w-9 h-5 bg-erp-bg4 peer-focus:ring-1 peer-focus:ring-erp-blue rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-erp-text3 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-erp-blue peer-checked:after:bg-white" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
          <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Account</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">E-mailadres</label>
              <input
                type="email"
                defaultValue="kas@sitejob.nl"
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
