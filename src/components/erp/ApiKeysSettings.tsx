import { useState } from "react";
import { useApiKeyStatus, useSetApiKey, useVerifyApiKey, useDeleteApiKey, useAiModels, useUpdateSelectedModel } from "@/hooks/useApiKeys";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const services = [
  { key: "anthropic" as const, label: "Anthropic (Claude)", desc: "Voor de AI Agent chat functionaliteit", placeholder: "sk-ant-..." },
  { key: "apify" as const, label: "Apify", desc: "Voor web scraping en data intelligence", placeholder: "apify_api_..." },
  { key: "resend" as const, label: "Resend", desc: "Voor transactionele en auth e-mails", placeholder: "re_..." },
] as const;

const tierConfig: Record<string, { label: string; className: string; emoji: string }> = {
  premium: { label: "PREMIUM", className: "bg-erp-purple/15 text-erp-purple", emoji: "🧠" },
  standard: { label: "AANBEVOLEN", className: "bg-erp-blue/15 text-erp-blue", emoji: "⚡" },
  budget: { label: "BUDGET", className: "bg-erp-green/15 text-erp-green", emoji: "💨" },
};

export default function ApiKeysSettings() {
  const { data: status, isLoading } = useApiKeyStatus();
  const setKey = useSetApiKey();
  const verifyKey = useVerifyApiKey();
  const deleteKey = useDeleteApiKey();
  const { data: models, isLoading: modelsLoading } = useAiModels();
  const updateModel = useUpdateSelectedModel();
  const { toast } = useToast();

  const [inputs, setInputs] = useState<Record<string, string>>({});

  if (isLoading) {
    return <div className="text-sm text-erp-text3 py-8 text-center">Laden...</div>;
  }

  const handleSave = async (service: "anthropic" | "apify") => {
    const value = inputs[service]?.trim();
    if (!value) { toast({ title: "Voer een API key in", variant: "destructive" }); return; }
    try {
      await setKey.mutateAsync({ service, apiKey: value });
      toast({ title: "API key opgeslagen" });
      setInputs((p) => ({ ...p, [service]: "" }));
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    }
  };

  const handleVerify = async (service: "anthropic" | "apify" | "resend") => {
    try {
      const result = await verifyKey.mutateAsync(service);
      toast({ title: (result as any)?.valid ? "✅ Key is geldig" : "❌ Key is ongeldig" });
    } catch (err: any) {
      toast({ title: "Fout bij verificatie", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (service: "anthropic" | "apify" | "resend") => {
    try {
      await deleteKey.mutateAsync(service);
      toast({ title: "API key verwijderd" });
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    }
  };

  const handleSelectModel = async (modelId: string) => {
    try {
      await updateModel.mutateAsync(modelId);
      toast({ title: "AI model gewijzigd" });
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    }
  };

  const selectedModel = status?.selected_model || "claude-sonnet-4-20250514";

  return (
    <div className="space-y-5">
      {services.map((svc) => {
        const isSet = status?.[`${svc.key}_key_set`];
        const hint = status?.[`${svc.key}_key_hint`];
        const verified = status?.[`${svc.key}_key_verified_at`];

        return (
          <div key={svc.key} className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-[14px] font-semibold text-erp-text0">{svc.label}</h4>
                <p className="text-[11px] text-erp-text3">{svc.desc}</p>
              </div>
              {isSet ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-erp-green/15 text-erp-green font-medium">
                  Ingesteld {hint ? `(${hint})` : ""}
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-erp-orange/15 text-erp-orange font-medium">
                  Niet ingesteld
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={inputs[svc.key] ?? ""}
                onChange={(e) => setInputs((p) => ({ ...p, [svc.key]: e.target.value }))}
                placeholder={svc.placeholder}
                className="flex-1 bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors"
              />
              <button
                onClick={() => handleSave(svc.key)}
                disabled={setKey.isPending}
                className="bg-erp-blue hover:brightness-110 text-white text-[12px] font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              >
                Opslaan
              </button>
            </div>

            {isSet && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleVerify(svc.key)}
                  disabled={verifyKey.isPending}
                  className="text-[11px] text-erp-text2 hover:text-erp-text0 bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  Verifiëren
                </button>
                <button
                  onClick={() => handleDelete(svc.key)}
                  disabled={deleteKey.isPending}
                  className="text-[11px] text-erp-red hover:brightness-110 bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                >
                  Verwijderen
                </button>
                {verified && (
                  <span className="text-[10px] text-erp-text3 self-center ml-auto">
                    Geverifieerd: {new Date(verified).toLocaleDateString("nl-NL")}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* AI Model Selector */}
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <div className="mb-4">
          <h4 className="text-[14px] font-semibold text-erp-text0">AI Model</h4>
          <p className="text-[11px] text-erp-text3">Kies welk Claude model de AI Agent gebruikt</p>
        </div>

        {modelsLoading ? (
          <div className="text-[12px] text-erp-text3 py-4 text-center">Modellen laden...</div>
        ) : (
          <div className="grid gap-2">
            {models?.map((model) => {
              const isSelected = selectedModel === model.id;
              const tier = tierConfig[model.tier] || tierConfig.standard;

              return (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  disabled={updateModel.isPending}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border-2 transition-all duration-150 disabled:opacity-50",
                    isSelected
                      ? "border-erp-blue bg-erp-blue/5"
                      : "border-erp-border0 bg-erp-bg2 hover:border-erp-border1 hover:bg-erp-hover"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{tier.emoji}</span>
                      <span className="text-[13px] font-semibold text-erp-text0">
                        {model.display_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", tier.className)}>
                        {tier.label}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-erp-blue flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-erp-text3 mb-1.5 ml-6">
                    {model.description}
                  </p>
                  <p className="text-[10px] text-erp-text3 font-mono ml-6">
                    ${model.input_price_per_mtok} input / ${model.output_price_per_mtok} output per MTok
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
