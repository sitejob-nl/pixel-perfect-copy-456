import { useState } from "react";
import { cn } from "@/lib/utils";
import { useApiKeyStatus } from "@/hooks/useApiKeys";
import {
  useResendWebhooks,
  useResendWebhookMutation,
  useResendTemplates,
  useResendTemplateMutation,
  useResendBroadcasts,
  useResendBroadcastMutation,
  useResendContacts,
  useResendContactMutation,
  useResendDomains,
  useResendDomainMutation,
} from "@/hooks/useResend";
import { Loader2, Plus, Trash2, Send, Copy, Globe, FileText, Radio, ExternalLink, Users, ShieldCheck, CheckCircle } from "lucide-react";

type SubTab = "webhooks" | "templates" | "broadcasts" | "contacts" | "domains";

const WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.complained",
  "email.bounced",
  "email.opened",
  "email.clicked",
];

export default function ResendSettings() {
  const { data: keyStatus } = useApiKeyStatus();
  const [subTab, setSubTab] = useState<SubTab>("webhooks");

  if (!keyStatus?.resend_key_set) {
    return (
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-6 text-center">
        <Globe className="w-10 h-10 mx-auto mb-3 text-erp-text3" />
        <h3 className="text-[15px] font-semibold text-erp-text0 mb-1">Resend API key niet ingesteld</h3>
        <p className="text-[13px] text-erp-text3 mb-4">
          Configureer eerst je Resend API key bij <span className="font-medium text-erp-text1">Instellingen → API Keys</span>.
        </p>
      </div>
    );
  }

  const tabs: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: "webhooks", label: "Webhooks", icon: <Globe className="w-4 h-4" /> },
    { key: "templates", label: "Templates", icon: <FileText className="w-4 h-4" /> },
    { key: "broadcasts", label: "Broadcasts", icon: <Radio className="w-4 h-4" /> },
    { key: "contacts", label: "Contacts", icon: <Users className="w-4 h-4" /> },
    { key: "domains", label: "Domains", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-erp-bg2 p-1 rounded-lg border border-erp-border0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all flex-1 justify-center",
              subTab === t.key
                ? "bg-erp-bg3 text-erp-text0 shadow-sm border border-erp-border0"
                : "text-erp-text3 hover:text-erp-text1"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "webhooks" && <WebhooksPanel />}
      {subTab === "templates" && <TemplatesPanel />}
      {subTab === "broadcasts" && <BroadcastsPanel />}
      {subTab === "contacts" && <ContactsPanel />}
      {subTab === "domains" && <DomainsPanel />}
    </div>
  );
}

