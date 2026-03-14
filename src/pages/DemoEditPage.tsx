import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDemo, useDemoPages } from "@/hooks/useDemos";
import DemoEditor from "@/components/demos/DemoEditor";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone, ArrowLeft, Share2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const DEVICES = [
  { key: "desktop", icon: Monitor, w: "100%" },
  { key: "tablet", icon: Tablet, w: "768px" },
  { key: "mobile", icon: Smartphone, w: "375px" },
] as const;

export default function DemoEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: demo, isLoading } = useDemo(id);
  const { data: pages } = useDemoPages(id);

  const [activePage, setActivePage] = useState("");
  const [device, setDevice] = useState("desktop");

  useEffect(() => {
    if (pages?.length && !activePage) setActivePage(pages[0].slug);
  }, [pages, activePage]);

  // Listen for iframe page nav
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "demo-nav") setActivePage(e.data.page);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">Laden...</div>;
  }

  if (!demo) {
    return <div className="flex items-center justify-center h-96 text-muted-foreground text-sm">Demo niet gevonden</div>;
  }

  const activeHtml = pages?.find((p: any) => p.slug === activePage)?.html_content || demo.demo_html || "";
  const activeWidth = DEVICES.find((d) => d.key === device)?.w || "100%";

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate("/demos")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Terug
          </Button>
          <span className="text-sm font-semibold text-foreground shrink-0">
            {demo.company_name || demo.title || "Demo"}
          </span>
          {pages && pages.length > 0 && (
            <div className="flex gap-1">
              {pages.map((p: any) => (
                <button
                  key={p.slug}
                  onClick={() => setActivePage(p.slug)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors",
                    activePage === p.slug
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {DEVICES.map((d) => (
            <Button key={d.key} variant="ghost" size="icon" className={cn("h-8 w-8", device === d.key && "bg-muted")} onClick={() => setDevice(d.key)}>
              <d.icon className="h-4 w-4" />
            </Button>
          ))}
          {demo.public_slug && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="outline" size="sm" onClick={() => window.open(`/demo/${demo.public_slug}`, "_blank")}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Bekijken
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-start justify-center overflow-auto p-4 bg-muted/30">
          <iframe
            srcDoc={activeHtml}
            className="bg-white rounded-lg shadow-xl transition-all duration-300"
            style={{ width: activeWidth, height: "calc(100vh - 160px)", maxWidth: "100%", border: "none" }}
            sandbox="allow-scripts"
            title="Demo editor"
          />
        </div>
        <div className="w-80 border-l border-border p-4 overflow-y-auto bg-card hidden lg:block">
          <h3 className="text-sm font-semibold text-foreground mb-3">AI Editor</h3>
          <DemoEditor demoId={demo.id} model={demo.model_used} />
        </div>
      </div>
    </div>
  );
}
