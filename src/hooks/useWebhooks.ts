import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export function useWebhookEndpoints() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["webhook-endpoints", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("webhook_endpoints")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useWebhookTemplates() {
  return useQuery({
    queryKey: ["webhook-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("webhook_source_templates")
        .select("*")
        .order("display_name");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useWebhookTargetFields(targetTable: string) {
  return useQuery({
    queryKey: ["webhook-target-fields", targetTable],
    enabled: !!targetTable,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("webhook_target_fields")
        .select("*")
        .eq("target_table", targetTable)
        .order("is_common", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useWebhookLogs(endpointId?: string) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["webhook-logs", orgId, endpointId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = (supabase as any)
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (endpointId) query = query.eq("endpoint_id", endpointId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateEndpoint() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();
  return useMutation({
    mutationFn: async (endpoint: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from("webhook_endpoints")
        .insert({ ...endpoint, organization_id: org!.organization_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });
}

export function useUpdateEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any)
        .from("webhook_endpoints")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });
}

export function useDeleteEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("webhook_endpoints")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });
}

export function useGenerateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (endpointId: string) => {
      const res = await supabase.functions.invoke("manage-webhooks", {
        body: { action: "generate_api_key", endpoint_id: endpointId },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data as { api_key: string; message: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async (endpointId: string) => {
      const res = await supabase.functions.invoke("manage-webhooks", {
        body: { action: "test_webhook", endpoint_id: endpointId },
      });
      if (res.error) throw res.error;
      return res.data as { test_payload: any; mapped_result: any; target_table: string };
    },
  });
}
