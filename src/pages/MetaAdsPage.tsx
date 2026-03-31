import { useState, useEffect } from "react";
import { ErpCard, ErpButton } from "@/components/erp/ErpPrimitives";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useMetaConfig, useMetaImportLead } from "@/hooks/useMetaMarketing";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Eye, MousePointerClick, DollarSign, Users, Download, Facebook, Instagram, Megaphone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const sb = supabase as any;

export default function MetaAdsPage() {
  const { data: org } = useOrganization();
  const { data: config, isLoading: configLoading } = useMetaConfig();
  const navigate = useNavigate();

  if (configLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-erp-text3" />
      </div>
    );
  }

  if (!config?.ad_account_id && !config?.page_id) {
    return (
      <div className="p-6">
        <ErpCard className="p-8 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-erp-text3 mx-auto" />
          <h2 className="text-lg font-semibold text-erp-text0">Meta niet gekoppeld</h2>
          <p className="text-sm text-erp-text3 max-w-md mx-auto">
            Ga naar Instellingen → Integraties → Meta Marketing om je Meta Business account te koppelen.
          </p>
          <ErpButton onClick={() => navigate("/settings")}>
            Naar Instellingen
          </ErpButton>
        </ErpCard>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-erp-text0">Meta Marketing</h1>
          <p className="text-sm text-erp-text3">Campagnes, leads en inzichten</p>
        </div>
        <div className="flex items-center gap-2">
          {config.page_name && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Facebook className="h-3 w-3 text-blue-500" />
              {config.page_name}
            </Badge>
          )}
          {config.ad_account_name && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Megaphone className="h-3 w-3 text-green-500" />
              {config.ad_account_name}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
          <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <InsightsPanel />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsPanel />
        </TabsContent>
        <TabsContent value="leads">
          <LeadsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InsightsPanel() {
  const [datePreset, setDatePreset] = useState("last_30d");
  const [insights, setInsights] = useState<any[]>([]);
  const [campaignInsights, setCampaignInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadInsights() {
    setLoading(true);
    try {
      const [accountRes, campaignRes] = await Promise.all([
        supabase.functions.invoke("connect-meta-api", {
          body: { action: "insights", params: { date_preset: datePreset } },
        }),
        supabase.functions.invoke("connect-meta-api", {
          body: { action: "campaign_insights", params: { date_preset: datePreset } },
        }),
      ]);

      if (accountRes.data?.insights) setInsights(accountRes.data.insights);
      if (campaignRes.data?.insights) setCampaignInsights(campaignRes.data.insights);
      if (accountRes.data?.error) toast.error(accountRes.data.error);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadInsights(); }, [datePreset]);

  const totals = insights[0] || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={datePreset} onValueChange={setDatePreset}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Vandaag</SelectItem>
            <SelectItem value="yesterday">Gisteren</SelectItem>
            <SelectItem value="last_7d">Afgelopen 7 dagen</SelectItem>
            <SelectItem value="last_14d">Afgelopen 14 dagen</SelectItem>
            <SelectItem value="last_30d">Afgelopen 30 dagen</SelectItem>
            <SelectItem value="this_month">Deze maand</SelectItem>
            <SelectItem value="last_month">Vorige maand</SelectItem>
          </SelectContent>
        </Select>

        <ErpButton variant="outline" size="sm" onClick={loadInsights} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Vernieuwen
        </ErpButton>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Eye} label="Bereik" value={formatNum(totals.reach)} />
        <KpiCard icon={TrendingUp} label="Impressies" value={formatNum(totals.impressions)} />
        <KpiCard icon={MousePointerClick} label="Clicks" value={formatNum(totals.clicks)} />
        <KpiCard icon={DollarSign} label="Uitgaven" value={totals.spend ? `€${Number(totals.spend).toFixed(2)}` : "—"} />
      </div>

      {/* Campaign breakdown */}
      {campaignInsights.length > 0 && (
        <ErpCard className="p-4">
          <h3 className="text-sm font-semibold text-erp-text0 mb-3">Campagne prestaties</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-erp-border text-erp-text3">
                  <th className="text-left py-2 pr-4">Campagne</th>
                  <th className="text-right py-2 px-2">Bereik</th>
                  <th className="text-right py-2 px-2">Impressies</th>
                  <th className="text-right py-2 px-2">Clicks</th>
                  <th className="text-right py-2 px-2">CTR</th>
                  <th className="text-right py-2 px-2">CPC</th>
                  <th className="text-right py-2 pl-2">Uitgaven</th>
                </tr>
              </thead>
              <tbody>
                {campaignInsights.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-erp-border/50">
                    <td className="py-2 pr-4 text-erp-text0 font-medium max-w-[200px] truncate">{c.campaign_name}</td>
                    <td className="text-right py-2 px-2 text-erp-text2">{formatNum(c.reach)}</td>
                    <td className="text-right py-2 px-2 text-erp-text2">{formatNum(c.impressions)}</td>
                    <td className="text-right py-2 px-2 text-erp-text2">{formatNum(c.clicks)}</td>
                    <td className="text-right py-2 px-2 text-erp-text2">{c.ctr ? `${Number(c.ctr).toFixed(2)}%` : "—"}</td>
                    <td className="text-right py-2 px-2 text-erp-text2">{c.cpc ? `€${Number(c.cpc).toFixed(2)}` : "—"}</td>
                    <td className="text-right py-2 pl-2 text-erp-text0 font-medium">{c.spend ? `€${Number(c.spend).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ErpCard>
      )}

      {!loading && insights.length === 0 && (
        <ErpCard className="p-8 text-center">
          <p className="text-sm text-erp-text3">Geen data beschikbaar voor deze periode</p>
        </ErpCard>
      )}
    </div>
  );
}

function CampaignsPanel() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "campaigns" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCampaigns(); }, []);

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-600 border-green-500/30",
    PAUSED: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    DELETED: "bg-red-500/10 text-red-600 border-red-500/30",
    ARCHIVED: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  };

  return (
    <ErpCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-erp-text0">Campagnes</h3>
        <ErpButton variant="outline" size="sm" onClick={loadCampaigns} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Vernieuwen
        </ErpButton>
      </div>

      {campaigns.length === 0 && !loading && (
        <p className="text-sm text-erp-text3 text-center py-8">Geen campagnes gevonden</p>
      )}

      <div className="space-y-2">
        {campaigns.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-erp-border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-erp-text0 truncate">{c.name}</p>
              <p className="text-xs text-erp-text3">{c.objective?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              {c.daily_budget && (
                <span className="text-xs text-erp-text2">€{(Number(c.daily_budget) / 100).toFixed(0)}/dag</span>
              )}
              <Badge variant="outline" className={`text-xs ${statusColor[c.status] || ""}`}>
                {c.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </ErpCard>
  );
}

function LeadsPanel() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const importLead = useMetaImportLead();

  async function loadLeads() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "leads" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLeads(data.leads || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLeads(); }, []);

  return (
    <ErpCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-erp-text0">Lead Ads leads</h3>
        <ErpButton variant="outline" size="sm" onClick={loadLeads} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Vernieuwen
        </ErpButton>
      </div>

      {leads.length === 0 && !loading && (
        <p className="text-sm text-erp-text3 text-center py-8">Nog geen leads ontvangen via Lead Ads</p>
      )}

      <div className="space-y-2">
        {leads.map((lead: any) => {
          const fields = lead.fields || {};
          const name = fields.full_name || fields.name || "Onbekend";
          const email = fields.email || "";
          const phone = fields.phone_number || fields.phone || "";
          const isImported = lead.status === "imported";

          return (
            <div key={lead.id} className="flex items-center justify-between rounded-lg border border-erp-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-erp-text0">{name}</p>
                <div className="flex items-center gap-3 text-xs text-erp-text3">
                  {email && <span>{email}</span>}
                  {phone && <span>{phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {isImported ? (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                    Geïmporteerd
                  </Badge>
                ) : (
                  <ErpButton
                    size="sm"
                    variant="outline"
                    onClick={() => importLead.mutate(lead.id)}
                    disabled={importLead.isPending}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Importeren
                  </ErpButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ErpCard>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <ErpCard className="p-4">
      <div className="flex items-center gap-2 text-xs text-erp-text3 mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-bold text-erp-text0">{value}</p>
    </ErpCard>
  );
}

function formatNum(n: any): string {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("nl-NL");
}
