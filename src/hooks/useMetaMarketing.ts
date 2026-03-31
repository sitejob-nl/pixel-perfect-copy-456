import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

const sb = supabase as any;

export function useMetaConnection() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["meta-connection", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("meta_connections")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMetaConfig() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["meta-config", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("meta_config")
        .select("page_id, page_name, ad_account_id, ad_account_name, instagram_account_id, instagram_username, token_expires_at, granted_scopes, business_id, updated_at")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });
}

export function useMetaStatus() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["meta-status", orgId],
    enabled: !!orgId,
    refetchInterval: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-meta-manage", {
        body: { action: "status" },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useMetaRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-meta-manage", {
        body: { action: "register" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-connection"] });
      qc.invalidateQueries({ queryKey: ["meta-status"] });
    },
  });
}

export function useMetaDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-meta-manage", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-connection"] });
      qc.invalidateQueries({ queryKey: ["meta-config"] });
      qc.invalidateQueries({ queryKey: ["meta-status"] });
      toast.success("Meta koppeling verwijderd");
    },
  });
}

export function useMetaAssets() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["meta-assets", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "assets" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        pages: data.pages || [],
        instagramAccounts: data.instagram_accounts || [],
        adAccounts: data.ad_accounts || [],
      };
    },
  });
}

type MetaAssetSelection = {
  page_id: string | null;
  instagram_account_id: string | null;
  ad_account_id: string | null;
};

export function useMetaSaveSelection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (selection: MetaAssetSelection) => {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "select_assets", params: selection },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-config"] });
      qc.invalidateQueries({ queryKey: ["meta-status"] });
      qc.invalidateQueries({ queryKey: ["meta-assets"] });
      toast.success("Meta selectie opgeslagen");
    },
  });
}

export function useMetaCampaigns() {
  return useQuery({
    queryKey: ["meta-campaigns"],
    enabled: false, // manually triggered
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "campaigns" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.campaigns || [];
    },
  });
}

export function useMetaInsights(datePreset = "last_30d") {
  return useQuery({
    queryKey: ["meta-insights", datePreset],
    enabled: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "insights", params: { date_preset: datePreset } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.insights || [];
    },
  });
}

export function useMetaCampaignInsights(datePreset = "last_30d") {
  return useQuery({
    queryKey: ["meta-campaign-insights", datePreset],
    enabled: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "campaign_insights", params: { date_preset: datePreset } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.insights || [];
    },
  });
}

export function useMetaLeads() {
  return useQuery({
    queryKey: ["meta-leads"],
    enabled: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "leads" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.leads || [];
    },
  });
}

export function useMetaImportLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.functions.invoke("connect-meta-api", {
        body: { action: "import_lead", params: { lead_id: leadId } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-leads"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Lead geïmporteerd als contact");
    },
  });
}
