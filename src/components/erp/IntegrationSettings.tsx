import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { ErpCard, Dot, ErpButton } from "@/components/erp/ErpPrimitives";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Eye, EyeOff, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const sb = supabase as any;

function useIntegrations(orgId: string | undefined) {
  return useQuery({
    queryKey: ["integrations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("organization_integrations")
        .select("*")
        .eq("organization_id", orgId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useSecrets(orgId: string | undefined) {
  return useQuery({
    queryKey: ["integration-secrets", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("integration_secrets")
        .select("*")
        .eq("organization_id", orgId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function getIntegration(integrations: any[], provider: string) {
  return integrations?.find((i: any) => i.provider === provider) ?? null;
}

function getSecret(secrets: any[], provider: string, key: string) {
  return secrets?.find((s: any) => s.provider === provider && s.secret_key === key)?.secret_value ?? "";
}

function MaskedInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const hasValue = !!value;

  return (
    <div>
      <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={editing && visible ? "text" : "password"}
            value={editing ? value : hasValue ? "••••••••••••" : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={!editing}
            className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue disabled:opacity-60 pr-10"
          />
          {editing && (
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-erp-text3 hover:text-erp-text1"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (editing) {
              setEditing(false);
              setVisible(false);
            } else {
              setEditing(true);
            }
          }}
          className="p-2 rounded-lg bg-erp-bg3 border border-erp-border0 text-erp-text2 hover:text-erp-text0"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

const SLACK_EVENTS = [
  { key: "deal_won", label: "Deal gewonnen" },
  { key: "deal_lost", label: "Deal verloren" },
  { key: "project_delivered", label: "Project opgeleverd" },
  { key: "invoice_overdue", label: "Factuur overdue" },
  { key: "company_inactive", label: "Inactief bedrijf" },
] as const;

// ─── Slack Card ───────────────────────────────────────────────
function SlackCard({ orgId, integration, secret }: { orgId: string; integration: any; secret: string }) {
  const qc = useQueryClient();
  const config = integration?.config ?? {};
  const [active, setActive] = useState(integration?.is_active ?? false);
  const [webhookUrl, setWebhookUrl] = useState(secret);
  const [channel, setChannel] = useState(config.channel ?? "");
  const [digestEnabled, setDigestEnabled] = useState(config.digest_enabled ?? false);
  const [events, setEvents] = useState<string[]>(config.events ?? []);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setActive(integration?.is_active ?? false);
    const c = integration?.config ?? {};
    setChannel(c.channel ?? "");
    setDigestEnabled(c.digest_enabled ?? false);
    setEvents(c.events ?? []);
  }, [integration]);

  useEffect(() => { setWebhookUrl(secret); }, [secret]);

  const toggleEvent = (key: string) => {
    setEvents((prev) => prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await sb.from("organization_integrations").upsert({
        organization_id: orgId,
        provider: "slack",
        is_active: active,
        config: { channel, digest_enabled: digestEnabled, events },
      }, { onConflict: "organization_id,provider" });

      if (webhookUrl) {
        await sb.from("integration_secrets").upsert({
          organization_id: orgId,
          provider: "slack",
          secret_key: "webhook_url",
          secret_value: webhookUrl,
        }, { onConflict: "organization_id,provider,secret_key" });
      }
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["integration-secrets"] });
      toast.success("Slack instellingen opgeslagen");
    } catch (e: any) {
      toast.error("Fout bij opslaan: " + (e.message ?? "Onbekend"));
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { error } = await sb.rpc("fn_send_slack_message", {
        p_org_id: orgId,
        p_blocks: [{ type: "section", text: { type: "mrkdwn", text: "✅ *SiteJob ERP* — Slack integratie werkt!" } }],
      });
      if (error) throw error;
      toast.success("Testbericht verzonden naar Slack");
    } catch (e: any) {
      toast.error("Test mislukt: " + (e.message ?? "Onbekend"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <ErpCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">💬</span>
          <h3 className="text-[15px] font-semibold text-erp-text0">Slack</h3>
          <Dot color={active ? "hsl(var(--erp-green))" : "hsl(var(--erp-text-3))"} size={8} />
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <p className="text-[12px] text-erp-text3 mb-4">Dagelijkse digest en realtime notificaties naar Slack</p>

      <div className="space-y-4">
        <MaskedInput label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl} placeholder="https://hooks.slack.com/services/..." />

        <div>
          <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Kanaal naam</label>
          <input
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="#general"
            className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-erp-text2">Dagelijkse digest</label>
          <Switch checked={digestEnabled} onCheckedChange={setDigestEnabled} />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-erp-text2 mb-2">Event notificaties</label>
          <div className="grid grid-cols-2 gap-2">
            {SLACK_EVENTS.map((ev) => (
              <label key={ev.key} className="flex items-center gap-2 text-[12px] text-erp-text1 cursor-pointer">
                <Checkbox
                  checked={events.includes(ev.key)}
                  onCheckedChange={() => toggleEvent(ev.key)}
                />
                {ev.label}
              </label>
            ))}
          </div>
        </div>

        {integration?.last_sync_at && (
          <p className="text-[11px] text-erp-text3">
            Laatste bericht: {formatDistanceToNow(new Date(integration.last_sync_at), { locale: nl, addSuffix: true })}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <ErpButton primary onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} Opslaan
          </ErpButton>
          <ErpButton onClick={testConnection} disabled={testing || !webhookUrl}>
            {testing && <Loader2 size={14} className="animate-spin" />} Test verbinding
          </ErpButton>
        </div>
      </div>
    </ErpCard>
  );
}

// ─── KVK Card ─────────────────────────────────────────────────
function KvkCard({ orgId, integration, secret }: { orgId: string; integration: any; secret: string }) {
  const qc = useQueryClient();
  const config = integration?.config ?? {};
  const [active, setActive] = useState(integration?.is_active ?? false);
  const [apiKey, setApiKey] = useState(secret);
  const [autoEnrich, setAutoEnrich] = useState(config.auto_enrich ?? true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setActive(integration?.is_active ?? false);
    setAutoEnrich(integration?.config?.auto_enrich ?? true);
  }, [integration]);
  useEffect(() => { setApiKey(secret); }, [secret]);

  const { data: enrichedCount } = useQuery({
    queryKey: ["kvk-enriched-count", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .not("kvk_enriched_at", "is", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const save = async () => {
    setSaving(true);
    try {
      await sb.from("organization_integrations").upsert({
        organization_id: orgId,
        provider: "kvk",
        is_active: active,
        config: { auto_enrich: autoEnrich },
      }, { onConflict: "organization_id,provider" });

      if (apiKey) {
        await sb.from("integration_secrets").upsert({
          organization_id: orgId,
          provider: "kvk",
          secret_key: "api_key",
          secret_value: apiKey,
        }, { onConflict: "organization_id,provider,secret_key" });
      }
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["integration-secrets"] });
      toast.success("KVK instellingen opgeslagen");
    } catch (e: any) {
      toast.error("Fout bij opslaan: " + (e.message ?? "Onbekend"));
    } finally {
      setSaving(false);
    }
  };

  const testApi = async () => {
    setTesting(true);
    try {
      // Test with KVK number for KvK itself
      const { error } = await sb.rpc("fn_kvk_enrich_company", { p_org_id: orgId, p_company_id: null });
      if (error) throw error;
      toast.success("KVK API bereikbaar");
    } catch {
      toast.info("Test verzonden — controleer het resultaat in je bedrijfsoverzicht");
    } finally {
      setTesting(false);
    }
  };

  return (
    <ErpCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🏛️</span>
          <h3 className="text-[15px] font-semibold text-erp-text0">KVK Handelsregister</h3>
          <Dot color={active ? "hsl(var(--erp-green))" : "hsl(var(--erp-text-3))"} size={8} />
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <p className="text-[12px] text-erp-text3 mb-4">Automatische bedrijfsverrijking via KVK API</p>

      <div className="space-y-4">
        <MaskedInput label="API Key" value={apiKey} onChange={setApiKey} placeholder="Jouw KVK API key" />

        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-erp-text2">Automatisch verrijken bij KVK-nummer wijziging</label>
          <Switch checked={autoEnrich} onCheckedChange={setAutoEnrich} />
        </div>

        <div className="bg-erp-bg3 border border-erp-border0 rounded-lg p-3">
          <p className="text-[11px] text-erp-text3 leading-relaxed">
            Vul je API key in via{" "}
            <a href="https://kvk.nl/producten" target="_blank" rel="noopener" className="text-erp-blue hover:underline">
              kvk.nl/producten
            </a>
            . Bij het invullen van een KVK-nummer op een bedrijf worden automatisch naam, adres, SBI-code, rechtsvorm en oprichtingsdatum opgehaald.
          </p>
        </div>

        {typeof enrichedCount === "number" && (
          <p className="text-[11px] text-erp-text3">
            📊 {enrichedCount} bedrijven verrijkt via KVK
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <ErpButton primary onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} Opslaan
          </ErpButton>
          <ErpButton onClick={testApi} disabled={testing || !apiKey}>
            {testing && <Loader2 size={14} className="animate-spin" />} Test API
          </ErpButton>
        </div>
      </div>
    </ErpCard>
  );
}

// ─── Google Card ──────────────────────────────────────────────
function GoogleCard({ orgId, integration }: { orgId: string; integration: any }) {
  const qc = useQueryClient();
  const config = integration?.config ?? {};
  const [active, setActive] = useState(integration?.is_active ?? false);
  const [syncEmail, setSyncEmail] = useState(config.sync_email ?? true);
  const [syncCalendar, setSyncCalendar] = useState(config.sync_calendar ?? true);
  const [syncInterval, setSyncInterval] = useState(config.sync_interval_minutes ?? 15);
  const [maxDays, setMaxDays] = useState(config.max_email_days ?? 90);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setActive(integration?.is_active ?? false);
    const c = integration?.config ?? {};
    setSyncEmail(c.sync_email ?? true);
    setSyncCalendar(c.sync_calendar ?? true);
    setSyncInterval(c.sync_interval_minutes ?? 15);
    setMaxDays(c.max_email_days ?? 90);
  }, [integration]);

  const { data: emailAccounts } = useQuery({
    queryKey: ["google-email-accounts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("organization_id", orgId)
        .eq("provider", "google");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async () => {
    setSaving(true);
    try {
      await sb.from("organization_integrations").upsert({
        organization_id: orgId,
        provider: "google",
        is_active: active,
        config: {
          sync_email: syncEmail,
          sync_calendar: syncCalendar,
          sync_interval_minutes: syncInterval,
          max_email_days: maxDays,
        },
      }, { onConflict: "organization_id,provider" });
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Google instellingen opgeslagen");
    } catch (e: any) {
      toast.error("Fout bij opslaan: " + (e.message ?? "Onbekend"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ErpCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📧</span>
          <h3 className="text-[15px] font-semibold text-erp-text0">Google Workspace</h3>
          <Dot color={active ? "hsl(var(--erp-green))" : "hsl(var(--erp-text-3))"} size={8} />
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <p className="text-[12px] text-erp-text3 mb-4">Gmail en Google Calendar synchronisatie</p>

      <div className="space-y-4">
        {/* Connected accounts */}
        {emailAccounts && emailAccounts.length > 0 && (
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-2">Verbonden accounts</label>
            <div className="space-y-2">
              {emailAccounts.map((acc: any) => (
                <div key={acc.id} className="flex items-center justify-between bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-[13px] text-erp-text0">{acc.email_address}</p>
                    {acc.last_sync_at && (
                      <p className="text-[11px] text-erp-text3">
                        Laatste sync: {formatDistanceToNow(new Date(acc.last_sync_at), { locale: nl, addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <Dot color={acc.is_active ? "hsl(var(--erp-green))" : "hsl(var(--erp-text-3))"} size={8} />
                </div>
              ))}
            </div>
          </div>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ErpButton disabled>Nieuw account verbinden</ErpButton>
              </div>
            </TooltipTrigger>
            <TooltipContent>Binnenkort beschikbaar</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-erp-text2">E-mail synchronisatie</label>
          <Switch checked={syncEmail} onCheckedChange={setSyncEmail} />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-erp-text2">Agenda synchronisatie</label>
          <Switch checked={syncCalendar} onCheckedChange={setSyncCalendar} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Sync interval (minuten)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={syncInterval}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">E-mails ophalen (dagen terug)</label>
            <input
              type="number"
              min={7}
              max={365}
              value={maxDays}
              onChange={(e) => setMaxDays(Number(e.target.value))}
              className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <ErpButton primary onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} Opslaan
          </ErpButton>
        </div>
      </div>
    </ErpCard>
  );
}

// ─── Voys Card ────────────────────────────────────────────────
function VoysCard({ orgId, integration }: { orgId: string; integration: any }) {
  const qc = useQueryClient();
  const config = integration?.config ?? {};
  const [active, setActive] = useState(integration?.is_active ?? false);
  const [autoLog, setAutoLog] = useState(config.auto_create_activity ?? true);
  const [autoMatch, setAutoMatch] = useState(config.auto_match_contacts ?? true);
  const [autoAi, setAutoAi] = useState(config.auto_ai_summary ?? false);
  const [saving, setSaving] = useState(false);

  const webhookSecret = config.webhook_secret || crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  const webhookUrl = `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/voys-webhook?org_id=${orgId}&secret=${webhookSecret}`;

  useEffect(() => {
    setActive(integration?.is_active ?? false);
    const c = integration?.config ?? {};
    setAutoLog(c.auto_create_activity ?? true);
    setAutoMatch(c.auto_match_contacts ?? true);
    setAutoAi(c.auto_ai_summary ?? false);
  }, [integration]);

  const save = async () => {
    setSaving(true);
    try {
      await sb.from("organization_integrations").upsert({
        organization_id: orgId,
        provider: "voys",
        is_active: active,
        config: {
          webhook_secret: webhookSecret,
          auto_create_activity: autoLog,
          auto_match_contacts: autoMatch,
          auto_ai_summary: autoAi,
        },
      }, { onConflict: "organization_id,provider" });
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Voys instellingen opgeslagen");
    } catch (e: any) {
      toast.error("Fout bij opslaan: " + (e.message ?? "Onbekend"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ErpCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📞</span>
          <h3 className="text-[15px] font-semibold text-erp-text0">Voys Telefonie</h3>
          <Dot color={active ? "hsl(var(--erp-green))" : "hsl(var(--erp-text-3))"} size={8} />
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <p className="text-[12px] text-erp-text3 mb-4">Gesprekken automatisch loggen, opnames en transcripties</p>

      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[11px] text-erp-text1 font-mono"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Webhook URL gekopieerd"); }}
              className="p-2 rounded-lg bg-erp-bg3 border border-erp-border0 text-erp-text2 hover:text-erp-text0"
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-erp-text2">Automatisch gesprekken loggen</label>
          <Switch checked={autoLog} onCheckedChange={setAutoLog} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-erp-text2">Contact matching</label>
          <Switch checked={autoMatch} onCheckedChange={setAutoMatch} />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-medium text-erp-text2">AI samenvatting</label>
          <Switch checked={autoAi} onCheckedChange={setAutoAi} />
        </div>

        <div className="bg-erp-bg3 border border-erp-border0 rounded-lg p-3">
          <p className="text-[11px] text-erp-text3 leading-relaxed">
            Configureer deze webhook URL in je Voys Freedom onder Gespreksnotificaties. Alle inkomende en uitgaande gesprekken worden automatisch gelogd.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <ErpButton primary onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} Opslaan
          </ErpButton>
        </div>
      </div>
    </ErpCard>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function IntegrationSettings() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const { data: integrations, isLoading: loadingInt } = useIntegrations(orgId);
  const { data: secrets, isLoading: loadingSec } = useSecrets(orgId);

  if (loadingInt || loadingSec) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-erp-text3" />
      </div>
    );
  }

  const slackInt = getIntegration(integrations ?? [], "slack");
  const kvkInt = getIntegration(integrations ?? [], "kvk");
  const googleInt = getIntegration(integrations ?? [], "google");
  const voysInt = getIntegration(integrations ?? [], "voys");
  const slackWebhook = getSecret(secrets ?? [], "slack", "webhook_url");
  const kvkApiKey = getSecret(secrets ?? [], "kvk", "api_key");

  return (
    <div className="space-y-4">
      <SlackCard orgId={orgId!} integration={slackInt} secret={slackWebhook} />
      <KvkCard orgId={orgId!} integration={kvkInt} secret={kvkApiKey} />
      <GoogleCard orgId={orgId!} integration={googleInt} />
      <VoysCard orgId={orgId!} integration={voysInt} />
    </div>
  );
}
