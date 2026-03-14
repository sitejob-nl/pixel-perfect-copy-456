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

  const { data: summary } = useQuery({
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
      // Get entity context
      const { data: context, error: ctxErr } = await (supabase as any).rpc("fn_get_entity_context", {
        p_entity_type: entityType,
        p_entity_id: entityId,
      });
      if (ctxErr) throw ctxErr;

      // Call AI
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Je bent een project-assistent voor SiteJob. Maak een beknopte samenvatting (max 3 zinnen) van dit ${entityType} op basis van de volgende context. Focus op: huidige status, openstaande acties, en belangrijkste aandachtspunten. Antwoord in het Nederlands.\n\nContext: ${JSON.stringify(context)}`,
              },
            ],
            system: "Je bent een zakelijke assistent. Geef beknopte samenvattingen in het Nederlands.",
          }),
        }
      );

      if (!response.ok) throw new Error("AI fout");

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let summaryText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          // Parse SSE
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) summaryText += delta;
              // Also handle non-streaming response
              const content = parsed.content?.[0]?.text;
              if (content) summaryText += content;
            } catch { /* partial */ }
          }
        }
      }

      if (!summaryText.trim()) {
        // Fallback: try reading as JSON
        summaryText = "Samenvatting kon niet worden gegenereerd.";
      }

      // Upsert summary
      const { error: upsertErr } = await (supabase as any)
        .from("ai_summaries")
        .upsert({
          organization_id: orgId,
          entity_type: entityType,
          entity_id: entityId,
          summary: summaryText.trim(),
          key_points: [],
          generated_at: new Date().toISOString(),
          generated_by: session.user.id,
          is_stale: false,
        }, { onConflict: "entity_type,entity_id" });

      if (upsertErr) throw upsertErr;

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
          <Icons.Bot className="w-4 h-4 text-erp-blue" />
          <span className="text-[14px] font-semibold text-erp-text0">AI Samenvatting</span>
        </div>
        {summary ? (
          <ErpButton onClick={generate} disabled={generating}>
            {generating ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-erp-text3 border-t-erp-blue rounded-full animate-spin" />
                Genereren...
              </span>
            ) : "Vernieuwen"}
          </ErpButton>
        ) : null}
      </div>

      {summary ? (
        <div>
          <div className="text-[13px] text-erp-text1 whitespace-pre-wrap">{summary.summary}</div>
          <div className="text-[11px] text-erp-text3 mt-2">
            Gegenereerd {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true, locale: nl })}
          </div>
        </div>
      ) : (
        <div className="text-center py-3">
          <div className="text-[13px] text-erp-text3 mb-3">Nog geen samenvatting beschikbaar</div>
          <ErpButton primary onClick={generate} disabled={generating}>
            {generating ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Genereren...
              </span>
            ) : "Genereer samenvatting"}
          </ErpButton>
        </div>
      )}
    </ErpCard>
  );
}
