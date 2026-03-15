import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCrawlStart, useCrawlAnalyze, useGenerateDemo, usePollStatus, callDemoService } from "@/hooks/useDemos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import DemoTypeSelector, { type PlatformType } from "./DemoTypeSelector";
import DemoEditor from "./DemoEditor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Globe, Check, Loader2, X, GripVertical,
  Plus, Monitor, Tablet, Smartphone, ExternalLink, Copy, Share2, Info,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STEPS = [
  "Website & Klant",
  "Bedrijfsprofiel",
  "Pagina's",
  "Genereren",
  "Preview & Delen",
];

interface PageConfig {
  title: string;
  slug: string;
  description: string;
  enabled: boolean;
}

const FALLBACK_PAGES: PageConfig[] = [
  { title: "Home", slug: "home", description: "Hero, diensten overzicht, testimonials, CTA", enabled: true },
  { title: "Over Ons", slug: "over-ons", description: "Bedrijfsverhaal, team, missie en visie", enabled: true },
  { title: "Diensten", slug: "diensten", description: "Alle diensten met uitleg en voordelen", enabled: true },
  { title: "Contact", slug: "contact", description: "Contactformulier, adres, openingstijden", enabled: true },
];

const DEVICES = [
  { key: "desktop", icon: Monitor, w: "100%" },
  { key: "tablet", icon: Tablet, w: "768px" },
  { key: "mobile", icon: Smartphone, w: "375px" },
] as const;

interface Props {
  onClose: () => void;
}

