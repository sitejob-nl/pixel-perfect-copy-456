import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icons, type IconName } from "@/components/erp/ErpIcons";
import { Dot } from "@/components/erp/ErpPrimitives";
import { useOrgModules } from "@/hooks/useOrgModules";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import { useBranding } from "@/contexts/BrandingContext";

interface NavItem {
  k: string;
  l: string;
  i: IconName;
  b?: string;
  dot?: boolean;
}

interface NavSection {
  l: string;
  items: NavItem[];
}

const nav: NavSection[] = [
  { l: "Overzicht", items: [{ k: "dashboard", l: "Dashboard", i: "Home" }] },
  {
    l: "CRM", items: [
      { k: "contacts", l: "Contacten", i: "Users", b: "8" },
      { k: "companies", l: "Bedrijven", i: "Building" },
      { k: "pipeline", l: "Pipeline", i: "Kanban", b: "7" },
    ]
  },
  {
    l: "Projecten", items: [
      { k: "projects", l: "Projecten", i: "Folder" },
      { k: "quotes", l: "Offertes", i: "File" },
      { k: "invoices", l: "Facturen", i: "Receipt" },
      { k: "contracts", l: "Contracten", i: "Pen" },
      { k: "knowledgebase", l: "Kennisbank", i: "Book" },
    ]
  },
  {
    l: "Intelligence", items: [
      { k: "dataintel", l: "Data Intelligence", i: "Zap", dot: true },
      { k: "scrapers", l: "Scrapers", i: "Search" },
      { k: "aiagent", l: "AI Agent", i: "Bot", dot: true },
      { k: "demos", l: "Demo's", i: "Globe" },
      { k: "content", l: "Content", i: "Calendar" },
    ]
  },
  {
    l: "Communicatie", items: [
      { k: "whatsapp", l: "WhatsApp", i: "Msg", b: "3" },
    ]
  },
  {
    l: "Integraties", items: [
      { k: "webhooks", l: "Webhooks", i: "Zap" },
    ]
  },
];

const moduleMap: Record<string, string> = {
  projects: "mod_projects",
  quotes: "mod_quotes",
  invoices: "mod_invoices",
  contracts: "mod_contracts",
  content: "mod_content_calendar",
  whatsapp: "mod_whatsapp",
  dataintel: "mod_data_sources",
  scrapers: "mod_data_sources",
  aiagent: "mod_ai_agent",
  demos: "mod_demos",
  webhooks: "mod_webhooks",
};

export default function ErpSidebar() {
  const [hov, setHov] = useState<string | null>(null);
  const { data: modules } = useOrgModules();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const { org: brandOrg } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active page from pathname
  const pathSegment = location.pathname.split("/")[1] || "dashboard";
  const activePage = pathSegment;

  const orgName = brandOrg?.name || "SiteJob";
  const orgLogo = brandOrg?.logo_url;
  const orgInitials = orgName.slice(0, 2).toUpperCase();
  const primaryColor = brandOrg?.primary_color || "#2563EB";
  const secondaryColor = brandOrg?.secondary_color || "#1E40AF";

  const isModuleEnabled = (pageKey: string) => {
    const moduleKey = moduleMap[pageKey];
    if (!moduleKey) return true;
    if (!modules) return true;
    return (modules as any)[moduleKey] === true;
  };

  const handleNavigate = (key: string) => {
    navigate(`/${key}`);
  };

  return (
    <aside className="w-[248px] min-w-[248px] h-full bg-erp-bg1 border-r border-erp-border0 flex flex-col">
      {/* Logo */}
      <div className="px-4 pt-[18px] pb-[14px] border-b border-erp-border0">
        <div className="flex items-center gap-[10px]">
          <div
            className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center overflow-hidden"
            style={{ background: orgLogo ? "transparent" : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
          >
            {orgLogo ? (
              <img src={orgLogo} alt={orgName} className="w-full h-full object-contain" />
            ) : (
              <span className="text-[13px] font-bold text-white">{orgInitials}</span>
            )}
          </div>
          <div>
            <div className="text-base font-bold tracking-tight leading-tight">{orgName}</div>
            <div className="text-[10.5px] text-erp-text3 font-medium mt-[1px]">ERP Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-[10px_8px] overflow-y-auto">
        {nav.map(sec => {
          const visibleItems = sec.items.filter(it => isModuleEnabled(it.k));
          if (visibleItems.length === 0) return null;
          return (
            <div key={sec.l} className="mb-[18px]">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 px-[10px] mb-[5px]">{sec.l}</div>
              {visibleItems.map(it => {
                const active = activePage === it.k;
                const hover = hov === it.k && !active;
                const Icon = Icons[it.i];
                return (
                  <div
                    key={it.k}
                    onClick={() => handleNavigate(it.k)}
                    onMouseEnter={() => setHov(it.k)}
                    onMouseLeave={() => setHov(null)}
                    className={cn(
                      "flex items-center gap-[9px] px-[10px] py-[7px] rounded-lg cursor-pointer text-[13px] transition-all duration-100",
                      active ? "text-erp-text0 bg-erp-bg3 font-medium" : hover ? "text-erp-text1 bg-erp-hover" : "text-erp-text2"
                    )}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span className="flex-1">{it.l}</span>
                    {it.b && (
                      <span className={cn(
                        "text-[10.5px] font-semibold px-[7px] py-[1px] rounded-[10px]",
                        active ? "bg-erp-blue/10 text-erp-blue" : "bg-erp-bg4 text-erp-text3"
                      )}>{it.b}</span>
                    )}
                    {it.dot && <Dot color="hsl(160, 67%, 52%)" size={6} />}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Super Admin link */}
        {isSuperAdmin && (
          <div className="mb-[18px]">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 px-[10px] mb-[5px]">Admin</div>
            <div
              onClick={() => handleNavigate("admin")}
              onMouseEnter={() => setHov("admin")}
              onMouseLeave={() => setHov(null)}
              className={cn(
                "flex items-center gap-[9px] px-[10px] py-[7px] rounded-lg cursor-pointer text-[13px] transition-all duration-100",
                activePage === "admin" ? "text-erp-text0 bg-erp-bg3 font-medium" : hov === "admin" ? "text-erp-text1 bg-erp-hover" : "text-erp-text2"
              )}
            >
              <Icons.Shield className="w-[18px] h-[18px]" />
              <span className="flex-1">Super Admin</span>
              <Dot color="hsl(25, 95%, 53%)" size={6} />
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-erp-border0 flex items-center gap-[10px]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white overflow-hidden"
          style={{ background: orgLogo ? "transparent" : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
        >
          {orgLogo ? (
            <img src={orgLogo} alt="" className="w-full h-full object-contain" />
          ) : (
            orgInitials
          )}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{orgName}</div>
          <div className="text-[10.5px] text-erp-text3">Professional</div>
        </div>
        <span className="text-erp-text3 cursor-pointer flex" onClick={() => handleNavigate("settings")}><Icons.Settings className="w-[17px] h-[17px]" /></span>
      </div>
    </aside>
  );
}
