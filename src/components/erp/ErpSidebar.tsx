import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icons, type IconName } from "@/components/erp/ErpIcons";
import { Dot } from "@/components/erp/ErpPrimitives";
import { useOrgModules } from "@/hooks/useOrgModules";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import { useBranding } from "@/contexts/BrandingContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { usePendingSuggestionCount } from "@/hooks/useGmailThreads";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  collapsible?: boolean;
  showFirst?: number;
}

/* ── Navigation structure ─────────────────────────────────────────── */
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
      { k: "companies", l: "Bedrijven", i: "Building" },
      { k: "contacts", l: "Contacten", i: "Users" },
      { k: "deals", l: "Deals", i: "Kanban" },
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
      { k: "project-plans", l: "Projectplannen", i: "File" },
    ],
    collapsible: true,
    showFirst: 2,
  },
  {
    l: "Communicatie",
    items: [
      { k: "gmail", l: "Gmail", i: "Mail" },
      { k: "whatsapp", l: "WhatsApp", i: "Msg", b: "3" },
      { k: "calendar", l: "Agenda", i: "Calendar" },
      { k: "calls", l: "Gesprekken", i: "Phone" },
      { k: "bookings", l: "Boekingen", i: "Calendar" },
      { k: "portals", l: "Klantenportaal", i: "Portal" },
    ],
    collapsible: true,
    showFirst: 3,
  },
  {
    l: "Tools",
    items: [
      { k: "ai", l: "AI Assistent", i: "Bot", dot: true },
      { k: "knowledgebase", l: "Kennisbank", i: "Book" },
      { k: "dataintel", l: "Data Intelligence", i: "Zap", dot: true },
      { k: "scrapers", l: "Scrapers", i: "Search" },
      { k: "aiagent", l: "AI Agent", i: "Bot" },
      { k: "demos", l: "Demo's", i: "Globe" },
      { k: "content", l: "Content", i: "Calendar" },
      { k: "email", l: "Email Builder", i: "Send" },
      { k: "drafts", l: "Email Drafts", i: "Send" },
      { k: "meta-ads", l: "Meta Marketing", i: "Megaphone" },
      { k: "reports", l: "Rapportages", i: "BarChart" },
      { k: "webhooks", l: "Webhooks", i: "Zap" },
    ],
    collapsible: true,
    showFirst: 3,
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

const entityRouteMap: Record<string, string> = {
  projects: "/projects",
  companies: "/klanten",
  contacts: "/klanten",
  deals: "/pipeline",
  invoices: "/invoices",
  quotes: "/quotes",
  contracts: "/contracts",
};

const iconNameMap: Record<string, IconName> = {
  folder: "Folder", building: "Building", users: "Users", kanban: "Kanban",
  receipt: "Receipt", file: "File", pen: "Pen", zap: "Zap", search: "Search",
  globe: "Globe", home: "Home", bot: "Bot", send: "Send", mail: "Mail",
  calendar: "Calendar", book: "Book", star: "Zap",
};

/* ── Component ────────────────────────────────────────────────────── */
export default function ErpSidebar() {
  const [hov, setHov] = useState<string | null>(null);
  const { data: modules } = useOrgModules();
  const { data: isSuperAdmin } = useIsSuperAdmin();
  const { org: brandOrg } = useBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: org } = useOrganization();
  const { data: pendingSuggestionCount = 0 } = usePendingSuggestionCount();

  const { data: savedViews = [] } = useQuery({
    queryKey: ["saved-views-pinned", org?.organization_id],
    enabled: !!org?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_views")
        .select("*")
        .eq("is_pinned", true)
        .order("sort_order");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const activePage = location.pathname.split("/")[1] || "dashboard";

  const orgName = brandOrg?.name || "SiteJob";
  const orgLogo = brandOrg?.logo_url;
  const orgInitials = orgName.slice(0, 2).toUpperCase();
  const primaryColor = brandOrg?.primary_color || "#2563EB";
  const secondaryColor = brandOrg?.secondary_color || "#1E40AF";

  const isModuleEnabled = (pageKey: string) => {
    const moduleKey = moduleMap[pageKey];
    if (!moduleKey || !modules) return true;
    return (modules as any)[moduleKey] === true;
  };

  const handleNavigate = (key: string) => navigate(`/${key}`);

  const handleViewClick = (view: any) => {
    const route = entityRouteMap[view.entity_type] || "/dashboard";
    const params = new URLSearchParams();
    if (view.filters) params.set("view", view.id);
    navigate(params.toString() ? `${route}?${params}` : route);
  };

  /* Check if any item in a collapsible section is active */
  const sectionHasActive = (items: NavItem[]) => items.some((it) => activePage === it.k);

  /* Render a single nav item */
  const renderItem = (it: NavItem) => {
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
        {(it.b || (it.k === "gmail" && pendingSuggestionCount > 0)) && (
          <span className={cn(
            "text-[10.5px] font-semibold px-[7px] py-[1px] rounded-[10px]",
            active ? "bg-erp-blue/10 text-erp-blue" : "bg-erp-bg4 text-erp-text3"
          )}>
            {it.k === "gmail" && pendingSuggestionCount > 0 ? String(pendingSuggestionCount) : it.b}
          </span>
        )}
        {it.dot && <Dot color="hsl(160, 67%, 52%)" size={6} />}
      </div>
    );
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
        {nav.map((sec) => {
          const visibleItems = sec.items.filter((it) => isModuleEnabled(it.k));
          if (visibleItems.length === 0) return null;

          const hasActive = sectionHasActive(visibleItems);

          /* Collapsible section */
          if (sec.collapsible) {
            const n = sec.showFirst ?? 3;
            const alwaysShow = visibleItems.slice(0, n);
            const collapsedItems = visibleItems.slice(n);
            const collapsedHasActive = sectionHasActive(collapsedItems);

            if (collapsedItems.length === 0) {
              return (
                <div key={sec.l} className="mb-[14px]">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 px-[10px] mb-[5px]">{sec.l}</div>
                  {alwaysShow.map(renderItem)}
                </div>
              );
            }

            return (
              <div key={sec.l} className="mb-[14px]">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 px-[10px] mb-[5px]">
                  {sec.l}
                </div>
                {alwaysShow.map(renderItem)}
                <Collapsible defaultOpen={collapsedHasActive}>
                  <CollapsibleContent>
                    {collapsedItems.map(renderItem)}
                  </CollapsibleContent>
                  <CollapsibleTrigger className="w-full flex items-center gap-[9px] px-[10px] py-[5px] rounded-lg text-[12px] text-erp-text3 hover:text-erp-text1 transition-colors group">
                    <Icons.ChevRight className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-90" />
                    <span className="group-data-[state=open]:hidden">Meer tonen…</span>
                    <span className="hidden group-data-[state=open]:inline">Minder tonen</span>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
            );
          }

          /* Standard section */
          return (
            <div key={sec.l} className="mb-[14px]">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 px-[10px] mb-[5px]">
                {sec.l}
              </div>
              {visibleItems.map(renderItem)}
            </div>
          );
        })}

        {/* Saved Views */}
        {savedViews.length > 0 && (
          <div className="mb-[14px]">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-erp-text3 px-[10px] mb-[5px]">Saved Views</div>
            {savedViews.map((view: any) => {
              const iconKey = (view.icon || "folder").toLowerCase();
              const IconComp = Icons[iconNameMap[iconKey] || "Folder"];
              const viewId = `view-${view.id}`;
              const isHov = hov === viewId;
              return (
                <div
                  key={view.id}
                  onClick={() => handleViewClick(view)}
                  onMouseEnter={() => setHov(viewId)}
                  onMouseLeave={() => setHov(null)}
                  className={cn(
                    "flex items-center gap-[9px] px-[10px] py-[7px] rounded-lg cursor-pointer text-[13px] transition-all duration-100",
                    isHov ? "text-erp-text1 bg-erp-hover" : "text-erp-text2"
                  )}
                >
                  <IconComp className="w-[18px] h-[18px]" />
                  <span className="flex-1 truncate">{view.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Super Admin */}
        {isSuperAdmin && (
          <div className="mb-[14px]">
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
        <span className="text-erp-text3 cursor-pointer flex" onClick={() => handleNavigate("settings")}>
          <Icons.Settings className="w-[17px] h-[17px]" />
        </span>
      </div>
    </aside>
  );
}
