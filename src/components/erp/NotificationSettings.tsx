import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { Bell, BellOff, Smartphone } from "lucide-react";

const EVENT_TYPES = [
  { key: "whatsapp_message", label: "WhatsApp berichten", desc: "Inkomende WhatsApp berichten", icon: "💬" },
  { key: "new_lead", label: "Nieuwe leads", desc: "Wanneer een nieuw contact wordt aangemaakt", icon: "👤" },
  { key: "contract_signed", label: "Contract ondertekend", desc: "Wanneer een contract wordt getekend", icon: "✍️" },
  { key: "deal_stage_change", label: "Deal wijzigingen", desc: "Wanneer een deal naar een andere fase gaat", icon: "📊" },
] as const;

type Prefs = Record<string, string>;

export default function NotificationSettings() {
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const { supported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const [prefs, setPrefs] = useState<Prefs>({});
  const [saving, setSaving] = useState(false);

  // Load preferences
  useEffect(() => {
    if (!user || !orgId) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .eq("organization_id", orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p: Prefs = {};
          for (const e of EVENT_TYPES) {
            p[e.key] = (data as Record<string, unknown>)[e.key] as string ?? "push";
          }
          setPrefs(p);
        } else {
          // Defaults
          const p: Prefs = {};
          for (const e of EVENT_TYPES) p[e.key] = "push";
          setPrefs(p);
        }
      });
  }, [user, orgId]);

  const togglePref = async (key: string) => {
    if (!user || !orgId) return;
    const newVal = prefs[key] === "push" ? "off" : "push";
    setPrefs((prev) => ({ ...prev, [key]: newVal }));
    setSaving(true);

    const updateData: Record<string, unknown> = {
      user_id: user.id,
      organization_id: orgId,
      [key]: newVal,
    };

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(updateData, { onConflict: "user_id,organization_id" } as never);

    if (error) {
      toast.error("Fout bij opslaan voorkeur");
      setPrefs((prev) => ({ ...prev, [key]: prefs[key] }));
    }
    setSaving(false);
  };

  const handleSubscribe = async () => {
    const ok = await subscribe();
    if (ok) toast.success("Push notificaties ingeschakeld!");
    else if (permission === "denied") toast.error("Notificaties zijn geblokkeerd in je browser. Sta ze toe via de browser-instellingen.");
  };

  return (
    <div className="space-y-6">
      {/* Push subscription card */}
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <h3 className="text-[15px] font-semibold text-erp-text0 mb-1 flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Push notificaties
        </h3>
        <p className="text-[12px] text-erp-text3 mb-4">
          Ontvang real-time meldingen op dit apparaat, ook als de app niet open is.
        </p>

        {!supported ? (
          <div className="text-[12px] text-erp-text3 bg-erp-bg2 rounded-lg p-3">
            Push notificaties worden niet ondersteund in deze browser. Gebruik Chrome, Edge of Firefox.
          </div>
        ) : isSubscribed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] text-green-400">
              <Bell className="w-4 h-4" />
              Push notificaties zijn actief op dit apparaat
            </div>
            <button
              onClick={unsubscribe}
              disabled={loading}
              className="text-[12px] text-erp-text3 hover:text-red-400 transition-colors"
            >
              Uitschakelen
            </button>
          </div>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-erp-blue text-white rounded-lg text-[13px] font-medium hover:bg-erp-blue/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              "Bezig..."
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Push notificaties inschakelen
              </>
            )}
          </button>
        )}

        {permission === "denied" && (
          <p className="text-[11px] text-red-400 mt-2">
            Notificaties zijn geblokkeerd. Ga naar je browserinstellingen om dit te wijzigen.
          </p>
        )}
      </div>

      {/* Notification preferences per event */}
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <h3 className="text-[15px] font-semibold text-erp-text0 mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notificatie voorkeuren
        </h3>
        <div className="space-y-1">
          {EVENT_TYPES.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-erp-bg2 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="text-[13px] font-medium text-erp-text0">{item.label}</div>
                  <div className="text-[11px] text-erp-text3">{item.desc}</div>
                </div>
              </div>
              <button
                onClick={() => togglePref(item.key)}
                disabled={saving}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  prefs[item.key] === "push" ? "bg-erp-blue" : "bg-erp-bg4"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full transition-transform ${
                    prefs[item.key] === "push"
                      ? "translate-x-[18px] bg-white"
                      : "translate-x-[2px] bg-erp-text3"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
