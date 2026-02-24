import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Fetch snelstart config for current user's org
export function useSnelstartConfig() {
  return useQuery({
    queryKey: ["snelstart-config"],
    queryFn: async () => {
      // Get user's org
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return null;

      const { data, error } = await supabase
        .from("snelstart_config")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

// Save/update snelstart config
export function useSaveSnelstartConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: {
      subscription_key?: string;
      app_short_name?: string;
      sync_interval?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("No organization");

      // Upsert
      const { data, error } = await supabase
        .from("snelstart_config")
        .upsert(
          {
            organization_id: profile.organization_id,
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

// Trigger a sync action via edge function
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

// Fetch sync logs
export function useSnelstartSyncLog() {
  return useQuery({
    queryKey: ["snelstart-sync-log"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from("snelstart_sync_log")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });
}
