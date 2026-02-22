import { useState } from "react";
import ErpSidebar from "@/components/erp/ErpSidebar";
import ErpHeader from "@/components/erp/ErpHeader";
import DashboardPage from "@/pages/DashboardPage";
import ContactsPage from "@/pages/ContactsPage";
import PipelinePage from "@/pages/PipelinePage";
import { ProjectsPage, InvoicesPage } from "@/pages/ProjectsInvoicesPage";
import DataIntelPage from "@/pages/DataIntelPage";
import ContentPage from "@/pages/ContentPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import type { IconName } from "@/components/erp/ErpIcons";

const pages: Record<string, React.ReactNode> = {
  dashboard: <DashboardPage />,
  contacts: <ContactsPage />,
  pipeline: <PipelinePage />,
  projects: <ProjectsPage />,
  invoices: <InvoicesPage />,
  dataintel: <DataIntelPage />,
  content: <ContentPage />,
  companies: <PlaceholderPage title="Bedrijven" icon="Building" />,
  quotes: <PlaceholderPage title="Offertes" icon="File" />,
  contracts: <PlaceholderPage title="Contracten" icon="Pen" />,
  demos: <PlaceholderPage title="Demo Generatie" icon="Globe" />,
  whatsapp: <PlaceholderPage title="WhatsApp" icon="Msg" />,
};

const Index = () => {
  const [activePage, setActivePage] = useState("dashboard");

  return (
    <div className="flex h-screen w-full bg-erp-bg0 text-erp-text0 overflow-hidden">
      <ErpSidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ErpHeader />
        <div className="flex-1 overflow-auto p-[22px]" key={activePage}>
          {pages[activePage] || <PlaceholderPage title={activePage} icon="Home" />}
        </div>
      </main>
    </div>
  );
};

export default Index;
