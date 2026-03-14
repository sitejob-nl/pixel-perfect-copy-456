import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Upload, Eye, Copy, Trash2, Globe, Lock, Search, Loader2, Pencil, CheckCircle, XCircle, FileStack,
} from "lucide-react";
import { useDemos, useDeleteDemo, useDuplicateDemo, useUpdateDemo } from "@/hooks/useDemos";
import DemoTypeBadge from "@/components/demos/DemoTypeBadge";
import DemoPreviewModal from "@/components/demos/DemoPreviewModal";
import UploadDemoDialog from "@/components/demos/UploadDemoDialog";
import DemoWizard from "@/components/demos/DemoWizard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function DemosPage() {
  const [wizardOpen, setWizardOpen] = useState(false);

  if (wizardOpen) {
    return <DemoWizard onClose={() => setWizardOpen(false)} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Demo Bouwer</h1>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Nieuwe demo
        </Button>
      </div>
      <DemosGrid />
    </div>
  );
}

function DemosGrid() {
  const navigate = useNavigate();
  const { data: demos, isLoading } = useDemos();
  const deleteDemo = useDeleteDemo();
  const duplicateDemo = useDuplicateDemo();
  const updateDemo = useUpdateDemo();
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = (demos || []).filter(
    (d: any) =>
      (d.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (d.company_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/demo/${slug}`);
    toast.success("Link gekopieerd");
  };

  const getStatusIcon = (demo: any) => {
    if (demo.generation_status === "generating") return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    if (demo.generation_status === "failed") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    if (demo.demo_html || demo.generation_status === "completed") return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoeken..." className="pl-9" />
        </div>
        <Button onClick={() => setUploadOpen(true)} variant="outline" size="sm"><Upload className="h-4 w-4 mr-1.5" />Upload</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Laden...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Geen demo's gevonden</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((demo: any) => (
            <Card key={demo.id} className="bg-card border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(demo)}
                    <h3 className="text-sm font-semibold text-foreground truncate">{demo.title || "Naamloze demo"}</h3>
                  </div>
                  {demo.company_name && <p className="text-xs text-muted-foreground">{demo.company_name}</p>}
                </div>
                <DemoTypeBadge type={demo.demo_type} />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{demo.views || 0}</span>
                {demo.is_multipage && (
                  <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                    <FileStack className="h-2.5 w-2.5" /> {demo.page_count || "Multi"}
                  </Badge>
                )}
                {demo.feedback_count > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">{demo.feedback_count} feedback</Badge>
                )}
                {demo.model_used && (
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-medium">{demo.model_used}</span>
                )}
                {demo.is_public ? (
                  <span className="flex items-center gap-1 text-primary"><Globe className="h-3 w-3" />Publiek</span>
                ) : (
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Privé</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setPreviewHtml(demo.demo_html); setPreviewTitle(demo.title); }}>
                  <Eye className="h-3 w-3 mr-1" />Preview
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/demos/${demo.id}/edit`)}>
                  <Pencil className="h-3 w-3 mr-1" />Bewerk
                </Button>
                {demo.public_slug && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyLink(demo.public_slug)}>
                    <Copy className="h-3 w-3 mr-1" />Link
                  </Button>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                  <Switch
                    checked={!!demo.is_public}
                    onCheckedChange={(checked) => updateDemo.mutate({ id: demo.id, is_public: checked })}
                    className="scale-75"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateDemo.mutate(demo.id)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDemo.mutate(demo.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <DemoPreviewModal open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)} html={previewHtml || ""} title={previewTitle} />
      <UploadDemoDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
