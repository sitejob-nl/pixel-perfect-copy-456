import { useState, useEffect, useRef } from "react";
import ErpSidebar from "@/components/erp/ErpSidebar";
import ErpHeader from "@/components/erp/ErpHeader";
import { toast } from "sonner";
import DashboardPage from "@/pages/DashboardPage";
import ContactsPage from "@/pages/ContactsPage";
import PipelinePage from "@/pages/PipelinePage";
import CompaniesPage from "@/pages/CompaniesPage";
import { ProjectsPage, InvoicesPage } from "@/pages/ProjectsInvoicesPage";
import QuotesPage from "@/pages/QuotesPage";
import DataIntelPage from "@/pages/DataIntelPage";
import ContentPage from "@/pages/ContentPage";
import AIAgentPage from "@/pages/AIAgentPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import WebhooksPage from "@/pages/WebhooksPage";
import AdminPage from "@/pages/AdminPage";
import SettingsPage from "@/pages/SettingsPage";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import type { IconName } from "@/components/erp/ErpIcons";

const pages: Record<string, React.ReactNode> = {
  dashboard: <DashboardPage />,
  contacts: <ContactsPage />,
  companies: <CompaniesPage />,
  pipeline: <PipelinePage />,
  projects: <ProjectsPage />,
  invoices: <InvoicesPage />,
  quotes: <QuotesPage />,
  dataintel: <DataIntelPage />,
  aiagent: <AIAgentPage />,
  content: <ContentPage />,
  contracts: <PlaceholderPage title="Contracten" icon="Pen" />,
  demos: <PlaceholderPage title="Demo Generatie" icon="Globe" />,
  whatsapp: <PlaceholderPage title="WhatsApp" icon="Msg" />,
  webhooks: <WebhooksPage />,
  settings: <SettingsPage />,
};

const Index = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const { data: isSuperAdmin } = useIsSuperAdmin();

  // Handle Snelstart successUrl redirect — show toast when user returns
  const callbackHandled = useRef(false);
  useEffect(() => {
    if (callbackHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("snelstart") === "activated") {
      callbackHandled.current = true;
      toast.success("Snelstart koppeling wordt geactiveerd. Dit kan even duren.");
      setActivePage("settings");
      // Clean URL
      params.delete("snelstart");
      const clean = params.toString();
      const newUrl = window.location.pathname + (clean ? "?" + clean : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  const resolvedPage = activePage === "admin"
    ? (isSuperAdmin ? <AdminPage /> : <PlaceholderPage title="Geen toegang" icon="Home" />)
    : (pages[activePage] || <PlaceholderPage title={activePage} icon="Home" />);

  return (
    <div className="flex h-screen w-full bg-erp-bg0 text-erp-text0 overflow-hidden">
      <ErpSidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ErpHeader />
        <div className="flex-1 overflow-auto p-[22px]" key={activePage}>
          {resolvedPage}
        </div>
      </main>
    </div>
  );
};

export default Index;
