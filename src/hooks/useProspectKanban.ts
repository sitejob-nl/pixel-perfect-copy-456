import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface KanbanStage {
  status_key: string;
  label: string;
  color: string;
  icon: string;
  sort_order: number;
  is_terminal: boolean;
  is_positive?: boolean;
  count: number;
}

export interface ProspectLead {
  id: string;
  status: string;
  company_name: string;
  website_url?: string;
  phone?: string;
  city?: string;
  score?: number;
  score_breakdown?: Record<string, number>;
  fit_summary?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_job_title?: string;
  contact_linkedin_url?: string;
  contact_source?: string;
  demo_id?: string;
  demo_url?: string;
  demo_view_count?: number;
  demo_viewed_at?: string;
  email_subject?: string;
  email_body?: string;
  email_sent_at?: string;
  email_opened_at?: string;
  email_replied_at?: string;
  google_rating?: number;
  google_review_count?: number;
  last_contacted_at?: string;
  last_contact_channel?: string;
  notes?: string;
  assigned_to?: string;
  deal_id?: string;
  linkedin_message_draft?: string;
  analyzed_at?: string;
  demo_built_at?: string;
  email_drafted_at?: string;
  converted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanData {
  stages: KanbanStage[];
  leads: ProspectLead[];
  summary: { total: number; with_demo: number; demos_viewed: number; converted: number };
}

export function useProspectKanban(poolId?: string) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery<KanbanData>({
    queryKey: ["prospect-kanban", orgId, poolId],
    enabled: !!orgId,
    queryFn: async () => {
      const params: Record<string, any> = { p_organization_id: orgId };
      if (poolId) params.p_pool_id = poolId;
      const { data, error } = await supabase.rpc("get_prospect_kanban", params);
      if (error) throw error;
      return data as unknown as KanbanData;
    },
    refetchInterval: 15000,
  });
}

export function useUpdateProspectStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase
        .from("prospect_leads")
        .update({ status } as any)
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospect-kanban"] });
    },
  });
}

export function useConvertProspect() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      p_prospect_lead_id: string;
      p_deal_stage_id?: string;
      p_deal_value?: number;
      p_assigned_to?: string;
    }) => {
      const { data, error } = await supabase.rpc("convert_prospect_to_deal", params);
      if (error) throw error;
      return data as unknown as { success: boolean; company_id: string; contact_id: string; deal_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospect-kanban"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUpdateProspectLead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("prospect_leads")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospect-kanban"] });
    },
  });
}

export function useProspectPools() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["prospect-pools", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_pools")
        .select("id, name, source, status, total_leads")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteProspectLead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospect_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospect-kanban"] });
    },
  });
}
