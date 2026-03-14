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

  // Quality & Stats state
  const [phoneQuality, setPhoneQuality] = useState<PhoneQuality | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState(7);
  const [loadingStats, setLoadingStats] = useState(false);

  const isConnected = account?.is_active && account?.phone_number_id !== "pending";
  const isPending = account && !account.is_active && account?.phone_number_id === "pending";

  useEffect(() => {
    if (isConnected) {
      fetchPhoneQuality();
      fetchStats();
    }
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
    } catch (err: any) {
      console.error("Phone quality error:", err);
    }
    setLoadingQuality(false);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const orgId = org?.organization_id;
      if (!orgId) return;

      const since = subDays(new Date(), statsPeriod).toISOString();
      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("direction, status, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", since);

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
        total_sent: sent,
        total_received: received,
        total_delivered: delivered,
        total_read: read,
        per_day: Object.entries(dayMap).map(([date, v]) => ({
          date: format(new Date(date), "d MMM", { locale: nl }),
          ...v,
        })),
      });
    } catch (err: any) {
      console.error("Stats error:", err);
    }
    setLoadingStats(false);
  };

  const handleRegister = async () => {
    try {
      const result = await register.mutateAsync(tenantName || undefined);
      window.open(result.setup_url, "_blank");
      toast.success("Tenant geregistreerd! Voltooi de koppeling in het geopende venster.");
    } catch (err: any) {
      toast.error(err.message || "Registratie mislukt");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Weet je zeker dat je WhatsApp wilt ontkoppelen?")) return;
    try {
      await disconnect.mutateAsync();
      toast.success("WhatsApp ontkoppeld");
    } catch (err: any) {
      toast.error(err.message || "Ontkoppeling mislukt");
    }
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
    { key: "automations", label: "Automations" },
    { key: "logs", label: "Webhook Logs" },
  ];

  const qualityColors: Record<string, string> = {
    GREEN: "text-green-400 bg-green-400/10",
    YELLOW: "text-yellow-400 bg-yellow-400/10",
    RED: "text-red-400 bg-red-400/10",
  };

  const qualityLabel: Record<string, string> = {
    GREEN: "Hoog",
    YELLOW: "Gemiddeld",
    RED: "Laag",
    UNKNOWN: "Onbekend",
  };

  return (
    <div className="space-y-4">
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-erp-text0">WhatsApp Business</h3>
            <p className="text-[12px] text-erp-text3 mt-1">
              Koppel je WhatsApp Business account om berichten te versturen en ontvangen vanuit het CRM.
            </p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "hsl(142, 70%, 45%)" }} />
              <span className="text-[11px] font-medium" style={{ color: "hsl(142, 70%, 45%)" }}>Verbonden</span>
            </div>
          )}
        </div>

        {/* Sub-tabs */}
        {isConnected && (
          <div className="flex gap-1 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSubTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                  subTab === tab.key
                    ? "bg-erp-bg2 text-erp-text0"
                    : "text-erp-text3 hover:text-erp-text1"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Connection tab */}
        {(subTab === "verbinding" || !isConnected) && (
          <>
            {isConnected ? (
              <div className="space-y-4">
                {/* Connection details */}
                <div className="bg-erp-bg2 rounded-lg border border-erp-border0 p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg" style={{ background: "hsl(142, 70%, 45%)" }}>
                      📱
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-erp-text0">
                        {account.display_phone || account.phone_number_id}
                      </div>
                      <div className="text-[11px] text-erp-text3">
                        {account.business_name || "WhatsApp Business"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-[12px]">
                    {account.display_phone && (
                      <div className="flex justify-between py-1 border-b border-erp-border0">
                        <span className="text-erp-text3">Telefoonnummer</span>
                        <span className="text-erp-text0 font-mono">{account.display_phone}</span>
                      </div>
                    )}
                    {account.waba_id && account.waba_id !== "pending" && (
                      <div className="flex justify-between py-1 border-b border-erp-border0">
                        <span className="text-erp-text3">WABA ID</span>
                        <span className="text-erp-text0 font-mono">{account.waba_id}</span>
                      </div>
                    )}
                    {account.phone_number_id && (
                      <div className="flex justify-between py-1 border-b border-erp-border0">
                        <span className="text-erp-text3">Phone Number ID</span>
                        <span className="text-erp-text0 font-mono">{account.phone_number_id}</span>
                      </div>
                    )}
                    {account.tenant_id && (
                      <div className="flex justify-between py-1 border-b border-erp-border0">
                        <span className="text-erp-text3">Tenant ID</span>
                        <span className="text-erp-text0 font-mono">{account.tenant_id}</span>
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
                      <span className="text-[13px] font-medium text-erp-text0">Telefoonnummer Kwaliteit</span>
                    </div>
                    <button onClick={fetchPhoneQuality} disabled={loadingQuality} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      {loadingQuality ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Vernieuwen
                    </button>
                  </div>
                  {phoneQuality ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-erp-text3 mb-1">Kwaliteit</p>
                        <span className={cn("text-[12px] font-semibold px-2 py-0.5 rounded-full", qualityColors[phoneQuality.quality_rating] || "text-erp-text3 bg-erp-bg3")}>
                          {qualityLabel[phoneQuality.quality_rating] || phoneQuality.quality_rating}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-erp-text3 mb-1">Geverifieerde naam</p>
                        <p className="text-[12px] text-erp-text0 font-medium">{phoneQuality.verified_name || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-erp-text3 mb-1">Verificatie</p>
                        <span className={cn("text-[11px] font-medium", phoneQuality.code_verification_status === "VERIFIED" ? "text-green-400" : "text-erp-text2")}>
                          {phoneQuality.code_verification_status === "VERIFIED" ? "✓ Geverifieerd" : phoneQuality.code_verification_status}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-erp-text3">Klik op Vernieuwen om kwaliteitsdata op te halen</p>
                  )}
                </div>

                {/* Message Statistics */}
                <div className="bg-erp-bg2 rounded-lg border border-erp-border0 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-erp-text2" />
                      <span className="text-[13px] font-medium text-erp-text0">Berichtstatistieken</span>
                    </div>
                    <div className="flex gap-1">
                      {[7, 30, 90].map(d => (
                        <button
                          key={d}
                          onClick={() => setStatsPeriod(d)}
                          className={cn("px-2 py-0.5 rounded text-[10px] font-medium", statsPeriod === d ? "bg-primary text-white" : "bg-erp-bg3 text-erp-text3")}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingStats ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-erp-text3" /></div>
                  ) : stats ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Verzonden", value: stats.total_sent, color: "hsl(142, 70%, 45%)" },
                          { label: "Ontvangen", value: stats.total_received, color: "hsl(221, 83%, 53%)" },
                          { label: "Afgeleverd", value: stats.total_delivered, color: "hsl(45, 90%, 50%)" },
                          { label: "Gelezen", value: stats.total_read, color: "hsl(180, 70%, 45%)" },
                        ].map(s => (
                          <div key={s.label} className="bg-erp-bg3 rounded-lg p-2 text-center">
                            <p className="text-[16px] font-bold text-erp-text0">{s.value}</p>
                            <p className="text-[10px] text-erp-text3">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {stats.per_day.length > 0 && (
                        <div className="h-[160px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.per_day}>
                              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--erp-text-3))" }} />
                              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--erp-text-3))" }} allowDecimals={false} />
                              <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--erp-bg-2))", border: "1px solid hsl(var(--erp-border-0))", borderRadius: 8 }} />
                              <Bar dataKey="sent" fill="hsl(142, 71%, 45%)" name="Verzonden" radius={[2, 2, 0, 0]} />
                              <Bar dataKey="received" fill="hsl(221, 83%, 53%)" name="Ontvangen" radius={[2, 2, 0, 0]} />
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
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-[13px] font-medium text-erp-text0">
                    Wachten op WhatsApp koppeling...
                  </span>
                </div>
                <p className="text-[11px] text-erp-text3">
                  De tenant is geregistreerd. Klik hieronder om de WhatsApp OAuth flow te voltooien.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const setupUrl = `https://connect.sitejob.nl/whatsapp-setup?tenant_id=${account.tenant_id}`;
                      window.open(setupUrl, "_blank");
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-white rounded-lg transition-colors"
                    style={{ background: "hsl(142, 70%, 45%)" }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    WhatsApp koppelen
                  </button>
                  <button
                    onClick={() => refetch()}
                    className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-erp-text1 bg-erp-bg3 rounded-lg hover:bg-erp-bg4 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Controleren
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Bedrijfsnaam (optioneel)"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="flex-1 bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                  />
                </div>
                <button
                  onClick={handleRegister}
                  disabled={register.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 text-white rounded-lg text-[13px] font-medium transition-colors"
                  style={{ background: "hsl(142, 70%, 45%)" }}
                >
                  {register.isPending ? "Registreren..." : "📱 WhatsApp koppelen"}
                </button>
              </div>
            )}

            <div className="text-[11px] text-erp-text3 border-t border-erp-border0 pt-3 mt-4 space-y-1">
              <p><strong>Hoe werkt het?</strong></p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Klik op "WhatsApp koppelen" om te registreren</li>
                <li>Doorloop de Meta/Facebook OAuth in het geopende venster</li>
                <li>Na koppeling worden berichten automatisch gesynchroniseerd</li>
              </ol>
            </div>
          </>
        )}

        {/* Profile tab */}
        {isConnected && subTab === "profiel" && <ProfileSettings />}

        {/* Templates tab */}
        {isConnected && subTab === "templates" && <TemplateManager />}

        {/* Automations tab */}
        {isConnected && subTab === "automations" && <AutomationsPage />}

        {/* Webhook Logs tab */}
        {isConnected && subTab === "logs" && <WebhookLogsTab />}
      </div>
    </div>
  );
}

function WebhookLogsTab() {
  const { data: logs = [], isLoading } = useWhatsAppWebhookLogs();

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-erp-text3">Recente webhook events voor debugging</p>

      {isLoading ? (
        <div className="text-[12px] text-erp-text3 py-4">Laden...</div>
      ) : logs.length === 0 ? (
        <div className="text-[12px] text-erp-text3 py-4 text-center">Geen webhook logs</div>
      ) : (
        <div className="space-y-0 max-h-[400px] overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-2 py-2 border-b border-erp-border0 last:border-0">
              <span className="text-[12px] text-erp-text1 font-mono truncate flex-1">{log.event_type}</span>
              {log.processed ? (
                <Check className="w-3.5 h-3.5" style={{ color: "hsl(var(--erp-green))" }} />
              ) : (
                <X className="w-3.5 h-3.5 text-erp-text3" />
              )}
              {log.error && (
                <span className="text-[10px] text-erp-red truncate max-w-[150px]">{log.error}</span>
              )}
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
