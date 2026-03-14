import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErpCard, PageHeader, ErpButton, Badge, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useProspectingStatus, useProspectSearch } from "@/hooks/useProspecting";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  searching: "hsl(210, 70%, 55%)",
  found: "hsl(30, 80%, 55%)",
  analyzing: "hsl(30, 80%, 55%)",
  analyzed: "hsl(30, 80%, 55%)",
  demos_ready: "hsl(145, 60%, 45%)",
  ready_to_send: "hsl(145, 60%, 45%)",
  completed: "hsl(145, 60%, 45%)",
  failed: "hsl(0, 65%, 50%)",
};

const sourceLabels: Record<string, string> = {
  google_maps: "Google Maps",
  url_import: "URL Import",
  csv_import: "CSV Import",
  manual: "Handmatig",
};

function SendStatusBar({ sent, limit, paused, reason }: { sent: number; limit: number; paused?: boolean; reason?: string }) {
  if (paused) {
    return (
      <div className="bg-erp-red/10 border border-erp-red/20 rounded-lg px-4 py-2.5 text-[13px] text-erp-red font-medium">
        ⛔ Outreach gepauzeerd: {reason}
      </div>
    );
  }
  const pct = limit > 0 ? (sent / limit) * 100 : 0;
  const remaining = Math.max(0, limit - sent);
  const barColor = pct >= 100 ? "bg-erp-red" : pct >= 80 ? "bg-orange-500" : "bg-erp-green";

  return (
    <div className="bg-erp-bg2 border border-erp-border0 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-erp-text2 font-medium">Vandaag: {sent}/{limit} verstuurd · {remaining} resterend</span>
      </div>
      <div className="h-1.5 bg-erp-bg4 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function PoolCard({ pool, onClick }: { pool: any; onClick: () => void }) {
  const date = new Date(pool.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const color = statusColors[pool.status] || "hsl(220, 10%, 50%)";

  return (
    <ErpCard hover onClick={onClick} className="p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <span className="text-[15px] font-semibold text-erp-text0">{pool.name}</span>
        </div>
        <Badge color={color}>{sourceLabels[pool.source] || pool.source}</Badge>
      </div>
      <p className="text-[12px] text-erp-text3 mb-3">
        {date} · {pool.total_leads ?? 0} leads · {pool.analyzed_leads ?? 0} geanalyseerd · {pool.demos_built ?? 0} demo's
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-erp-bg4 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ background: color, width: `${getPoolProgress(pool)}%` }}
          />
        </div>
        <span className="text-[11px] font-medium" style={{ color }}>{pool.status}</span>
      </div>
      <div className="mt-3 text-right">
        <span className="text-[12px] text-erp-blue font-medium cursor-pointer hover:underline">Bekijk details →</span>
      </div>
    </ErpCard>
  );
}

function getPoolProgress(pool: any): number {
  const stages = ["searching", "found", "analyzing", "analyzed", "demos_ready", "ready_to_send", "completed"];
  const idx = stages.indexOf(pool.status);
  if (idx < 0) return 0;
  return ((idx + 1) / stages.length) * 100;
}

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
      const res = await searchMutation.mutateAsync({
        source: "google_maps",
        query: gmQuery,
        config: { max_results: parseInt(gmMax) || 20 },
      });
      toast.success(`Zoekopdracht gestart: ${gmQuery}`);
      onOpenChange(false);
      if (res.pool_id) navigate(`/prospecting/${res.pool_id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      const res = await searchMutation.mutateAsync({
        source: "url_import",
        leads: [{ website_url: urlInput, company_name: urlName || undefined }],
      });
      toast.success("URL toegevoegd");
      onOpenChange(false);
      if (res.pool_id) navigate(`/prospecting/${res.pool_id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleManual = async () => {
    if (!manualName.trim()) return;
    try {
      const res = await searchMutation.mutateAsync({
        source: "manual",
        leads: [{ company_name: manualName, website_url: manualWebsite || undefined, city: manualCity || undefined }],
      });
      toast.success("Lead toegevoegd");
      onOpenChange(false);
      if (res.pool_id) navigate(`/prospecting/${res.pool_id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const loading = searchMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-erp-bg2 border-erp-border0">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuwe zoekopdracht</DialogTitle>
        </DialogHeader>
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Search className="w-4 h-4" />}
              Zoeken
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Plus className="w-4 h-4" />}
              Toevoegen
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icons.Plus className="w-4 h-4" />}
              Toevoegen
            </ErpButton>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function ProspectingPage() {
  const { data, isLoading } = useProspectingStatus();
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  const stats = data?.stats || {};
  const pools = data?.pools || [];
  const sendStatus = data?.send_status || { sent: 0, limit: 10 };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader title="Prospecting" desc="Vind prospects, bouw demo's, verstuur outreach">
        <ErpButton primary onClick={() => setSearchOpen(true)}>
          <Icons.Plus className="w-4 h-4" />
          Nieuwe zoekopdracht
        </ErpButton>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Totaal leads", value: fmt(stats.total_leads ?? 0) },
          { label: "Emails verstuurd", value: fmt(stats.emails_sent ?? 0) },
          { label: "Demo's bekeken", value: fmt(stats.demos_viewed ?? 0) },
          { label: "Reacties", value: fmt(stats.replied ?? 0) },
        ].map(s => (
          <ErpCard key={s.label} className="p-[18px_20px]">
            <div className="text-xs text-erp-text2 font-medium mb-2">{s.label}</div>
            <div className="text-[26px] font-bold tracking-tight text-erp-text0 leading-none">{s.value}</div>
          </ErpCard>
        ))}
      </div>

      {/* Send status */}
      <div className="mb-5">
        <SendStatusBar
          sent={sendStatus.sent ?? 0}
          limit={sendStatus.limit ?? 10}
          paused={sendStatus.allowed === false}
          reason={sendStatus.reason}
        />
      </div>

      {/* Pool list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-erp-text3" />
        </div>
      ) : pools.length === 0 ? (
        <ErpCard className="p-10 text-center">
          <Icons.Search className="w-10 h-10 text-erp-text3 mx-auto mb-3" />
          <p className="text-[14px] text-erp-text2 font-medium mb-1">Nog geen zoekopdrachten</p>
          <p className="text-[12px] text-erp-text3">Start je eerste zoekopdracht om prospects te vinden.</p>
        </ErpCard>
      ) : (
        <div className="space-y-3">
          {pools.map((pool: any) => (
            <PoolCard key={pool.id} pool={pool} onClick={() => navigate(`/prospecting/${pool.id}`)} />
          ))}
        </div>
      )}

      <NewSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
