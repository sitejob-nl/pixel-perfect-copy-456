import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export function useSnelstartConfig() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["snelstart-config", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("snelstart_config")
        .select("*")
        .eq("organization_id", orgId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useSaveSnelstartConfig() {
  const queryClient = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async (config: {
      subscription_key?: string;
      app_short_name?: string;
      sync_interval?: string;
      koppel_sleutel?: string;
      is_active?: boolean;
    }) => {
      const orgId = org?.organization_id;
      if (!orgId) throw new Error("No organization");

      const { data, error } = await (supabase as any)
        .from("snelstart_config")
        .upsert(
          {
            organization_id: orgId,
            ...config,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snelstart-config"] });
    },
  });
}

export function useSnelstartSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: string) => {
      const { data, error } = await supabase.functions.invoke("snelstart-sync", {
        body: { action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snelstart-config"] });
      queryClient.invalidateQueries({ queryKey: ["snelstart-sync-log"] });
    },
  });
}

export function useSnelstartSyncLog() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["snelstart-sync-log", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("snelstart_sync_log")
        .select("*")
        .eq("organization_id", orgId!)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });
}
