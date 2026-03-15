import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ErpCard, ErpButton, Badge, fmt } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useProspectPool, useProspectAction } from "@/hooks/useProspecting";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Star, Mail, Eye, MessageCircle, XCircle, SkipForward, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Status config ---
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  new: { color: "hsl(220,10%,45%)", icon: <span className="text-erp-text3">○</span>, label: "Nieuw" },
  analyzing: { color: "hsl(210,70%,55%)", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "Analyseren..." },
  scored: { color: "hsl(30,80%,55%)", icon: null, label: "Gescoord" },
  demo_queued: { color: "hsl(210,70%,55%)", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "Demo wachtrij" },
  demo_building: { color: "hsl(210,70%,55%)", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "Demo bouwen..." },
  demo_ready: { color: "hsl(145,60%,45%)", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Demo klaar" },
  email_draft: { color: "hsl(270,50%,55%)", icon: <Mail className="w-3.5 h-3.5" />, label: "Email concept" },
  email_approved: { color: "hsl(145,60%,45%)", icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Goedgekeurd" },
  email_sent: { color: "hsl(210,70%,55%)", icon: <Mail className="w-3.5 h-3.5" />, label: "Verstuurd" },
  replied: { color: "hsl(145,70%,50%)", icon: <MessageCircle className="w-3.5 h-3.5" />, label: "Gereageerd" },
  bounced: { color: "hsl(0,65%,50%)", icon: <XCircle className="w-3.5 h-3.5" />, label: "Bounced" },
  skipped: { color: "hsl(220,10%,45%)", icon: <SkipForward className="w-3.5 h-3.5" />, label: "Overgeslagen" },
  converted: { color: "hsl(45,90%,50%)", icon: <Star className="w-3.5 h-3.5" />, label: "Geconverteerd" },
};

function getScoreColor(score: number) {
  if (score >= 80) return "hsl(145,60%,45%)";
  if (score >= 60) return "hsl(30,80%,55%)";
  return "hsl(0,65%,50%)";
}

// --- Pipeline steps ---
const PIPELINE_STEPS = [
  { key: "new", label: "Gevonden", statuses: ["new"] },
  { key: "scored", label: "Geanalyseerd", statuses: ["scored", "analyzing"] },
  { key: "demo_ready", label: "Demo klaar", statuses: ["demo_ready", "demo_queued", "demo_building"] },
  { key: "email_draft", label: "Email draft", statuses: ["email_draft", "email_approved"] },
  { key: "email_sent", label: "Verstuurd", statuses: ["email_sent", "replied", "bounced", "converted"] },
];

// --- Lead card ---
function LeadCard({ lead, selected, onSelect, onExpand, expanded }: {
  lead: any; selected: boolean; onSelect: (v: boolean) => void; onExpand: () => void; expanded: boolean;
}) {
  const cfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const score = lead.score ?? 0;
  const scoreBreakdown = lead.score_breakdown as Record<string, number> | null;

  return (
    <ErpCard className={cn("overflow-hidden transition-all", expanded && "ring-1 ring-erp-blue/30")}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={{ borderLeft: `3px solid ${cfg.color}` }}
        onClick={onExpand}
      >
        <div onClick={e => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={v => onSelect(!!v)} />
        </div>

        {lead.status !== "new" && score > 0 && (
          <span className="text-[18px] font-bold w-8 text-center" style={{ color: getScoreColor(score) }}>
            {score}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-erp-text0 truncate">{lead.company_name}</span>
            {lead.demo_viewed_at && <span className="text-[10px] bg-orange-500/10 text-orange-500 font-semibold px-1.5 py-0.5 rounded">🔥 Demo bekeken</span>}
            {lead.demo_url && !lead.demo_viewed_at && (
              <span className="text-[10px] bg-green-500/10 text-green-500 font-semibold px-1.5 py-0.5 rounded">✅ Demo klaar</span>
            )}
          </div>
          <div className="text-[11px] text-erp-text3 mt-0.5 flex items-center gap-1.5 flex-wrap">
            {lead.website_url && <span>{new URL(lead.website_url).hostname}</span>}
            {lead.city && <><span>·</span><span>{lead.city}</span></>}
            {lead.google_rating && (
              <><span>·</span><span>⭐ {lead.google_rating} ({lead.google_review_count ?? 0})</span></>
            )}
          </div>
          <div className="text-[11px] text-erp-text3 mt-0.5">
            Contact: {lead.contact_name || "?"} · {lead.contact_email || "onbekend"}
            {lead.contact_source && <span className="text-erp-text3/60"> ({lead.contact_source})</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lead.demo_url && (
            <a href={lead.demo_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
               className="text-[11px] text-erp-blue hover:underline flex items-center gap-1">
              <Eye className="w-3 h-3" /> Demo
            </a>
          )}
          <div className="flex items-center gap-1.5" style={{ color: cfg.color }}>
            {cfg.icon}
            <span className="text-[11px] font-medium">{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-erp-border0 pt-3" style={{ borderLeft: `3px solid ${cfg.color}` }}>
          {/* Analysis */}
          {(lead.analysis || lead.fit_summary || scoreBreakdown) && (
            <div className="bg-erp-bg3 rounded-lg p-3 space-y-2">
              <div className="text-[11px] font-semibold text-erp-text2 mb-1.5">Analyse</div>
              {lead.fit_summary && (
                <p className="text-[12px] text-erp-text1">{lead.fit_summary}</p>
              )}
              {scoreBreakdown && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(scoreBreakdown).map(([k, v]) => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-erp-bg4 text-erp-text2">
                      {k}: {v as number}
                    </span>
                  ))}
                </div>
              )}
              {lead.analysis?.strengths && lead.analysis.strengths.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold text-green-500 mb-1">✓ Sterke punten</div>
                  <ul className="text-[11px] text-erp-text1 space-y-0.5 list-disc list-inside">
                    {lead.analysis.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {lead.analysis?.weaknesses && lead.analysis.weaknesses.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold text-orange-500 mb-1">⚡ Kansen</div>
                  <ul className="text-[11px] text-erp-text1 space-y-0.5 list-disc list-inside">
                    {lead.analysis.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {lead.analysis?.recommendation && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold text-erp-blue mb-1">💡 Aanbeveling</div>
                  <p className="text-[11px] text-erp-text1">{lead.analysis.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Demo */}
          {lead.status === "demo_building" && !lead.demo_url && (
            <div className="bg-erp-bg3 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-erp-blue" />
              <span className="text-[12px] text-erp-text2">Demo wordt gebouwd...</span>
            </div>
          )}
          {lead.demo_url && (
            <div className="bg-erp-bg3 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-erp-text2 mb-1.5">Demo</div>
              <div className="flex items-center gap-2">
                <a href={lead.demo_url} target="_blank" rel="noopener" className="text-[12px] text-erp-blue hover:underline flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Bekijk demo
                </a>
                {lead.demo_view_count > 0 && (
                  <span className="text-[11px] text-erp-text3">{lead.demo_view_count}x bekeken</span>
                )}
              </div>
            </div>
          )}

          {/* Email */}
          {lead.email_subject && (
            <div className="bg-erp-bg3 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-erp-text2 mb-1.5">Email</div>
              <p className="text-[12px] text-erp-text1 font-medium">{lead.email_subject}</p>
              <p className="text-[12px] text-erp-text2 mt-1 line-clamp-3 whitespace-pre-wrap">{lead.email_body}</p>
            </div>
          )}
        </div>
      )}
    </ErpCard>
  );
}

// --- Email editor sheet ---
function EmailEditorSheet({ lead, open, onClose, onSave }: {
  lead: any; open: boolean; onClose: () => void; onSave: (subject: string, body: string, approve: boolean) => void;
}) {
  const [subject, setSubject] = useState(lead?.email_subject || "");
  const [body, setBody] = useState(lead?.email_body || "");

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle className="text-erp-text0">Email bewerken — {lead?.company_name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-erp-text1 text-[12px]">Onderwerp</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
          </div>
          <div className="space-y-2">
            <Label className="text-erp-text1 text-[12px]">Inhoud</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={12} className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[13px]" />
          </div>
          <div className="flex gap-2 pt-2">
            <ErpButton onClick={() => { onSave(subject, body, false); onClose(); }}>Opslaan</ErpButton>
            <ErpButton primary onClick={() => { onSave(subject, body, true); onClose(); }}>
              <CheckCircle2 className="w-4 h-4" /> Goedkeuren
            </ErpButton>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- Main page ---
export default function ProspectPoolDetailPage() {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useProspectPool(poolId);
  const actionMutation = useProspectAction();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [sendConfirm, setSendConfirm] = useState(false);

  const pool = data?.pool;
  const leads: any[] = data?.leads || [];
  const sendStatus = data?.send_status || { sent: 0, limit: 10 };

  // Filter leads by active pipeline step
  const filteredLeads = useMemo(() => {
    if (!activeStep) return leads;
    const step = PIPELINE_STEPS.find(s => s.key === activeStep);
    if (!step) return leads;
    return leads.filter(l => step.statuses.includes(l.status));
  }, [leads, activeStep]);

  // Pipeline counts
  const stepCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const step of PIPELINE_STEPS) {
      counts[step.key] = leads.filter(l => step.statuses.includes(l.status)).length;
    }
    return counts;
  }, [leads]);

  const toggleSelect = (id: string, val: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const selectedLeads = leads.filter(l => selectedIds.has(l.id));

  const canAnalyze = selectedLeads.some(l => l.status === "new");
  const canBuildDemos = selectedLeads.some(l => l.status === "scored");
  const canDraftEmails = selectedLeads.some(l => l.status === "demo_ready");
  const canSend = selectedLeads.some(l => l.status === "email_approved");

  const handleBatchAction = async (action: string, filterStatus: string) => {
    const ids = selectedLeads.filter(l => l.status === filterStatus).map(l => l.id);
    if (ids.length === 0) return;
    try {
      await actionMutation.mutateAsync({ action, lead_ids: ids, pool_id: poolId });
      toast.success(`Actie gestart voor ${ids.length} leads`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSendConfirm = async () => {
    const ids = selectedLeads.filter(l => l.status === "email_approved").map(l => l.id);
    try {
      await actionMutation.mutateAsync({ action: "send", lead_ids: ids, pool_id: poolId });
      toast.success(`${ids.length} emails verstuurd`);
      setSendConfirm(false);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEmailSave = async (subject: string, body: string, approve: boolean) => {
    if (!editingLead) return;
    try {
      await actionMutation.mutateAsync({
        action: "update_email",
        lead_ids: [editingLead.id],
        pool_id: poolId,
        email_subject: subject,
        email_body: body,
        approve,
      });
      toast.success(approve ? "Email goedgekeurd" : "Email opgeslagen");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-erp-text3" />
      </div>
    );
  }

  const remaining = Math.max(0, (sendStatus.limit ?? 10) - (sendStatus.sent ?? 0));
  const approvedCount = selectedLeads.filter(l => l.status === "email_approved").length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate("/prospecting")} className="text-erp-text3 hover:text-erp-text1 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[22px] font-bold tracking-tight text-erp-text0">{pool?.name || "Pool"}</h1>
        {pool?.source && (
          <Badge color="hsl(210,70%,55%)">{pool.source === "google_maps" ? "Google Maps" : pool.source}</Badge>
        )}
      </div>
      <div className="flex items-center gap-4 mb-5 ml-8">
        <span className="text-[12px] text-erp-text3">
          {pool?.created_at && new Date(pool.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </span>
        <span className="text-[12px] text-erp-text2 font-medium">
          Vandaag: {sendStatus.sent ?? 0}/{sendStatus.limit ?? 10} verstuurd
        </span>
      </div>

      {/* Pipeline steps */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveStep(null)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap border",
            !activeStep
              ? "bg-erp-blue/10 text-erp-blue border-erp-blue/20"
              : "bg-erp-bg3 text-erp-text2 border-erp-border0 hover:text-erp-text1"
          )}
        >
          Alle ({leads.length})
        </button>
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center">
            {i > 0 && <span className="text-erp-text3/40 mx-0.5">→</span>}
            <button
              onClick={() => setActiveStep(activeStep === step.key ? null : step.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap border",
                activeStep === step.key
                  ? "bg-erp-blue/10 text-erp-blue border-erp-blue/20"
                  : "bg-erp-bg3 text-erp-text2 border-erp-border0 hover:text-erp-text1"
              )}
            >
              {step.label}: {stepCounts[step.key] ?? 0}
            </button>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap mb-4 bg-erp-bg2 border border-erp-border0 rounded-lg px-4 py-2.5">
        <button onClick={selectAll} className="text-[12px] text-erp-blue font-medium hover:underline">
          {selectedIds.size === filteredLeads.length && filteredLeads.length > 0 ? "Deselecteer alle" : "Selecteer alle"}
        </button>
        <span className="text-[11px] text-erp-text3">· {selectedIds.size} geselecteerd</span>
        <div className="flex-1" />
        <ErpButton onClick={() => handleBatchAction("analyze", "new")} disabled={!canAnalyze || actionMutation.isPending}>
          Analyseer
        </ErpButton>
        <ErpButton onClick={() => handleBatchAction("build_demos", "scored")} disabled={!canBuildDemos || actionMutation.isPending}>
          Bouw demo's
        </ErpButton>
        <ErpButton onClick={() => handleBatchAction("draft_emails", "demo_ready")} disabled={!canDraftEmails || actionMutation.isPending}>
          Genereer emails
        </ErpButton>
        <ErpButton primary onClick={() => setSendConfirm(true)} disabled={!canSend || actionMutation.isPending}>
          Verstuur goedgekeurde
        </ErpButton>
      </div>

      {/* Lead list */}
      <div className="space-y-2">
        {filteredLeads.length === 0 ? (
          <ErpCard className="p-8 text-center">
            <p className="text-[13px] text-erp-text3">Geen leads in deze stap</p>
          </ErpCard>
        ) : (
          filteredLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              selected={selectedIds.has(lead.id)}
              onSelect={v => toggleSelect(lead.id, v)}
              expanded={expandedId === lead.id}
              onExpand={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
            />
          ))
        )}
      </div>

      {/* Email editor */}
      {editingLead && (
        <EmailEditorSheet
          lead={editingLead}
          open={!!editingLead}
          onClose={() => setEditingLead(null)}
          onSave={handleEmailSave}
        />
      )}

      {/* Send confirmation dialog */}
      <Dialog open={sendConfirm} onOpenChange={setSendConfirm}>
        <DialogContent className="bg-erp-bg2 border-erp-border0">
          <DialogHeader>
            <DialogTitle className="text-erp-text0">Emails versturen</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-erp-text2">
            Je staat op het punt <strong>{approvedCount}</strong> emails te versturen.
            Vandaag heb je nog <strong>{remaining}</strong> van je limiet over.
          </p>
          {approvedCount > remaining && (
            <p className="text-[12px] text-erp-red font-medium mt-1">
              ⚠️ Je hebt niet genoeg limiet. Maximaal {remaining} emails worden verstuurd.
            </p>
          )}
          <DialogFooter className="gap-2">
            <ErpButton onClick={() => setSendConfirm(false)}>Annuleren</ErpButton>
            <ErpButton primary onClick={handleSendConfirm} disabled={actionMutation.isPending}>
              {actionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Verstuur {Math.min(approvedCount, remaining)} emails
            </ErpButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
