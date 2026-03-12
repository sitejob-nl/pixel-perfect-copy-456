import { useState } from "react";
import { cn } from "@/lib/utils";
import { useEmailTemplates, useCreateEmailTemplate, useDeleteEmailTemplate, useDuplicateTemplate, useUpdateEmailTemplate, useEmailSends, useEmailStats, useSendEmail } from "@/hooks/useEmailTemplates";
import EmailBuilder from "@/components/email/EmailBuilder";
import { getDefaultDesign, generateHtml, type DesignJson } from "@/components/email/generateHtml";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

type Tab = "templates" | "versturen" | "verzonden";

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {!showBuilder ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[22px] font-bold text-erp-text0">Email</h1>
              <p className="text-[13px] text-erp-text3 mt-0.5">Templates beheren, e-mails versturen en prestaties bekijken</p>
            </div>
          </div>

          <div className="flex gap-1 bg-erp-bg2 p-1 rounded-xl border border-erp-border0 mb-5 w-fit">
            {([["templates", "📝 Templates"], ["versturen", "📤 Versturen"], ["verzonden", "📊 Verzonden"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-medium transition-all",
                tab === k ? "bg-erp-bg3 text-erp-text0 shadow-sm border border-erp-border0" : "text-erp-text3 hover:text-erp-text1"
              )}>{l}</button>
            ))}
          </div>

          {tab === "templates" && <TemplatesTab onEdit={(id) => { setEditingTemplateId(id); setShowBuilder(true); }} onNew={() => { setEditingTemplateId(null); setShowBuilder(true); }} />}
          {tab === "versturen" && <SendTab />}
          {tab === "verzonden" && <SentTab />}
        </>
      ) : (
        <BuilderView templateId={editingTemplateId} onClose={() => setShowBuilder(false)} />
      )}
    </div>
  );
}

// ─── Templates Tab ───
function TemplatesTab({ onEdit, onNew }: { onEdit: (id: string) => void; onNew: () => void }) {
  const { data: templates, isLoading } = useEmailTemplates();
  const deleteMut = useDeleteEmailTemplate();
  const dupMut = useDuplicateTemplate();

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={onNew} className="px-4 py-2 rounded-lg bg-erp-blue text-white text-[13px] font-medium hover:bg-erp-blue/90">+ Nieuw template</button>
      </div>
      {isLoading ? <div className="text-erp-text3 text-[13px]">Laden...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates || []).map(t => (
            <div key={t.id} className="bg-erp-bg3 rounded-xl border border-erp-border0 p-4 hover:border-erp-blue/30 transition-all group">
              {/* Preview */}
              <div className="h-32 bg-erp-bg2 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                {t.thumbnail_url ? <img src={t.thumbnail_url} alt="" className="w-full h-full object-cover" /> : (
                  <div className="text-erp-text3 text-[40px]">✉️</div>
                )}
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[14px] font-semibold text-erp-text0">{t.name}</div>
                  <div className="text-[11px] text-erp-text3 mt-0.5">{t.subject}</div>
                  {t.category && <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-erp-bg4 text-erp-text2 rounded-full">{t.category}</span>}
                </div>
              </div>
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(t.id)} className="flex-1 py-1.5 rounded-lg bg-erp-bg2 border border-erp-border0 text-[11px] text-erp-text1 hover:bg-erp-hover">Bewerken</button>
                <button onClick={() => dupMut.mutate(t.id)} className="py-1.5 px-2 rounded-lg bg-erp-bg2 border border-erp-border0 text-[11px] text-erp-text2 hover:bg-erp-hover">📋</button>
                <button onClick={() => { if (confirm("Template verwijderen?")) deleteMut.mutate(t.id); }} className="py-1.5 px-2 rounded-lg bg-erp-bg2 border border-erp-border0 text-[11px] text-red-400 hover:bg-erp-hover">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && (templates || []).length === 0 && (
        <div className="text-center py-16">
          <div className="text-[40px] mb-3">✉️</div>
          <div className="text-[14px] text-erp-text2 mb-1">Geen templates</div>
          <div className="text-[12px] text-erp-text3 mb-4">Maak je eerste email template</div>
          <button onClick={onNew} className="px-4 py-2 rounded-lg bg-erp-blue text-white text-[13px] font-medium">+ Nieuw template</button>
        </div>
      )}
    </div>
  );
}

