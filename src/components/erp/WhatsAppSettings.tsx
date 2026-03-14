import { useState } from "react";
import { useWhatsAppAccount, useWhatsAppRegister, useWhatsAppDisconnect, useWhatsAppWebhookLogs, useWhatsAppMessages } from "@/hooks/useWhatsApp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, X, RefreshCw, ExternalLink } from "lucide-react";

type SubTab = "verbinding" | "berichten" | "logs";

export default function WhatsAppSettings() {
  const { data: account, isLoading, refetch } = useWhatsAppAccount();
  const register = useWhatsAppRegister();
  const disconnect = useWhatsAppDisconnect();
  const [tenantName, setTenantName] = useState("");
  const [subTab, setSubTab] = useState<SubTab>("verbinding");

  const isConnected = account?.is_active && account?.phone_number_id !== "pending";
  const isPending = account && !account.is_active && account?.phone_number_id === "pending";

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
    { key: "berichten", label: "Berichten" },
    { key: "logs", label: "Webhook Logs" },
  ];

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

        {/* Messages tab */}
        {isConnected && subTab === "berichten" && <MessagesTab />}

        {/* Webhook Logs tab */}
        {isConnected && subTab === "logs" && <WebhookLogsTab />}
      </div>
    </div>
  );
}

function MessagesTab() {
  const { data: messages = [], isLoading } = useWhatsAppMessages();
  const [dirFilter, setDirFilter] = useState<"alle" | "inbound" | "outbound">("alle");

  const filtered = messages.filter((m) => {
    if (dirFilter === "alle") return true;
    return m.direction === dirFilter;
  });

  const statusColor = (status: string | null) => {
    switch (status) {
      case "sent": return "hsl(var(--erp-blue))";
      case "delivered": return "hsl(var(--erp-green))";
      case "read": return "hsl(var(--erp-cyan))";
      case "failed": return "hsl(var(--erp-red))";
      case "received": return "hsl(var(--erp-green))";
      default: return "hsl(var(--erp-text-3))";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {(["alle", "inbound", "outbound"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setDirFilter(f)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
              dirFilter === f ? "bg-erp-bg2 text-erp-text0" : "text-erp-text3 hover:text-erp-text1"
            )}
          >
            {f === "alle" ? "Alle" : f === "inbound" ? "← Inbound" : "→ Outbound"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-[12px] text-erp-text3 py-4">Laden...</div>
      ) : filtered.length === 0 ? (
        <div className="text-[12px] text-erp-text3 py-4 text-center">Geen berichten</div>
      ) : (
        <div className="space-y-0 max-h-[400px] overflow-y-auto">
          {filtered.map((msg) => (
            <div key={msg.id} className="flex items-center gap-2 py-2 border-b border-erp-border0 last:border-0">
              <span className="text-[11px] text-erp-text3 w-4">
                {msg.direction === "inbound" ? "←" : "→"}
              </span>
              <span className="text-[12px] text-erp-text1 font-mono w-28 truncate flex-shrink-0">{msg.phone_number}</span>
              <span className="text-[12px] text-erp-text0 flex-1 truncate">{msg.content || `[${msg.message_type}]`}</span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ color: statusColor(msg.status), background: `${statusColor(msg.status)}14` }}
              >
                {msg.status}
              </span>
              <span className="text-[10px] text-erp-text3 w-12 text-right flex-shrink-0">
                {new Date(msg.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
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
