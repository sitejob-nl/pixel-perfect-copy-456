import { useState } from "react";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { toast } from "sonner";
import {
    useSnelstartConfig,
    useSaveSnelstartConfig,
    useSnelstartSync,
    useSnelstartSyncLog,
} from "@/hooks/useSnelstart";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function SnelstartSettings() {
    const { data: config, isLoading } = useSnelstartConfig();
    const saveConfig = useSaveSnelstartConfig();
    const sync = useSnelstartSync();
    const { data: syncLog = [] } = useSnelstartSyncLog();

    // Callback handler is now in Index.tsx (global)

    const [subscriptionKey, setSubscriptionKey] = useState("");
    const [appShortName, setAppShortName] = useState("");
    const [showKey, setShowKey] = useState(false);
    const [showLog, setShowLog] = useState(false);

    // Initialize form when config loads
    const initialized = useState(false);
    if (config && !initialized[0]) {
        setSubscriptionKey(config.subscription_key || "");
        setAppShortName(config.app_short_name || "");
        initialized[1](true);
    }

    const handleSaveConfig = async () => {
        try {
            await saveConfig.mutateAsync({
                subscription_key: subscriptionKey,
                app_short_name: appShortName,
            });
            toast.success("Snelstart configuratie opgeslagen");
        } catch (e: any) {
            toast.error("Fout bij opslaan: " + e.message);
        }
    };

    const handleTestConnection = async () => {
        try {
            const result = await sync.mutateAsync("test_connection");
            if (result.success) {
                toast.success("Verbinding met Snelstart succesvol!");
            } else {
                toast.error("Verbinding mislukt: " + (result.error || "Onbekende fout"));
            }
        } catch (e: any) {
            toast.error("Test mislukt: " + e.message);
        }
    };

    const handleSync = async (action: string, label: string) => {
        try {
            toast.info(`${label} synchronisatie gestart...`);
            const result = await sync.mutateAsync(action);
            if (result.success) {
                toast.success(`${label}: ${result.synced} gesynchroniseerd, ${result.failed} mislukt`);
            } else {
                toast.error(`${label} mislukt`);
            }
        } catch (e: any) {
            toast.error(`${label} fout: ` + e.message);
        }
    };

    const isActive = config?.is_active && config?.koppel_sleutel;

    // Build clean successUrl without query params like __lovable_token
    const cleanSuccessUrl = window.location.origin + window.location.pathname;
    const activationUrl = appShortName
        ? `https://web.snelstart.nl/couplings/activate/${appShortName}?referenceKey=${config?.organization_id || ""}&successUrl=${encodeURIComponent(cleanSuccessUrl)}`
        : null;

    if (isLoading) {
        return <div className="text-erp-text3 text-sm">Laden...</div>;
    }

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            success: "bg-green-500/15 text-green-400",
            partial: "bg-yellow-500/15 text-yellow-400",
            failed: "bg-red-500/15 text-red-400",
            running: "bg-blue-500/15 text-blue-400",
        };
        return (
            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${colors[status] || "bg-erp-bg4 text-erp-text3"}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-erp-text0">Koppelingsstatus</h3>
                    {isActive ? (
                        <span className="flex items-center gap-2 text-[12px] font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            Gekoppeld
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 text-[12px] font-semibold text-erp-text3 bg-erp-bg4 px-3 py-1 rounded-full">
                            <span className="w-2 h-2 bg-erp-text3 rounded-full" />
                            Niet gekoppeld
                        </span>
                    )}
                </div>

                {isActive && config?.last_sync_at && (
                    <p className="text-[12px] text-erp-text3">
                        Laatste sync: {format(new Date(config.last_sync_at), "d MMM yyyy HH:mm", { locale: nl })}
                    </p>
                )}

                {!isActive && (
                    <p className="text-[12px] text-erp-text3">
                        Sla eerst je Subscription Key en App Naam op, en klik vervolgens op "Koppel met Snelstart" om de verbinding te activeren.
                    </p>
                )}
            </div>

            {/* API Keys */}
            <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
                <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">API Configuratie</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Subscription Key (Primary)</label>
                        <div className="flex gap-2">
                            <input
                                type={showKey ? "text" : "password"}
                                value={subscriptionKey}
                                onChange={(e) => setSubscriptionKey(e.target.value)}
                                placeholder="Ocp-Apim-Subscription-Key"
                                className="flex-1 bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="text-[11px] text-erp-text3 hover:text-erp-text1 px-2"
                            >
                                {showKey ? "Verberg" : "Toon"}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">App Short Name</label>
                        <input
                            type="text"
                            value={appShortName}
                            onChange={(e) => setAppShortName(e.target.value)}
                            placeholder="Je Snelstart app naam"
                            className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                        />
                        <p className="text-[11px] text-erp-text3 mt-1">Ontvangen per mail bij partner aanmelding</p>
                    </div>

                    <div className="flex gap-2 pt-1">
                        <ErpButton primary onClick={handleSaveConfig}>
                            {saveConfig.isPending ? "Opslaan..." : "Configuratie opslaan"}
                        </ErpButton>
                        {activationUrl && (
                            <ErpButton onClick={() => window.location.assign(activationUrl)}>
                                Koppel met Snelstart →
                            </ErpButton>
                        )}
                    </div>
                </div>
            </div>

            {/* Sync Controls */}
            <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
                <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Synchronisatie</h3>

                {!isActive ? (
                    <p className="text-[12px] text-erp-text3">Koppel eerst met Snelstart om te synchroniseren.</p>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-erp-border0">
                            <div>
                                <div className="text-[13px] font-medium text-erp-text0">🏢 Klanten</div>
                                <div className="text-[11px] text-erp-text3">Bedrijven → Snelstart relaties</div>
                            </div>
                            <ErpButton
                                primary
                                onClick={() => handleSync("sync_klanten", "Klanten")}
                                disabled={sync.isPending}
                            >
                                {sync.isPending ? "Bezig..." : "Sync"}
                            </ErpButton>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-erp-border0">
                            <div>
                                <div className="text-[13px] font-medium text-erp-text0">📄 Facturen</div>
                                <div className="text-[11px] text-erp-text3">Facturen → Snelstart verkoopfacturen</div>
                            </div>
                            <ErpButton
                                primary
                                onClick={() => handleSync("sync_facturen", "Facturen")}
                                disabled={sync.isPending}
                            >
                                {sync.isPending ? "Bezig..." : "Sync"}
                            </ErpButton>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div>
                                <div className="text-[13px] font-medium text-erp-text0">📋 Offertes</div>
                                <div className="text-[11px] text-erp-text3">Offertes → Snelstart offertes</div>
                            </div>
                            <ErpButton
                                primary
                                onClick={() => handleSync("sync_offertes", "Offertes")}
                                disabled={sync.isPending}
                            >
                                {sync.isPending ? "Bezig..." : "Sync"}
                            </ErpButton>
                        </div>

                        <div className="pt-2">
                            <ErpButton onClick={handleTestConnection} disabled={sync.isPending}>
                                {sync.isPending ? "Testen..." : "🔌 Test verbinding"}
                            </ErpButton>
                        </div>
                    </div>
                )}
            </div>

            {/* Sync Log */}
            <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowLog(!showLog)}
                >
                    <h3 className="text-[15px] font-semibold text-erp-text0">Sync Log</h3>
                    <span className="text-erp-text3 text-[12px]">{showLog ? "▲ Inklappen" : "▼ Uitklappen"} ({syncLog.length})</span>
                </div>

                {showLog && (
                    <div className="mt-4 space-y-2">
                        {syncLog.length === 0 ? (
                            <p className="text-[12px] text-erp-text3">Nog geen synchronisaties uitgevoerd.</p>
                        ) : (
                            syncLog.map((log: any) => (
                                <div key={log.id} className="flex items-center justify-between bg-erp-bg2 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[12px] font-medium text-erp-text1 w-16">{log.entity_type}</span>
                                        {statusBadge(log.status)}
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-erp-text3">
                                        <span className="text-green-400">{log.records_synced} ✓</span>
                                        {log.records_failed > 0 && <span className="text-red-400">{log.records_failed} ✗</span>}
                                        <span>{format(new Date(log.started_at), "d MMM HH:mm", { locale: nl })}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
