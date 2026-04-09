import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader, ErpCard, StatCard, Badge, Dot, TH, TD, TR, ErpButton, ErpTabs,
} from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import {
  useLeadFunnel, useAttentionLeads, useRecentMessages, useLeads,
  LEAD_STATUSES, type LeadStatus,
} from "@/hooks/useOutreach";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { AlertTriangle, ArrowRight, MessageSquare, Send, Inbox } from "lucide-react";

function fmtTime(d: string | null) {
  if (!d) return "—";
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: nl }); } catch { return "—"; }
}

export default function OutreachPage() {
  const [tab, setTab] = useState("overview");
  const navigate = useNavigate();

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Outreach" desc="LinkedIn outreach pipeline en berichten">
        <ErpButton onClick={() => navigate("/outreach/settings")}>
          <Icons.Settings className="w-4 h-4" /> Instellingen
        </ErpButton>
      </PageHeader>

      <ErpTabs
        items={[["overview", "Overzicht"], ["leads", "Alle leads"], ["messages", "Berichten"]]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && <OverviewTab />}
      {tab === "leads" && <LeadsTab />}
      {tab === "messages" && <MessagesTab />}
    </div>
  );
}

// ── Pipeline Funnel ──

function FunnelBar() {
  const { data: funnel, isLoading } = useLeadFunnel();
  if (isLoading || !funnel) return null;

  const total = Object.values(funnel).reduce((a, b) => a + b, 0);

  return (
    <ErpCard className="p-5 mb-6">
      <div className="text-[15px] font-semibold mb-4">Pipeline funnel</div>
      <div className="flex gap-1 h-8 rounded-lg overflow-hidden mb-3">
        {LEAD_STATUSES.map(s => {
          const count = funnel[s.key] ?? 0;
          if (count === 0 || total === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={s.key}
              title={`${s.label}: ${count}`}
              className="flex items-center justify-center text-[10px] font-bold text-white min-w-[24px] transition-all"
              style={{ width: `${pct}%`, background: s.color }}
            >
              {pct > 6 ? count : ""}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {LEAD_STATUSES.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs">
            <Dot color={s.color} size={6} />
            <span className="text-erp-text2">{s.label}</span>
            <span className="text-erp-text0 font-semibold">{funnel[s.key] ?? 0}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-erp-border0 text-xs text-erp-text3">
        Totaal: <span className="text-erp-text0 font-semibold">{total}</span> leads in pipeline
      </div>
    </ErpCard>
  );
}

// ── Attention Block ──

function AttentionBlock() {
  const { data: leads = [], isLoading } = useAttentionLeads();
  const navigate = useNavigate();

  if (isLoading) return null;
  if (leads.length === 0) return null;

  return (
    <ErpCard className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-erp-amber" />
        <span className="text-[15px] font-semibold">Aandacht nodig</span>
        <Badge color="hsl(43,96%,56%)">{leads.length}</Badge>
      </div>
      <div className="space-y-1">
        {leads.map(l => {
          const status = LEAD_STATUSES.find(s => s.key === l.status);
          return (
            <div
              key={l.id}
              onClick={() => navigate(`/outreach/${l.id}`)}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer hover:bg-erp-hover transition-colors"
            >
              <Dot color={status?.color ?? "#6b7280"} size={8} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-erp-text0 truncate">{l.company_name}</div>
                <div className="text-[11px] text-erp-text3">
                  {l.contact_name ?? "—"} · {l.city ?? "—"}
                </div>
              </div>
              <Badge color={status?.color ?? "#6b7280"}>{status?.label ?? l.status}</Badge>
              <span className="text-[11px] text-erp-text3">{fmtTime(l.updated_at)}</span>
              <ArrowRight className="w-3.5 h-3.5 text-erp-text3" />
            </div>
          );
        })}
      </div>
    </ErpCard>
  );
}

// ── Recent Activity ──

function RecentActivityBlock() {
  const { data: messages = [], isLoading } = useRecentMessages();
  const navigate = useNavigate();

  return (
    <ErpCard className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-erp-blue" />
        <span className="text-[15px] font-semibold">Recente activiteit</span>
      </div>
      {isLoading && <div className="text-sm text-erp-text3 py-4">Laden...</div>}
      {!isLoading && messages.length === 0 && (
        <div className="text-sm text-erp-text3 py-4">Nog geen outreach berichten.</div>
      )}
      <div className="space-y-1">
        {messages.map(m => (
          <div
            key={m.id}
            onClick={() => navigate(`/outreach/${m.lead_id}`)}
            className="flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer hover:bg-erp-hover transition-colors"
          >
            {m.direction === "outbound" ? (
              <Send className="w-3.5 h-3.5 text-erp-blue flex-shrink-0" />
            ) : (
              <Inbox className="w-3.5 h-3.5 text-erp-green flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-erp-text0 truncate">
                <span className="font-medium">{m.leads?.company_name ?? "Onbekend"}</span>
                {m.content && <span className="text-erp-text2"> — {m.content.slice(0, 80)}{m.content.length > 80 ? "..." : ""}</span>}
              </div>
            </div>
            <span className="text-[11px] text-erp-text3 flex-shrink-0">{fmtTime(m.created_at)}</span>
          </div>
        ))}
      </div>
    </ErpCard>
  );
}

// ── Overview Tab ──

function OverviewTab() {
  const { data: funnel } = useLeadFunnel();
  const total = funnel ? Object.values(funnel).reduce((a, b) => a + b, 0) : 0;
  const active = funnel ? (funnel.outreach_active ?? 0) + (funnel.connected ?? 0) : 0;
  const warm = funnel ? (funnel.interested ?? 0) + (funnel.appointment_booked ?? 0) : 0;
  const converted = funnel?.converted ?? 0;

  return (
    <>
      <div className="grid grid-cols-4 gap-[14px] mb-6">
        <StatCard label="Totaal leads" value={String(total)} change="in pipeline" up />
        <StatCard label="Actieve outreach" value={String(active)} change="berichten actief" up />
        <StatCard label="Warm / Afspraak" value={String(warm)} change="aandacht nodig" up={warm > 0} />
        <StatCard label="Geconverteerd" value={String(converted)} change="deals geworden" up />
      </div>
      <FunnelBar />
      <div className="grid grid-cols-[3fr_2fr] gap-[14px]">
        <RecentActivityBlock />
        <AttentionBlock />
      </div>
    </>
  );
}

// ── Leads Tab ──

function LeadsTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: leads = [], isLoading } = useLeads(statusFilter);
  const navigate = useNavigate();

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setStatusFilter(undefined)}
          className={`px-3 py-[6px] rounded-[7px] text-xs font-medium border transition-all ${!statusFilter ? "bg-erp-blue/10 text-erp-blue border-erp-blue/20" : "bg-erp-bg3 text-erp-text2 border-erp-border0 hover:text-erp-text1"}`}
        >
          Alle
        </button>
        {LEAD_STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-[6px] rounded-[7px] text-xs font-medium border transition-all flex items-center gap-1.5 ${statusFilter === s.key ? "bg-erp-blue/10 text-erp-blue border-erp-blue/20" : "bg-erp-bg3 text-erp-text2 border-erp-border0 hover:text-erp-text1"}`}
          >
            <Dot color={s.color} size={5} /> {s.label}
          </button>
        ))}
      </div>

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>}

      {!isLoading && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <TH>Bedrijf</TH>
                <TH>Contact</TH>
                <TH>Stad</TH>
                <TH>Branche</TH>
                <TH>Score</TH>
                <TH>Status</TH>
                <TH>Laatste contact</TH>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-erp-text3 text-sm border-b border-erp-border0">Geen leads gevonden</td></tr>
              )}
              {leads.map(l => {
                const status = LEAD_STATUSES.find(s => s.key === l.status);
                return (
                  <TR key={l.id} onClick={() => navigate(`/outreach/${l.id}`)}>
                    <TD className="font-medium text-erp-text0">{l.company_name}</TD>
                    <TD className="text-erp-text1">{l.contact_name ?? "—"}</TD>
                    <TD className="text-erp-text1">{l.city ?? "—"}</TD>
                    <TD className="text-erp-text1">{l.industry ?? "—"}</TD>
                    <TD>
                      {l.relevance_score != null ? (
                        <span className="text-xs font-semibold text-erp-text0">{l.relevance_score}</span>
                      ) : <span className="text-erp-text3">—</span>}
                    </TD>
                    <TD>
                      <Badge color={status?.color ?? "#6b7280"}>
                        <Dot color={status?.color ?? "#6b7280"} size={5} />
                        {status?.label ?? l.status}
                      </Badge>
                    </TD>
                    <TD className="text-erp-text2 text-xs">{fmtTime(l.last_contacted_at)}</TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </ErpCard>
      )}
    </>
  );
}

// ── Messages Tab ──

function MessagesTab() {
  const { data: messages = [], isLoading } = useRecentMessages();
  const navigate = useNavigate();

  return (
    <>
      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>}
      {!isLoading && (
        <ErpCard className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr><TH>Bedrijf</TH><TH>Richting</TH><TH>Kanaal</TH><TH>Bericht</TH><TH>Tijd</TH></tr>
            </thead>
            <tbody>
              {messages.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-erp-text3 text-sm border-b border-erp-border0">Geen berichten</td></tr>
              )}
              {messages.map(m => (
                <TR key={m.id} onClick={() => navigate(`/outreach/${m.lead_id}`)}>
                  <TD className="font-medium text-erp-text0">{m.leads?.company_name ?? "—"}</TD>
                  <TD>
                    {m.direction === "outbound" ? (
                      <Badge color="hsl(225,93%,64%)"><Send className="w-3 h-3" /> Uit</Badge>
                    ) : (
                      <Badge color="hsl(160,67%,52%)"><Inbox className="w-3 h-3" /> In</Badge>
                    )}
                  </TD>
                  <TD className="text-erp-text2 text-xs">{m.channel}</TD>
                  <TD className="text-erp-text1 text-xs max-w-[400px] truncate">{m.content ?? "—"}</TD>
                  <TD className="text-erp-text2 text-xs">{fmtTime(m.created_at)}</TD>
                </TR>
              ))}
            </tbody>
          </table>
        </ErpCard>
      )}
    </>
  );
}
