import { useState, useEffect, useRef } from "react";
import { ErpCard } from "@/components/erp/ErpPrimitives";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMetaConfig, useMetaImportLead } from "@/hooks/useMetaMarketing";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, TrendingUp, Eye, MousePointerClick, DollarSign, Download, Facebook,
  Megaphone, AlertCircle, Instagram, MessageCircle, Play, Pause, Send, Plus,
  ThumbsUp, MessageSquare, Heart, Users, Image as ImageIcon, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

// ── Helpers ──
function formatNum(n: any): string {
  if (n == null) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString("nl-NL");
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <ErpCard className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </ErpCard>
  );
}

async function metaApi(action: string, params?: any) {
  const { data, error } = await supabase.functions.invoke("connect-meta-api", {
    body: { action, params },
  });
  if (error) throw error;
  if (data?.token_expired) {
    toast.error("Je Meta token is verlopen. Ga naar Instellingen → Meta Marketing om opnieuw te koppelen.", { duration: 8000 });
    throw new Error(data.error);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Main Page ──
export default function MetaAdsPage() {
  const { data: config, isLoading: configLoading } = useMetaConfig();
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
  const hasFacebook = !!config.page_id;
  const hasInstagram = !!config.instagram_account_id;
  const hasMessenger = hasFacebook && config.granted_scopes?.includes("pages_messaging");

  const defaultTab = hasAds ? "overview" : hasFacebook ? "facebook" : hasInstagram ? "instagram" : "leads";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Meta Marketing</h1>
          <p className="text-sm text-muted-foreground">Campagnes, content, leads en berichten</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {config.page_name && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Facebook className="h-3 w-3" /> {config.page_name}
            </Badge>
          )}
          {config.instagram_username && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Instagram className="h-3 w-3" /> @{config.instagram_username}
            </Badge>
          )}
          {config.ad_account_name && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Megaphone className="h-3 w-3" /> {config.ad_account_name}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          {hasAds && <TabsTrigger value="overview">Overzicht</TabsTrigger>}
          {hasAds && <TabsTrigger value="campaigns">Campagnes</TabsTrigger>}
          {hasFacebook && <TabsTrigger value="facebook">Facebook</TabsTrigger>}
          {hasInstagram && <TabsTrigger value="instagram">Instagram</TabsTrigger>}
          <TabsTrigger value="leads">Leads</TabsTrigger>
          {hasMessenger && <TabsTrigger value="messenger">Berichten</TabsTrigger>}
        </TabsList>
        {hasAds && <TabsContent value="overview"><InsightsPanel /></TabsContent>}
        {hasAds && <TabsContent value="campaigns"><CampaignsPanel /></TabsContent>}
        {hasFacebook && <TabsContent value="facebook"><FacebookPanel /></TabsContent>}
        {hasInstagram && <TabsContent value="instagram"><InstagramPanel /></TabsContent>}
        <TabsContent value="leads"><LeadsPanel /></TabsContent>
        {hasMessenger && <TabsContent value="messenger"><MessengerPanel /></TabsContent>}
      </Tabs>
    </div>
  );
}

