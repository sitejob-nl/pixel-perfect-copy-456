import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useIsSuperAdmin } from "@/hooks/useSuperAdmin";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";
import DashboardPage from "./pages/DashboardPage";
import ContactsPage from "./pages/ContactsPage";
import ContactDetailPage from "./pages/ContactDetailPage";
import CompaniesPage from "./pages/CompaniesPage";
import PipelinePage from "./pages/PipelinePage";
import { ProjectsPage, InvoicesPage } from "./pages/ProjectsInvoicesPage";
import QuotesPage from "./pages/QuotesPage";
import DataIntelPage from "./pages/DataIntelPage";
import AIAgentPage from "./pages/AIAgentPage";
import ContentPage from "./pages/ContentPage";
import WebhooksPage from "./pages/WebhooksPage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import ContractsPage from "./pages/ContractsPage";
import ContractSigningPage from "./pages/ContractSigningPage";
import ScrapersPage from "./pages/ScrapersPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import DemosPage from "./pages/DemosPage";
import DemoViewPage from "./pages/DemoViewPage";
import PortalAdminPage from "./pages/PortalAdminPage";
import ClientPortalPage from "./pages/ClientPortalPage";
import EmailPage from "./pages/EmailPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { data: orgData, isLoading: orgLoading } = useOrganization();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-erp-bg0 flex items-center justify-center">
        <div className="text-erp-text2 text-sm">Laden...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!orgData) {
    return <Navigate to="/onboarding" replace />;
  }

  if (orgData.deactivated) {
    return (
      <div className="min-h-screen bg-erp-bg0 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠</span>
          </div>
          <h2 className="text-lg font-semibold text-erp-text0">Account gedeactiveerd</h2>
          <p className="text-sm text-erp-text3">
            Je account is gedeactiveerd door een beheerder. Neem contact op met de organisatiebeheerder om weer toegang te krijgen.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { data: orgData, isLoading: orgLoading } = useOrganization();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-erp-bg0 flex items-center justify-center">
        <div className="text-erp-text2 text-sm">Laden...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (orgData) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-erp-bg0 flex items-center justify-center">
        <div className="text-erp-text2 text-sm">Laden...</div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AdminRoute() {
  const { data: isSuperAdmin, isLoading } = useIsSuperAdmin();

  if (isLoading) return null;

  return isSuperAdmin
    ? <AdminPage />
    : <PlaceholderPage title="Geen toegang" icon="Home" />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/sign" element={<ContractSigningPage />} />
            <Route path="/portal" element={<ClientPortalPage />} />
            <Route path="/demo/:slug" element={<DemoViewPage />} />
            <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

            {/* Protected layout with sidebar */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="contacts/:id" element={<ContactDetailPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="knowledgebase" element={<KnowledgeBasePage />} />
              <Route path="dataintel" element={<DataIntelPage />} />
              <Route path="scrapers" element={<ScrapersPage />} />
              <Route path="aiagent" element={<AIAgentPage />} />
              <Route path="demos" element={<DemosPage />} />
              <Route path="content" element={<ContentPage />} />
              <Route path="portals" element={<PortalAdminPage />} />
              <Route path="whatsapp" element={<WhatsAppPage />} />
              <Route path="email" element={<EmailPage />} />
              <Route path="webhooks" element={<WebhooksPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<AdminRoute />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
