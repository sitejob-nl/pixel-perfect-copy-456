import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader, StatCard, FilterButton, TH, TD, TR, Badge } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Loader2, PhoneIncoming, PhoneOutgoing, PhoneMissed, Mic, FileText, X, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

const sb = supabase as any;

const FILTERS = [
  { key: "all", label: "Alle" },
  { key: "inbound", label: "Inkomend" },
  { key: "outbound", label: "Uitgaand" },
  { key: "missed", label: "Gemist" },
  { key: "recording", label: "Met opname" },
  { key: "transcription", label: "Met transcriptie" },
];

export default function CallsPage() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { session } = useAuth();

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["call-log", orgId, filter],
    enabled: !!orgId,
    queryFn: async () => {
      let q = sb.from("call_log")
        .select("*")
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false })
        .limit(100);

      if (filter === "inbound") q = q.eq("direction", "inbound");
      else if (filter === "outbound") q = q.eq("direction", "outbound");
      else if (filter === "missed") q = q.eq("status", "missed");
      else if (filter === "recording") q = q.eq("has_recording", true);
      else if (filter === "transcription") q = q.eq("has_transcription", true);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!).eq("status", "in_progress").order("name");
      return data ?? [];
    },
  });

  // Stats
  const todayCount = calls.filter((c: any) => {
    const d = new Date(c.started_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const missedCount = calls.filter((c: any) => {
    const d = new Date(c.started_at);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return c.status === "missed" && d > weekAgo;
  }).length;

  const avgDuration = calls.length > 0
    ? Math.round(calls.filter((c: any) => c.duration_seconds > 0).reduce((acc: number, c: any) => acc + (c.duration_seconds || 0), 0) / Math.max(calls.filter((c: any) => c.duration_seconds > 0).length, 1) / 60)
    : 0;

  const saveNotes = async () => {
    if (!selectedCall) return;
    setSavingNotes(true);
    try {
      await sb.from("call_log").update({ notes }).eq("id", selectedCall.id);
      qc.invalidateQueries({ queryKey: ["call-log"] });
      toast.success("Notitie opgeslagen");
    } finally {
      setSavingNotes(false);
    }
  };

  const linkProject = async (projectId: string) => {
    if (!selectedCall) return;
    await sb.from("call_log").update({ matched_project_id: projectId || null }).eq("id", selectedCall.id);
    qc.invalidateQueries({ queryKey: ["call-log"] });
    toast.success("Project gekoppeld");
  };

  const analyzeCall = async () => {
    if (!selectedCall || !session?.access_token) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-sitejob`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "analyze_call", entity_id: selectedCall.id, org_id: orgId }),
      });
      if (!res.ok) throw new Error("Analyse mislukt");
      const result = await res.json();
      // Refresh call data
      qc.invalidateQueries({ queryKey: ["call-log"] });
      setSelectedCall({ ...selectedCall, sentiment: result.sentiment, ai_summary: result.summary, ai_action_items: result.action_items });
      toast.success("Gesprek geanalyseerd");
    } catch (err: any) {
      toast.error(err.message || "Analyse mislukt");
    } finally {
      setAnalyzing(false);
    }
  };

  const openCall = (call: any) => {
    setSelectedCall(call);
    setNotes(call.notes || "");
  };

  const DirectionIcon = ({ call }: { call: any }) => {
    if (call.status === "missed") return <PhoneMissed className="w-4 h-4 text-erp-red" />;
    if (call.direction === "inbound") return <PhoneIncoming className="w-4 h-4 text-erp-green" />;
    return <PhoneOutgoing className="w-4 h-4 text-erp-blue" />;
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "ended": return "Afgerond";
      case "missed": return "Gemist";
      case "in_progress": return "Bezig";
      case "ringing": return "Overgaat";
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "ended": return "hsl(var(--erp-green))";
      case "missed": return "hsl(var(--erp-red))";
      case "in_progress": return "hsl(var(--erp-blue))";
      default: return "hsl(var(--erp-text-2))";
    }
  };

  const formatDuration = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader title="Gesprekken" desc="Voys call tracking en opnames" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Gesprekken vandaag" value={String(todayCount)} change="vandaag" up={true} />
        <StatCard label="Gemiste gesprekken" value={String(missedCount)} change="afgelopen 7 dagen" up={false} />
        <StatCard label="Gemiddelde duur" value={`${avgDuration} min`} change="gemiddeld" up={true} />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <FilterButton key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </FilterButton>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-erp-text3" /></div>
      ) : calls.length === 0 ? (
        <div className="text-center py-12 text-erp-text3 text-sm">Geen gesprekken gevonden</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-erp-border0">
          <table className="w-full">
            <thead>
              <tr>
                <TH></TH>
                <TH>Contact</TH>
                <TH>Nummer</TH>
                <TH>Status</TH>
                <TH>Duur</TH>
                <TH>Wanneer</TH>
                <TH></TH>
              </tr>
            </thead>
            <tbody>
              {calls.map((call: any) => {
                const externalNumber = call.direction === "inbound" ? call.caller_number : call.destination_number;
                const contactName = call.caller_name || externalNumber || "Onbekend";
                return (
                  <TR key={call.id} onClick={() => openCall(call)}>
                    <TD><DirectionIcon call={call} /></TD>
                    <TD>
                      <div className="text-erp-text0 text-[13px]">{contactName}</div>
                    </TD>
                    <TD className="text-erp-text2 font-mono text-xs">{externalNumber || "—"}</TD>
                    <TD><Badge color={statusColor(call.status)}>{statusLabel(call.status)}</Badge></TD>
                    <TD className="text-erp-text2">{formatDuration(call.duration_seconds)}</TD>
                    <TD className="text-erp-text3 text-xs">
                      {call.started_at ? formatDistanceToNow(new Date(call.started_at), { locale: nl, addSuffix: true }) : "—"}
                    </TD>
                    <TD>
                      <div className="flex gap-1">
                        {call.has_recording && <Mic className="w-3.5 h-3.5 text-erp-amber" />}
                        {call.has_transcription && <FileText className="w-3.5 h-3.5 text-erp-blue" />}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Call detail sheet */}
      <Sheet open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <SheetContent className="bg-erp-bg1 border-erp-border0 w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-erp-text0">Gespreksdetails</SheetTitle>
          </SheetHeader>
          {selectedCall && (
            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-erp-text3">Richting</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <DirectionIcon call={selectedCall} />
                    <span className="text-[13px] text-erp-text0">{selectedCall.direction === "inbound" ? "Inkomend" : "Uitgaand"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-erp-text3">Status</p>
                  <div className="mt-1"><Badge color={statusColor(selectedCall.status)}>{statusLabel(selectedCall.status)}</Badge></div>
                </div>
                <div>
                  <p className="text-xs text-erp-text3">Beller</p>
                  <p className="text-[13px] text-erp-text0 mt-1">{selectedCall.caller_name || selectedCall.caller_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-erp-text3">Bestemming</p>
                  <p className="text-[13px] text-erp-text0 mt-1">{selectedCall.destination_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-erp-text3">Duur</p>
                  <p className="text-[13px] text-erp-text0 mt-1">{formatDuration(selectedCall.duration_seconds)}</p>
                </div>
                <div>
                  <p className="text-xs text-erp-text3">Tijdstip</p>
                  <p className="text-[13px] text-erp-text0 mt-1">
                    {selectedCall.started_at ? format(new Date(selectedCall.started_at), "d MMM HH:mm", { locale: nl }) : "—"}
                  </p>
                </div>
              </div>

              {/* Audio player */}
              {selectedCall.has_recording && selectedCall.recording_url && (
                <div>
                  <p className="text-xs text-erp-text3 mb-2">Opname</p>
                  <audio controls className="w-full" src={selectedCall.recording_url} />
                </div>
              )}

              {/* Transcription */}
              {selectedCall.has_transcription && selectedCall.transcription_text && (
                <div>
                  <p className="text-xs text-erp-text3 mb-2">Transcriptie</p>
                  <div className="bg-erp-bg3 rounded-lg p-3 text-[13px] text-erp-text1 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedCall.transcription_text}
                  </div>
                </div>
              )}

              {/* AI Analyze button */}
              {selectedCall.has_transcription && !selectedCall.ai_summary && (
                <button
                  onClick={analyzeCall}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-erp-blue to-erp-purple text-white text-xs font-medium hover:brightness-110 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {analyzing ? "Analyseren..." : "AI Analyse"}
                </button>
              )}

              {/* AI Summary */}
              {selectedCall.ai_summary && (
                <div>
                  <p className="text-xs text-erp-text3 mb-2">AI Samenvatting</p>
                  <div className="bg-erp-bg3 rounded-lg p-3 text-[13px] text-erp-text1">
                    {selectedCall.ai_summary}
                  </div>
                </div>
              )}

              {/* Action items */}
              {selectedCall.ai_action_items && Array.isArray(selectedCall.ai_action_items) && selectedCall.ai_action_items.length > 0 && (
                <div>
                  <p className="text-xs text-erp-text3 mb-2">Actiepunten</p>
                  <ul className="space-y-1">
                    {selectedCall.ai_action_items.map((item: string, i: number) => (
                      <li key={i} className="text-[13px] text-erp-text1 flex items-start gap-2">
                        <span className="text-erp-blue mt-0.5">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs text-erp-text3 mb-2">Notitie</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Voeg een notitie toe..."
                  className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[13px] min-h-[80px]"
                />
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-erp-blue text-white text-xs font-medium hover:brightness-110 disabled:opacity-50"
                >
                  {savingNotes ? "Opslaan..." : "Notitie opslaan"}
                </button>
              </div>

              {/* Link project */}
              <div>
                <p className="text-xs text-erp-text3 mb-2">Koppel aan project</p>
                <Select
                  value={selectedCall.matched_project_id || ""}
                  onValueChange={linkProject}
                >
                  <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[13px]">
                    <SelectValue placeholder="Selecteer project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-erp-bg3 border-erp-border0">
                    {projects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="text-erp-text0 text-[13px]">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
