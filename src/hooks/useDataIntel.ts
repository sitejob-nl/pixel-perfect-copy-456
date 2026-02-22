import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DataSourceRow = Database["public"]["Tables"]["data_sources"]["Row"];
type ScrapeRunRow = Database["public"]["Tables"]["scrape_runs"]["Row"];
type ScoringRuleRow = Database["public"]["Tables"]["scoring_rules"]["Row"];
type OutreachSequenceRow = Database["public"]["Tables"]["outreach_sequences"]["Row"];

export function useDataSources() {
  return useQuery({
    queryKey: ["data-sources"],
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
  return useQuery({
    queryKey: ["scrape-runs"],
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
  return useQuery({
    queryKey: ["scoring-rules"],
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
  return useQuery({
    queryKey: ["outreach-sequences"],
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