// ─── Builder View ───
function BuilderView({ templateId, onClose }: { templateId: string | null; onClose: () => void }) {
  const { data: templates } = useEmailTemplates();
  const createMut = useCreateEmailTemplate();
  const updateMut = useUpdateEmailTemplate();

  const template = templateId ? templates?.find(t => t.id === templateId) : null;
  const initialDesign = template?.design_json ? (template.design_json as unknown as DesignJson) : null;

  const [name, setName] = useState(template?.name || "Nieuw template");
  const [subject, setSubject] = useState(template?.subject || "");

  const handleSave = (design: DesignJson, html: string) => {
    if (templateId) {
      updateMut.mutate({ id: templateId, name, subject, design_json: design as unknown as Json, html_content: html });
    } else {
      createMut.mutate({ name, subject, design_json: design as unknown as Json, html_content: html }, {
        onSuccess: () => onClose(),
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={onClose} className="text-erp-text3 hover:text-erp-text0 text-[13px]">← Terug</button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-[16px] font-semibold text-erp-text0 bg-transparent border-none focus:outline-none flex-1"
          placeholder="Template naam"
        />
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="text-[13px] text-erp-text1 bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-erp-blue"
          placeholder="Onderwerp"
        />
      </div>
      <div className="flex-1 min-h-0">
        <EmailBuilder
          initialDesign={initialDesign}
          onSave={handleSave}
          saving={createMut.isPending || updateMut.isPending}
        />
      </div>
    </div>
  );
}

// ─── Send Tab ───
function SendTab() {
  const { data: templates } = useEmailTemplates();
  const sendMut = useSendEmail();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [from, setFrom] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const selectedTemplate = templates?.find(t => t.id === templateId);

  const handleSelectTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates?.find(t => t.id === id);
    if (t) {
      setSubject(t.subject);
      setHtmlContent(t.html_content);
    }
  };

  const handleSend = () => {
    if (!to || !subject) { toast.error("Vul ontvanger en onderwerp in"); return; }
    const content = htmlContent || `<p>${subject}</p>`;
    sendMut.mutate({
      action: "send",
      to, subject, html_content: content,
      from: from || undefined,
      template_id: templateId || undefined,
      scheduled_for: scheduleEnabled && scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
    }, {
      onSuccess: () => { toast.success("E-mail verzonden!"); setTo(""); setSubject(""); setHtmlContent(""); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleSendTest = () => {
    if (!subject) { toast.error("Vul onderwerp in"); return; }
    sendMut.mutate({
      action: "send-test",
      subject, html_content: htmlContent || `<p>${subject}</p>`,
      from: from || undefined,
    }, {
      onSuccess: () => toast.success("Testmail verzonden naar je eigen e-mail"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5 space-y-4">
        <div>
          <label className="block text-[12px] font-medium text-erp-text2 mb-1">Aan</label>
          <input type="email" value={to} onChange={e => setTo(e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue" placeholder="naam@voorbeeld.nl" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-erp-text2 mb-1">Template (optioneel)</label>
          <select value={templateId} onChange={e => handleSelectTemplate(e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0">
            <option value="">— Geen template —</option>
            {(templates || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-erp-text2 mb-1">Onderwerp</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-erp-text2 mb-1">Van (optioneel)</label>
          <input type="text" value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue" placeholder="naam@jouwdomein.nl" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-erp-text2 mb-1">HTML inhoud</label>
          <textarea value={htmlContent} onChange={e => setHtmlContent(e.target.value)} rows={8} className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[12px] text-erp-text0 font-mono focus:outline-none focus:ring-1 focus:ring-erp-blue resize-none" placeholder="<p>Hoi {{first_name}},</p>" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-[12px] text-erp-text1 cursor-pointer">
            <input type="checkbox" checked={scheduleEnabled} onChange={e => setScheduleEnabled(e.target.checked)} className="rounded" />
            Inplannen
          </label>
          {scheduleEnabled && (
            <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="mt-2 w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0" />
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSendTest} disabled={sendMut.isPending} className="px-4 py-2 rounded-lg bg-erp-bg2 border border-erp-border0 text-[13px] text-erp-text1 hover:bg-erp-hover">Testmail sturen</button>
          <button onClick={handleSend} disabled={sendMut.isPending} className="px-4 py-2 rounded-lg bg-erp-blue text-white text-[13px] font-medium hover:bg-erp-blue/90 disabled:opacity-50">
            {sendMut.isPending ? "Verzenden..." : scheduleEnabled ? "Inplannen" : "Verzenden"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sent Tab ───
function SentTab() {
  const { data: sends, isLoading } = useEmailSends(100);
  const statsMut = useEmailStats();

  const stats = statsMut.data;

  const statusColors: Record<string, string> = {
    queued: "bg-erp-bg4 text-erp-text3",
    sent: "bg-blue-500/10 text-blue-400",
    delivered: "bg-blue-500/10 text-blue-400",
    opened: "bg-green-500/10 text-green-400",
    clicked: "bg-purple-500/10 text-purple-400",
    bounced: "bg-red-500/10 text-red-400",
    failed: "bg-red-500/10 text-red-400",
  };

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-3 mb-5">
        <button onClick={() => statsMut.mutate()} className="text-[11px] text-erp-blue hover:underline mb-2">📊 Stats laden</button>
      </div>
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Verzonden", val: stats.total, color: "text-erp-text0" },
            { label: "Geopend", val: stats.opened, pct: stats.total ? Math.round((stats.opened / stats.total) * 100) : 0, color: "text-green-400" },
            { label: "Geklikt", val: stats.clicked, pct: stats.total ? Math.round((stats.clicked / stats.total) * 100) : 0, color: "text-purple-400" },
            { label: "Bounced", val: stats.bounced, pct: stats.total ? Math.round((stats.bounced / stats.total) * 100) : 0, color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-erp-bg3 rounded-xl border border-erp-border0 p-4">
              <div className="text-[11px] text-erp-text3">{s.label}</div>
              <div className={`text-[20px] font-bold ${s.color}`}>{s.val}{s.pct !== undefined ? <span className="text-[12px] font-normal text-erp-text3 ml-1">({s.pct}%)</span> : null}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? <div className="text-erp-text3 text-[13px]">Laden...</div> : (
        <div className="bg-erp-bg3 rounded-xl border border-erp-border0 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-erp-border0">
                {["Aan", "Onderwerp", "Status", "Type", "Verzonden", "Geopend", "Geklikt"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-erp-text3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sends || []).map(s => (
                <tr key={s.id} className="border-b border-erp-border0 last:border-0 hover:bg-erp-hover">
                  <td className="px-4 py-2.5 text-erp-text0">{s.to_address}</td>
                  <td className="px-4 py-2.5 text-erp-text1 max-w-[200px] truncate">{s.subject}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[s.status] || ""}`}>{s.status}</span></td>
                  <td className="px-4 py-2.5 text-erp-text3">{s.send_type || "—"}</td>
                  <td className="px-4 py-2.5 text-erp-text3">{s.sent_at ? new Date(s.sent_at).toLocaleString("nl") : "—"}</td>
                  <td className="px-4 py-2.5 text-erp-text3">{s.opened_at ? `${new Date(s.opened_at).toLocaleString("nl")}${(s.opened_count || 0) > 1 ? ` (${s.opened_count}×)` : ""}` : "—"}</td>
                  <td className="px-4 py-2.5 text-erp-text3">{s.clicked_at ? `${new Date(s.clicked_at).toLocaleString("nl")}${(s.clicked_count || 0) > 1 ? ` (${s.clicked_count}×)` : ""}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(sends || []).length === 0 && <div className="text-center py-8 text-erp-text3 text-[13px]">Nog geen e-mails verzonden</div>}
        </div>
      )}
    </div>
  );
}
