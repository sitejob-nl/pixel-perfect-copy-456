import { useState, useEffect } from "react";
import { useWhatsAppAccount, useWhatsAppRegister, useWhatsAppDisconnect, useWhatsAppWebhookLogs } from "@/hooks/useWhatsApp";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, X, RefreshCw, ExternalLink, Shield, BarChart3, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ProfileSettings from "@/components/whatsapp/ProfileSettings";
import TemplateManager from "@/components/whatsapp/TemplateManager";
import AutomationsPage from "@/components/whatsapp/AutomationsPage";

type SubTab = "verbinding" | "profiel" | "templates" | "automations" | "logs";

interface PhoneQuality {
  quality_rating: string;
  verified_name: string | null;
  code_verification_status: string;
  display_phone_number: string | null;
}

interface MessageStats {
  total_sent: number;
  total_received: number;
  total_delivered: number;
  total_read: number;
  per_day: { date: string; sent: number; received: number }[];
}

export default function WhatsAppSettings() {
  const { data: account, isLoading, refetch } = useWhatsAppAccount();
  const { data: org } = useOrganization();
  const register = useWhatsAppRegister();
  const disconnect = useWhatsAppDisconnect();
  const [tenantName, setTenantName] = useState("");
  const [subTab, setSubTab] = useState<SubTab>("verbinding");

  const [phoneQuality, setPhoneQuality] = useState<PhoneQuality | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState(7);
  const [loadingStats, setLoadingStats] = useState(false);

  const isConnected = account?.is_active && account?.phone_number_id !== "pending";
  const isPending = account && !account.is_active && account?.phone_number_id === "pending";

  useEffect(() => {
    if (isConnected) { fetchPhoneQuality(); fetchStats(); }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) fetchStats();
  }, [statsPeriod]);

  const fetchPhoneQuality = async () => {
    setLoadingQuality(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-phone-quality");
      if (error) throw error;
      setPhoneQuality(data);
    } catch (err: any) { console.error("Phone quality error:", err); }
    setLoadingQuality(false);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const orgId = org?.organization_id;
      if (!orgId) return;
      const since = subDays(new Date(), statsPeriod).toISOString();
      const { data: messages } = await supabase.from("whatsapp_messages").select("direction, status, created_at").eq("organization_id", orgId).gte("created_at", since);
      if (!messages) { setLoadingStats(false); return; }

      const sent = messages.filter(m => m.direction === "outbound").length;
      const received = messages.filter(m => m.direction === "inbound").length;
      const delivered = messages.filter(m => m.status === "delivered").length;
      const read = messages.filter(m => m.status === "read").length;

      const dayMap: Record<string, { sent: number; received: number }> = {};
      for (let i = statsPeriod - 1; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        dayMap[d] = { sent: 0, received: 0 };
      }
      for (const msg of messages) {
        const d = format(new Date(msg.created_at), "yyyy-MM-dd");
        if (dayMap[d]) {
          if (msg.direction === "outbound") dayMap[d].sent++;
          else dayMap[d].received++;
        }
      }

      setStats({
        total_sent: sent, total_received: received, total_delivered: delivered, total_read: read,
        per_day: Object.entries(dayMap).map(([date, v]) => ({ date: format(new Date(date), "d MMM", { locale: nl }), ...v })),
      });
    } catch (err: any) { console.error("Stats error:", err); }
    setLoadingStats(false);
  };

  const handleRegister = async () => {
    try {
      const result = await register.mutateAsync(tenantName || undefined);
      window.open(result.setup_url, "_blank");
      toast.success("Tenant geregistreerd! Voltooi de koppeling in het geopende venster.");
    } catch (err: any) { toast.error(err.message || "Registratie mislukt"); }
  };

  const handleDisconnect = async () => {
    if (!confirm("Weet je zeker dat je WhatsApp wilt ontkoppelen?")) return;
    try { await disconnect.mutateAsync(); toast.success("WhatsApp ontkoppeld"); }
    catch (err: any) { toast.error(err.message || "Ontkoppeling mislukt"); }
  };

  if (isLoading) {
    return (
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <div className="text-[13px] text-erp-text3">Laden...</div>
      </div>
    );
  }

  const tabs: { key: SubTab; label: string }[] = [
    { key: "verbinding", label: "Verbinding" },
    { key: "profiel", label: "Profiel" },
    { key: "templates", label: "Templates" },
    { key: "automations", label: "Auto" },
    { key: "logs", label: "Logs" },
  ];

  const qualityColors: Record<string, string> = {
    GREEN: "text-erp-green bg-erp-green/10",
    YELLOW: "text-erp-amber bg-erp-amber/10",
    RED: "text-erp-red bg-erp-red/10",
  };

  const qualityLabel: Record<string, string> = {
    GREEN: "Hoog", YELLOW: "Gemiddeld", RED: "Laag", UNKNOWN: "Onbekend",
  };

  return (
    <div className="space-y-4">
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-erp-text0">WhatsApp Business</h3>
            <p className="text-[12px] text-erp-text3 mt-1">
              Koppel je WhatsApp Business account.
            </p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-erp-green" />
              <span className="text-[11px] font-medium text-erp-green hidden sm:inline">Verbonden</span>
            </div>
          )}
        </div>

        {isConnected && (
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSubTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap flex-shrink-0",
                  subTab === tab.key ? "bg-erp-bg2 text-erp-text0" : "text-erp-text3 hover:text-erp-text1"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {(subTab === "verbinding" || !isConnected) && (
          <>
            {isConnected ? (
              <div className="space-y-4">
                <div className="bg-erp-bg2 rounded-lg border border-erp-border0 p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-erp-green/20">📱</div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-erp-text0 truncate">{account.display_phone || account.phone_number_id}</div>
                      <div className="text-[11px] text-erp-text3 truncate">{account.business_name || "WhatsApp Business"}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    {account.display_phone && (
                      <div className="flex justify-between py-1 border-b border-erp-border0 gap-2">
                        <span className="text-erp-text3 flex-shrink-0">Telefoon</span>
                        <span className="text-erp-text0 font-mono truncate">{account.display_phone}</span>
                      </div>
                    )}
                    {account.waba_id && account.waba_id !== "pending" && (
                      <div className="flex justify-between py-1 border-b border-erp-border0 gap-2">
                        <span className="text-erp-text3 flex-shrink-0">WABA ID</span>
                        <span className="text-erp-text0 font-mono truncate">{account.waba_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1">
                      <span className="text-erp-text3">Verbonden sinds</span>
                      <span className="text-erp-text0">{new Date(account.created_at).toLocaleDateString("nl-NL")}</span>
                    </div>
                  </div>
                </div>

                {/* Phone Quality */}
                <div className="bg-erp-bg2 rounded-lg border border-erp-border0 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-erp-text2" />
                      <span className="text-[13px] font-medium text-erp-text0">Kwaliteit</span>
                    </div>
                    <button onClick={fetchPhoneQuality} disabled={loadingQuality} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      {loadingQuality ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      <span className="hidden sm:inline">Vernieuwen</span>
                    </button>
                  </div>
                  {phoneQuality ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-erp-text3 mb-1">Kwaliteit</p>
                        <span className={cn("text-[12px] font-semibold px-2 py-0.5 rounded-full", qualityColors[phoneQuality.quality_rating] || "text-erp-text3 bg-erp-bg3")}>
                          {qualityLabel[phoneQuality.quality_rating] || phoneQuality.quality_rating}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-erp-text3 mb-1">Naam</p>
                        <p className="text-[12px] text-erp-text0 font-medium truncate">{phoneQuality.verified_name || "—"}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[10px] text-erp-text3 mb-1">Verificatie</p>
                        <span className={cn("text-[11px] font-medium", phoneQuality.code_verification_status === "VERIFIED" ? "text-erp-green" : "text-erp-text2")}>
                          {phoneQuality.code_verification_status === "VERIFIED" ? "✓ Geverifieerd" : phoneQuality.code_verification_status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-erp-text3">Klik op Vernieuwen om data op te halen</p>
                  )}
                </div>

                {/* Stats */}
                <div className="bg-erp-bg2 rounded-lg border border-erp-border0 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-erp-text2" />
                      <span className="text-[13px] font-medium text-erp-text0">Statistieken</span>
                    </div>
                    <div className="flex gap-1">
                      {[7, 30, 90].map(d => (
                        <button key={d} onClick={() => setStatsPeriod(d)} className={cn("px-2 py-0.5 rounded text-[10px] font-medium", statsPeriod === d ? "bg-primary text-primary-foreground" : "bg-erp-bg3 text-erp-text3")}>{d}d</button>
                      ))}
                    </div>
                  </div>

                  {loadingStats ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-erp-text3" /></div>
                  ) : stats ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: "Verzonden", value: stats.total_sent },
                          { label: "Ontvangen", value: stats.total_received },
                          { label: "Afgeleverd", value: stats.total_delivered },
                          { label: "Gelezen", value: stats.total_read },
                        ].map(s => (
                          <div key={s.label} className="bg-erp-bg3 rounded-lg p-2 text-center">
                            <p className="text-[16px] font-bold text-erp-text0">{s.value}</p>
                            <p className="text-[10px] text-erp-text3">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {stats.per_day.length > 0 && (
                        <div className="h-[140px] sm:h-[160px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.per_day}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--erp-text-3))" }} />
                              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--erp-text-3))" }} allowDecimals={false} width={24} />
                              <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--erp-bg-2))", border: "1px solid hsl(var(--erp-border-0))", borderRadius: 8 }} />
                              <Bar dataKey="sent" fill="hsl(var(--erp-green))" name="Verzonden" radius={[2, 2, 0, 0]} />
                              <Bar dataKey="received" fill="hsl(var(--erp-blue))" name="Ontvangen" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={handleDisconnect}
                  disabled={disconnect.isPending}
                  className="px-3 py-1.5 text-[12px] font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
                >
                  {disconnect.isPending ? "Bezig..." : "Verbinding verbreken"}
                </button>
              </div>
            ) : isPending ? (
              <div className="bg-erp-bg2 rounded-lg border border-erp-border0 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-erp-amber animate-pulse" />
                  <span className="text-[13px] font-medium text-erp-text0">Wachten op koppeling...</span>
                </div>
                <p className="text-[11px] text-erp-text3">De tenant is geregistreerd. Voltooi de OAuth flow.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => { window.open(`https://connect.sitejob.nl/whatsapp-setup?tenant_id=${account.tenant_id}`, "_blank"); }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-medium text-primary-foreground rounded-lg bg-erp-green"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> WhatsApp koppelen
                  </button>
                  <button
                    onClick={() => refetch()}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium text-erp-text1 bg-erp-bg3 rounded-lg hover:bg-erp-bg4 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Controleren
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Bedrijfsnaam (optioneel)"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleRegister}
                  disabled={register.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 text-primary-foreground rounded-lg text-[13px] font-medium bg-erp-green"
                >
                  {register.isPending ? "Registreren..." : "📱 WhatsApp koppelen"}
                </button>
                <div className="text-[11px] text-erp-text3 border-t border-erp-border0 pt-3 mt-4 space-y-1">
                  <p><strong>Hoe werkt het?</strong></p>
                  <ol className="list-decimal ml-4 space-y-0.5">
                    <li>Klik op "WhatsApp koppelen"</li>
                    <li>Doorloop de Meta/Facebook OAuth</li>
                    <li>Berichten worden automatisch gesynchroniseerd</li>
                  </ol>
                </div>
              </div>
            )}
          </>
        )}

        {isConnected && subTab === "profiel" && <ProfileSettings />}
        {isConnected && subTab === "templates" && <TemplateManager />}
        {isConnected && subTab === "automations" && <AutomationsPage />}
        {isConnected && subTab === "logs" && <WebhookLogsTab />}
      </div>
    </div>
  );
}

function WebhookLogsTab() {
  const { data: logs = [], isLoading } = useWhatsAppWebhookLogs();

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-erp-text3">Recente webhook events</p>
      {isLoading ? (
        <div className="text-[12px] text-erp-text3 py-4">Laden...</div>
      ) : logs.length === 0 ? (
        <div className="text-[12px] text-erp-text3 py-4 text-center">Geen webhook logs</div>
      ) : (
        <div className="space-y-0 max-h-[400px] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-2 py-2 border-b border-erp-border0 last:border-0">
              <span className="text-[12px] text-erp-text1 font-mono truncate flex-1">{log.event_type}</span>
              {log.processed ? <Check className="w-3.5 h-3.5 text-erp-green flex-shrink-0" /> : <X className="w-3.5 h-3.5 text-erp-text3 flex-shrink-0" />}
              {log.error && <span className="text-[10px] text-erp-red truncate max-w-[100px] sm:max-w-[150px]">{log.error}</span>}
              <span className="text-[10px] text-erp-text3 flex-shrink-0">
                {new Date(log.created_at).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
