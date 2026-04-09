import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ErpCard, ErpButton, PageHeader } from "@/components/erp/ErpPrimitives";
import { ArrowLeft, Save, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

const OUTREACH_API = "http://204.168.221.107:8100";
const API_KEY_KEY = "outreach_api_key";
const LOCAL_SETTINGS_KEY = "outreach_settings_local";

interface LocalSettings {
  maxConnectionsPerDay: number;
  maxDmsPerDay: number;
  requireApproval: boolean;
}

const localDefaults: LocalSettings = {
  maxConnectionsPerDay: 20,
  maxDmsPerDay: 40,
  requireApproval: true,
};

function loadLocalSettings(): LocalSettings {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    return raw ? { ...localDefaults, ...JSON.parse(raw) } : localDefaults;
  } catch { return localDefaults; }
}

export default function OutreachSettingsPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_KEY) ?? "");
  const [branches, setBranches] = useState("");
  const [cities, setCities] = useState("");
  const [localSettings, setLocalSettings] = useState<LocalSettings>(loadLocalSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load discovery config from VPS API
  useEffect(() => {
    const key = localStorage.getItem(API_KEY_KEY);
    if (!key) return;
    loadConfig(key);
  }, []);

  async function loadConfig(key: string) {
    setLoading(true);
    try {
      const res = await fetch(`${OUTREACH_API}/config/discovery`, {
        headers: { "X-API-Key": key },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      // Convert search_queries back to branch names
      // Format: "installatiebedrijf {city} site:.nl ..." → "installatiebedrijf"
      const branchNames = (data.search_queries ?? []).map((q: string) => {
        return q.split("{city}")[0].trim().replace(/\s+site:\.nl.*$/, "");
      });
      setBranches(branchNames.join(", "));
      setCities((data.target_cities ?? []).join(", "));
      setConfigLoaded(true);
    } catch (err: any) {
      toast.error(`Config laden mislukt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    // Save API key to localStorage
    localStorage.setItem(API_KEY_KEY, apiKey);

    // Save local settings (rate limits, approval)
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(localSettings));

    if (!apiKey) {
      toast.error("Voer eerst een API key in");
      return;
    }

    // Convert branches to search query templates
    const branchList = branches
      .split(",")
      .map(b => b.trim())
      .filter(Boolean);
    const cityList = cities
      .split(",")
      .map(c => c.trim())
      .filter(Boolean);

    if (branchList.length === 0 || cityList.length === 0) {
      toast.error("Vul minimaal één branche en één stad in");
      return;
    }

    const searchQueries = branchList.map(
      b => `${b} {city} site:.nl -vergelijk -top -review`
    );

    setSaving(true);
    try {
      const res = await fetch(`${OUTREACH_API}/config/discovery`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          search_queries: searchQueries,
          target_cities: cityList,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${body}`);
      }

      toast.success("Discovery instellingen opgeslagen");
    } catch (err: any) {
      toast.error(`Opslaan mislukt: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const noApiKey = !apiKey && !localStorage.getItem(API_KEY_KEY);

  return (
    <div className="animate-fade-up max-w-[800px]">
      <button
        onClick={() => navigate("/outreach")}
        className="flex items-center gap-1.5 text-xs text-erp-text2 hover:text-erp-text0 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Terug naar Outreach
      </button>

      <PageHeader title="Outreach Instellingen" desc="Configureer discovery, limieten en berichten-goedkeuring">
        <ErpButton primary onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Opslaan..." : "Opslaan"}
        </ErpButton>
      </PageHeader>

      {/* API Key */}
      <ErpCard className="p-5 mb-6">
        <div className="text-[15px] font-semibold mb-4">API Verbinding</div>
        <div>
          <Label className="text-xs text-erp-text2 mb-1 block">Outreach Service API Key</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Voer je API key in..."
            className="bg-erp-bg3 border-erp-border0 text-erp-text0 max-w-md"
          />
          <p className="text-[11px] text-erp-text3 mt-1">
            API endpoint: 204.168.221.107:8100 — X-API-Key header.
            Sla eerst op om de key te bewaren, daarna worden instellingen geladen.
          </p>
        </div>
      </ErpCard>

      {/* No API key warning */}
      {noApiKey && (
        <ErpCard className="p-5 mb-6 border-l-4 border-l-erp-amber">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-erp-amber" />
            <span className="text-[13px] text-erp-text0 font-medium">
              Voer eerst een API key in om discovery instellingen te laden en op te slaan.
            </span>
          </div>
        </ErpCard>
      )}

      {/* Discovery Settings */}
      <ErpCard className="p-5 mb-6">
        <div className="text-[15px] font-semibold mb-4">Discovery instellingen</div>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full bg-erp-bg3" />
            <Skeleton className="h-10 w-full bg-erp-bg3" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-erp-text2 mb-1 block">Branches (komma-gescheiden)</Label>
              <Input
                value={branches}
                onChange={e => setBranches(e.target.value)}
                placeholder="bijv. installatiebedrijf, autogarage, schoonmaakbedrijf, dakdekker bedrijf"
                className="bg-erp-bg3 border-erp-border0 text-erp-text0"
              />
              <p className="text-[11px] text-erp-text3 mt-1">
                Elke branche wordt automatisch omgezet naar een zoekquery: "branche &#123;city&#125; site:.nl ..."
              </p>
            </div>
            <div>
              <Label className="text-xs text-erp-text2 mb-1 block">Steden (komma-gescheiden)</Label>
              <Input
                value={cities}
                onChange={e => setCities(e.target.value)}
                placeholder="bijv. Eindhoven, Tilburg, Den Bosch, Breda"
                className="bg-erp-bg3 border-erp-border0 text-erp-text0"
              />
            </div>
            {configLoaded && (
              <p className="text-[11px] text-erp-green">Instellingen geladen vanuit de outreach service</p>
            )}
          </div>
        )}
      </ErpCard>

      {/* Rate Limits */}
      <ErpCard className="p-5 mb-6">
        <div className="text-[15px] font-semibold mb-4">Dagelijkse limieten</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-erp-text2 mb-1 block">Max connectieverzoeken per dag</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={localSettings.maxConnectionsPerDay}
              onChange={e => setLocalSettings(s => ({ ...s, maxConnectionsPerDay: Number(e.target.value) }))}
              className="bg-erp-bg3 border-erp-border0 text-erp-text0 w-32"
            />
          </div>
          <div>
            <Label className="text-xs text-erp-text2 mb-1 block">Max DM's per dag</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={localSettings.maxDmsPerDay}
              onChange={e => setLocalSettings(s => ({ ...s, maxDmsPerDay: Number(e.target.value) }))}
              className="bg-erp-bg3 border-erp-border0 text-erp-text0 w-32"
            />
          </div>
        </div>
        <p className="text-[11px] text-erp-text3 mt-2">
          LinkedIn raadt max 20-25 connectieverzoeken en 50 berichten per dag aan om restricties te voorkomen.
        </p>
      </ErpCard>

      {/* Approval Flow */}
      <ErpCard className="p-5 mb-6">
        <div className="text-[15px] font-semibold mb-4">Berichten goedkeuring</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] text-erp-text0 font-medium">Berichten eerst goedkeuren</div>
            <p className="text-[11px] text-erp-text3 mt-0.5">
              Als dit aan staat, worden AI-gegenereerde berichten niet automatisch verzonden
              maar eerst ter goedkeuring in het ERP getoond.
            </p>
          </div>
          <Switch
            checked={localSettings.requireApproval}
            onCheckedChange={v => setLocalSettings(s => ({ ...s, requireApproval: v }))}
          />
        </div>
      </ErpCard>
    </div>
  );
}
