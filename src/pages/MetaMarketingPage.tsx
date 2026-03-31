import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ErpCard } from "@/components/erp/ErpPrimitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  useMetaHealth, useMetaConfig, useMetaAssets, useMetaSaveSelection,
  useMetaCampaigns, useUpdateCampaign, useMetaAdSets, useUpdateAdSet,
  useMetaAds, useUpdateAd, useMetaInsights, useMetaCampaignInsights,
  useMetaPagePosts, useCreatePagePost, useDeletePagePost,
  useMetaInstagramMedia, useMetaInstagramInsights, useInstagramPublish,
  useMetaLeads, useMetaImportLead,
  useMetaConversations, useMetaConversationMessages, useSendMessage,
  useMetaRegister, useMetaDisconnect, useMetaStatus,
} from "@/hooks/useMetaMarketing";
import {
  Loader2, TrendingUp, Eye, MousePointerClick, DollarSign, AlertCircle,
  Facebook, Instagram, MessageCircle, Play, Pause, Send, Plus, Trash2,
  ThumbsUp, MessageSquare, Heart, Image as ImageIcon, ExternalLink,
  ChevronRight, Settings, RefreshCw, Link2, Unlink, CheckCircle, XCircle,
  Upload, BarChart3, Target, Megaphone, Clock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

// ── Helpers ──

function fmtNum(n: any): string {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return num.toLocaleString("nl-NL");
}

function fmtEuro(n: any): string {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return `€${num.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: any): string {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  return `${num.toFixed(2)}%`;
}

function fmtDate(d: any): string {
  if (!d) return "—";
  try { return format(new Date(d), "d MMM yyyy", { locale: nl }); } catch { return "—"; }
}

function fmtDateTime(d: any): string {
  if (!d) return "—";
  try { return format(new Date(d), "d MMM yyyy HH:mm", { locale: nl }); } catch { return "—"; }
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === "ACTIVE") return <Badge className="bg-green-500/15 text-green-700 border-green-200 text-[10px]">Actief</Badge>;
  if (s === "PAUSED") return <Badge variant="secondary" className="text-[10px]">Gepauzeerd</Badge>;
  if (s === "ARCHIVED") return <Badge variant="destructive" className="text-[10px]">Gearchiveerd</Badge>;
  if (s === "DELETED") return <Badge variant="destructive" className="line-through text-[10px]">Verwijderd</Badge>;
  return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <ErpCard className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </ErpCard>
  );
}

function LoadingTable({ cols = 5, rows = 4 }: { cols?: number; rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function TokenHealthDot({ health }: { health: any }) {
  if (!health?.token_health) return null;
  const { is_expired, is_expiring_soon, days_until_expiry } = health.token_health;
  const color = is_expired ? "bg-red-500" : is_expiring_soon ? "bg-orange-400" : "bg-green-500";
  const label = is_expired ? "Token verlopen" : is_expiring_soon ? `Verloopt over ${days_until_expiry} dagen` : `Token geldig (${days_until_expiry} dagen)`;
  return (
    <Tooltip>
      <TooltipTrigger>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const DATE_PRESETS = [
  { value: "today", label: "Vandaag" },
  { value: "yesterday", label: "Gisteren" },
  { value: "last_7d", label: "Afgelopen 7 dagen" },
  { value: "last_14d", label: "Afgelopen 14 dagen" },
  { value: "last_30d", label: "Afgelopen 30 dagen" },
  { value: "last_90d", label: "Afgelopen 90 dagen" },
  { value: "this_month", label: "Deze maand" },
  { value: "last_month", label: "Vorige maand" },
];

// ════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════

export default function MetaMarketingPage() {
  const { data: config, isLoading: configLoading } = useMetaConfig();
  const { data: health } = useMetaHealth();
  const navigate = useNavigate();

  if (configLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config?.ad_account_id && !config?.page_id && !config?.instagram_account_id) {
    return (
      <div className="p-6">
        <ErpCard className="p-8 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Meta niet gekoppeld</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ga naar Instellingen → Integraties → Meta Marketing om je Meta Business account te koppelen.
          </p>
          <Button onClick={() => navigate("/settings")}>Naar Instellingen</Button>
        </ErpCard>
      </div>
    );
  }

  const hasAds = !!config.ad_account_id;
  const hasFb = !!config.page_id;
  const hasIg = !!config.instagram_account_id;
  const hasMessenger = hasFb && config.granted_scopes?.includes("pages_messaging");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Meta Marketing</h1>
          <p className="text-sm text-muted-foreground">Campagnes, content, leads en berichten</p>
        </div>
        <div className="flex items-center gap-3">
          <TokenHealthDot health={health} />
          <div className="flex items-center gap-1.5 flex-wrap">
            {config.page_name && <Badge variant="outline" className="gap-1 text-[10px]"><Facebook className="h-3 w-3" />{config.page_name}</Badge>}
            {config.instagram_username && <Badge variant="outline" className="gap-1 text-[10px]"><Instagram className="h-3 w-3" />@{config.instagram_username}</Badge>}
            {config.ad_account_name && <Badge variant="outline" className="gap-1 text-[10px]"><Megaphone className="h-3 w-3" />{config.ad_account_name}</Badge>}
          </div>
        </div>
      </div>

      <Tabs defaultValue={hasAds ? "dashboard" : hasFb ? "content" : "leads"} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          {hasAds && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
          {hasAds && <TabsTrigger value="campaigns">Campagnes</TabsTrigger>}
          {(hasFb || hasIg) && <TabsTrigger value="content">Content</TabsTrigger>}
          <TabsTrigger value="leads">Leads</TabsTrigger>
          {hasMessenger && <TabsTrigger value="messenger">Messenger</TabsTrigger>}
          <TabsTrigger value="settings">Instellingen</TabsTrigger>
        </TabsList>

        {hasAds && <TabsContent value="dashboard"><DashboardTab /></TabsContent>}
        {hasAds && <TabsContent value="campaigns"><CampaignsTab /></TabsContent>}
        {(hasFb || hasIg) && <TabsContent value="content"><ContentTab hasFb={hasFb} hasIg={hasIg} /></TabsContent>}
        <TabsContent value="leads"><LeadsTab /></TabsContent>
        {hasMessenger && <TabsContent value="messenger"><MessengerTab /></TabsContent>}
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB: DASHBOARD
// ════════════════════════════════════════════

function DashboardTab() {
  const [datePreset, setDatePreset] = useState("last_30d");
  const { data: insightsData, isLoading: insightsLoading, refetch: refetchInsights } = useMetaInsights(datePreset);
  const { data: campaignData, isLoading: campaignLoading, refetch: refetchCampaigns } = useMetaCampaignInsights(datePreset);

  const totals = insightsData?.insights?.[0] || {};
  const campaigns = campaignData?.insights || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={datePreset} onValueChange={setDatePreset}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { refetchInsights(); refetchCampaigns(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Vernieuwen
        </Button>
      </div>

      {insightsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={DollarSign} label="Uitgaven" value={fmtEuro(totals.spend)} />
          <KpiCard icon={Eye} label="Bereik" value={fmtNum(totals.reach)} />
          <KpiCard icon={TrendingUp} label="Impressies" value={fmtNum(totals.impressions)} />
          <KpiCard icon={MousePointerClick} label="Klikken" value={fmtNum(totals.clicks)} />
          <KpiCard icon={Target} label="CTR" value={fmtPct(totals.ctr)} />
          <KpiCard icon={DollarSign} label="CPC" value={fmtEuro(totals.cpc)} />
        </div>
      )}

      <ErpCard className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Campagne prestaties</h3>
        {campaignLoading ? <LoadingTable cols={7} /> : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Geen campagne data gevonden</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead className="text-right">Impressies</TableHead>
                  <TableHead className="text-right">Klikken</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Uitgaven</TableHead>
                  <TableHead className="text-right">CPC</TableHead>
                  <TableHead className="text-right">Bereik</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => (
                  <TableRow key={c.campaign_id || c.campaign_name}>
                    <TableCell className="font-medium text-xs">{c.campaign_name}</TableCell>
                    <TableCell className="text-right text-xs">{fmtNum(c.impressions)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtNum(c.clicks)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtPct(c.ctr)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtEuro(c.spend)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtEuro(c.cpc)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtNum(c.reach)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ErpCard>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB: CAMPAGNES (Hierarchical)
// ════════════════════════════════════════════

function CampaignsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [selectedAdSet, setSelectedAdSet] = useState<any>(null);
  const [editItem, setEditItem] = useState<{ type: "campaign" | "adset" | "ad"; item: any } | null>(null);

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        <button className="text-primary hover:underline font-medium" onClick={() => { setSelectedCampaign(null); setSelectedAdSet(null); }}>Campagnes</button>
        {selectedCampaign && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button className="text-primary hover:underline font-medium" onClick={() => setSelectedAdSet(null)}>{selectedCampaign.name}</button>
          </>
        )}
        {selectedAdSet && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground font-medium">{selectedAdSet.name}</span>
          </>
        )}
      </div>

      {!selectedCampaign && (
        <CampaignsList statusFilter={statusFilter} setStatusFilter={setStatusFilter} onSelect={setSelectedCampaign} onEdit={(c) => setEditItem({ type: "campaign", item: c })} />
      )}
      {selectedCampaign && !selectedAdSet && (
        <AdSetsList campaignId={selectedCampaign.id} onSelect={setSelectedAdSet} onEdit={(a) => setEditItem({ type: "adset", item: a })} />
      )}
      {selectedAdSet && (
        <AdsList adsetId={selectedAdSet.id} onEdit={(a) => setEditItem({ type: "ad", item: a })} />
      )}

      {editItem && (
        <EditSheet item={editItem} onClose={() => setEditItem(null)} />
      )}
    </div>
  );
}

function CampaignsList({ statusFilter, setStatusFilter, onSelect, onEdit }: any) {
  const { data, isLoading } = useMetaCampaigns(statusFilter || undefined);
  const updateCampaign = useUpdateCampaign();
  const campaigns = data?.campaigns || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Alle statussen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alles</SelectItem>
            <SelectItem value="ACTIVE">Actief</SelectItem>
            <SelectItem value="PAUSED">Gepauzeerd</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <LoadingTable /> : campaigns.length === 0 ? (
        <ErpCard className="p-6 text-center"><p className="text-sm text-muted-foreground">Geen campagnes gevonden</p></ErpCard>
      ) : (
        <ErpCard className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Doel</TableHead>
                <TableHead className="text-right">Dagbudget</TableHead>
                <TableHead className="text-right">Totaalbudget</TableHead>
                <TableHead>Startdatum</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c: any) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => onSelect(c)}>
                  <TableCell className="font-medium text-xs">{c.name}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.objective}</TableCell>
                  <TableCell className="text-right text-xs">{c.daily_budget ? fmtEuro(c.daily_budget / 100) : "—"}</TableCell>
                  <TableCell className="text-right text-xs">{c.lifetime_budget ? fmtEuro(c.lifetime_budget / 100) : "—"}</TableCell>
                  <TableCell className="text-xs">{fmtDate(c.start_time)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={updateCampaign.isPending}
                        onClick={() => updateCampaign.mutate({ campaign_id: c.id, status: c.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}>
                        {c.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(c)}>
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ErpCard>
      )}
    </div>
  );
}

function AdSetsList({ campaignId, onSelect, onEdit }: any) {
  const { data, isLoading } = useMetaAdSets(campaignId);
  const updateAdSet = useUpdateAdSet();
  const adsets = data?.adsets || [];

  if (isLoading) return <LoadingTable />;
  if (adsets.length === 0) return <ErpCard className="p-6 text-center"><p className="text-sm text-muted-foreground">Geen ad sets gevonden</p></ErpCard>;

  return (
    <ErpCard className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Naam</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Dagbudget</TableHead>
            <TableHead className="text-right">Totaalbudget</TableHead>
            <TableHead>Optimalisatie</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adsets.map((a: any) => (
            <TableRow key={a.id} className="cursor-pointer" onClick={() => onSelect(a)}>
              <TableCell className="font-medium text-xs">{a.name}</TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
              <TableCell className="text-right text-xs">{a.daily_budget ? fmtEuro(a.daily_budget / 100) : "—"}</TableCell>
              <TableCell className="text-right text-xs">{a.lifetime_budget ? fmtEuro(a.lifetime_budget / 100) : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{a.optimization_goal || "—"}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={updateAdSet.isPending}
                    onClick={() => updateAdSet.mutate({ adset_id: a.id, status: a.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}>
                    {a.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(a)}>
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ErpCard>
  );
}

function AdsList({ adsetId, onEdit }: any) {
  const { data, isLoading } = useMetaAds(adsetId);
  const updateAd = useUpdateAd();
  const ads = data?.ads || [];

  if (isLoading) return <LoadingTable />;
  if (ads.length === 0) return <ErpCard className="p-6 text-center"><p className="text-sm text-muted-foreground">Geen advertenties gevonden</p></ErpCard>;

  return (
    <ErpCard className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Naam</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Creative</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.map((a: any) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium text-xs">{a.name}</TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
              <TableCell>
                {a.creative?.thumbnail_url ? (
                  <img src={a.creative.thumbnail_url} alt="" className="h-8 w-8 rounded object-cover" />
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={updateAd.isPending}
                    onClick={() => updateAd.mutate({ ad_id: a.id, status: a.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}>
                    {a.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(a)}>
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ErpCard>
  );
}

function EditSheet({ item, onClose }: { item: { type: string; item: any }; onClose: () => void }) {
  const { type, item: data } = item;
  const [name, setName] = useState(data.name || "");
  const [dailyBudget, setDailyBudget] = useState(data.daily_budget ? (data.daily_budget / 100).toFixed(2) : "");
  const [lifetimeBudget, setLifetimeBudget] = useState(data.lifetime_budget ? (data.lifetime_budget / 100).toFixed(2) : "");
  const updateCampaign = useUpdateCampaign();
  const updateAdSet = useUpdateAdSet();
  const updateAd = useUpdateAd();

  const saving = updateCampaign.isPending || updateAdSet.isPending || updateAd.isPending;

  function handleSave() {
    if (type === "campaign") {
      updateCampaign.mutate({
        campaign_id: data.id, name,
        ...(dailyBudget ? { daily_budget: parseFloat(dailyBudget) } : {}),
        ...(lifetimeBudget ? { lifetime_budget: parseFloat(lifetimeBudget) } : {}),
      }, { onSuccess: onClose });
    } else if (type === "adset") {
      updateAdSet.mutate({
        adset_id: data.id, name,
        ...(dailyBudget ? { daily_budget: parseFloat(dailyBudget) } : {}),
        ...(lifetimeBudget ? { lifetime_budget: parseFloat(lifetimeBudget) } : {}),
      }, { onSuccess: onClose });
    } else {
      updateAd.mutate({ ad_id: data.id, name }, { onSuccess: onClose });
    }
  }

  const label = type === "campaign" ? "Campagne" : type === "adset" ? "Ad Set" : "Advertentie";

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{label} bewerken</SheetTitle>
          <SheetDescription>Pas de instellingen aan van {data.name}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <Label>Naam</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {type !== "ad" && (
            <>
              <div>
                <Label>Dagbudget (€)</Label>
                <Input type="number" step="0.01" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="25.00" />
              </div>
              <div>
                <Label>Totaalbudget (€)</Label>
                <Input type="number" step="0.01" value={lifetimeBudget} onChange={(e) => setLifetimeBudget(e.target.value)} placeholder="500.00" />
              </div>
            </>
          )}
          {type === "ad" && data.creative && (
            <div className="space-y-2">
              <Label>Creative</Label>
              {data.creative.thumbnail_url && <img src={data.creative.thumbnail_url} alt="" className="rounded-md max-h-40 object-contain" />}
              {data.creative.body && <p className="text-xs text-muted-foreground">{data.creative.body}</p>}
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Opslaan
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ════════════════════════════════════════════
// TAB: CONTENT (Facebook + Instagram)
// ════════════════════════════════════════════

function ContentTab({ hasFb, hasIg }: { hasFb: boolean; hasIg: boolean }) {
  const [sub, setSub] = useState(hasFb ? "facebook" : "instagram");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {hasFb && <Button variant={sub === "facebook" ? "default" : "outline"} size="sm" onClick={() => setSub("facebook")}><Facebook className="h-3.5 w-3.5 mr-1" />Facebook</Button>}
        {hasIg && <Button variant={sub === "instagram" ? "default" : "outline"} size="sm" onClick={() => setSub("instagram")}><Instagram className="h-3.5 w-3.5 mr-1" />Instagram</Button>}
      </div>
      {sub === "facebook" && <FacebookContent />}
      {sub === "instagram" && <InstagramContent />}
    </div>
  );
}

function FacebookContent() {
  const { data, isLoading, refetch } = useMetaPagePosts();
  const createPost = useCreatePagePost();
  const deletePost = useDeletePagePost();
  const [showNew, setShowNew] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const posts = data?.posts || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Facebook berichten</h3>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-3.5 w-3.5 mr-1" />Nieuw bericht</Button>
      </div>

      {isLoading ? <LoadingTable cols={4} /> : posts.length === 0 ? (
        <ErpCard className="p-6 text-center"><p className="text-sm text-muted-foreground">Geen berichten gevonden</p></ErpCard>
      ) : (
        <div className="space-y-3">
          {posts.map((p: any) => (
            <ErpCard key={p.id} className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-3">{p.message || <span className="text-muted-foreground italic">Geen tekst</span>}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{fmtDateTime(p.created_time)}</span>
                    <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />{p.likes?.summary?.total_count ?? p.likes ?? 0}</span>
                    <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{p.comments?.summary?.total_count ?? p.comments ?? 0}</span>
                    <span className="flex items-center gap-0.5"><Send className="h-3 w-3" />{p.shares?.count ?? 0}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </ErpCard>
          ))}
        </div>
      )}

      {/* New post dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuw Facebook bericht</DialogTitle>
            <DialogDescription>Plaats een bericht op je Facebook pagina</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Schrijf je bericht..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            <Input placeholder="Link (optioneel)" value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
          <DialogFooter>
            <Button disabled={!message.trim() || createPost.isPending} onClick={() => {
              createPost.mutate({ message, link: link || undefined }, {
                onSuccess: () => { setShowNew(false); setMessage(""); setLink(""); }
              });
            }}>
              {createPost.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Plaatsen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bericht verwijderen?</DialogTitle>
            <DialogDescription>Dit kan niet ongedaan worden gemaakt.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuleren</Button>
            <Button variant="destructive" disabled={deletePost.isPending} onClick={() => {
              if (deleteId) deletePost.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
            }}>
              {deletePost.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstagramContent() {
  const { data, isLoading } = useMetaInstagramMedia();
  const publishMut = useInstagramPublish();
  const [showPublish, setShowPublish] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const media = data?.media || [];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  }

  async function handlePublish() {
    if (!selectedFile) return;
    try {
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const path = `instagram/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("meta-uploads").upload(path, selectedFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("meta-uploads").getPublicUrl(path);
      await publishMut.mutateAsync({ image_url: urlData.publicUrl, caption: caption || undefined });
      setShowPublish(false);
      setCaption("");
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Instagram media</h3>
        <Button size="sm" onClick={() => setShowPublish(true)}><Upload className="h-3.5 w-3.5 mr-1" />Publiceer foto</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
      ) : media.length === 0 ? (
        <ErpCard className="p-6 text-center"><p className="text-sm text-muted-foreground">Geen media gevonden</p></ErpCard>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {media.map((m: any) => (
            <div key={m.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img src={m.media_url || m.thumbnail_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                <p className="text-white text-[10px] line-clamp-2">{m.caption || ""}</p>
                <div className="flex gap-2 text-white text-[10px] mt-1">
                  <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{m.like_count ?? 0}</span>
                  <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{m.comments_count ?? 0}</span>
                </div>
              </div>
              {m.media_type && (
                <Badge className="absolute top-1 right-1 text-[8px] bg-black/60 text-white border-0">{m.media_type}</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showPublish} onOpenChange={setShowPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instagram foto publiceren</DialogTitle>
            <DialogDescription>Upload een afbeelding en voeg een caption toe</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="" className="rounded-lg max-h-48 mx-auto object-contain" />
                <Button variant="ghost" size="sm" className="absolute top-1 right-1" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                Klik om een afbeelding te selecteren
              </button>
            )}
            <Textarea placeholder="Caption (optioneel)" value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button disabled={!selectedFile || publishMut.isPending} onClick={handlePublish}>
              {publishMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Publiceren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════
// TAB: LEADS
// ════════════════════════════════════════════

function LeadsTab() {
  const [status, setStatus] = useState<string>("");
  const { data, isLoading } = useMetaLeads(status || undefined);
  const importLead = useMetaImportLead();
  const navigate = useNavigate();

  const leads = data?.leads || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Alle leads" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alles</SelectItem>
            <SelectItem value="new">Nieuw</SelectItem>
            <SelectItem value="imported">Geïmporteerd</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <LoadingTable cols={6} /> : leads.length === 0 ? (
        <ErpCard className="p-6 text-center"><p className="text-sm text-muted-foreground">Geen leads gevonden</p></ErpCard>
      ) : (
        <ErpCard className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefoon</TableHead>
                <TableHead>Formulier</TableHead>
                <TableHead>Campagne</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l: any) => {
                const fields = typeof l.fields === "object" ? l.fields : {};
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs font-medium">{fields.full_name || fields.name || "—"}</TableCell>
                    <TableCell className="text-xs">{fields.email || "—"}</TableCell>
                    <TableCell className="text-xs">{fields.phone_number || fields.phone || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.form_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.campaign_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "imported" ? "default" : "secondary"} className="text-[10px]">
                        {l.status === "imported" ? "Geïmporteerd" : "Nieuw"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(l.created_at)}</TableCell>
                    <TableCell>
                      {l.status === "new" ? (
                        <Button variant="outline" size="sm" className="h-7 text-[10px]" disabled={importLead.isPending}
                          onClick={() => importLead.mutate(l.id)}>
                          Importeer
                        </Button>
                      ) : l.contact_id ? (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => navigate(`/contacts/${l.contact_id}`)}>
                          <ExternalLink className="h-3 w-3 mr-1" /> Contact
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ErpCard>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// TAB: MESSENGER
// ════════════════════════════════════════════

function MessengerTab() {
  const { data: convData, isLoading: convLoading } = useMetaConversations();
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const conversations = convData?.conversations || [];

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Left: conversation list */}
      <div className="w-80 flex-shrink-0 border rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground">Gesprekken</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground text-center">Geen gesprekken</p>
          ) : (
            conversations.map((c: any) => (
              <button key={c.id} onClick={() => setSelectedConv(c)}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedConv?.id === c.id ? "bg-muted" : ""}`}>
                <p className="text-xs font-medium text-foreground truncate">
                  {c.participants?.data?.map((p: any) => p.name).join(", ") || "Onbekend"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.snippet || ""}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDateTime(c.updated_time)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: messages */}
      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
        {selectedConv ? (
          <ConversationMessages conversation={selectedConv} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Selecteer een gesprek
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationMessages({ conversation }: { conversation: any }) {
  const { data, isLoading, refetch } = useMetaConversationMessages(conversation.id);
  const sendMsg = useSendMessage();
  const [input, setInput] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);

  const messages = data?.messages || [];
  const recipientId = conversation.participants?.data?.[0]?.id;

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || !recipientId) return;
    sendMsg.mutate({ recipient_id: recipientId, message: input }, {
      onSuccess: () => { setInput(""); refetch(); }
    });
  }

  return (
    <>
      <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {conversation.participants?.data?.map((p: any) => p.name).join(", ") || "Gesprek"}
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Geen berichten</p>
        ) : (
          messages.map((m: any, i: number) => (
            <div key={i} className={`flex ${m.from?.id === recipientId ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[70%] rounded-lg px-3 py-2 text-xs ${m.from?.id === recipientId ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                <p>{m.message}</p>
                <p className="text-[9px] opacity-60 mt-0.5">{fmtDateTime(m.created_time)}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEnd} />
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input placeholder="Typ een bericht..." value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} className="flex-1" />
        <Button size="icon" disabled={!input.trim() || sendMsg.isPending} onClick={handleSend}>
          {sendMsg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

// ════════════════════════════════════════════
// TAB: INSTELLINGEN
// ════════════════════════════════════════════

function SettingsTab() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useMetaHealth();
  const { data: config } = useMetaConfig();
  const { data: status } = useMetaStatus();
  const { data: assetsData, isLoading: assetsLoading, refetch: refetchAssets } = useMetaAssets(false);
  const saveSelection = useMetaSaveSelection();
  const registerMut = useMetaRegister();
  const disconnectMut = useMetaDisconnect();

  const [showAssets, setShowAssets] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>("");
  const [selectedIg, setSelectedIg] = useState<string>("");
  const [showDisconnect, setShowDisconnect] = useState(false);

  const connected = health?.connected || status?.connected;

  function openAssetPicker() {
    setSelectedPage(config?.page_id || "");
    setSelectedAdAccount(config?.ad_account_id || "");
    setSelectedIg(config?.instagram_account_id || "");
    setShowAssets(true);
    refetchAssets();
  }

  function handleSaveAssets() {
    saveSelection.mutate({
      page_id: selectedPage || null,
      instagram_account_id: selectedIg || null,
      ad_account_id: selectedAdAccount || null,
    }, { onSuccess: () => setShowAssets(false) });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Connection status */}
      <ErpCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Verbindingsstatus</h3>
          <Button variant="ghost" size="sm" onClick={() => refetchHealth()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {healthLoading ? <LoadingTable cols={2} rows={3} /> : health ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {health.connected ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span className="text-sm text-foreground">{health.connected ? "Verbonden" : "Niet verbonden"}</span>
            </div>

            {health.assets && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-md bg-muted/50 space-y-1">
                  <p className="text-muted-foreground">Facebook Pagina</p>
                  <p className="font-medium">{health.assets.page?.name || "Niet geselecteerd"}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 space-y-1">
                  <p className="text-muted-foreground">Ad Account</p>
                  <p className="font-medium">{health.assets.ad_account?.name || "Niet geselecteerd"}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 space-y-1">
                  <p className="text-muted-foreground">Instagram</p>
                  <p className="font-medium">{health.assets.instagram?.username ? `@${health.assets.instagram.username}` : "Niet geselecteerd"}</p>
                </div>
              </div>
            )}

            {health.token_health && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <TokenHealthDot health={health} />
                <span>Verloopt: {fmtDate(health.token_health.expires_at)}</span>
                <span>•</span>
                <span>Refreshes: {health.token_health.refresh_count ?? 0}</span>
                {health.token_health.last_refreshed && (
                  <><span>•</span><span>Laatst ververst: {fmtDateTime(health.token_health.last_refreshed)}</span></>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Kon status niet ophalen</p>
        )}
      </ErpCard>

      {/* Asset selection */}
      <ErpCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Gekoppelde assets</h3>
          <Button variant="outline" size="sm" onClick={openAssetPicker}>Wijzig assets</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2"><Facebook className="h-4 w-4" /><span>{config?.page_name || "Niet geselecteerd"}</span></div>
          <div className="flex items-center gap-2"><Megaphone className="h-4 w-4" /><span>{config?.ad_account_name || "Niet geselecteerd"}</span></div>
          <div className="flex items-center gap-2"><Instagram className="h-4 w-4" /><span>{config?.instagram_username ? `@${config.instagram_username}` : "Niet geselecteerd"}</span></div>
        </div>
      </ErpCard>

      {/* Connection management */}
      <ErpCard className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Koppeling beheren</h3>
        {connected ? (
          <Button variant="destructive" size="sm" onClick={() => setShowDisconnect(true)}>
            <Unlink className="h-3.5 w-3.5 mr-1" /> Ontkoppel Meta
          </Button>
        ) : (
          <Button size="sm" disabled={registerMut.isPending} onClick={() => {
            registerMut.mutate(undefined, {
              onSuccess: (data) => {
                if (data?.connect_url) window.open(data.connect_url, "_blank");
              }
            });
          }}>
            {registerMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Link2 className="h-3.5 w-3.5 mr-1" /> Koppel Meta
          </Button>
        )}
      </ErpCard>

      {/* Scopes */}
      {health?.granted_scopes && (
        <ErpCard className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Toegekende scopes</h3>
          <div className="flex flex-wrap gap-1.5">
            {health.granted_scopes.map((s: string) => (
              <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </ErpCard>
      )}

      {/* Asset picker sheet */}
      <Sheet open={showAssets} onOpenChange={setShowAssets}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Assets selecteren</SheetTitle>
            <SheetDescription>Kies welke Facebook Pagina, Ad Account en Instagram account je wilt gebruiken</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            {assetsLoading ? <LoadingTable cols={1} rows={3} /> : (
              <>
                <div>
                  <Label>Facebook Pagina</Label>
                  <Select value={selectedPage} onValueChange={setSelectedPage}>
                    <SelectTrigger><SelectValue placeholder="Selecteer pagina" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen</SelectItem>
                      {assetsData?.pages?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ad Account</Label>
                  <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
                    <SelectTrigger><SelectValue placeholder="Selecteer ad account" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen</SelectItem>
                      {assetsData?.adAccounts?.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Instagram Account</Label>
                  <Select value={selectedIg} onValueChange={setSelectedIg}>
                    <SelectTrigger><SelectValue placeholder="Selecteer Instagram" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen</SelectItem>
                      {assetsData?.instagramAccounts?.map((ig: any) => (
                        <SelectItem key={ig.id} value={ig.id}>{ig.username || ig.name || ig.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={saveSelection.isPending} onClick={handleSaveAssets}>
                  {saveSelection.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Opslaan
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Disconnect dialog */}
      <Dialog open={showDisconnect} onOpenChange={setShowDisconnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meta ontkoppelen?</DialogTitle>
            <DialogDescription>Alle Meta data en koppelingen worden verwijderd. Dit kan niet ongedaan worden.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnect(false)}>Annuleren</Button>
            <Button variant="destructive" disabled={disconnectMut.isPending} onClick={() => {
              disconnectMut.mutate(undefined, { onSuccess: () => setShowDisconnect(false) });
            }}>
              {disconnectMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Ontkoppelen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
