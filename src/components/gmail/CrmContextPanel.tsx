import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ErpCard, Badge, Dot, Chip } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useThreadSuggestions,
  useApproveSuggestion,
  useRejectSuggestion,
  type EmailThread,
  type AiSuggestion,
} from "@/hooks/useGmailThreads";

const tempColors: Record<string, string> = {
  hot: "#ef4444", warm: "#f59e0b", cold: "#3b82f6",
};

const suggestionIcons: Record<string, string> = {
  create_task: "✅", create_deal: "💰", update_contact: "👤",
  log_activity: "📝", flag_urgent: "🚨", send_followup: "📧",
};

interface Props {
  thread: EmailThread | null;
  emailIds: string[];
}

export default function CrmContextPanel({ thread, emailIds }: Props) {
  const navigate = useNavigate();
  const approve = useApproveSuggestion();
  const reject = useRejectSuggestion();
  const { data: suggestions = [], isLoading: sugLoading } = useThreadSuggestions(emailIds);

  const contactId = thread?.matched_contact_id;
  const companyId = thread?.matched_company_id;

  const { data: contact } = useQuery({
    queryKey: ["gmail-contact", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").eq("id", contactId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: company } = useQuery({
    queryKey: ["gmail-company", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ["gmail-activities", contactId, companyId],
    enabled: !!contactId || !!companyId,
    queryFn: async () => {
      let query = supabase.from("activities").select("id, subject, activity_type, created_at").order("created_at", { ascending: false }).limit(5);
      if (contactId) query = query.eq("contact_id", contactId);
      else if (companyId) query = query.eq("company_id", companyId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recentCalls = [] } = useQuery({
    queryKey: ["gmail-calls", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_log")
        .select("id, direction, duration_seconds, created_at")
        .eq("matched_company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  const pendingSuggestions = suggestions.filter(s => s.status === "pending");
  const processedSuggestions = suggestions.filter(s => s.status !== "pending");

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast.success("Suggestie goedgekeurd");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reject.mutateAsync(id);
      toast.success("Suggestie afgewezen");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!thread) return null;

  return (
    <div className="w-[300px] min-w-[300px] border-l border-erp-border0 h-full overflow-y-auto p-3 space-y-3">
      {/* CRM Context */}
      {contact ? (
        <ErpCard className="p-3">
          <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider mb-2">Contact</div>
          <div
            className="text-[13px] font-medium text-erp-text0 cursor-pointer hover:text-erp-blue transition"
            onClick={() => navigate(`/contacts/${contact.id}`)}
          >
            {contact.first_name} {contact.last_name}
          </div>
          {contact.email && <div className="text-[11px] text-erp-text3 mt-0.5">{contact.email}</div>}
          {contact.phone && <div className="text-[11px] text-erp-text3">{contact.phone}</div>}
          {contact.job_title && <div className="text-[11px] text-erp-text2 mt-1">{contact.job_title}</div>}
          <div className="flex items-center gap-2 mt-2">
            {(contact as any).temperature && (
              <Badge color={tempColors[(contact as any).temperature] || "#6b7280"}>
                {(contact as any).temperature}
              </Badge>
            )}
            {(contact as any).lead_score != null && (
              <span className="text-[10px] text-erp-text3">Score: {(contact as any).lead_score}</span>
            )}
          </div>
        </ErpCard>
      ) : (
        <ErpCard className="p-3">
          <div className="text-[11px] text-erp-text3 text-center py-2">
            Onbekend contact
          </div>
          <button className="w-full text-[11px] text-erp-blue hover:underline text-center">
            + Contact aanmaken
          </button>
        </ErpCard>
      )}

      {company && (
        <ErpCard className="p-3">
          <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider mb-2">Bedrijf</div>
          <div
            className="text-[13px] font-medium text-erp-text0 cursor-pointer hover:text-erp-blue transition"
            onClick={() => navigate(`/companies/${company.id}`)}
          >
            {company.name}
          </div>
          {company.industry && <div className="text-[11px] text-erp-text2 mt-0.5">{company.industry}</div>}
          {company.city && <div className="text-[11px] text-erp-text3">{company.city}</div>}
        </ErpCard>
      )}

      {/* Recent activities */}
      {recentActivities.length > 0 && (
        <ErpCard className="p-3">
          <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider mb-2">Recente activiteiten</div>
          {recentActivities.map((a: any) => (
            <div key={a.id} className="flex items-center gap-2 py-1.5 border-b border-erp-border0 last:border-none">
              <span className="text-[11px]">
                {a.activity_type === "call" ? "📞" : a.activity_type === "email" ? "📧" : a.activity_type === "meeting" ? "🤝" : "📝"}
              </span>
              <span className="text-[11px] text-erp-text1 truncate flex-1">{a.subject}</span>
              <span className="text-[10px] text-erp-text3 flex-shrink-0">
                {formatDistanceToNow(new Date(a.created_at), { locale: nl, addSuffix: false })}
              </span>
            </div>
          ))}
        </ErpCard>
      )}

      {/* Recent calls */}
      {recentCalls.length > 0 && (
        <ErpCard className="p-3">
          <div className="text-[11px] font-semibold text-erp-text3 uppercase tracking-wider mb-2">Recente gesprekken</div>
          {recentCalls.map((c: any) => (
            <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-erp-border0 last:border-none">
              <span className="text-[11px]">{c.direction === "inbound" ? "📥" : "📤"}</span>
              <span className="text-[11px] text-erp-text1 flex-1">
                {c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, "0")}` : "0:00"}
              </span>
              <span className="text-[10px] text-erp-text3">
                {formatDistanceToNow(new Date(c.created_at), { locale: nl, addSuffix: false })}
              </span>
            </div>
          ))}
        </ErpCard>
      )}

      {/* AI Suggestions */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <Sparkles className="w-3.5 h-3.5 text-erp-amber" />
          <span className="text-[12px] font-semibold text-erp-text0">AI Suggesties</span>
          {pendingSuggestions.length > 0 && (
            <span className="text-[9px] bg-erp-amber/20 text-erp-amber px-1.5 py-0.5 rounded-full font-medium">
              {pendingSuggestions.length}
            </span>
          )}
        </div>

        {sugLoading ? (
          <div className="space-y-2">
            {[1,2].map(i => <Skeleton key={i} className="h-20 w-full bg-erp-bg3 rounded-lg" />)}
          </div>
        ) : pendingSuggestions.length === 0 && processedSuggestions.length === 0 ? (
          <ErpCard className="p-4 text-center">
            <Sparkles className="w-5 h-5 text-erp-text3 mx-auto mb-1 opacity-40" />
            <p className="text-[11px] text-erp-text3">Geen suggesties voor deze thread</p>
          </ErpCard>
        ) : (
          <div className="space-y-2">
            {/* Pending */}
            {pendingSuggestions.map(s => (
              <SuggestionCard key={s.id} suggestion={s} onApprove={handleApprove} onReject={handleReject} isPending />
            ))}
            {/* Processed */}
            {processedSuggestions.map(s => (
              <SuggestionCard key={s.id} suggestion={s} onApprove={handleApprove} onReject={handleReject} isPending={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion: s,
  onApprove,
  onReject,
  isPending,
}: {
  suggestion: AiSuggestion;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}) {
  const confidence = (s.confidence ?? 0) * 100;
  const barColor = confidence > 70 ? "bg-emerald-500" : confidence > 40 ? "bg-amber-500" : "bg-red-500";
  const icon = suggestionIcons[s.suggestion_type] || "💡";

  return (
    <ErpCard className={cn("p-3", !isPending && "opacity-60")}>
      <div className="flex items-start gap-2">
        <span className="text-[14px]">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-erp-text0">{s.title}</div>
          {s.description && <p className="text-[10px] text-erp-text2 mt-0.5">{s.description}</p>}

          {/* Confidence bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 bg-erp-bg4 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", barColor)} style={{ width: `${confidence}%` }} />
            </div>
            <span className="text-[9px] text-erp-text3">{Math.round(confidence)}%</span>
          </div>

          {/* Suggested data */}
          {s.suggested_data && Object.keys(s.suggested_data).length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {Object.entries(s.suggested_data).slice(0, 4).map(([k, v]) => (
                <div key={k} className="text-[10px] text-erp-text3">
                  <span className="text-erp-text2">{k}:</span> {String(v)}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {isPending ? (
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => onApprove(s.id)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-emerald-500/15 text-emerald-400 rounded hover:bg-emerald-500/25 transition"
              >
                ✓ Goedkeuren
              </button>
              <button
                onClick={() => onReject(s.id)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-erp-bg4 text-erp-text3 rounded hover:bg-erp-hover transition"
              >
                ✗ Afwijzen
              </button>
            </div>
          ) : (
            <div className="mt-1.5">
              <span className={cn(
                "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                s.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-erp-bg4 text-erp-text3"
              )}>
                {s.status === "approved" ? "Goedgekeurd" : "Afgewezen"}
              </span>
            </div>
          )}
        </div>
      </div>
    </ErpCard>
  );
}
