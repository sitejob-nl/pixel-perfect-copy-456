import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicDemo } from "@/hooks/useDemos";
import DemoPasswordGate from "@/components/demos/DemoPasswordGate";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const DEVICES = [
  { key: "desktop", icon: Monitor, width: "100%" },
  { key: "tablet", icon: Tablet, width: "768px" },
  { key: "mobile", icon: Smartphone, width: "375px" },
] as const;

export default function DemoViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: demo, isLoading, error } = usePublicDemo(slug);
  const [device, setDevice] = useState<string>("desktop");
  const [unlocked, setUnlocked] = useState(false);
  const [pwError, setPwError] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-erp-bg0 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Laden...</p>
      </div>
    );
  }

  if (error || !demo) {
    return (
      <div className="min-h-screen bg-erp-bg0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Globe className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-foreground font-medium">Demo niet gevonden</p>
          <p className="text-sm text-muted-foreground">Deze link is ongeldig of de demo is niet meer beschikbaar.</p>
        </div>
      </div>
    );
  }

  // Password gate
  if (demo.password_hash && !unlocked) {
    return (
      <DemoPasswordGate
        hint={demo.password_hint}
        onUnlock={(pw) => {
          // Simple client-side check — the hash comparison should ideally happen server-side
          if (pw === demo.password_hash) {
            setUnlocked(true);
          } else {
            setPwError(true);
          }
        }}
      />
    );
  }

  const activeWidth = DEVICES.find((d) => d.key === device)!.width;

  return (
    <div className="min-h-screen bg-erp-bg0 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            {demo.company_name || demo.title || "Demo"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {DEVICES.map((d) => (
            <Button
              key={d.key}
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", device === d.key && "bg-muted")}
              onClick={() => setDevice(d.key)}
            >
              <d.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </header>

      {/* Iframe */}
      <div className="flex-1 flex items-start justify-center overflow-auto p-4">
        <iframe
          srcDoc={demo.demo_html}
          className="bg-white rounded-lg shadow-xl transition-all duration-300"
          style={{ width: activeWidth, height: "calc(100vh - 80px)", maxWidth: "100%", border: "none" }}
          sandbox="allow-scripts"
          title={demo.title || "Demo"}
        />
      </div>

      {/* Footer CTA */}
      <footer className="border-t border-border bg-card px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-primary">SaleJobs</span>
        </p>
      </footer>
    </div>
  );
}
