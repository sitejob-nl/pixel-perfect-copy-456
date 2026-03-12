import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Upload, Eye, Copy, Trash2, Globe, Lock, ExternalLink, Search, Wand2, Loader2, Monitor, Tablet, Smartphone,
} from "lucide-react";
import { useDemos, useDeleteDemo, useDuplicateDemo, useUpdateDemo, useGenerateDemo, useAnalyzeWebsite, useWebsiteScrapes } from "@/hooks/useDemos";
import { useContacts } from "@/hooks/useContacts";
import { useOrganization } from "@/hooks/useOrganization";
import DemoTypeBadge from "@/components/demos/DemoTypeBadge";
import DemoTypeSelector from "@/components/demos/DemoTypeSelector";
import DemoPreviewModal from "@/components/demos/DemoPreviewModal";
import UploadDemoDialog from "@/components/demos/UploadDemoDialog";
import DemoEditor from "@/components/demos/DemoEditor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

// ─── Tab 1: Demo's grid ─────────────────────────────────────────────
function DemosGrid() {
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
                  <h3 className="text-sm font-semibold text-foreground truncate">{demo.title || "Naamloze demo"}</h3>
                  {demo.company_name && <p className="text-xs text-muted-foreground">{demo.company_name}</p>}
                </div>
                <DemoTypeBadge type={demo.demo_type} />
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{demo.views || 0}</span>
                {demo.model_used && (
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-medium">{demo.model_used}</span>
                )}
                {demo.is_public ? (
                  <span className="flex items-center gap-1 text-erp-green"><Globe className="h-3 w-3" />Publiek</span>
                ) : (
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3" />Privé</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setPreviewHtml(demo.demo_html); setPreviewTitle(demo.title); }}>
                  <Eye className="h-3 w-3 mr-1" />Preview
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

// ─── Tab 2: Genereren wizard ─────────────────────────────────────────
function GenerateTab() {
  const { data: orgData } = useOrganization();
  const orgId = (orgData?.organizations as any)?.id;
  const { data: contacts } = useContacts();
  const generateDemo = useGenerateDemo();
  const analyzeWebsite = useAnalyzeWebsite();
  // Dynamic model list from ai_models table
  const { data: aiModels } = useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_models")
        .select("id, display_name, tier, is_available")
        .eq("is_available", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactId, setContactId] = useState("");
  const [demoType, setDemoType] = useState("website");
  const [model, setModel] = useState("");
  const [result, setResult] = useState<any>(null);
  const [device, setDevice] = useState("desktop");

  const DEVICES = [
    { key: "desktop", icon: Monitor, w: "100%" },
    { key: "tablet", icon: Tablet, w: "768px" },
    { key: "mobile", icon: Smartphone, w: "375px" },
  ];

  const handleGenerate = async () => {
    let scrapeId: string | undefined;
    
    // If website URL is provided, first analyze to get a scrape_id
    if (websiteUrl) {
      setIsAnalyzing(true);
      try {
        const analyzeResult = await analyzeWebsite.mutateAsync({
          url: websiteUrl,
          organization_id: orgId,
        });
        scrapeId = analyzeResult?.scrape_id || analyzeResult?.id;
      } catch {
        setIsAnalyzing(false);
        return;
      }
      setIsAnalyzing(false);
    }
    
    // Now generate the demo
    setStep(2);
    generateDemo.mutate(
      {
        company_name: companyName,
        website_url: websiteUrl || undefined,
        demo_type: demoType,
        contact_id: contactId || undefined,
        model,
        organization_id: orgId,
        scrape_id: scrapeId,
      },
      {
        onSuccess: (data) => { setResult(data); setStep(3); },
        onError: () => setStep(1),
      }
    );
  };

  if (step === 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Demo wordt gegenereerd...</p>
        <p className="text-xs text-muted-foreground">Dit kan 30-60 seconden duren</p>
      </div>
    );
  }

  if (step === 3 && result) {
    const html = result.demo_html || result.html || "<p>Geen HTML ontvangen</p>";
    const demoId = result.id || result.demo_id;
    const activeW = DEVICES.find((d) => d.key === device)!.w;

    return (
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            {DEVICES.map((d) => (
              <Button key={d.key} variant="ghost" size="icon" className={cn("h-8 w-8", device === d.key && "bg-muted")} onClick={() => setDevice(d.key)}>
                <d.icon className="h-4 w-4" />
              </Button>
            ))}
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => { setStep(1); setResult(null); }}>
              Nieuwe demo
            </Button>
          </div>
          <div className="bg-erp-bg0 rounded-lg p-4 flex justify-center overflow-auto" style={{ minHeight: 500 }}>
            <iframe srcDoc={html} className="bg-white rounded shadow-lg" style={{ width: activeW, height: "100%", minHeight: 500, border: "none" }} sandbox="allow-scripts" title="Generated demo" />
          </div>
        </div>
        {demoId && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">AI Editor</h3>
            <DemoEditor demoId={demoId} model={model} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="space-y-2">
        <Label>Bedrijfsnaam *</Label>
        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme B.V." />
      </div>
      <div className="space-y-2">
        <Label>Website URL (optioneel)</Label>
        <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://acme.nl" />
      </div>
      <div className="space-y-2">
        <Label>Contact (optioneel)</Label>
        <Select value={contactId} onValueChange={setContactId}>
          <SelectTrigger><SelectValue placeholder="Selecteer contact" /></SelectTrigger>
          <SelectContent>
            {(contacts || []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Demo type</Label>
        <DemoTypeSelector value={demoType} onChange={setDemoType} />
      </div>
      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger><SelectValue placeholder="Selecteer model" /></SelectTrigger>
          <SelectContent>
            {(aiModels || []).map((m: any) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  {m.display_name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">{m.tier}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleGenerate} disabled={!companyName.trim()} className="w-full">
        <Wand2 className="h-4 w-4 mr-2" />Demo genereren
      </Button>
    </div>
  );
}

// ─── Tab 3: Website Analyse ──────────────────────────────────────────
function WebsiteAnalyseTab() {
  const { data: orgData } = useOrganization();
  const orgId = (orgData?.organizations as any)?.id;
  const { data: scrapes, isLoading } = useWebsiteScrapes();
  const analyzeWebsite = useAnalyzeWebsite();
  const [url, setUrl] = useState("");

  const handleAnalyze = () => {
    if (!url.trim()) return;
    analyzeWebsite.mutate({ url, organization_id: orgId });
    setUrl("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="flex-1" />
        <Button onClick={handleAnalyze} disabled={!url.trim() || analyzeWebsite.isPending}>
          <Search className="h-4 w-4 mr-1.5" />
          {analyzeWebsite.isPending ? "Analyseren..." : "Analyseer"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Laden...</p>
      ) : !scrapes?.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nog geen website analyses</p>
      ) : (
        <div className="space-y-2">
          {scrapes.map((s: any) => (
            <Card key={s.id} className="bg-card border-border p-3 flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.url}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(s.created_at), "d MMM yyyy HH:mm", { locale: nl })} · Status: {s.status}
                </p>
              </div>
              {s.score && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s.score}/100</span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────
export default function DemosPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Demo Bouwer</h1>
      </div>

      <Tabs defaultValue="demos">
        <TabsList>
          <TabsTrigger value="demos">Demo's</TabsTrigger>
          <TabsTrigger value="generate">Genereren</TabsTrigger>
          <TabsTrigger value="analyze">Website Analyse</TabsTrigger>
        </TabsList>
        <TabsContent value="demos"><DemosGrid /></TabsContent>
        <TabsContent value="generate"><GenerateTab /></TabsContent>
        <TabsContent value="analyze"><WebsiteAnalyseTab /></TabsContent>
      </Tabs>
    </div>
  );
}