export default function DemoWizard({ onClose }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: orgData } = useOrganization();
  const orgId = (orgData?.organizations as any)?.id;

  const [step, setStep] = useState(0);

  // Step 1 state
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [klantId, setKlantId] = useState("");
  const [crawlJobId, setCrawlJobId] = useState<string | null>(null);
  const [crawlFailed, setCrawlFailed] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Step 2 state (profile)
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState("");
  const [target, setTarget] = useState("");
  const [usps, setUsps] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1a56db");
  const [secondaryColor, setSecondaryColor] = useState("#f3f4f6");
  const [accentColor, setAccentColor] = useState("#dc2626");
  const [font, setFont] = useState("");
  const [tone, setTone] = useState("friendly");

  // Step 3 state
  const [demoType, setDemoType] = useState("website");
  const [pages, setPages] = useState<PageConfig[]>(FALLBACK_PAGES);
  const [model, setModel] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [addingPage, setAddingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageDesc, setNewPageDesc] = useState("");

  // Step 4 state
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationDone, setGenerationDone] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Step 5 state
  const [resultDemo, setResultDemo] = useState<any>(null);
  const [resultPages, setResultPages] = useState<any[]>([]);
  const [activePage, setActivePage] = useState("home");
  const [device, setDevice] = useState("desktop");
  const [shareOpen, setShareOpen] = useState(false);

  // Platform types query (single source of truth for page defaults)
  const { data: platformTypes } = useQuery({
    queryKey: ["platform-types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("demo_platform_types")
        .select("id, naam, beschrijving, categorie, default_pages, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as PlatformType[];
    },
  });

  // Reset pages when demoType changes — driven by state, not callbacks
  useEffect(() => {
    if (!platformTypes) return;
    const selected = platformTypes.find((t) => t.id === demoType);
    if (selected?.default_pages && Array.isArray(selected.default_pages) && selected.default_pages.length > 0) {
      setPages(selected.default_pages.map((p: any) => ({
        title: p.title || "",
        slug: p.slug || p.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "",
        description: p.description || "",
        enabled: true,
      })));
    } else {
      setPages(FALLBACK_PAGES);
    }
  }, [demoType, platformTypes]);

  // Data queries
  const { data: klanten } = useQuery({
    queryKey: ["klanten-select"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, website, industry").eq("organization_id", orgId).order("name");
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: aiModels } = useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_models").select("id, display_name, tier, is_available").eq("is_available", true).order("sort_order");
      return data || [];
    },
  });

  // Crawl polling
  const { data: crawlStatus } = usePollStatus(
    "crawl-status",
    { crawl_job_id: crawlJobId },
    3000,
    !!crawlJobId && step === 0
  );

  const crawlStart = useCrawlStart();
  const generateDemo = useGenerateDemo();

  // Generation polling
  const { data: genStatus } = usePollStatus(
    "check-generation",
    { demo_id: generationId },
    3000,
    !!generationId && step === 3 && !generationDone
  );

  // Inline update mutation
  const updateDemo = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("demos").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demos"] }),
  });

  // Handle klant selection
  useEffect(() => {
    if (klantId && klanten) {
      const k = klanten.find((c: any) => c.id === klantId);
      if (k) {
        if (k.website) setWebsiteUrl(k.website);
        if (k.name) setCompanyName(k.name);
        if (k.industry) setIndustry(k.industry);
      }
    }
  }, [klantId, klanten]);

  const selectedTypeData = platformTypes?.find((t) => t.id === demoType) || null;


  useEffect(() => {
    if (!crawlStatus) return;
    if (crawlStatus.status === "completed" && crawlStatus.analysis) {
      const a = crawlStatus.analysis;
      if (a.company_name) setCompanyName(a.company_name);
      if (a.industry) setIndustry(a.industry || "");
      if (a.location) setLocation(a.location || "");
      if (a.description) setDescription(a.description || "");
      if (a.services) setServices(Array.isArray(a.services) ? a.services.join(", ") : a.services || "");
      if (a.target_audience) setTarget(a.target_audience || "");
      if (a.usps) setUsps(Array.isArray(a.usps) ? a.usps.join(", ") : a.usps || "");
      if (a.primary_color) setPrimaryColor(a.primary_color);
      if (a.secondary_color) setSecondaryColor(a.secondary_color);
      if (a.accent_color) setAccentColor(a.accent_color);
      if (a.font) setFont(a.font);
      if (a.nav_items && Array.isArray(a.nav_items) && a.nav_items.length > 0) {
        const navPages = a.nav_items.map((item: any, i: number) => ({
          title: typeof item === "string" ? item : item.label || item.title || `Pagina ${i + 1}`,
          slug: (typeof item === "string" ? item : item.label || item.title || `pagina-${i + 1}`)
            .toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: typeof item === "string" ? "" : item.description || "",
          enabled: i < 5,
        }));
        setPages(navPages);
      }
      setCrawlJobId(null);
      setStep(1);
    } else if (crawlStatus.status === "failed") {
      setCrawlFailed(true);
      setCrawlJobId(null);
    }
  }, [crawlStatus]);

  // Handle generation completion
  useEffect(() => {
    if (!genStatus) return;
    if (genStatus.status === "completed" || genStatus.generation_status === "completed") {
      setGenerationDone(true);
      setResultDemo(genStatus.demo || genStatus);
      setResultPages(genStatus.pages || []);
      if (genStatus.pages?.length) setActivePage(genStatus.pages[0].slug);
      setTimeout(() => setStep(4), 500);
    } else if (genStatus.status === "failed" || genStatus.generation_status === "failed") {
      setGenerationError(genStatus.error || "Generatie mislukt");
    }
  }, [genStatus]);

  // Listen for iframe page navigation
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "demo-nav") setActivePage(e.data.page);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleCrawlStart = async () => {
    if (!websiteUrl.trim()) return;
    setCrawlFailed(false);
    try {
      const result = await crawlStart.mutateAsync({
        url: websiteUrl,
        organization_id: orgId,
        page_limit: 15,
        depth: 3,
      });
      if (result?.crawl_job_id) {
        setCrawlJobId(result.crawl_job_id);
      } else if (result?.error?.includes("credentials") || result?.error?.includes("Cloudflare")) {
        setCrawlFailed(true);
      } else if (result?.analysis) {
        const a = result.analysis;
        if (a.company_name) setCompanyName(a.company_name);
        if (a.industry) setIndustry(a.industry || "");
        setStep(1);
      }
    } catch {
      setCrawlFailed(true);
    }
  };

  const handleGenerate = async () => {
    setStep(3);
    setGenerationDone(false);
    setGenerationError(null);
    const enabledPages = pages.filter((p) => p.enabled);
    try {
      const result = await generateDemo.mutateAsync({
        company_name: companyName,
        website_url: websiteUrl || undefined,
        demo_type: demoType,
        model,
        organization_id: orgId,
        page_config: enabledPages.map((p) => ({ title: p.title, slug: p.slug, description: p.description })),
        extra_instructions: extraInstructions || undefined,
        branding: {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          font,
          tone,
          industry,
          services,
          target_audience: target,
          usps,
          description,
          location,
        },
      });
      if (result?.id && (result?.demo_html || result?.pages)) {
        setResultDemo(result);
        setResultPages(result.pages || []);
        if (result.pages?.length) setActivePage(result.pages[0].slug);
        setGenerationDone(true);
        setStep(4);
      } else if (result?.demo_id || result?.id) {
        setGenerationId(result.demo_id || result.id);
      }
    } catch {
      setGenerationError("Er ging iets mis bij het genereren.");
    }
  };

  const addPage = () => {
    if (!newPageTitle.trim()) return;
    setPages((prev) => [
      ...prev,
      {
        title: newPageTitle,
        slug: newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: newPageDesc,
        enabled: true,
      },
    ]);
    setNewPageTitle("");
    setNewPageDesc("");
    setAddingPage(false);
  };

  const enabledPages = pages.filter((p) => p.enabled);
  const activeHtml = resultPages.find((p: any) => p.slug === activePage)?.html_content
    || (resultDemo?.demo_html || "");
  const activeWidth = DEVICES.find((d) => d.key === device)?.w || "100%";

  const crawlProgress = crawlStatus
    ? crawlStatus.pages_found
      ? Math.min(100, Math.round((crawlStatus.pages_found / (crawlStatus.page_limit || 15)) * 100))
      : 30
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Step indicator */}
      <div className="border-b border-border px-6 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Sluiten
        </Button>
        <div className="flex-1 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                i < step ? "bg-primary text-primary-foreground border-primary" :
                i === step ? "border-primary text-primary bg-primary/10" :
                "border-border text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs hidden sm:inline", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        {/* ─── Step 1: URL & Klant ─── */}
        {step === 0 && (
          <div className="max-w-lg mx-auto p-6 space-y-6 pt-12">
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-foreground">Website & Klant</h2>
              <p className="text-sm text-muted-foreground">Voer een website URL in of koppel aan een bestaande klant</p>
            </div>

            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://bakkerijjanssen.nl" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">OF koppel aan bestaande klant</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              <Label>Klant (optioneel)</Label>
              <Select value={klantId} onValueChange={setKlantId}>
                <SelectTrigger><SelectValue placeholder="Zoek klant..." /></SelectTrigger>
                <SelectContent>
                  {(klanten || []).map((k: any) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name} {k.industry ? `· ${k.industry}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {crawlJobId && (
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-foreground">Website wordt gecrawld...</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-primary"><Check className="h-3 w-3" /> Verbinding gemaakt</div>
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Pagina's aan het ophalen ({crawlStatus?.pages_found || 0}/{crawlStatus?.page_limit || 15})
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">○ Branding analyseren</div>
                  <div className="flex items-center gap-2 text-muted-foreground">○ Bedrijfsinformatie extraheren</div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${crawlProgress}%` }} />
                </div>
              </Card>
            )}

            {(crawlFailed || manualMode) && (
              <Card className="p-4 space-y-3 border-destructive/20">
                <p className="text-xs text-muted-foreground">
                  {crawlFailed ? "Cloudflare is niet geconfigureerd of de crawl is mislukt. " : ""}
                  Je kunt handmatig doorgaan.
                </p>
                <div className="space-y-2">
                  <Label>Bedrijfsnaam *</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Bakkerij Janssen" />
                </div>
                <div className="space-y-2">
                  <Label>Branche</Label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Bakkerij" />
                </div>
                <div className="space-y-2">
                  <Label>Beschrijving</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ambachtelijke bakkerij..." rows={3} />
                </div>
                <Button onClick={() => setStep(2)} disabled={!companyName.trim()} className="w-full">
                  Doorgaan naar pagina's <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Card>
            )}

            {!crawlJobId && !crawlFailed && !manualMode && (
              <div className="flex gap-2">
                <Button onClick={handleCrawlStart} disabled={!websiteUrl.trim() || crawlStart.isPending} className="flex-1">
                  {crawlStart.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                  Crawl starten
                </Button>
                <Button variant="outline" onClick={() => setManualMode(true)}>
                  Handmatig
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 2: Bedrijfsprofiel ─── */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto p-6 space-y-6 pt-8">
            <h2 className="text-lg font-bold text-foreground text-center">Bedrijfsprofiel</h2>

            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Bedrijfsgegevens</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Naam</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Branche</Label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Locatie</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Doelgroep</Label>
                  <Input value={target} onChange={(e) => setTarget(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Beschrijving</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Diensten</Label>
                <Input value={services} onChange={(e) => setServices(e.target.value)} placeholder="Dienst 1, Dienst 2, ..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">USP's</Label>
                <Input value={usps} onChange={(e) => setUsps(e.target.value)} placeholder="Ambachtelijk, Lokaal, ..." />
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Branding</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Primair</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer" />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="text-xs h-8" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Secundair</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer" />
                    <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="text-xs h-8" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Accent</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer" />
                    <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="text-xs h-8" />
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Font</Label>
                  <Input value={font} onChange={(e) => setFont(e.target.value)} placeholder="Playfair Display" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Toon</Label>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {["formeel", "casual", "friendly", "technisch"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={cn(
                          "text-xs px-3 py-1 rounded-full border transition-colors capitalize",
                          tone === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Terug</Button>
              <Button onClick={() => setStep(2)} disabled={!companyName.trim()}>Volgende <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Pagina's configureren ─── */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto p-6 space-y-6 pt-8">
            <h2 className="text-lg font-bold text-foreground text-center">Pagina's configureren</h2>

            <div className="space-y-2">
              <Label>Demo type</Label>
              <DemoTypeSelector value={demoType} onChange={setDemoType} />
            </div>

            {selectedTypeData && ["platform", "portal"].includes(selectedTypeData.categorie) && (
              <Alert className="border-erp-purple/30 bg-erp-purple/5">
                <Info className="h-4 w-4 text-erp-purple" />
                <AlertDescription className="text-xs text-muted-foreground">
                  {selectedTypeData.categorie === "platform"
                    ? "Dit genereert een applicatie-dashboard met sidebar navigatie, niet een publieke website."
                    : "Dit genereert een self-service portaal met inlog en klantgerichte interface."}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Pagina's</Label>
              <div className="space-y-1.5">
                {pages.map((page, i) => (
                  <Card key={i} className={cn("p-3 flex items-start gap-3 transition-opacity", !page.enabled && "opacity-50")}>
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 cursor-grab" />
                    <Checkbox
                      checked={page.enabled}
                      onCheckedChange={(checked) => {
                        setPages((prev) => prev.map((p, j) => j === i ? { ...p, enabled: !!checked } : p));
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Input
                        value={page.title}
                        onChange={(e) => setPages((prev) => prev.map((p, j) => j === i ? { ...p, title: e.target.value } : p))}
                        className="h-7 text-sm font-medium border-none p-0 shadow-none focus-visible:ring-0"
                      />
                      <Input
                        value={page.description}
                        onChange={(e) => setPages((prev) => prev.map((p, j) => j === i ? { ...p, description: e.target.value } : p))}
                        className="h-6 text-xs text-muted-foreground border-none p-0 shadow-none focus-visible:ring-0"
                        placeholder="Beschrijving..."
                      />
                    </div>
                  </Card>
                ))}
              </div>

              {addingPage ? (
                <Card className="p-3 space-y-2">
                  <Input value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)} placeholder="Paginanaam" className="h-8 text-sm" />
                  <Input value={newPageDesc} onChange={(e) => setNewPageDesc(e.target.value)} placeholder="Beschrijving" className="h-8 text-xs" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addPage} disabled={!newPageTitle.trim()}>Toevoegen</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingPage(false)}>Annuleren</Button>
                  </div>
                </Card>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAddingPage(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Pagina toevoegen
                </Button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue placeholder="Selecteer model" /></SelectTrigger>
                  <SelectContent>
                    {(aiModels || []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.display_name}
                        <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">{m.tier}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Extra instructies (optioneel)</Label>
              <Textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)} placeholder="Focus op online bestellen en bezorging" rows={2} />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Terug</Button>
              <Button onClick={handleGenerate} disabled={enabledPages.length === 0}>
                Genereer demo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Genereren ─── */}
        {step === 3 && (
          <div className="max-w-lg mx-auto p-6 space-y-6 pt-12">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-foreground">Demo wordt gegenereerd</h2>
              <p className="text-sm text-muted-foreground">
                {companyName} — {demoType} ({enabledPages.length} pagina's)
              </p>
            </div>

            {generationError ? (
              <Card className="p-4 space-y-3 border-destructive/30">
                <p className="text-sm text-destructive">{generationError}</p>
                <Button onClick={handleGenerate}>Opnieuw proberen</Button>
              </Card>
            ) : (
              <>
                <div className="space-y-2">
                  {enabledPages.map((page, i) => {
                    const pageStatus = genStatus?.pages_status?.find((ps: any) => ps.slug === page.slug);
                    const isDone = pageStatus?.status === "completed";
                    const isActive = pageStatus?.status === "generating";

                    return (
                      <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-card border border-border">
                        <div className="flex items-center gap-2">
                          {isDone ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                          )}
                          <span className={cn(isDone ? "text-foreground" : "text-muted-foreground")}>{page.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {isDone ? `klaar${pageStatus?.duration ? ` (${pageStatus.duration}s)` : ""}` :
                           isActive ? "bezig..." : "wachtend"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{
                        width: `${genStatus?.pages_status
                          ? Math.round((genStatus.pages_status.filter((p: any) => p.status === "completed").length / enabledPages.length) * 100)
                          : 10}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {genStatus?.pages_status
                      ? `${genStatus.pages_status.filter((p: any) => p.status === "completed").length}/${enabledPages.length} pagina's`
                      : "Bezig..."}
                  </p>
                </div>

                {!genStatus && (
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Step 5: Preview & Delen ─── */}
        {step === 4 && (
          <div className="flex flex-col h-full">
            <div className="border-b border-border px-4 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-sm font-semibold text-foreground shrink-0">{companyName}</span>
                <div className="flex gap-1">
                  {resultPages.map((p: any) => (
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
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {DEVICES.map((d) => (
                  <Button key={d.key} variant="ghost" size="icon" className={cn("h-8 w-8", device === d.key && "bg-muted")} onClick={() => setDevice(d.key)}>
                    <d.icon className="h-4 w-4" />
                  </Button>
                ))}
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-3.5 w-3.5 mr-1" /> Delen
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex items-start justify-center overflow-auto p-4 bg-muted/30">
                <iframe
                  srcDoc={activeHtml}
                  className="bg-white rounded-lg shadow-xl transition-all duration-300"
                  style={{ width: activeWidth, height: "calc(100vh - 160px)", maxWidth: "100%", border: "none" }}
                  sandbox="allow-scripts"
                  title="Demo preview"
                />
              </div>
              {resultDemo?.id && (
                <div className="w-80 border-l border-border p-4 overflow-y-auto bg-card hidden lg:block">
                  <h3 className="text-sm font-semibold text-foreground mb-3">AI Editor</h3>
                  <DemoEditor demoId={resultDemo.id} model={model} />
                </div>
              )}
            </div>

            <div className="border-t border-border px-4 py-2 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Terug naar overzicht
              </Button>
              <div className="flex gap-2">
                {resultDemo?.public_slug && (
                  <Button variant="outline" size="sm" onClick={() => window.open(`/demo/${resultDemo.public_slug}`, "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open in nieuw tab
                  </Button>
                )}
                <Button size="sm" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-3.5 w-3.5 mr-1" /> Deel demo
                </Button>
              </div>
            </div>

            {/* Share dialog */}
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Demo delen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Publiek maken</Label>
                    <Switch
                      checked={resultDemo?.is_public || false}
                      onCheckedChange={(v) => {
                        if (resultDemo?.id) updateDemo.mutate({ id: resultDemo.id, is_public: v });
                        setResultDemo((prev: any) => prev ? { ...prev, is_public: v } : prev);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Feedback toestaan</Label>
                    <Switch
                      checked={resultDemo?.share_settings?.allow_feedback !== false}
                      onCheckedChange={(v) => {
                        const ss = { ...(resultDemo?.share_settings || {}), allow_feedback: v };
                        if (resultDemo?.id) updateDemo.mutate({ id: resultDemo.id, share_settings: ss });
                        setResultDemo((prev: any) => prev ? { ...prev, share_settings: ss } : prev);
                      }}
                    />
                  </div>
                  {resultDemo?.public_slug && (
                    <>
                      <div className="flex gap-2">
                        <Input value={`${window.location.origin}/demo/${resultDemo.public_slug}`} readOnly className="text-xs" />
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/demo/${resultDemo.public_slug}`); toast.success("Link gekopieerd"); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => window.open(`/demo/${resultDemo.public_slug}`, "_blank")}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Open in nieuw tab
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
