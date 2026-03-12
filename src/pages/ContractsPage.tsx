import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PageHeader, ErpButton, ErpTabs, ErpCard, TH, TD, TR, Badge } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import {
  useContracts, useContract, useContractTemplates, useContractVariableSources,
  useCreateContract, useUpdateContract, useCreateSigningSession, useResolveVariables,
  useCreateTemplate, useUpdateTemplate,
} from "@/hooks/useContracts";
import PDFFieldEditor, { type SignatureField } from "@/components/contracts/PDFFieldEditor";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useDeals } from "@/hooks/useDeals";
import { useProjects } from "@/hooks/useProjects";
import { useQuotes } from "@/hooks/useQuotes";
import { useOrgMembers } from "@/hooks/useTeam";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--erp-text-2))",
  sent: "hsl(var(--erp-blue))",
  partially_signed: "hsl(var(--erp-orange))",
  signed: "hsl(var(--erp-green))",
  expired: "hsl(var(--erp-red))",
  cancelled: "hsl(var(--erp-red))",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  partially_signed: "Deels getekend",
  signed: "Getekend",
  expired: "Verlopen",
  cancelled: "Geannuleerd",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy", { locale: nl }); } catch { return "—"; }
}

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "dd-MM-yyyy HH:mm", { locale: nl }); } catch { return "—"; }
}

// ─── Contracts List ────────────────────────────────────────────

