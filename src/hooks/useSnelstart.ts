import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function getOrganizationId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return membership?.organization_id || null;
}

export function useSnelstartConfig() {
  return useQuery({
    queryKey: ["snelstart-config"],
    queryFn: async () => {
      const orgId = await getOrganizationId();
      if (!orgId) return null;

      const { data, error } = await (supabase as any)
        .from("snelstart_config")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useSaveSnelstartConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      subscription_key?: string;
      app_short_name?: string;
      sync_interval?: string;
    }) => {
      const orgId = await getOrganizationId();
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
  return useQuery({
    queryKey: ["snelstart-sync-log"],
    queryFn: async () => {
      const orgId = await getOrganizationId();
      if (!orgId) return [];

      const { data, error } = await (supabase as any)
        .from("snelstart_sync_log")
        .select("*")
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });
}
