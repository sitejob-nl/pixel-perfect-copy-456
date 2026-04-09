import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ErpCard, ErpButton, PageHeader } from "@/components/erp/ErpPrimitives";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "outreach_settings";
const API_KEY_KEY = "outreach_api_key";

interface OutreachSettings {
  branches: string;
  cities: string;
  maxConnectionsPerDay: number;
  maxDmsPerDay: number;
  requireApproval: boolean;
}

const defaults: OutreachSettings = {
  branches: "",
  cities: "",
  maxConnectionsPerDay: 20,
  maxDmsPerDay: 40,
  requireApproval: true,
};

function loadSettings(): OutreachSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return defaults; }
}

export default function OutreachSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<OutreachSettings>(loadSettings);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_KEY) ?? "");

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(API_KEY_KEY, apiKey);
    toast.success("Instellingen opgeslagen");
  };

  return (
    <div className="animate-fade-up max-w-[800px]">
      <button
        onClick={() => navigate("/outreach")}
        className="flex items-center gap-1.5 text-xs text-erp-text2 hover:text-erp-text0 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Terug naar Outreach
      </button>

      <PageHeader title="Outreach Instellingen" desc="Configureer discovery, limieten en berichten-goedkeuring">
        <ErpButton primary onClick={handleSave}>
          <Save className="w-4 h-4" /> Opslaan
        </ErpButton>
      </PageHeader>

      {/* API Key */}
      <ErpCard className="p-5 mb-6">
        <div className="text-[15px] font-semibold mb-4">API Verbinding</div>
        <div className="space-y-3">
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
              API endpoint: 204.168.221.107:8100 — X-API-Key header
            </p>
          </div>
        </div>
      </ErpCard>

      {/* Discovery Settings */}
      <ErpCard className="p-5 mb-6">
        <div className="text-[15px] font-semibold mb-4">Discovery instellingen</div>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-erp-text2 mb-1 block">Branches (komma-gescheiden)</Label>
            <Input
              value={settings.branches}
              onChange={e => setSettings(s => ({ ...s, branches: e.target.value }))}
              placeholder="bijv. Keukens, Installatie, Bouw, Horeca"
              className="bg-erp-bg3 border-erp-border0 text-erp-text0"
            />
            <p className="text-[11px] text-erp-text3 mt-1">
              Welke branches moet de discovery zoeken op Google Maps / LinkedIn
            </p>
          </div>
          <div>
            <Label className="text-xs text-erp-text2 mb-1 block">Steden (komma-gescheiden)</Label>
            <Input
              value={settings.cities}
              onChange={e => setSettings(s => ({ ...s, cities: e.target.value }))}
              placeholder="bijv. Eindhoven, Tilburg, Den Bosch, Breda"
              className="bg-erp-bg3 border-erp-border0 text-erp-text0"
            />
          </div>
        </div>
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
              value={settings.maxConnectionsPerDay}
              onChange={e => setSettings(s => ({ ...s, maxConnectionsPerDay: Number(e.target.value) }))}
              className="bg-erp-bg3 border-erp-border0 text-erp-text0 w-32"
            />
          </div>
          <div>
            <Label className="text-xs text-erp-text2 mb-1 block">Max DM's per dag</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={settings.maxDmsPerDay}
              onChange={e => setSettings(s => ({ ...s, maxDmsPerDay: Number(e.target.value) }))}
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
            checked={settings.requireApproval}
            onCheckedChange={v => setSettings(s => ({ ...s, requireApproval: v }))}
          />
        </div>
      </ErpCard>
    </div>
  );
}
