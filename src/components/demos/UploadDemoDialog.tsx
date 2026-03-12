import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DemoTypeSelector from "./DemoTypeSelector";
import { Upload } from "lucide-react";
import { useCreateDemo } from "@/hooks/useDemos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UploadDemoDialog({ open, onOpenChange }: Props) {
  const [html, setHtml] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [demoType, setDemoType] = useState("website");
  const [password, setPassword] = useState("");
  const createDemo = useCreateDemo();

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHtml(reader.result as string);
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHtml(reader.result as string);
    reader.readAsText(file);
  }, []);

  const handleSubmit = () => {
    if (!html) return;
    createDemo.mutate(
      {
        demo_html: html,
        demo_type: demoType,
        company_name: companyName || undefined,
        title: companyName ? `${companyName} - ${demoType}` : `Upload - ${demoType}`,
        is_public: !!slug,
        public_slug: slug || undefined,
        password_hash: password || undefined,
      },
      { onSuccess: () => { onOpenChange(false); setHtml(""); setCompanyName(""); setSlug(""); setPassword(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader><DialogTitle>Demo uploaden</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/40 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">{html ? "HTML geladen ✓" : "Sleep een HTML bestand hierheen"}</p>
            <Input type="file" accept=".html,.htm" onChange={handleFile} className="max-w-xs mx-auto" />
          </div>

          <div className="space-y-2">
            <Label>Bedrijfsnaam</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme B.V." />
          </div>

          <div className="space-y-2">
            <Label>Demo type</Label>
            <DemoTypeSelector value={demoType} onChange={setDemoType} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Publieke slug (optioneel)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme-demo" />
            </div>
            <div className="space-y-2">
              <Label>Wachtwoord (optioneel)</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={!html || createDemo.isPending} className="w-full">
            {createDemo.isPending ? "Uploaden..." : "Demo opslaan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