// ═══════════════════════════════ WEBHOOKS ═══════════════════════════════
function WebhooksPanel() {
  const { data, isLoading } = useResendWebhooks();
  const mutation = useResendWebhookMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [events, setEvents] = useState<string[]>(["email.sent"]);

  const webhooks = data?.data || [];

  const handleCreate = () => {
    if (!endpoint) return;
    mutation.mutate(
      { action: "create", payload: { endpoint, events } },
      { onSuccess: () => { setShowCreate(false); setEndpoint(""); setEvents(["email.sent"]); } }
    );
  };

  return (
    <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-erp-text0">Webhooks</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nieuw
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-erp-bg2 rounded-lg border border-erp-border0 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1">Endpoint URL</label>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://example.com/webhook"
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">Events</label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 text-[12px] text-erp-text1">
                  <input
                    type="checkbox"
                    checked={events.includes(ev)}
                    onChange={(e) =>
                      setEvents(e.target.checked ? [...events, ev] : events.filter((x) => x !== ev))
                    }
                    className="rounded border-erp-border0"
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-[12px] text-erp-text3 hover:text-erp-text1">Annuleren</button>
            <button onClick={handleCreate} disabled={mutation.isPending} className="px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 disabled:opacity-50">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aanmaken"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-erp-text3" /></div>
      ) : webhooks.length === 0 ? (
        <p className="text-[13px] text-erp-text3 text-center py-6">Geen webhooks gevonden</p>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh: any) => (
            <div key={wh.id} className="flex items-center justify-between p-3 bg-erp-bg2 rounded-lg border border-erp-border0">
              <div>
                <div className="text-[13px] font-medium text-erp-text0 break-all">{wh.endpoint}</div>
                <div className="text-[11px] text-erp-text3 mt-0.5">{(wh.events || []).join(", ")}</div>
              </div>
              <button
                onClick={() => mutation.mutate({ action: "delete", payload: { id: wh.id } })}
                className="p-1.5 text-erp-text3 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════ TEMPLATES ═══════════════════════════════
function TemplatesPanel() {
  const { data, isLoading } = useResendTemplates();
  const mutation = useResendTemplateMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [html, setHtml] = useState("<p>Hallo {{name}}</p>");

  const templates = data?.data || [];

  const handleCreate = () => {
    if (!name) return;
    mutation.mutate(
      { action: "create", payload: { name, html } },
      { onSuccess: () => { setShowCreate(false); setName(""); setHtml("<p>Hallo {{name}}</p>"); } }
    );
  };

  return (
    <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-erp-text0">E-mail Templates</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nieuw
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-erp-bg2 rounded-lg border border-erp-border0 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1">Template naam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="order-confirmation"
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1">HTML Content</label>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={6}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 font-mono focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-[12px] text-erp-text3 hover:text-erp-text1">Annuleren</button>
            <button onClick={handleCreate} disabled={mutation.isPending} className="px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 disabled:opacity-50">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aanmaken"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-erp-text3" /></div>
      ) : templates.length === 0 ? (
        <p className="text-[13px] text-erp-text3 text-center py-6">Geen templates gevonden</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-erp-bg2 rounded-lg border border-erp-border0">
              <div>
                <div className="text-[13px] font-medium text-erp-text0">{t.name}</div>
                <div className="text-[11px] text-erp-text3 mt-0.5">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString("nl-NL") : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => mutation.mutate({ action: "publish", payload: { id: t.id } })}
                  title="Publiceren"
                  className="p-1.5 text-erp-text3 hover:text-erp-blue transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => mutation.mutate({ action: "duplicate", payload: { id: t.id } })}
                  title="Dupliceren"
                  className="p-1.5 text-erp-text3 hover:text-erp-blue transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => mutation.mutate({ action: "delete", payload: { id: t.id } })}
                  className="p-1.5 text-erp-text3 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════ BROADCASTS ═══════════════════════════════
function BroadcastsPanel() {
  const { data, isLoading } = useResendBroadcasts();
  const mutation = useResendBroadcastMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    segmentId: "",
    from: "",
    subject: "",
    html: "",
  });

  const broadcasts = data?.data || [];

  const handleCreate = () => {
    if (!form.from || !form.subject) return;
    mutation.mutate(
      { action: "create", payload: { ...form } },
      { onSuccess: () => { setShowCreate(false); setForm({ segmentId: "", from: "", subject: "", html: "" }); } }
    );
  };

  return (
    <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-erp-text0">Broadcasts</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nieuw
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-erp-bg2 rounded-lg border border-erp-border0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1">Van (from)</label>
              <input
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
                placeholder="Acme <info@acme.com>"
                className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1">Segment ID</label>
              <input
                value={form.segmentId}
                onChange={(e) => setForm({ ...form, segmentId: e.target.value })}
                placeholder="uuid"
                className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1">Onderwerp</label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Nieuwsbrief maart"
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1">HTML Content</label>
            <textarea
              value={form.html}
              onChange={(e) => setForm({ ...form, html: e.target.value })}
              rows={4}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 font-mono focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-[12px] text-erp-text3 hover:text-erp-text1">Annuleren</button>
            <button onClick={handleCreate} disabled={mutation.isPending} className="px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 disabled:opacity-50">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aanmaken"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-erp-text3" /></div>
      ) : broadcasts.length === 0 ? (
        <p className="text-[13px] text-erp-text3 text-center py-6">Geen broadcasts gevonden</p>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between p-3 bg-erp-bg2 rounded-lg border border-erp-border0">
              <div>
                <div className="text-[13px] font-medium text-erp-text0">{b.subject || b.name || b.id}</div>
                <div className="text-[11px] text-erp-text3 mt-0.5">
                  Status: {b.status || "draft"} · {b.created_at ? new Date(b.created_at).toLocaleDateString("nl-NL") : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => mutation.mutate({ action: "send", payload: { id: b.id } })}
                  title="Versturen"
                  className="p-1.5 text-erp-text3 hover:text-green-400 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  onClick={() => mutation.mutate({ action: "delete", payload: { id: b.id } })}
                  className="p-1.5 text-erp-text3 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════ CONTACTS ═══════════════════════════════
function ContactsPanel() {
  const { data, isLoading } = useResendContacts();
  const mutation = useResendContactMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", unsubscribed: false });

  const contacts = data?.data || [];

  const handleCreate = () => {
    if (!form.email) return;
    mutation.mutate(
      { action: "create", payload: { ...form } },
      { onSuccess: () => { setShowCreate(false); setForm({ email: "", firstName: "", lastName: "", unsubscribed: false }); } }
    );
  };

  return (
    <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-erp-text0">Resend Contacts</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nieuw
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-erp-bg2 rounded-lg border border-erp-border0 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1">E-mail</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="naam@voorbeeld.nl"
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1">Voornaam</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-erp-text2 mb-1">Achternaam</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-erp-text1">
            <input
              type="checkbox"
              checked={form.unsubscribed}
              onChange={(e) => setForm({ ...form, unsubscribed: e.target.checked })}
              className="rounded border-erp-border0"
            />
            Uitgeschreven (unsubscribed)
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-[12px] text-erp-text3 hover:text-erp-text1">Annuleren</button>
            <button onClick={handleCreate} disabled={mutation.isPending} className="px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 disabled:opacity-50">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aanmaken"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-erp-text3" /></div>
      ) : contacts.length === 0 ? (
        <p className="text-[13px] text-erp-text3 text-center py-6">Geen contacts gevonden</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-erp-bg2 rounded-lg border border-erp-border0">
              <div>
                <div className="text-[13px] font-medium text-erp-text0">{c.email}</div>
                <div className="text-[11px] text-erp-text3 mt-0.5">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                  {c.unsubscribed && <span className="ml-2 text-red-400">uitgeschreven</span>}
                </div>
              </div>
              <button
                onClick={() => mutation.mutate({ action: "delete", payload: { id: c.id } })}
                className="p-1.5 text-erp-text3 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════ DOMAINS ═══════════════════════════════
function DomainsPanel() {
  const { data, isLoading } = useResendDomains();
  const mutation = useResendDomainMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [domainName, setDomainName] = useState("");

  const domains = data?.data || [];

  const handleCreate = () => {
    if (!domainName) return;
    mutation.mutate(
      { action: "create", payload: { name: domainName } },
      { onSuccess: () => { setShowCreate(false); setDomainName(""); } }
    );
  };

  return (
    <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-erp-text0">Domeinen</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nieuw
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-erp-bg2 rounded-lg border border-erp-border0 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-erp-text2 mb-1">Domeinnaam</label>
            <input
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="voorbeeld.nl"
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-[12px] text-erp-text3 hover:text-erp-text1">Annuleren</button>
            <button onClick={handleCreate} disabled={mutation.isPending} className="px-3 py-1.5 bg-erp-blue text-white rounded-lg text-[12px] font-medium hover:bg-erp-blue/90 disabled:opacity-50">
              {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Toevoegen"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-erp-text3" /></div>
      ) : domains.length === 0 ? (
        <p className="text-[13px] text-erp-text3 text-center py-6">Geen domeinen gevonden</p>
      ) : (
        <div className="space-y-2">
          {domains.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-erp-bg2 rounded-lg border border-erp-border0">
              <div>
                <div className="text-[13px] font-medium text-erp-text0">{d.name}</div>
                <div className="text-[11px] text-erp-text3 mt-0.5 flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                    d.status === "verified" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                  )}>
                    {d.status === "verified" && <CheckCircle className="w-3 h-3" />}
                    {d.status || "pending"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {d.status !== "verified" && (
                  <button
                    onClick={() => mutation.mutate({ action: "verify", payload: { id: d.id } })}
                    title="DNS verificatie starten"
                    className="p-1.5 text-erp-text3 hover:text-erp-blue transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => mutation.mutate({ action: "delete", payload: { id: d.id } })}
                  className="p-1.5 text-erp-text3 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
