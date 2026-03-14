import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";

export interface GoogleConnection {
  id: string;
  organization_id: string;
  user_id: string | null;
  connection_level: "organization" | "user";
  email: string;
  display_name: string | null;
  is_active: boolean;
  scopes: string[];
  connected_at: string;
  last_sync_at: string | null;
}

export function useGoogleConnections() {
  const { user } = useAuth();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["google-connections", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("google_connections")
        .select("id, organization_id, user_id, connection_level, email, display_name, is_active, scopes, connected_at, last_sync_at")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("connected_at", { ascending: false });
      if (error) throw error;
      return (data || []) as GoogleConnection[];
    },
  });
}

export function useStartGoogleOAuth() {
  const { user, session } = useAuth();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async (level: "organization" | "user") => {
      const res = await fetch(
        `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/google-oauth-callback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            organization_id: org?.organization_id,
            user_id: user?.id,
            connection_level: level,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.auth_url as string;
    },
  });
}

export function useDisconnectGoogle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await (supabase as any)
        .from("google_connections")
        .update({ is_active: false })
        .eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-connections"] });
    },
  });
}

export function useGoogleApi() {
  const { session } = useAuth();

  const callApi = async (connectionId: string, action: string, params: Record<string, any> = {}) => {
    const res = await fetch(
      `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/google-api`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ connection_id: connectionId, action, ...params }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "API fout");
    return data;
  };

  return { callApi };
}

export function useGoogleEmails(connectionId: string | null) {
  const { callApi } = useGoogleApi();

  return useQuery({
    queryKey: ["google-emails", connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      const result = await callApi(connectionId!, "list_messages", { max_results: 30 });
      return result.messages || [];
    },
    refetchInterval: 60000,
  });
}

export function useGoogleCalendarEvents(connectionId: string | null) {
  const { callApi } = useGoogleApi();

  return useQuery({
    queryKey: ["google-calendar", connectionId],
    enabled: !!connectionId,
    queryFn: async () => {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = await callApi(connectionId!, "list_events", { time_min: timeMin, time_max: timeMax });
      return result.events || [];
    },
    refetchInterval: 120000,
  });
}

export function useSyncGoogle() {
  const { callApi } = useGoogleApi();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, type }: { connectionId: string; type: "emails" | "calendar" }) => {
      const action = type === "emails" ? "sync_emails" : "sync_calendar";
      return await callApi(connectionId, action);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-emails"] });
      qc.invalidateQueries({ queryKey: ["google-calendar"] });
      qc.invalidateQueries({ queryKey: ["google-connections"] });
    },
  });
}
