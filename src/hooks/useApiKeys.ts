import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface ApiKeyStatus {
  anthropic_key_set: boolean;
  anthropic_key_hint: string | null;
  anthropic_key_verified_at: string | null;
  apify_key_set: boolean;
  apify_key_hint: string | null;
  apify_key_verified_at: string | null;
  selected_model: string | null;
}

export function useApiKeyStatus() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["api-key-status", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_api_keys")
        .select("anthropic_key_set, anthropic_key_hint, anthropic_key_verified_at, apify_key_set, apify_key_hint, apify_key_verified_at, selected_model")
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ApiKeyStatus | null) ?? {
        anthropic_key_set: false,
        anthropic_key_hint: null,
        anthropic_key_verified_at: null,
        apify_key_set: false,
        apify_key_hint: null,
        apify_key_verified_at: null,
        selected_model: null,
      };
    },
  });
}

export function useSetApiKey() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async ({ service, apiKey }: { service: "anthropic" | "apify"; apiKey: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        body: { action: "set", service, api_key: apiKey, organization_id: org!.organization_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-key-status"] });
    },
  });
}

export function useVerifyApiKey() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async (service: "anthropic" | "apify") => {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        body: { action: "verify", service, organization_id: org!.organization_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-key-status"] });
    },
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async (service: "anthropic" | "apify") => {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        body: { action: "delete", service, organization_id: org!.organization_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-key-status"] });
    },
  });
}
