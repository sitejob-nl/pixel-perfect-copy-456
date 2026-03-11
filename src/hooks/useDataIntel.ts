import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { Database } from "@/integrations/supabase/types";

type DataSourceRow = Database["public"]["Tables"]["data_sources"]["Row"];
type ScrapeRunRow = Database["public"]["Tables"]["scrape_runs"]["Row"];
type ScoringRuleRow = Database["public"]["Tables"]["scoring_rules"]["Row"];
type OutreachSequenceRow = Database["public"]["Tables"]["outreach_sequences"]["Row"];

export function useDataSources() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["data-sources", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DataSourceRow[];
    },
  });
}

export interface ScrapeRunWithSource extends ScrapeRunRow {
  data_sources: { name: string; provider: string } | null;
}

export function useScrapeRuns() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["scrape-runs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scrape_runs")
        .select("*, data_sources(name, provider)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ScrapeRunWithSource[];
    },
  });
}

export function useScoringRules() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["scoring-rules", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scoring_rules")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ScoringRuleRow[];
    },
  });
}

export function useOutreachSequences() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["outreach-sequences", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_sequences")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OutreachSequenceRow[];
    },
  });
}

export function useStartScrapeRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      data_source_id: string;
      organization_id: string;
      actor_input: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke("run-scraper", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scrape-runs"] });
      qc.invalidateQueries({ queryKey: ["data-sources"] });
    },
  });
}

export function useDeleteScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scoring_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scoring-rules"] }),
  });
}
