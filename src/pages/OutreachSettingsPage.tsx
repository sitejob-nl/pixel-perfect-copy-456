import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ErpCard, ErpButton, PageHeader } from "@/components/erp/ErpPrimitives";
import { ArrowLeft, Save, Loader2, AlertTriangle, X, Plus } from "lucide-react";
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

// ── Tag Input Component ──

function TagInput({ tags, onChange, placeholder }: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" staat er al in`);
      return;
    }
    onChange([...tags, trimmed]);
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text.includes(",")) {
      e.preventDefault();
      const items = text.split(",").map(s => s.trim()).filter(Boolean);
      const unique = items.filter(item => !tags.some(t => t.toLowerCase() === item.toLowerCase()));
      onChange([...tags, ...unique]);
      setInput("");
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex flex-wrap gap-1.5 p-2.5 bg-erp-bg3 border border-erp-border0 rounded-lg min-h-[44px] cursor-text transition-colors focus-within:border-erp-border2"
    >
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-erp-bg4 border border-erp-border1 rounded-md text-[12px] text-erp-text0 font-medium group"
        >
          {tag}
          <button
            onClick={e => { e.stopPropagation(); removeTag(i); }}
            className="text-erp-text3 hover:text-erp-red transition-colors ml-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? placeholder : "Typ en druk Enter..."}
        className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-[12px] text-erp-text0 placeholder:text-erp-text3 py-1"
      />
    </div>
  );
}

// ── Main Page ──

export default function OutreachSettingsPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_KEY) ?? "");
  const [branches, setBranches] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [localSettings, setLocalSettings] = useState<LocalSettings>(loadLocalSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

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

      const branchNames = (data.search_queries ?? []).map((q: string) =>
        q.split("{city}")[0].trim().replace(/\s+site:\.nl.*$/, "")
      );
      setBranches(branchNames);
      setCities(data.target_cities ?? []);
      setConfigLoaded(true);
    } catch (err: any) {
      toast.error(`Config laden mislukt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    localStorage.setItem(API_KEY_KEY, apiKey);
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(localSettings));

    if (!apiKey) {
      toast.error("Voer eerst een API key in");
      return;
    }

    if (branches.length === 0 || cities.length === 0) {
      toast.error("Voeg minimaal één branche en één stad toe");
      return;
    }

    const searchQueries = branches.map(
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
          target_cities: cities,
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
      <ErpCard className="p-5 mb-5">
        <div className="text-[15px] font-semibold mb-3">API Verbinding</div>
        <div>
          <Label className="text-xs text-erp-text2 mb-1.5 block">Outreach Service API Key</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Voer je API key in..."
              className="bg-erp-bg3 border-erp-border0 text-erp-text0 max-w-sm"
            />
            {apiKey && !configLoaded && !loading && (
              <ErpButton onClick={() => { localStorage.setItem(API_KEY_KEY, apiKey); loadConfig(apiKey); }}>
                Verbinden
              </ErpButton>
            )}
          </div>
          <p className="text-[11px] text-erp-text3 mt-1.5">
            Verbindt met de outreach service op 204.168.221.107:8100
          </p>
        </div>
      </ErpCard>

      {/* No API key warning */}
      {noApiKey && (
        <ErpCard className="p-4 mb-5 border-l-4 border-l-erp-amber">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-erp-amber flex-shrink-0" />
            <span className="text-[13px] text-erp-text0 font-medium">
              Voer eerst een API key in om discovery instellingen te laden en op te slaan.
            </span>
          </div>
        </ErpCard>
      )}

      {/* Discovery Settings */}
      <ErpCard className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[15px] font-semibold">Discovery — Branches</div>
            <p className="text-[11px] text-erp-text3 mt-0.5">
              Welke branches moet de agent zoeken? Typ een branche en druk Enter. Je kunt ook plakken met komma's.
            </p>
          </div>
          <span className="text-[11px] text-erp-text3 bg-erp-bg3 px-2 py-1 rounded-md">
            {branches.length} {branches.length === 1 ? "branche" : "branches"}
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-[44px] w-full bg-erp-bg3" />
        ) : (
          <TagInput
            tags={branches}
            onChange={setBranches}
            placeholder="bijv. installatiebedrijf, autogarage, schoonmaakbedrijf..."
          />
        )}
      </ErpCard>

      <ErpCard className="p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[15px] font-semibold">Discovery — Steden</div>
            <p className="text-[11px] text-erp-text3 mt-0.5">
              In welke steden moet de agent zoeken? Typ een stad en druk Enter.
            </p>
          </div>
          <span className="text-[11px] text-erp-text3 bg-erp-bg3 px-2 py-1 rounded-md">
            {cities.length} {cities.length === 1 ? "stad" : "steden"}
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-[44px] w-full bg-erp-bg3" />
        ) : (
          <TagInput
            tags={cities}
            onChange={setCities}
            placeholder="bijv. Eindhoven, Tilburg, Den Bosch, Breda..."
          />
        )}
        {configLoaded && (
          <p className="text-[11px] text-erp-green mt-3 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-erp-green inline-block" />
            Geladen vanuit de outreach service
          </p>
        )}
      </ErpCard>

      {/* Rate Limits */}
      <ErpCard className="p-5 mb-5">
        <div className="text-[15px] font-semibold mb-4">Dagelijkse limieten</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-erp-text2 mb-1.5 block">Max connectieverzoeken per dag</Label>
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
            <Label className="text-xs text-erp-text2 mb-1.5 block">Max DM's per dag</Label>
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
          LinkedIn adviseert max 20-25 connectieverzoeken en 50 berichten per dag.
        </p>
      </ErpCard>

      {/* Approval Flow */}
      <ErpCard className="p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold">Berichten goedkeuring</div>
            <p className="text-[11px] text-erp-text3 mt-0.5">
              AI-gegenereerde berichten worden niet automatisch verzonden maar eerst ter goedkeuring getoond.
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
