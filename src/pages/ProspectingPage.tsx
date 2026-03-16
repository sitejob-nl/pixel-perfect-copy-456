import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErpCard, PageHeader, ErpButton, Badge, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useProspectingStatus, useProspectSearch } from "@/hooks/useProspecting";
import { useProspectKanban, useProspectPools } from "@/hooks/useProspectKanban";
import ProspectKanban from "@/components/prospecting/ProspectKanban";
import ProspectTable from "@/components/prospecting/ProspectTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { Loader2, Kanban, Table2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── New Search Dialog (kept from original) ─── */
function NewSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const searchMutation = useProspectSearch();
  const [gmQuery, setGmQuery] = useState("");
  const [gmMax, setGmMax] = useState("20");
  const [urlInput, setUrlInput] = useState("");
  const [urlName, setUrlName] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualWebsite, setManualWebsite] = useState("");
  const [manualCity, setManualCity] = useState("");

  const handleGoogleMaps = async () => {
    if (!gmQuery.trim()) return;
    try {
      const res = await searchMutation.mutateAsync({ source: "google_maps", query: gmQuery, config: { max_results: parseInt(gmMax) || 20 } });
      toast.success(`Zoekopdracht gestart: ${gmQuery}`);
      onOpenChange(false);
      if (res.pool_id) navigate(`/prospecting/${res.pool_id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      const res = await searchMutation.mutateAsync({ source: "url_import", leads: [{ website_url: urlInput, company_name: urlName || undefined }] });
      toast.success("URL toegevoegd");
      onOpenChange(false);
      if (res.pool_id) navigate(`/prospecting/${res.pool_id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleManual = async () => {
    if (!manualName.trim()) return;
    try {
      const res = await searchMutation.mutateAsync({ source: "manual", leads: [{ company_name: manualName, website_url: manualWebsite || undefined, city: manualCity || undefined }] });
      toast.success("Lead toegevoegd");
      onOpenChange(false);
      if (res.pool_id) navigate(`/prospecting/${res.pool_id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const loading = searchMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-erp-bg2 border-erp-border0">
        <DialogHeader><DialogTitle className="text-erp-text0">Nieuwe zoekopdracht</DialogTitle></DialogHeader>
        <Tabs defaultValue="google_maps" className="mt-2">
          <TabsList className="bg-erp-bg3 border border-erp-border0">
            <TabsTrigger value="google_maps" className="text-[12px]">Google Maps</TabsTrigger>
            <TabsTrigger value="url" className="text-[12px]">URL importeren</TabsTrigger>
            <TabsTrigger value="manual" className="text-[12px]">Handmatig</TabsTrigger>
          </TabsList>
          <TabsContent value="google_maps" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Zoekopdracht</Label>
              <Input value={gmQuery} onChange={e => setGmQuery(e.target.value)} placeholder="installateur Eindhoven" className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
            </div>
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Max resultaten</Label>
              <Input value={gmMax} onChange={e => setGmMax(e.target.value)} type="number" className="bg-erp-bg3 border-erp-border0 text-erp-text0 w-24" />
            </div>
            <ErpButton primary onClick={handleGoogleMaps} disabled={loading || !gmQuery.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Search className="w-4 h-4" />} Zoeken
            </ErpButton>
          </TabsContent>
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Website URL</Label>
              <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://bakkerijjanssen.nl" className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
            </div>
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Bedrijfsnaam (optioneel)</Label>
              <Input value={urlName} onChange={e => setUrlName(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
            </div>
            <ErpButton primary onClick={handleUrl} disabled={loading || !urlInput.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Plus className="w-4 h-4" />} Toevoegen
            </ErpButton>
          </TabsContent>
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Bedrijfsnaam *</Label>
              <Input value={manualName} onChange={e => setManualName(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
            </div>
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Website</Label>
              <Input value={manualWebsite} onChange={e => setManualWebsite(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
            </div>
            <div className="space-y-2">
              <Label className="text-erp-text1 text-[12px]">Stad</Label>
              <Input value={manualCity} onChange={e => setManualCity(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
            </div>
            <ErpButton primary onClick={handleManual} disabled={loading || !manualName.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Plus className="w-4 h-4" />} Toevoegen
            </ErpButton>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Page ─── */
export default function ProspectingPage() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<"kanban" | "table">(isMobile ? "table" : "kanban");
  const [poolFilter, setPoolFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: kanbanData, isLoading } = useProspectKanban(poolFilter !== "all" ? poolFilter : undefined);
  const { data: pools } = useProspectPools();

  const summary = kanbanData?.summary;

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-erp-blue" />
          <h1 className="text-[22px] font-bold tracking-tight text-erp-text0">Prospecting</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Summary badges */}
          {summary && (
            <div className="flex items-center gap-2 text-[11px] text-erp-text2 font-medium">
              <span>{summary.total} totaal</span>
              <span>·</span>
              <span>{summary.with_demo} demo</span>
              <span>·</span>
              <span>{summary.demos_viewed} bekeken</span>
              <span>·</span>
              <span>{summary.converted} geconverteerd</span>
            </div>
          )}

          {/* Pool filter */}
          <Select value={poolFilter} onValueChange={setPoolFilter}>
            <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[12px] h-8 w-[160px]">
              <SelectValue placeholder="Alle pools" />
            </SelectTrigger>
            <SelectContent className="bg-erp-bg2 border-erp-border0">
              <SelectItem value="all" className="text-erp-text0 text-[12px]">Alle pools</SelectItem>
              {(pools || []).map((p: any) => (
                <SelectItem key={p.id} value={p.id} className="text-erp-text0 text-[12px]">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          {!isMobile && (
            <ToggleGroup type="single" value={view} onValueChange={v => v && setView(v as any)} className="bg-erp-bg3 border border-erp-border0 rounded-lg">
              <ToggleGroupItem value="kanban" className="text-[12px] px-3 py-1.5 data-[state=on]:bg-erp-blue data-[state=on]:text-white">
                <Kanban className="w-3.5 h-3.5 mr-1" /> Kanban
              </ToggleGroupItem>
              <ToggleGroupItem value="table" className="text-[12px] px-3 py-1.5 data-[state=on]:bg-erp-blue data-[state=on]:text-white">
                <Table2 className="w-3.5 h-3.5 mr-1" /> Tabel
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          <ErpButton primary onClick={() => setSearchOpen(true)}>
            <Icons.Plus className="w-4 h-4" /> Nieuwe zoekopdracht
          </ErpButton>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-erp-text3" />
        </div>
      ) : !kanbanData || kanbanData.leads.length === 0 ? (
        <ErpCard className="p-10 text-center">
          <Icons.Search className="w-10 h-10 text-erp-text3 mx-auto mb-3" />
          <p className="text-[14px] text-erp-text2 font-medium mb-1">Nog geen prospects</p>
          <p className="text-[12px] text-erp-text3">Start je eerste zoekopdracht om prospects te vinden.</p>
        </ErpCard>
      ) : view === "kanban" && !isMobile ? (
        <ProspectKanban data={kanbanData} />
      ) : (
        <ProspectTable data={kanbanData} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />
      )}

      <NewSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