function ContractsList({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: contracts, isLoading } = useContracts();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader title="Contracten" desc="Beheer contracten en ondertekeningen">
        <ErpButton primary onClick={() => setShowCreate(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuw contract
        </ErpButton>
      </PageHeader>

      {isLoading ? (
        <div className="text-erp-text3 text-sm py-8 text-center">Laden...</div>
      ) : !contracts?.length ? (
        <EmptyState onAction={() => setShowCreate(true)} />
      ) : (
        <ErpCard>
          <table className="w-full">
            <thead>
              <tr>
                <TH>Nummer</TH>
                <TH>Titel</TH>
                <TH>Klant</TH>
                <TH>Template</TH>
                <TH>Status</TH>
                <TH>Ondertekenaars</TH>
                <TH>Aangemaakt</TH>
                <TH>Vervalt</TH>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c: any) => (
                <TR key={c.id} onClick={() => onSelect(c.id)}>
                  <TD className="font-mono text-erp-text2">{c.contract_number || "—"}</TD>
                  <TD className="font-medium text-erp-text0">{c.title}</TD>
                  <TD>
                    {c.contacts
                      ? `${c.contacts.first_name} ${c.contacts.last_name || ""}`
                      : c.companies?.name || "—"}
                  </TD>
                  <TD className="text-erp-text2">{c.contract_templates?.name || "Geen"}</TD>
                  <TD>
                    <Badge color={STATUS_COLORS[c.status] || STATUS_COLORS.draft}>
                      {STATUS_LABELS[c.status] || c.status}
                    </Badge>
                  </TD>
                  <TD>
                    <SignerIcons sessions={c.contract_signing_sessions || []} />
                  </TD>
                  <TD className="text-erp-text2">{fmtDate(c.created_at)}</TD>
                  <TD className="text-erp-text2">{fmtDate(c.expires_at)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>
      )}

      {showCreate && <CreateContractDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={onSelect} />}
    </>
  );
}

function SignerIcons({ sessions }: { sessions: any[] }) {
  if (!sessions.length) return <span className="text-erp-text3 text-xs">—</span>;
  return (
    <div className="flex gap-1">
      {sessions.map((s: any) => (
        <span
          key={s.id}
          title={`${s.signer_name} (${s.signer_role}) — ${s.status === "signed" ? "Getekend" : "Wacht"}`}
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
            s.status === "signed"
              ? "bg-erp-green/20 text-erp-green"
              : "bg-erp-bg4 text-erp-text3"
          )}
        >
          {s.signer_name?.[0]?.toUpperCase() || "?"}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-erp-bg3 flex items-center justify-center mb-4">
        <Icons.Pen className="w-7 h-7 text-erp-text3" />
      </div>
      <h3 className="text-[15px] font-semibold text-erp-text0 mb-1">Geen contracten</h3>
      <p className="text-[13px] text-erp-text2 mb-4 max-w-sm">
        Maak je eerste contract aan op basis van een template en laat het digitaal ondertekenen.
      </p>
      <ErpButton primary onClick={onAction}>
        <Icons.Plus className="w-4 h-4" /> Nieuw contract
      </ErpButton>
    </div>
  );
}

// ─── Create Contract Dialog (3 steps) ──────────────────────────

function CreateContractDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (id: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [linkedRecords, setLinkedRecords] = useState<Record<string, string>>({});
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [signers, setSigners] = useState<Array<{ name: string; email: string; phone: string; role: string }>>([
    { name: "", email: "", phone: "", role: "Klant" },
  ]);

  const { data: templates } = useContractTemplates();
  const { data: contacts } = useContacts();
  const { data: companies } = useCompanies();
  const { data: members } = useOrgMembers();
  const { data: deals } = useDeals();
  const { data: projects } = useProjects();
  const { data: quotes } = useQuotes();
  const { data: resolvedVars } = useResolveVariables({
    contactId: linkedRecords.contact_id,
    companyId: linkedRecords.company_id,
    dealId: linkedRecords.deal_id,
    projectId: linkedRecords.project_id,
    quoteId: linkedRecords.quote_id,
  });

  const createContract = useCreateContract();
  const createSession = useCreateSigningSession();

  const selectedTemplate = templates?.find((t: any) => t.id === templateId);

  // Extract variables from template
  const templateVars: string[] = useMemo(() => {
    if (!selectedTemplate?.content_html) return [];
    const matches = (selectedTemplate.content_html as string).match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m: string) => m.replace(/\{\{|\}\}/g, "")))] as string[];
  }, [selectedTemplate]);

  // Auto-fill variables from resolved data
  useEffect(() => {
    if (resolvedVars && typeof resolvedVars === "object") {
      setVariableValues((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(resolvedVars)) {
          const varName = key.split(".").pop() || key;
          if (value && !next[varName]) {
            next[varName] = value as string;
          }
        }
        return next;
      });
    }
  }, [resolvedVars]);

  // Auto-fill first signer from linked contact
  useEffect(() => {
    if (linkedRecords.contact_id && contacts) {
      const contact = contacts.find((c: any) => c.id === linkedRecords.contact_id);
      if (contact) {
        setSigners((prev) => {
          const next = [...prev];
          if (next[0]) {
            next[0] = {
              ...next[0],
              name: `${contact.first_name} ${contact.last_name || ""}`.trim(),
              email: contact.email || "",
              phone: contact.phone || contact.mobile || "",
            };
          }
          return next;
        });
      }
    }
  }, [linkedRecords.contact_id, contacts]);

  const renderHtml = useMemo(() => {
    if (!selectedTemplate?.content_html) return "";
    let html = selectedTemplate.content_html;
    for (const varName of templateVars) {
      const val = variableValues[varName] || `{{${varName}}}`;
      html = html.replaceAll(`{{${varName}}}`, val);
    }
    return html;
  }, [selectedTemplate, templateVars, variableValues]);

  const handleCreate = async () => {
    try {
      const contract = await createContract.mutateAsync({
        title: title || selectedTemplate?.name || "Contract",
        template_id: templateId,
        contact_id: linkedRecords.contact_id || null,
        company_id: linkedRecords.company_id || null,
        deal_id: linkedRecords.deal_id || null,
        project_id: linkedRecords.project_id || null,
        quote_id: linkedRecords.quote_id || null,
        variable_values: variableValues,
        rendered_html: renderHtml,
        content: renderHtml,
        status: "draft",
      });

      // Create signing sessions
      for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        if (s.name && s.email && s.phone) {
          await createSession.mutateAsync({
            contract_id: contract.id,
            signer_name: s.name,
            signer_email: s.email,
            signer_phone: s.phone,
            signer_role: s.role,
            signing_order: i + 1,
          });
        }
      }

      toast.success("Contract aangemaakt");
      onClose();
      onCreated(contract.id);
    } catch (e: any) {
      toast.error(e.message || "Kon contract niet aanmaken");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-erp-bg2 border-erp-border0">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">
            Nieuw contract — Stap {step} van 3
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-2 mb-4">
          {["Template", "Variabelen", "Preview & Ondertekenaars"].map((label, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-1 rounded-full",
                i + 1 <= step ? "bg-erp-blue" : "bg-erp-bg4"
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <Step1Templates
            templates={templates || []}
            selected={templateId}
            onSelect={(id) => {
              setTemplateId(id);
              const tmpl = templates?.find((t: any) => t.id === id);
              if (tmpl) setTitle(tmpl.name);
            }}
            title={title}
            onTitleChange={setTitle}
          />
        )}

        {step === 2 && (
          <Step2Variables
            contacts={contacts || []}
            companies={companies || []}
            deals={deals || []}
            projects={projects || []}
            quotes={quotes || []}
            linkedRecords={linkedRecords}
            onLinkRecord={(k, v) => setLinkedRecords((p) => ({ ...p, [k]: v }))}
            templateVars={templateVars}
            variableValues={variableValues}
            onVarChange={(k, v) => setVariableValues((p) => ({ ...p, [k]: v }))}
            resolvedVars={resolvedVars}
          />
        )}

        {step === 3 && (
          <Step3Preview
            renderHtml={renderHtml}
            signers={signers}
            onSignersChange={setSigners}
            members={members || []}
          />
        )}

        <div className="flex justify-between mt-4 pt-4 border-t border-erp-border0">
          <ErpButton onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
            {step === 1 ? "Annuleren" : "Vorige"}
          </ErpButton>
          {step < 3 ? (
            <ErpButton primary onClick={() => setStep(step + 1)} disabled={step === 1 && !title}>
              Volgende
            </ErpButton>
          ) : (
            <ErpButton primary onClick={handleCreate} disabled={createContract.isPending}>
              {createContract.isPending ? "Aanmaken..." : "Contract aanmaken"}
            </ErpButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step1Templates({ templates, selected, onSelect, title, onTitleChange }: {
  templates: any[]; selected: string | null; onSelect: (id: string | null) => void;
  title: string; onTitleChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-erp-text2 mb-1.5">Contracttitel</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Bijv. Dienstverleningsovereenkomst Klant X"
          className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-erp-text2 mb-2">Selecteer een template</label>
        <div className="grid grid-cols-2 gap-3">
          {/* Empty option */}
          <div
            onClick={() => onSelect(null)}
            className={cn(
              "p-4 rounded-xl border-2 cursor-pointer transition-all",
              !selected
                ? "border-erp-blue bg-erp-blue/5"
                : "border-erp-border0 bg-erp-bg3 hover:border-erp-border1"
            )}
          >
            <div className="text-sm font-medium text-erp-text0">Leeg contract</div>
            <div className="text-xs text-erp-text3 mt-1">Begin zonder template</div>
          </div>

          {templates.map((t: any) => (
            <div
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cn(
                "p-4 rounded-xl border-2 cursor-pointer transition-all",
                selected === t.id
                  ? "border-erp-blue bg-erp-blue/5"
                  : "border-erp-border0 bg-erp-bg3 hover:border-erp-border1"
              )}
            >
              <div className="text-sm font-medium text-erp-text0">{t.name}</div>
              <div className="text-xs text-erp-text3 mt-1">{t.description || t.category || "Template"}</div>
              {t.variables?.length > 0 && (
                <div className="text-[10px] text-erp-text3 mt-2">
                  {t.variables.length} variabelen
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-erp-text2 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
      >
        <option value="">{placeholder || "— Selecteer —"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Step2Variables({ contacts, companies, deals, projects, quotes, linkedRecords, onLinkRecord, templateVars, variableValues, onVarChange, resolvedVars }: {
  contacts: any[]; companies: any[]; deals: any[]; projects: any[]; quotes: any[];
  linkedRecords: Record<string, string>;
  onLinkRecord: (key: string, value: string) => void;
  templateVars: string[];
  variableValues: Record<string, string>;
  onVarChange: (key: string, value: string) => void;
  resolvedVars: Record<string, string> | undefined;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-erp-text0 mb-3">Records koppelen</h4>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Contact"
            value={linkedRecords.contact_id || ""}
            onChange={(v) => onLinkRecord("contact_id", v)}
            options={contacts.map((c: any) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ""}` }))}
          />
          <SelectField
            label="Bedrijf"
            value={linkedRecords.company_id || ""}
            onChange={(v) => onLinkRecord("company_id", v)}
            options={companies.map((c: any) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            label="Deal"
            value={linkedRecords.deal_id || ""}
            onChange={(v) => onLinkRecord("deal_id", v)}
            options={deals.map((d: any) => ({ value: d.id, label: d.title }))}
          />
          <SelectField
            label="Project"
            value={linkedRecords.project_id || ""}
            onChange={(v) => onLinkRecord("project_id", v)}
            options={projects.map((p: any) => ({ value: p.id, label: p.name }))}
          />
          <SelectField
            label="Offerte"
            value={linkedRecords.quote_id || ""}
            onChange={(v) => onLinkRecord("quote_id", v)}
            options={quotes.map((q: any) => ({ value: q.id, label: `${q.quote_number} — ${q.customer_name || ""}` }))}
          />
        </div>
      </div>

      {templateVars.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-erp-text0 mb-3">Variabelen</h4>
          <div className="grid grid-cols-2 gap-3">
            {templateVars.map((varName) => {
              const isAutoFilled = resolvedVars && Object.entries(resolvedVars).some(
                ([k, v]) => k.split(".").pop() === varName && v
              );
              return (
                <div key={varName}>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-erp-text2 mb-1">
                    {varName.replace(/_/g, " ")}
                    {isAutoFilled && (
                      <span className="text-[9px] bg-erp-green/10 text-erp-green px-1.5 py-0.5 rounded-full font-semibold">
                        auto
                      </span>
                    )}
                  </label>
                  <input
                    value={variableValues[varName] || ""}
                    onChange={(e) => onVarChange(varName, e.target.value)}
                    className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Step3Preview({ renderHtml, signers, onSignersChange, members }: {
  renderHtml: string;
  signers: Array<{ name: string; email: string; phone: string; role: string }>;
  onSignersChange: (s: Array<{ name: string; email: string; phone: string; role: string }>) => void;
  members: import("@/hooks/useTeam").OrgMember[];
}) {
  const updateSigner = (i: number, field: string, value: string) => {
    const next = [...signers];
    next[i] = { ...next[i], [field]: value };
    onSignersChange(next);
  };

  const fillFromMember = (i: number, userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    if (!member) return;
    const next = [...signers];
    next[i] = {
      ...next[i],
      name: member.profiles?.full_name || "",
      email: member.profiles?.email || "",
      phone: member.profiles?.phone || "",
      role: "Medewerker",
    };
    onSignersChange(next);
  };

  const activeMembers = members.filter((m) => m.is_active);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: Preview */}
      <div>
        <h4 className="text-sm font-semibold text-erp-text0 mb-2">Preview</h4>
        <div
          className="bg-white text-gray-900 rounded-lg p-6 max-h-[400px] overflow-y-auto text-sm shadow-inner border border-erp-border0"
          dangerouslySetInnerHTML={{ __html: renderHtml || "<p>Geen content</p>" }}
        />
      </div>

      {/* Right: Signers */}
      <div>
        <h4 className="text-sm font-semibold text-erp-text0 mb-2">Ondertekenaars</h4>
        <div className="space-y-3">
          {signers.map((s, i) => (
            <div key={i} className="bg-erp-bg3 rounded-xl p-3 border border-erp-border0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-erp-text2">Ondertekenaar {i + 1}</span>
                {signers.length > 1 && (
                  <button
                    onClick={() => onSignersChange(signers.filter((_, j) => j !== i))}
                    className="text-xs text-erp-red hover:underline"
                  >
                    Verwijderen
                  </button>
                )}
              </div>
              {/* Team member picker */}
              {activeMembers.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) fillFromMember(i, e.target.value);
                  }}
                  className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2.5 py-1.5 text-xs text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                >
                  <option value="">— Selecteer teamlid —</option>
                  {activeMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.full_name || "Onbekend"} ({m.role})
                    </option>
                  ))}
                </select>
              )}
              <input
                value={s.role}
                onChange={(e) => updateSigner(i, "role", e.target.value)}
                placeholder="Rol (bijv. Klant)"
                className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2.5 py-1.5 text-xs text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
              <input
                value={s.name}
                onChange={(e) => updateSigner(i, "name", e.target.value)}
                placeholder="Naam"
                className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2.5 py-1.5 text-xs text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
              <input
                value={s.email}
                onChange={(e) => updateSigner(i, "email", e.target.value)}
                placeholder="E-mail"
                className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2.5 py-1.5 text-xs text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
              <input
                value={s.phone}
                onChange={(e) => updateSigner(i, "phone", e.target.value)}
                placeholder="Telefoon (voor SMS)"
                className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2.5 py-1.5 text-xs text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              />
            </div>
          ))}
          <button
            onClick={() => onSignersChange([...signers, { name: "", email: "", phone: "", role: "Ondertekenaar" }])}
            className="text-xs text-erp-blue hover:underline font-medium"
          >
            + Ondertekenaar toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contract Detail Panel ─────────────────────────────────────

function SendContractEmailDialog({ open, onClose, contract }: { open: boolean; onClose: () => void; contract: any }) {
  const sessions = contract.contract_signing_sessions || [];
  const contactEmail = contract.contacts?.email || "";
  const [to, setTo] = useState(contactEmail);
  const [subject, setSubject] = useState(`Contract ter ondertekening: ${contract.title}`);
  const [message, setMessage] = useState("Hierbij ontvangt u een contract ter ondertekening. Klik op de link hieronder om het contract te bekijken en te ondertekenen.");
  const [sending, setSending] = useState(false);
  const updateContract = useUpdateContract();

  const handleSend = async () => {
    if (!to) { toast.error("Vul een e-mailadres in"); return; }
    setSending(true);
    try {
      const origin = window.location.origin;
      const signerLinksHtml = sessions
        .filter((s: any) => s.status !== "signed")
        .map((s: any) => `<p style="margin:8px 0"><a href="${origin}/sign?token=${s.session_token}" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${s.signer_name} — Onderteken nu</a></p>`)
        .join("");

      const htmlContent = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#1a1a2e;margin-bottom:8px">${contract.title}</h2>
          ${contract.contract_number ? `<p style="color:#666;font-size:13px;margin-top:0">Nummer: ${contract.contract_number}</p>` : ""}
          <p style="color:#333;font-size:14px;line-height:1.6">${message}</p>
          <div style="margin:24px 0">${signerLinksHtml}</div>
          <p style="color:#999;font-size:12px;margin-top:32px">Dit is een automatisch gegenereerd bericht.</p>
        </div>`;

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          action: "send",
          to,
          subject,
          html_content: htmlContent,
          contact_id: contract.contact_id || null,
          send_type: "contract",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await updateContract.mutateAsync({
        id: contract.id,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      toast.success("Contract per e-mail verzonden");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Verzenden mislukt");
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-erp-bg2 border-erp-border0">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Contract versturen via e-mail</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-erp-text2 mb-1">Aan</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@voorbeeld.nl"
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue" />
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text2 mb-1">Onderwerp</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue" />
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text2 mb-1">Bericht</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue resize-none" />
          </div>
          {sessions.filter((s: any) => s.status !== "signed").length > 0 && (
            <div className="bg-erp-bg3 rounded-lg p-3">
              <div className="text-xs font-medium text-erp-text2 mb-1.5">Ondertekeningslinks in e-mail:</div>
              {sessions.filter((s: any) => s.status !== "signed").map((s: any) => (
                <div key={s.id} className="text-xs text-erp-text1">• {s.signer_name} ({s.signer_role})</div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-erp-border0">
          <ErpButton onClick={onClose}>Annuleren</ErpButton>
          <ErpButton primary onClick={handleSend} disabled={sending || !to}>
            {sending ? "Verzenden..." : "Verstuur e-mail"}
          </ErpButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContractDetail({ contractId, onBack }: { contractId: string; onBack: () => void }) {
  const { data: contract, isLoading } = useContract(contractId);
  const [tab, setTab] = useState("content");
  const [sigFields, setSigFields] = useState<SignatureField[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const updateContract = useUpdateContract();

  // Load existing signature fields from contract
  useEffect(() => {
    if (contract?.signature_fields && Array.isArray(contract.signature_fields)) {
      setSigFields(contract.signature_fields as SignatureField[]);
    }
  }, [contract?.signature_fields]);

  const saveFields = async () => {
    try {
      await updateContract.mutateAsync({ id: contractId, signature_fields: sigFields });
      toast.success("Velden opgeslagen");
    } catch (e: any) {
      toast.error(e.message || "Opslaan mislukt");
    }
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://fuvpmxxihmpustftzvgk.supabase.co"}/functions/v1/sign-pdf`;
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contractId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("PDF gegenereerd");
      if (data.pdf_url) window.open(data.pdf_url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "PDF generatie mislukt");
    }
    setGeneratingPdf(false);
  };

  if (isLoading) return <div className="text-erp-text3 text-sm py-8 text-center">Laden...</div>;
  if (!contract) return <div className="text-erp-text3 text-sm py-8 text-center">Contract niet gevonden</div>;

  const signingBaseUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://fuvpmxxihmpustftzvgk.supabase.co"}/functions/v1/contract-signing`;

  const handleSend = async () => {
    try {
      await updateContract.mutateAsync({
        id: contract.id,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      toast.success("Contract verzonden");
    } catch (e: any) {
      toast.error(e.message || "Fout bij verzenden");
    }
  };

  const togglePortal = async () => {
    try {
      await updateContract.mutateAsync({
        id: contract.id,
        visible_in_portal: !contract.visible_in_portal,
      });
      toast.success(contract.visible_in_portal ? "Verwijderd uit portaal" : "Zichtbaar in portaal");
    } catch (e: any) {
      toast.error(e.message || "Fout bij wijzigen");
    }
  };

  const copyLink = (token: string) => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/sign?token=${token}`);
    toast.success("Signing link gekopieerd");
  };

  const hasSigned = (contract.contract_signing_sessions || []).some((s: any) => s.status === "signed");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="text-erp-text2 hover:text-erp-text0">
          <Icons.ChevDown className="w-5 h-5 rotate-90" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-erp-text0">{contract.title}</h1>
            <Badge color={STATUS_COLORS[contract.status]}>{STATUS_LABELS[contract.status] || contract.status}</Badge>
            {contract.visible_in_portal && (
              <Badge color="hsl(var(--erp-blue))">Portaal</Badge>
            )}
          </div>
          <div className="text-xs text-erp-text3 mt-0.5 font-mono">{contract.contract_number}</div>
        </div>

        {/* Portal toggle */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-erp-text2">Portaal</label>
          <Switch checked={!!contract.visible_in_portal} onCheckedChange={togglePortal} />
        </div>

        {contract.status === "draft" && (
          <>
            <ErpButton onClick={() => setShowEmailDialog(true)}>
              <Icons.Mail className="w-4 h-4" /> Via e-mail
            </ErpButton>
            <ErpButton primary onClick={handleSend}>
              <Icons.Send className="w-4 h-4" /> Verzenden
            </ErpButton>
          </>
        )}
        {contract.status === "sent" && (
          <ErpButton onClick={() => setShowEmailDialog(true)}>
            <Icons.Mail className="w-4 h-4" /> Opnieuw mailen
          </ErpButton>
        )}
        {hasSigned && (
          <ErpButton onClick={generatePdf} disabled={generatingPdf}>
            {generatingPdf ? "PDF genereren..." : "📄 Download PDF"}
          </ErpButton>
        )}
        {contract.signed_pdf_url && (
          <a href={contract.signed_pdf_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-erp-blue hover:underline font-medium">
            Bekijk PDF ↗
          </a>
        )}
      </div>

      {showEmailDialog && (
        <SendContractEmailDialog open={showEmailDialog} onClose={() => setShowEmailDialog(false)} contract={contract} />
      )}

      <ErpTabs
        items={[["content", "Contract"], ["fields", "Velden"], ["signers", "Ondertekenaars"], ["audit", "Audit Trail"]]}
        active={tab}
        onChange={setTab}
      />

      {tab === "content" && (
        <ErpCard className="p-6">
          <div
            className="bg-white text-gray-900 rounded-lg p-8 text-sm leading-relaxed shadow-inner"
            dangerouslySetInnerHTML={{ __html: contract.rendered_html || contract.content || "<p>Geen content</p>" }}
          />
        </ErpCard>
      )}

      {tab === "fields" && (
        <ErpCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-erp-text0">Handtekeningvelden positioneren</h3>
              <p className="text-xs text-erp-text3">Sleep velden naar de juiste positie op het contract</p>
            </div>
            <ErpButton primary onClick={saveFields} disabled={updateContract.isPending}>
              {updateContract.isPending ? "Opslaan..." : "Velden opslaan"}
            </ErpButton>
          </div>
          <div className="h-[500px]">
            <PDFFieldEditor
              pages={[contract.rendered_html || contract.content || "<p>Geen content</p>"]}
              fields={sigFields}
              onChange={setSigFields}
              signerCount={(contract.contract_signing_sessions || []).length || 1}
              readOnly={contract.status === "signed"}
            />
          </div>
        </ErpCard>
      )}

      {tab === "signers" && (
        <ErpCard>
          <table className="w-full">
            <thead>
              <tr>
                <TH>Naam</TH>
                <TH>Rol</TH>
                <TH>Status</TH>
                <TH>Getekend op</TH>
                <TH>Link</TH>
              </tr>
            </thead>
            <tbody>
              {(contract.contract_signing_sessions || []).map((s: any) => (
                <TR key={s.id}>
                  <TD className="font-medium text-erp-text0">{s.signer_name}</TD>
                  <TD className="text-erp-text2">{s.signer_role}</TD>
                  <TD>
                    {s.status === "signed" ? (
                      <Badge color="hsl(var(--erp-green))">✅ Getekend</Badge>
                    ) : (
                      <Badge color="hsl(var(--erp-amber))">⏳ Wacht</Badge>
                    )}
                  </TD>
                  <TD className="text-erp-text2">{fmtDateTime(s.signed_at)}</TD>
                  <TD>
                    {s.status !== "signed" && (
                      <button
                        onClick={() => copyLink(s.session_token)}
                        className="text-xs text-erp-blue hover:underline font-medium"
                      >
                        Kopieer link
                      </button>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>
      )}

      {tab === "audit" && (
        <ErpCard className="p-5">
          {(contract.contract_audit_logs || []).length === 0 ? (
            <div className="text-erp-text3 text-sm text-center py-8">Nog geen audit events</div>
          ) : (
            <div className="space-y-3">
              {(contract.contract_audit_logs || [])
                .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((log: any) => (
                  <div key={log.id} className="flex gap-3 text-xs">
                    <span className="text-erp-text3 font-mono whitespace-nowrap">{fmtDateTime(log.created_at)}</span>
                    <div className="text-erp-text1">
                      <span className="font-medium">{log.action}</span>
                      {log.signer_name && <span className="text-erp-text2"> — {log.signer_name}</span>}
                      {log.ip_address && <span className="text-erp-text3"> (IP: {log.ip_address})</span>}
                      {log.document_hash && (
                        <div className="text-erp-text3 font-mono mt-0.5">Hash: {log.document_hash?.slice(0, 16)}...</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ErpCard>
      )}
    </div>
  );
}

// ─── Templates Tab ─────────────────────────────────────────────

function TemplatesTab() {
  const { data: templates, isLoading } = useContractTemplates();
  const [editing, setEditing] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <PageHeader title="Templates" desc="Beheer contract templates">
        <ErpButton primary onClick={() => setShowCreate(true)}>
          <Icons.Plus className="w-4 h-4" /> Nieuwe template
        </ErpButton>
      </PageHeader>

      {isLoading ? (
        <div className="text-erp-text3 text-sm py-8 text-center">Laden...</div>
      ) : !templates?.length ? (
        <div className="text-center py-16 text-erp-text3 text-sm">Nog geen templates</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((t: any) => {
            const varCount = (t.content_html?.match(/\{\{/g) || []).length;
            return (
              <ErpCard key={t.id} hover className="p-4" onClick={() => setEditing(t)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-erp-text0">{t.name}</div>
                    <div className="text-xs text-erp-text3 mt-0.5">{t.category || "Algemeen"}</div>
                  </div>
                  <Badge color="hsl(var(--erp-text-2))">{varCount} vars</Badge>
                </div>
                {t.description && (
                  <div className="text-xs text-erp-text2 mt-2 line-clamp-2">{t.description}</div>
                )}
              </ErpCard>
            );
          })}
        </div>
      )}

      {(showCreate || editing) && (
        <TemplateEditor
          template={editing}
          onClose={() => { setEditing(null); setShowCreate(false); }}
        />
      )}
    </>
  );
}

function TemplateEditor({ template, onClose }: { template: any | null; onClose: () => void }) {
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const { data: varSources } = useContractVariableSources();

  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || "general");
  const [contentHtml, setContentHtml] = useState(template?.content_html || "");
  const [variables, setVariables] = useState<any[]>(template?.variables || []);

  // Auto-detect variables from HTML
  const detectedVars: string[] = useMemo(() => {
    const matches = contentHtml.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m: string) => m.replace(/\{\{|\}\}/g, "")))] as string[];
  }, [contentHtml]);

  const previewHtml = useMemo(() => {
    let html = contentHtml;
    for (const v of detectedVars) {
      html = html.replaceAll(`{{${v}}}`, `<mark style="background:#fef3c7;padding:0 2px">${v}</mark>`);
    }
    return html;
  }, [contentHtml, detectedVars]);

  const handleSave = async () => {
    try {
      const payload = {
        name,
        description,
        category,
        content_html: contentHtml,
        variables: variables.length ? variables : detectedVars.map((v) => ({
          key: v,
          label: v.replace(/_/g, " "),
          required: false,
        })),
      };

      if (template?.id) {
        await updateTemplate.mutateAsync({ id: template.id, ...payload });
      } else {
        await createTemplate.mutateAsync(payload);
      }
      toast.success("Template opgeslagen");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Opslaan mislukt");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-erp-bg2 border-erp-border0">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">
            {template ? "Template bewerken" : "Nieuwe template"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-erp-text2 mb-1">Naam</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue" />
          </div>
          <div>
            <label className="block text-xs font-medium text-erp-text2 mb-1">Categorie</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-erp-text2 mb-1">Beschrijving</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* HTML Editor */}
          <div>
            <label className="block text-xs font-medium text-erp-text2 mb-1">
              HTML Content <span className="text-erp-text3">(gebruik {"{{variabele}}"} voor placeholders)</span>
            </label>
            <textarea
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              rows={20}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-xs text-erp-text0 font-mono focus:outline-none focus:ring-1 focus:ring-erp-blue resize-none"
            />
            {detectedVars.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {detectedVars.map((v) => (
                  <span key={v} className="text-[10px] bg-erp-amber/10 text-erp-amber px-2 py-0.5 rounded-full font-mono">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-medium text-erp-text2 mb-1">Preview</label>
            <div
              className="bg-white text-gray-900 rounded-lg p-6 text-sm shadow-inner border border-erp-border0 max-h-[500px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml || "<p>Typ HTML aan de linkerkant...</p>" }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-erp-border0">
          <ErpButton onClick={onClose}>Annuleren</ErpButton>
          <ErpButton primary onClick={handleSave} disabled={!name || createTemplate.isPending || updateTemplate.isPending}>
            {(createTemplate.isPending || updateTemplate.isPending) ? "Opslaan..." : "Opslaan"}
          </ErpButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function ContractsPage() {
  const [tab, setTab] = useState("contracts");
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  if (selectedContract) {
    return <ContractDetail contractId={selectedContract} onBack={() => setSelectedContract(null)} />;
  }

  return (
    <div>
      <ErpTabs
        items={[["contracts", "Contracten"], ["templates", "Templates"]]}
        active={tab}
        onChange={setTab}
      />

      {tab === "contracts" && <ContractsList onSelect={setSelectedContract} />}
      {tab === "templates" && <TemplatesTab />}
    </div>
  );
}
