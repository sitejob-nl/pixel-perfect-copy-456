import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { ErpCard, ErpButton } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  entityType: string;
  entityId: string;
}

export default function AiSummaryCard({ entityType, entityId }: Props) {
  const { session } = useAuth();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: summary, isLoading } = useQuery({
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

  const generate = async () => {
    if (!session?.access_token || !orgId) return;
    setGenerating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-sitejob`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "summarize",
          entity_type: entityType,
          entity_id: entityId,
          org_id: orgId,
        }),
      });

      if (!res.ok) throw new Error("AI fout");

      qc.invalidateQueries({ queryKey: ["ai-summary", entityType, entityId] });
      toast.success("Samenvatting gegenereerd");
    } catch (err: any) {
      console.error("AI summary error:", err);
      toast.error("Fout bij genereren: " + (err.message || "Onbekende fout"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ErpCard className="p-5 mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-erp-amber" />
          <span className="text-[14px] font-semibold text-erp-text0">AI Samenvatting</span>
        </div>
        {summary ? (
          <button onClick={generate} disabled={generating} className="p-1 rounded hover:bg-erp-hover text-erp-text3">
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
          </button>
        ) : null}
      </div>

      {isLoading || generating ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full bg-erp-bg3" />
          <Skeleton className="h-3 w-4/5 bg-erp-bg3" />
          <Skeleton className="h-3 w-3/5 bg-erp-bg3" />
        </div>
      ) : summary ? (
        <div>
          <div className="text-[13px] text-erp-text1 whitespace-pre-wrap">{summary.summary}</div>
          <div className="text-[11px] text-erp-text3 mt-2">
            Gecached · {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true, locale: nl })}
          </div>
        </div>
      ) : (
        <div className="text-center py-3">
          <div className="text-[13px] text-erp-text3 mb-3">Nog geen samenvatting beschikbaar</div>
          <ErpButton primary onClick={generate} disabled={generating}>
            Genereer samenvatting
          </ErpButton>
        </div>
      )}
    </ErpCard>
  );
}
