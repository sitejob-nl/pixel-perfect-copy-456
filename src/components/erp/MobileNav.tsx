import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icons, type IconName } from "@/components/erp/ErpIcons";
import { useOrgModules } from "@/hooks/useOrgModules";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import { useBranding } from "@/contexts/BrandingContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface NavItem { k: string; l: string; i: IconName }
interface NavSection { l: string; items: NavItem[] }

const nav: NavSection[] = [
  {
    l: "Overzicht",
    items: [
      { k: "dashboard", l: "Dashboard", i: "Home" },
      { k: "tasks", l: "Taken", i: "CheckSquare" },
    ],
  },
  {
    l: "CRM & Sales",
    items: [
      { k: "klanten", l: "Klanten", i: "Building" },
      { k: "pipeline", l: "Pipeline", i: "Kanban" },
      { k: "prospecting", l: "Prospecting", i: "Crosshair" },
    ],
  },
  {
    l: "Werk",
    items: [
      { k: "projects", l: "Projecten", i: "Folder" },
      { k: "quotes", l: "Offertes", i: "File" },
      { k: "invoices", l: "Facturen", i: "Receipt" },
      { k: "contracts", l: "Contracten", i: "Pen" },
    ],
  },
  {
    l: "Communicatie",
    items: [
      { k: "gmail", l: "Gmail", i: "Mail" },
      { k: "whatsapp", l: "WhatsApp", i: "Msg" },
      { k: "calendar", l: "Agenda", i: "Calendar" },
      { k: "calls", l: "Gesprekken", i: "Phone" },
      { k: "bookings", l: "Boekingen", i: "Calendar" },
      { k: "portals", l: "Klantenportaal", i: "Portal" },
    ],
  },
  {
    l: "Tools",
    items: [
      { k: "ai", l: "AI Assistent", i: "Bot" },
      { k: "knowledgebase", l: "Kennisbank", i: "Book" },
      { k: "dataintel", l: "Data Intelligence", i: "Zap" },
      { k: "scrapers", l: "Scrapers", i: "Search" },
      { k: "aiagent", l: "AI Agent", i: "Bot" },
      { k: "demos", l: "Demo's", i: "Globe" },
      { k: "content", l: "Content", i: "Calendar" },
      { k: "email", l: "Email Builder", i: "Send" },
      { k: "drafts", l: "Email Drafts", i: "Send" },
      { k: "reports", l: "Rapportages", i: "BarChart" },
      { k: "webhooks", l: "Webhooks", i: "Zap" },
    ],
  },
];

const moduleMap: Record<string, string> = {
  prospecting: "mod_prospecting",
  projects: "mod_projects",
  quotes: "mod_quotes",
  invoices: "mod_invoices",
  contracts: "mod_contracts",
  knowledgebase: "mod_knowledgebase",
  content: "mod_content_calendar",
  whatsapp: "mod_whatsapp",
  dataintel: "mod_data_sources",
  scrapers: "mod_data_sources",
  aiagent: "mod_ai_agent",
  ai: "mod_ai_assistant",
  demos: "mod_demos",
  reports: "mod_reports",
  gmail: "mod_gmail",
  calendar: "mod_calendar",
  bookings: "mod_bookings",
  calls: "mod_calls",
  email: "mod_email_accounts",
  drafts: "mod_email_drafts",
  portals: "mod_portal",
  webhooks: "mod_webhooks",
};

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const { data: modules } = useOrgModules();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const { org: brandOrg } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = location.pathname.split("/")[1] || "dashboard";
  const orgName = brandOrg?.name || "SiteJob";

  const isModuleEnabled = (k: string) => {
    const mk = moduleMap[k];
    if (!mk || !modules) return true;
    return (modules as any)[mk] === true;
  };

  const go = (k: string) => { navigate(`/${k}`); setOpen(false); };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-erp-text1 hover:bg-erp-bg3 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 bg-erp-bg1 border-erp-border0">
        <div className="px-4 pt-5 pb-3 border-b border-erp-border0">
          <div className="text-base font-bold text-erp-text0">{orgName}</div>
          <div className="text-[10.5px] text-erp-text3 mt-0.5">ERP Platform</div>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto max-h-[calc(100vh-80px)]">
          {nav.map(sec => {
            const items = sec.items.filter(it => isModuleEnabled(it.k));
            if (!items.length) return null;
            return (
              <div key={sec.l} className="mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 px-3 mb-1">{sec.l}</div>
                {items.map(it => {
                  const active = activePage === it.k;
                  const Icon = Icons[it.i];
                  return (
                    <button
                      key={it.k}
                      onClick={() => go(it.k)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors",
                        active ? "text-erp-text0 bg-erp-bg3 font-medium" : "text-erp-text2"
                      )}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      <span>{it.l}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Settings */}
          <div className="mb-4">
            <button
              onClick={() => go("settings")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors",
                activePage === "settings" ? "text-erp-text0 bg-erp-bg3 font-medium" : "text-erp-text2"
              )}
            >
              <Icons.Settings className="w-[18px] h-[18px]" />
              <span>Instellingen</span>
            </button>
          </div>

          {/* Super Admin */}
          {isSuperAdmin && (
            <div className="mb-4">
              <button
                onClick={() => go("admin")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors",
                  activePage === "admin" ? "text-erp-text0 bg-erp-bg3 font-medium" : "text-erp-text2"
                )}
              >
                <Icons.Shield className="w-[18px] h-[18px]" />
                <span>Super Admin</span>
              </button>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
