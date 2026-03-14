import { useState } from "react";
import { useWhatsAppAccount, useWhatsAppRegister, useWhatsAppDisconnect } from "@/hooks/useWhatsApp";
import { toast } from "sonner";

export default function WhatsAppSettings() {
  const { data: account, isLoading } = useWhatsAppAccount();
  const register = useWhatsAppRegister();
  const disconnect = useWhatsAppDisconnect();
  const [tenantName, setTenantName] = useState("");

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

  return (
    <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5 space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-erp-text0">WhatsApp Business</h3>
        <p className="text-[12px] text-erp-text3 mt-1">
          Koppel je WhatsApp Business account om berichten te versturen en ontvangen vanuit het CRM.
        </p>
      </div>

      {isConnected ? (
        <div className="flex items-center justify-between bg-erp-bg2 rounded-lg border border-erp-border0 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(142,70%,45%)] flex items-center justify-center text-white text-lg">
              📱
            </div>
            <div>
              <div className="text-[13px] font-medium text-erp-text0">
                {account.display_phone || account.phone_number_id}
              </div>
              <div className="text-[11px] text-erp-text3">
                {account.business_name || "WhatsApp Business"} — Gekoppeld
              </div>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnect.isPending}
            className="px-3 py-1.5 text-[12px] font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
          >
            {disconnect.isPending ? "Bezig..." : "Ontkoppelen"}
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
          <button
            onClick={() => {
              const setupUrl = `https://connect.sitejob.nl/whatsapp-setup?tenant_id=${account.tenant_id}`;
              window.open(setupUrl, "_blank");
            }}
            className="px-4 py-2 text-[12px] font-medium text-white bg-[hsl(142,70%,45%)] rounded-lg hover:bg-[hsl(142,70%,40%)] transition-colors"
          >
            WhatsApp koppelen →
          </button>
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
            className="flex items-center gap-2 px-4 py-2.5 bg-[hsl(142,70%,45%)] text-white rounded-lg text-[13px] font-medium hover:bg-[hsl(142,70%,40%)] transition-colors"
          >
            {register.isPending ? "Registreren..." : "📱 WhatsApp koppelen"}
          </button>
        </div>
      )}

      <div className="text-[11px] text-erp-text3 border-t border-erp-border0 pt-3 space-y-1">
        <p><strong>Hoe werkt het?</strong></p>
        <ol className="list-decimal ml-4 space-y-0.5">
          <li>Klik op "WhatsApp koppelen" om te registreren</li>
          <li>Doorloop de Meta/Facebook OAuth in het geopende venster</li>
          <li>Na koppeling worden berichten automatisch gesynchroniseerd</li>
        </ol>
      </div>
    </div>
  );
}
