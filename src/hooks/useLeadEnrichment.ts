import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export function useLeadPipeline() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["lead-pipeline", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_lead_pipeline")
        .select("*")
        .eq("organization_id", orgId!)
        .order("lead_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useHotLeads() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["hot-leads", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_hot_leads")
        .select("*")
        .eq("organization_id", orgId!)
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useEnrichmentStatus() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["enrichment-status", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("enrich-leads", {
        body: { action: "status", organization_id: orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        raw_leads: Record<string, number>;
        lead_enrichments: number;
      };
    },
  });
}

export function useProcessLeads() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async (params?: { enrich_limit?: number; import_limit?: number; min_import_score?: number }) => {
      const orgId = org?.organization_id;
      if (!orgId) throw new Error("Geen organisatie");

      const { data, error } = await supabase.functions.invoke("enrich-leads", {
        body: {
          action: "process-all",
          organization_id: orgId,
          enrich_limit: params?.enrich_limit ?? 20,
          import_limit: params?.import_limit ?? 50,
          min_import_score: params?.min_import_score ?? 0,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { pipeline: Record<string, number> };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-pipeline"] });
      qc.invalidateQueries({ queryKey: ["hot-leads"] });
      qc.invalidateQueries({ queryKey: ["enrichment-status"] });
      qc.invalidateQueries({ queryKey: ["scrape-runs"] });
    },
  });
}
