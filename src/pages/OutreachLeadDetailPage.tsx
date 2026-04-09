import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ErpCard, ErpButton, Badge, Dot, ErpTabs, PageHeader, Chip,
} from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import {
  useLead, useLeadResearch, useLeadMessages, usePreCallReport,
  useUpdateLeadStatus, useStartOutreachSequence, usePauseOutreach,
  LEAD_STATUSES,
} from "@/hooks/useOutreach";
import { formatDistanceToNow, format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Inbox, Play, Pause, ExternalLink,
  Building, User, MapPin, Globe, Phone, Mail, Linkedin, FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

function fmtTime(d: string | null) {
  if (!d) return "—";
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: nl }); } catch { return "—"; }
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy HH:mm", { locale: nl }); } catch { return "—"; }
}

export default function OutreachLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState("info");
  const [apiKey] = useState(() => localStorage.getItem("outreach_api_key") ?? "");

  const { data: lead, isLoading } = useLead(id);
  const { data: research } = useLeadResearch(id);
  const { data: messages = [] } = useLeadMessages(id);
  const { data: preCall } = usePreCallReport(id);
  const updateStatus = useUpdateLeadStatus();
  const startSequence = useStartOutreachSequence(apiKey);
  const pauseOutreach = usePauseOutreach(apiKey);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-erp-text3 text-sm">Laden...</div>;
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64 text-erp-text3 text-sm">
        Lead niet gevonden.
      </div>
    );
  }

  const status = LEAD_STATUSES.find(s => s.key === lead.status);

  const handleStart = async () => {
    if (!apiKey) {
      toast.error("Stel eerst een API key in via Outreach Instellingen");
      return;
    }
    try {
      await startSequence.mutateAsync(lead.id);
      await updateStatus.mutateAsync({ id: lead.id, status: "outreach_active" });
      toast.success("Outreach sequence gestart");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePause = async () => {
    try {
      await pauseOutreach.mutateAsync(lead.id);
      toast.success("Outreach gepauzeerd");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="animate-fade-up max-w-[1000px]">
      {/* Back + Header */}
      <button
        onClick={() => navigate("/outreach")}
        className="flex items-center gap-1.5 text-xs text-erp-text2 hover:text-erp-text0 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Terug naar Outreach
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-erp-text0">{lead.company_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge color={status?.color ?? "#6b7280"}>
              <Dot color={status?.color ?? "#6b7280"} size={5} />
              {status?.label ?? lead.status}
            </Badge>
            {lead.contact_name && <span className="text-[13px] text-erp-text2">{lead.contact_name}</span>}
            {lead.city && <span className="text-[13px] text-erp-text3">{lead.city}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {lead.status !== "outreach_active" && (
            <ErpButton primary onClick={handleStart} disabled={startSequence.isPending}>
              <Play className="w-4 h-4" /> Start outreach
            </ErpButton>
          )}
          {lead.status === "outreach_active" && (
            <ErpButton onClick={handlePause} disabled={pauseOutreach.isPending}>
              <Pause className="w-4 h-4" /> Pauzeer
            </ErpButton>
          )}
          <StatusDropdown leadId={lead.id} currentStatus={lead.status} />
        </div>
      </div>

      <ErpTabs
        items={[
          ["info", "Bedrijfsinfo"],
          ["research", `Research${research ? " ✓" : ""}`],
          ["messages", `Berichten (${messages.length})`],
          ["precall", `Pre-call${preCall ? " ✓" : ""}`],
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "info" && <InfoTab lead={lead} />}
      {tab === "research" && <ResearchTab research={research} />}
      {tab === "messages" && <MessagesTab messages={messages} />}
      {tab === "precall" && <PreCallTab report={preCall} />}
    </div>
  );
}

// ── Status Dropdown ──

function StatusDropdown({ leadId, currentStatus }: { leadId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const updateStatus = useUpdateLeadStatus();

  return (
    <div className="relative">
      <ErpButton onClick={() => setOpen(!open)}>
        Status wijzigen <Icons.ChevDown className="w-3 h-3" />
      </ErpButton>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-erp-bg3 border border-erp-border1 rounded-lg py-1 z-50 min-w-[180px] shadow-xl">
            {LEAD_STATUSES.map(s => (
              <button
                key={s.key}
                disabled={s.key === currentStatus}
                onClick={async () => {
                  await updateStatus.mutateAsync({ id: leadId, status: s.key });
                  setOpen(false);
                  toast.success(`Status → ${s.label}`);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-erp-text1 hover:bg-erp-hover disabled:opacity-40 transition-colors"
              >
                <Dot color={s.color} size={6} /> {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Info Tab ──

function InfoTab({ lead }: { lead: any }) {
  return (
    <div className="grid grid-cols-2 gap-[14px]">
      <ErpCard className="p-5">
        <div className="text-[14px] font-semibold mb-4">Bedrijfsgegevens</div>
        <div className="space-y-3">
          <InfoRow icon={<Building className="w-4 h-4" />} label="Bedrijf" value={lead.company_name} />
          <InfoRow icon={<User className="w-4 h-4" />} label="Contact" value={lead.contact_name} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Stad" value={lead.city} />
          <InfoRow icon={<FileText className="w-4 h-4" />} label="Branche" value={lead.industry} />
          <InfoRow icon={<FileText className="w-4 h-4" />} label="KvK" value={lead.kvk_number} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefoon" value={lead.phone} />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={lead.email} />
        </div>
      </ErpCard>
      <ErpCard className="p-5">
        <div className="text-[14px] font-semibold mb-4">Details</div>
        <div className="space-y-3">
          {lead.website && (
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Website" value={
              <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-erp-blue hover:underline text-xs flex items-center gap-1">
                {lead.website} <ExternalLink className="w-3 h-3" />
              </a>
            } />
          )}
          {lead.linkedin_company_url && (
            <InfoRow icon={<Linkedin className="w-4 h-4" />} label="LinkedIn bedrijf" value={
              <a href={lead.linkedin_company_url} target="_blank" rel="noreferrer" className="text-erp-blue hover:underline text-xs flex items-center gap-1">
                Bekijk <ExternalLink className="w-3 h-3" />
              </a>
            } />
          )}
          {lead.linkedin_contact_url && (
            <InfoRow icon={<Linkedin className="w-4 h-4" />} label="LinkedIn contact" value={
              <a href={lead.linkedin_contact_url} target="_blank" rel="noreferrer" className="text-erp-blue hover:underline text-xs flex items-center gap-1">
                Bekijk <ExternalLink className="w-3 h-3" />
              </a>
            } />
          )}
          <InfoRow icon={<FileText className="w-4 h-4" />} label="Titel" value={lead.contact_title} />
          <InfoRow icon={<FileText className="w-4 h-4" />} label="Provincie" value={lead.province} />
          <InfoRow icon={<FileText className="w-4 h-4" />} label="Bron" value={lead.source} />
          <InfoRow icon={<FileText className="w-4 h-4" />} label="Reden" value={lead.discovery_reason} />
          {lead.relevance_score != null && (
            <InfoRow icon={<FileText className="w-4 h-4" />} label="Score" value={
              <span className="text-erp-text0 font-semibold">{lead.relevance_score}</span>
            } />
          )}
        </div>
      </ErpCard>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-erp-text3 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <div className="text-[11px] text-erp-text3">{label}</div>
        <div className="text-[13px] text-erp-text1">{typeof value === "string" ? value : value}</div>
      </div>
    </div>
  );
}

// ── Research Tab ──

function ResearchTab({ research }: { research: any }) {
  if (!research) {
    return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Geen research beschikbaar voor deze lead.</ErpCard>;
  }

  return (
    <div className="space-y-[14px]">
      {research.company_summary && (
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-2">Bedrijfssamenvatting</div>
          <p className="text-[13px] text-erp-text1 whitespace-pre-wrap">{research.company_summary}</p>
        </ErpCard>
      )}

      {research.pitch_angle && (
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-2">Pitch angle</div>
          <p className="text-[13px] text-erp-text1 whitespace-pre-wrap">{research.pitch_angle}</p>
        </ErpCard>
      )}

      <div className="grid grid-cols-2 gap-[14px]">
        {research.pain_points?.length > 0 && (
          <ErpCard className="p-5">
            <div className="text-[14px] font-semibold mb-2">Pain points</div>
            <ul className="space-y-1">
              {research.pain_points.map((p: string, i: number) => (
                <li key={i} className="text-[12px] text-erp-text1 flex items-start gap-2">
                  <span className="text-erp-red mt-0.5">•</span> {p}
                </li>
              ))}
            </ul>
          </ErpCard>
        )}
        {research.growth_signals?.length > 0 && (
          <ErpCard className="p-5">
            <div className="text-[14px] font-semibold mb-2">Growth signals</div>
            <ul className="space-y-1">
              {research.growth_signals.map((g: string, i: number) => (
                <li key={i} className="text-[12px] text-erp-text1 flex items-start gap-2">
                  <span className="text-erp-green mt-0.5">•</span> {g}
                </li>
              ))}
            </ul>
          </ErpCard>
        )}
      </div>

      {research.recommended_product && (
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-2">Aanbevolen product</div>
          <Chip>{research.recommended_product}</Chip>
        </ErpCard>
      )}

      {research.google_reviews_summary && (
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-2">Google Reviews samenvatting</div>
          <p className="text-[13px] text-erp-text1 whitespace-pre-wrap">{research.google_reviews_summary}</p>
        </ErpCard>
      )}

      {research.current_tools && (
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-2">Huidige tools</div>
          <p className="text-[13px] text-erp-text1 whitespace-pre-wrap">{research.current_tools}</p>
        </ErpCard>
      )}

      <div className="text-[11px] text-erp-text3">
        Research gegenereerd op {fmtDate(research.created_at)}
        {research.research_model && ` · Model: ${research.research_model}`}
        {research.relevance_score != null && ` · Score: ${research.relevance_score}`}
      </div>
    </div>
  );
}

// ── Messages Tab ──

function MessagesTab({ messages }: { messages: any[] }) {
  if (messages.length === 0) {
    return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Nog geen berichten met deze lead.</ErpCard>;
  }

  return (
    <div className="space-y-2">
      {messages.map(m => (
        <div
          key={m.id}
          className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[70%] rounded-xl px-4 py-3 ${
              m.direction === "outbound"
                ? "bg-erp-blue/15 border border-erp-blue/20"
                : "bg-erp-bg3 border border-erp-border0"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {m.direction === "outbound" ? (
                <Send className="w-3 h-3 text-erp-blue" />
              ) : (
                <Inbox className="w-3 h-3 text-erp-green" />
              )}
              <span className="text-[11px] text-erp-text3">
                {m.direction === "outbound" ? "Verzonden" : "Ontvangen"} · {m.channel}
                {m.message_type && ` · ${m.message_type}`}
              </span>
            </div>
            <p className="text-[13px] text-erp-text1 whitespace-pre-wrap">{m.content ?? "—"}</p>
            <div className="text-[10px] text-erp-text3 mt-1.5">{fmtDate(m.created_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pre-Call Tab ──

function PreCallTab({ report }: { report: any }) {
  if (!report) {
    return <ErpCard className="p-8 text-center text-erp-text3 text-sm">Geen pre-call rapport beschikbaar.</ErpCard>;
  }

  return (
    <div className="space-y-[14px]">
      {report.appointment_at && (
        <ErpCard className="p-5 border-l-4 border-l-erp-green">
          <div className="text-[14px] font-semibold mb-1">Afspraak gepland</div>
          <p className="text-[13px] text-erp-text0 font-medium">{fmtDate(report.appointment_at)}</p>
        </ErpCard>
      )}

      <ErpCard className="p-5">
        <div className="text-[14px] font-semibold mb-2">Bedrijfsprofiel</div>
        <div className="text-[13px] text-erp-text1 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{report.company_profile}</ReactMarkdown>
        </div>
      </ErpCard>

      <ErpCard className="p-5">
        <div className="text-[14px] font-semibold mb-2">Pain points</div>
        <div className="text-[13px] text-erp-text1 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{report.pain_points}</ReactMarkdown>
        </div>
      </ErpCard>

      <ErpCard className="p-5">
        <div className="text-[14px] font-semibold mb-2">Voorgestelde oplossing</div>
        <div className="text-[13px] text-erp-text1 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{report.proposed_solution}</ReactMarkdown>
        </div>
      </ErpCard>

      <ErpCard className="p-5">
        <div className="text-[14px] font-semibold mb-2">Gespreksaanpak</div>
        <div className="text-[13px] text-erp-text1 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{report.conversation_approach}</ReactMarkdown>
        </div>
      </ErpCard>

      <ErpCard className="p-5">
        <div className="text-[14px] font-semibold mb-2">Interactiegeschiedenis</div>
        <div className="text-[13px] text-erp-text1 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{report.interaction_history}</ReactMarkdown>
        </div>
      </ErpCard>

      {report.pricing_indication && (
        <ErpCard className="p-5">
          <div className="text-[14px] font-semibold mb-2">Prijsindicatie</div>
          <p className="text-[13px] text-erp-text1 whitespace-pre-wrap">{report.pricing_indication}</p>
        </ErpCard>
      )}

      <div className="text-[11px] text-erp-text3">
        Rapport gegenereerd op {fmtDate(report.created_at)}
        {report.generated_by && ` · Door: ${report.generated_by}`}
      </div>
    </div>
  );
}
