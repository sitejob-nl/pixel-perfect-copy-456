import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useLinkedInConnection() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["linkedin-connection", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("linkedin_connections")
        .select("*")
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useLinkedInConnect() {
  const { user } = useAuth();
  const { data: org } = useOrganization();

  return () => {
    if (!user || !org) return;
    const returnUrl = `${window.location.origin}/settings`;
    const state = `${user.id}|${org.organization_id}|${returnUrl}`;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "fuvpmxxihmpustftzvgk";
    const startUrl = `https://${projectId}.supabase.co/functions/v1/linkedin-oauth?action=start&state=${encodeURIComponent(state)}`;
    window.location.href = startUrl;
  };
}

export function useLinkedInDisconnect() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async () => {
      // The edge function uses action=disconnect via query param, but functions.invoke
      // doesn't support query params easily. Let's use a different approach:
      // We'll call disconnect via the function URL directly.
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "fuvpmxxihmpustftzvgk";
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/linkedin-oauth?action=disconnect`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ organization_id: org?.organization_id }),
        }
      );
      if (!res.ok) throw new Error("Disconnect failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linkedin-connection"] });
      toast.success("LinkedIn ontkoppeld");
    },
    onError: () => toast.error("Kon LinkedIn niet ontkoppelen"),
  });
}

export function useLinkedInPost() {
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.functions.invoke("linkedin-post", {
        body: { organization_id: org?.organization_id, text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => toast.success("LinkedIn post gepubliceerd! 🎉"),
    onError: (err: Error) => toast.error(err.message || "Post publiceren mislukt"),
  });
}
