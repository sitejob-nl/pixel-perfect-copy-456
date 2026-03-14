import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ErpCard, ErpButton } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { Sparkles, RefreshCw, Lightbulb, AlertTriangle, Bell, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  entityType: string;
  entityId: string;
  orgId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  warning: <AlertTriangle className="w-3.5 h-3.5 text-erp-amber" />,
  opportunity: <Lightbulb className="w-3.5 h-3.5 text-erp-green" />,
  reminder: <Bell className="w-3.5 h-3.5 text-erp-blue" />,
  insight: <TrendingUp className="w-3.5 h-3.5 text-erp-purple" />,
};

const priorityBorder: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-green-500",
};

export default function AiSidePanel({ entityType, entityId, orgId }: Props) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [regenerating, setRegenerating] = useState(false);

  // Fetch cached summary
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["ai-summary", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ai_summaries")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
  });

  // Fetch suggestions
  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["ai-suggestions", orgId],
    enabled: !!orgId && !!session?.access_token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-sitejob`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ action: "suggest_actions", org_id: orgId }),
      });
      if (!res.ok) return { suggestions: [] };
      return await res.json();
    },
  });

  const regenerateSummary = async () => {
    if (!session?.access_token) return;
    setRegenerating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-sitejob`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "summarize", entity_type: entityType, entity_id: entityId, org_id: orgId }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["ai-summary", entityType, entityId] });
      }
    } finally {
      setRegenerating(false);
    }
  };

  // Auto-generate if no summary
  useEffect(() => {
    if (!summaryLoading && !summaryData && session?.access_token && !regenerating) {
      regenerateSummary();
    }
  }, [summaryLoading, summaryData]);

  return (
    <div className="w-[320px] flex-shrink-0 space-y-4">
      {/* Summary */}
      <ErpCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-erp-amber" />
            <span className="text-[13px] font-semibold text-erp-text0">AI Samenvatting</span>
          </div>
          <button
            onClick={regenerateSummary}
            disabled={regenerating}
            className="p-1 rounded hover:bg-erp-hover text-erp-text3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
          </button>
        </div>

        {summaryLoading || regenerating ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full bg-erp-bg3" />
            <Skeleton className="h-3 w-4/5 bg-erp-bg3" />
            <Skeleton className="h-3 w-3/5 bg-erp-bg3" />
          </div>
        ) : summaryData ? (
          <div>
            <p className="text-[13px] text-erp-text1 leading-relaxed">{summaryData.summary}</p>
            <p className="text-[10px] text-erp-text3 mt-2">
              Gecached · {formatDistanceToNow(new Date(summaryData.generated_at), { addSuffix: true, locale: nl })}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-erp-text3">Geen samenvatting beschikbaar</p>
        )}
      </ErpCard>

      {/* Suggestions */}
      <ErpCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-erp-amber" />
          <span className="text-[13px] font-semibold text-erp-text0">AI Suggesties</span>
        </div>

        {suggestionsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full bg-erp-bg3" />
            <Skeleton className="h-12 w-full bg-erp-bg3" />
          </div>
        ) : (
          <div className="space-y-2">
            {(suggestions?.suggestions || []).slice(0, 4).map((s: any, i: number) => (
              <div
                key={i}
                className={`border-l-2 ${priorityBorder[s.priority] || "border-l-gray-500"} bg-erp-bg3 rounded-r-lg p-2.5`}
              >
                <div className="flex items-start gap-2">
                  {typeIcons[s.type] || typeIcons.insight}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-erp-text0">{s.title}</p>
                    <p className="text-[11px] text-erp-text2 mt-0.5">{s.description}</p>
                  </div>
                </div>
              </div>
            ))}
            {(!suggestions?.suggestions || suggestions.suggestions.length === 0) && (
              <p className="text-[12px] text-erp-text3">Geen suggesties op dit moment</p>
            )}
          </div>
        )}
      </ErpCard>
    </div>
  );
}