// ── Insights Panel ──
function InsightsPanel() {
  const [datePreset, setDatePreset] = useState("last_30d");
  const [insights, setInsights] = useState<any[]>([]);
  const [campaignInsights, setCampaignInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadInsights() {
    setLoading(true);
    try {
      const [accountRes, campaignRes] = await Promise.all([
        metaApi("insights", { date_preset: datePreset }),
        metaApi("campaign_insights", { date_preset: datePreset }),
      ]);
      setInsights(accountRes.insights || []);
      setCampaignInsights(campaignRes.insights || []);
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
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
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
        <Button variant="outline" size="sm" onClick={loadInsights} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Vernieuwen
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Eye} label="Bereik" value={formatNum(totals.reach)} />
        <KpiCard icon={TrendingUp} label="Impressies" value={formatNum(totals.impressions)} />
        <KpiCard icon={MousePointerClick} label="Clicks" value={formatNum(totals.clicks)} />
        <KpiCard icon={DollarSign} label="Uitgaven" value={totals.spend ? `€${Number(totals.spend).toFixed(2)}` : "—"} />
      </div>

      {campaignInsights.length > 0 && (
        <ErpCard className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Campagne prestaties</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
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
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-foreground font-medium max-w-[200px] truncate">{c.campaign_name}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{formatNum(c.reach)}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{formatNum(c.impressions)}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{formatNum(c.clicks)}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{c.ctr ? `${Number(c.ctr).toFixed(2)}%` : "—"}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{c.cpc ? `€${Number(c.cpc).toFixed(2)}` : "—"}</td>
                    <td className="text-right py-2 pl-2 text-foreground font-medium">{c.spend ? `€${Number(c.spend).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ErpCard>
      )}

      {!loading && insights.length === 0 && (
        <ErpCard className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Geen data beschikbaar voor deze periode</p>
        </ErpCard>
      )}
    </div>
  );
}

// ── Campaigns Panel ──
function CampaignsPanel() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const data = await metaApi("campaigns");
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(campaignId: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setToggling(campaignId);
    try {
      await metaApi("update_campaign_status", { campaign_id: campaignId, status: newStatus });
      toast.success(`Campagne ${newStatus === "ACTIVE" ? "geactiveerd" : "gepauzeerd"}`);
      loadCampaigns();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setToggling(null);
    }
  }

  useEffect(() => { loadCampaigns(); }, []);

  return (
    <ErpCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Campagnes</h3>
        <Button variant="outline" size="sm" onClick={loadCampaigns} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Vernieuwen
        </Button>
      </div>

      {campaigns.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-8">Geen campagnes gevonden</p>
      )}

      <div className="space-y-2">
        {campaigns.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.objective?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              {c.daily_budget && (
                <span className="text-xs text-muted-foreground">€{(Number(c.daily_budget) / 100).toFixed(0)}/dag</span>
              )}
              <Badge variant={c.status === "ACTIVE" ? "default" : "outline"} className="text-xs">
                {c.status === "ACTIVE" ? "Actief" : c.status === "PAUSED" ? "Gepauzeerd" : c.status}
              </Badge>
              {(c.status === "ACTIVE" || c.status === "PAUSED") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => toggleStatus(c.id, c.status)}
                  disabled={toggling === c.id}
                >
                  {toggling === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : c.status === "ACTIVE" ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ErpCard>
  );
}

// ── Facebook Panel ──
function FacebookPanel() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true);
    setPermError(null);
    try {
      const data = await metaApi("page_posts");
      setPosts(data.posts || []);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("pages_read_engagement") || msg.includes("permission") || msg.includes("Permission")) {
        setPermError("Je Meta app mist de 'pages_read_engagement' permissie. Voeg deze toe in je Meta Developer Console om posts te kunnen laden.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function createPost() {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      await metaApi("create_page_post", { message: newPost.trim() });
      toast.success("Post geplaatst!");
      setNewPost("");
      loadPosts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  }

  useEffect(() => { loadPosts(); }, []);

  return (
    <div className="space-y-4">
      <ErpCard className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Nieuwe post</h3>
        <div className="space-y-2">
          <Textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Schrijf een bericht voor je Facebook pagina..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={createPost} disabled={posting || !newPost.trim()}>
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Plaatsen
            </Button>
          </div>
        </div>
      </ErpCard>

      <ErpCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Recente posts</h3>
          <Button variant="outline" size="sm" onClick={loadPosts} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            Vernieuwen
          </Button>
        </div>

        {permError && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-center space-y-2 mb-4">
            <AlertCircle className="h-6 w-6 text-yellow-500 mx-auto" />
            <p className="text-sm text-foreground">{permError}</p>
          </div>
        )}

        {!permError && posts.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-8">Geen posts gevonden</p>
        )}

        <div className="space-y-3">
          {posts.map((post: any) => (
            <div key={post.id} className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">
                {post.message || <span className="text-muted-foreground italic">Geen tekst</span>}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {post.likes?.summary?.total_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {post.comments?.summary?.total_count || 0}
                </span>
                {post.shares && (
                  <span>{post.shares.count || 0} shares</span>
                )}
                <span className="ml-auto">
                  {post.created_time ? format(new Date(post.created_time), "d MMM yyyy HH:mm", { locale: nl }) : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ErpCard>
    </div>
  );
}

// ── Instagram Panel ──
function InstagramPanel() {
  const [media, setMedia] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [showPublisher, setShowPublisher] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useState<HTMLInputElement | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [mediaRes, insightsRes] = await Promise.all([
        metaApi("instagram_media"),
        metaApi("instagram_insights").catch(() => ({ insights: [] })),
      ]);
      setMedia(mediaRes.media || []);
      setInsights(insightsRes.insights || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function publish() {
    if (!selectedFile) return;
    setPublishing(true);
    try {
      // Upload to Supabase storage (public bucket)
      const fileName = `ig_${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storagePath = `instagram/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("meta-uploads")
        .upload(storagePath, selectedFile, { contentType: selectedFile.type, upsert: true });

      if (uploadError) throw new Error("Upload mislukt: " + uploadError.message);

      const { data: urlData } = supabase.storage
        .from("meta-uploads")
        .getPublicUrl(storagePath);

      if (!urlData?.publicUrl) throw new Error("Kon publieke URL niet ophalen");

      await metaApi("instagram_publish", { image_url: urlData.publicUrl, caption: caption.trim() });
      toast.success("Instagram post gepubliceerd!");
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      setShowPublisher(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const insightMap: Record<string, number> = {};
  insights.forEach((i: any) => {
    insightMap[i.name] = i.values?.[0]?.value || 0;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard icon={Eye} label="Impressies" value={formatNum(insightMap.impressions)} />
        <KpiCard icon={Users} label="Bereik" value={formatNum(insightMap.reach)} />
        <KpiCard icon={Users} label="Profiel weergaven" value={formatNum(insightMap.profile_views)} />
      </div>

      <ErpCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Instagram posts</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPublisher(!showPublisher)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nieuwe post
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Vernieuwen
            </Button>
          </div>
        </div>

        {showPublisher && (
          <div className="rounded-lg border border-border p-3 mb-4 space-y-3">
            <div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="ig-file-upload"
                onChange={handleFileSelect}
              />
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-border" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  >
                    Verwijderen
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="ig-file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Klik om een afbeelding te selecteren</span>
                </label>
              )}
            </div>
            <Textarea
              placeholder="Caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowPublisher(false); setSelectedFile(null); setPreviewUrl(null); }}>Annuleren</Button>
              <Button size="sm" onClick={publish} disabled={publishing || !selectedFile}>
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                Publiceren
              </Button>
            </div>
          </div>
        )}

        {media.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-8">Geen posts gevonden</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {media.map((item: any) => (
            <div key={item.id} className="rounded-lg border border-border overflow-hidden group relative">
              {item.media_url ? (
                <img
                  src={item.media_type === "VIDEO" ? item.thumbnail_url || item.media_url : item.media_url}
                  alt={item.caption || ""}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs">
                <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {item.like_count || 0}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {item.comments_count || 0}</span>
              </div>
              {item.permalink && (
                <a href={item.permalink} target="_blank" rel="noopener noreferrer" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded p-1">
                  <ExternalLink className="h-3 w-3 text-white" />
                </a>
              )}
            </div>
          ))}
        </div>
      </ErpCard>
    </div>
  );
}

// ── Leads Panel ──
function LeadsPanel() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const importLead = useMetaImportLead();

  async function loadLeads() {
    setLoading(true);
    try {
      const data = await metaApi("leads");
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
        <h3 className="text-sm font-semibold text-foreground">Lead Ads leads</h3>
        <Button variant="outline" size="sm" onClick={loadLeads} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Vernieuwen
        </Button>
      </div>

      {leads.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-8">Nog geen leads ontvangen via Lead Ads</p>
      )}

      <div className="space-y-2">
        {leads.map((lead: any) => {
          const fields = lead.fields || {};
          const name = fields.full_name || fields.name || "Onbekend";
          const email = fields.email || "";
          const phone = fields.phone_number || fields.phone || "";
          const isImported = lead.status === "imported";

          return (
            <div key={lead.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {email && <span>{email}</span>}
                  {phone && <span>{phone}</span>}
                  {lead.form_name && <span className="italic">{lead.form_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {isImported ? (
                  <Badge variant="outline" className="text-xs">Geïmporteerd</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => importLead.mutate(lead.id)}
                    disabled={importLead.isPending}
                  >
                    <Download className="h-3 w-3 mr-1" /> Importeren
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ErpCard>
  );
}

// ── Messenger Panel ──
function MessengerPanel() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConvo, setSelectedConvo] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  async function loadConversations() {
    setLoading(true);
    try {
      const data = await metaApi("conversations");
      setConversations(data.conversations || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(convo: any) {
    setSelectedConvo(convo);
    setMsgLoading(true);
    try {
      const data = await metaApi("conversation_messages", { conversation_id: convo.id });
      setMessages(data.messages || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setMsgLoading(false);
    }
  }

  async function sendReply() {
    if (!reply.trim() || !selectedConvo) return;
    const participants = selectedConvo.participants?.data || [];
    // Find the non-page participant
    const recipient = participants.find((p: any) => p.id !== selectedConvo.id);
    if (!recipient) {
      toast.error("Kan ontvanger niet bepalen");
      return;
    }
    setSending(true);
    try {
      await metaApi("send_message", { recipient_id: recipient.id, message: reply.trim() });
      toast.success("Bericht verzonden");
      setReply("");
      openConversation(selectedConvo);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => { loadConversations(); }, []);

  if (selectedConvo) {
    return (
      <ErpCard className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedConvo(null); setMessages([]); }}>← Terug</Button>
          <h3 className="text-sm font-semibold text-foreground">
            {selectedConvo.participants?.data?.map((p: any) => p.name).join(", ") || "Gesprek"}
          </h3>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-2 border border-border rounded-lg p-3">
          {msgLoading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
          {messages.map((msg: any) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium text-foreground">{msg.from?.name || "Onbekend"}: </span>
              <span className="text-muted-foreground">{msg.message}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {msg.created_time ? format(new Date(msg.created_time), "d MMM HH:mm", { locale: nl }) : ""}
              </span>
            </div>
          ))}
          {!msgLoading && messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">Geen berichten</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Typ een bericht..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
          />
          <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </ErpCard>
    );
  }

  return (
    <ErpCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Messenger gesprekken</h3>
        <Button variant="outline" size="sm" onClick={loadConversations} disabled={loading}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Vernieuwen
        </Button>
      </div>

      {conversations.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground text-center py-8">Geen gesprekken gevonden</p>
      )}

      <div className="space-y-2">
        {conversations.map((convo: any) => {
          const participants = convo.participants?.data?.map((p: any) => p.name).join(", ") || "Onbekend";
          return (
            <button
              key={convo.id}
              onClick={() => openConversation(convo)}
              className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium text-foreground truncate">{participants}</p>
              <p className="text-xs text-muted-foreground truncate">{convo.snippet || ""}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {convo.updated_time ? format(new Date(convo.updated_time), "d MMM yyyy HH:mm", { locale: nl }) : ""}
              </p>
            </button>
          );
        })}
      </div>
    </ErpCard>
  );
}
