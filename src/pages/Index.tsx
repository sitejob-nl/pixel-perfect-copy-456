import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import ErpSidebar from "@/components/erp/ErpSidebar";
import ErpHeader from "@/components/erp/ErpHeader";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import AskSiteJobCommandBar from "@/components/erp/AskSiteJobCommandBar";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Snelstart callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("snelstart") === "activated") {
      toast.success("Snelstart koppeling wordt geactiveerd. Dit kan even duren.");
      navigate("/settings", { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <BrandingProvider>
      <div className="flex h-[100dvh] w-full bg-erp-bg0 text-erp-text0 overflow-hidden">
        {!isMobile && <ErpSidebar />}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <ErpHeader onSearchClick={() => setCommandBarOpen(true)} />
          <div className="flex-1 overflow-auto p-3 md:p-[22px]">
            <Outlet />
          </div>
        </main>
      </div>
      <AskSiteJobCommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </BrandingProvider>
  );
};

export default Index;
