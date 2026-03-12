import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone, X, Copy, Download } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  title?: string;
}

const DEVICES = [
  { key: "desktop", icon: Monitor, width: "100%" },
  { key: "tablet", icon: Tablet, width: "768px" },
  { key: "mobile", icon: Smartphone, width: "375px" },
] as const;

export default function DemoPreviewModal({ open, onOpenChange, html, title }: Props) {
  const [device, setDevice] = useState<string>("desktop");
  const activeDevice = DEVICES.find((d) => d.key === device)!;

  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    toast.success("HTML gekopieerd");
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "demo"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-[90vh] p-0 gap-0 bg-erp-bg1 border-border">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm font-medium text-foreground truncate">{title || "Preview"}</span>
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
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}><Download className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex-1 flex items-start justify-center overflow-auto p-4 bg-erp-bg0">
          <iframe
            srcDoc={html}
            className="bg-white rounded-lg shadow-lg transition-all duration-300"
            style={{ width: activeDevice.width, height: "100%", maxWidth: "100%", border: "none" }}
            sandbox="allow-scripts"
            title="Demo preview"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
