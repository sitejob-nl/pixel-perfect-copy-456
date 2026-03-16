import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { Database } from "@/integrations/supabase/types";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];
type DealInsert = Database["public"]["Tables"]["deals"]["Insert"];
type StageRow = Database["public"]["Tables"]["pipeline_stages"]["Row"];

export interface DealWithRelations extends DealRow {
  pipeline_stages: { name: string; color: string | null; sort_order: number; is_won: boolean | null; is_lost: boolean | null; probability: number | null } | null;
  contacts: { first_name: string; last_name: string | null; email: string | null; phone: string | null; linkedin_url: string | null } | null;
  companies: { name: string } | null;
  profiles: { full_name: string | null; avatar_url: string | null; email: string | null } | null;
  _task_count?: number;
}

export function usePipelineStages() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["pipeline_stages", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as StageRow[];
    },
  });
}

export function useDeals() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["deals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, pipeline_stages(name, color, sort_order, is_won, is_lost, probability), contacts(first_name, last_name, email, phone, linkedin_url), companies(name), profiles(full_name, avatar_url, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DealWithRelations[];
    },
  });
}

export function useDealTasks(dealId: string | null) {
  return useQuery({
    queryKey: ["deal-tasks", dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deal: DealInsert) => {
      const { data, error } = await supabase
        .from("deals")
        .insert(deal)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { data, error } = await supabase
        .from("deals")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}
