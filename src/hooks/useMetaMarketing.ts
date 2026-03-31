import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

// ── Generic API helpers ──

async function metaApi(action: string, params?: any) {
  const { data, error } = await supabase.functions.invoke("connect-meta-api", {
    body: { action, params },
  });
  if (error) throw error;
  if (data?.token_expired) {
    toast.error("Je Meta token is verlopen. Ga naar Instellingen om opnieuw te koppelen.", { duration: 8000 });
    throw new Error(data.error || "Token verlopen");
  }
  if (data?.meta_rate_limited) {
    toast.error(`Meta rate limit bereikt. Probeer het over ${Math.ceil((data.retry_after || 300) / 60)} minuten opnieuw.`);
    throw new Error("Rate limited");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

async function metaManage(action: string, params?: any) {
  const { data, error } = await supabase.functions.invoke("connect-meta-manage", {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export { metaApi, metaManage };

const STALE = 5 * 60 * 1000;

// ── Health ──

export function useMetaHealth() {
  return useQuery({
    queryKey: ["meta-health"],
    queryFn: () => metaApi("health"),
    staleTime: STALE,
    retry: 1,
  });
}

// ── Config (from DB) ──

export function useMetaConfig() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const sb = supabase as any;

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

// ── Assets ──

export function useMetaAssets(enabled = true) {
  return useQuery({
    queryKey: ["meta-assets"],
    enabled,
    queryFn: async () => {
      const res = await metaApi("assets");
      return {
        pages: res.pages || [],
        instagramAccounts: res.instagram_accounts || [],
        adAccounts: res.ad_accounts || [],
      };
    },
  });
}

export function useMetaSaveSelection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (selection: { page_id: string | null; instagram_account_id: string | null; ad_account_id: string | null }) =>
      metaApi("select_assets", selection),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-config"] });
      qc.invalidateQueries({ queryKey: ["meta-health"] });
      qc.invalidateQueries({ queryKey: ["meta-assets"] });
      toast.success("Meta selectie opgeslagen");
    },
  });
}

// ── Campaigns ──

export function useMetaCampaigns(statusFilter?: string) {
  return useQuery({
    queryKey: ["meta-campaigns", statusFilter],
    queryFn: () => metaApi("campaigns", statusFilter ? { status_filter: statusFilter } : undefined),
    staleTime: STALE,
    retry: 1,
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { campaign_id: string; name?: string; status?: string; daily_budget?: number; lifetime_budget?: number; end_time?: string }) =>
      metaApi("update_campaign", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-campaigns"] });
      qc.invalidateQueries({ queryKey: ["meta-campaign-insights"] });
      toast.success("Campagne bijgewerkt");
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; objective: string; status?: string }) =>
      metaApi("create_campaign", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-campaigns"] });
      toast.success("Campagne aangemaakt");
    },
  });
}

export function useCreateAdSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; campaign_id: string; daily_budget: number; targeting_countries?: string[]; optimization_goal?: string }) =>
      metaApi("create_adset", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-adsets"] });
      toast.success("Ad set aangemaakt");
    },
  });
}

export function useUploadAdVideo() {
  return useMutation({
    mutationFn: (params: { video_url: string; title?: string }) =>
      metaApi("upload_advideo", params),
    onSuccess: () => {
      toast.success("Video geüpload naar Meta");
    },
  });
}

export function useCreateAdCreative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      creative_type?: "link" | "video" | "carousel";
      message?: string;
      link?: string;
      image_url?: string;
      cta_type?: string;
      video_id?: string;
      thumbnail_url?: string;
      link_description?: string;
      child_attachments?: Array<{ link: string; name?: string; description?: string; image_url?: string; image_hash?: string; video_id?: string }>;
    }) => metaApi("create_adcreative", params),
    onSuccess: () => {
      toast.success("Creative aangemaakt");
    },
  });
}

export function useCreateAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; adset_id: string; creative_id: string; status?: string }) =>
      metaApi("create_ad", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-ads"] });
      toast.success("Advertentie aangemaakt");
    },
  });
}

// ── Ad Sets ──

export function useMetaAdSets(campaignId?: string) {
  return useQuery({
    queryKey: ["meta-adsets", campaignId],
    enabled: !!campaignId,
    queryFn: () => metaApi("adsets", { campaign_id: campaignId }),
    staleTime: STALE,
    retry: 1,
  });
}

export function useUpdateAdSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { adset_id: string; name?: string; status?: string; daily_budget?: number; lifetime_budget?: number; end_time?: string; bid_amount?: number }) =>
      metaApi("update_adset", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-adsets"] });
      toast.success("Ad set bijgewerkt");
    },
  });
}

// ── Ads ──

export function useMetaAds(adsetId?: string, campaignId?: string) {
  return useQuery({
    queryKey: ["meta-ads", adsetId, campaignId],
    enabled: !!adsetId || !!campaignId,
    queryFn: () => metaApi("ads", { adset_id: adsetId, campaign_id: campaignId }),
    staleTime: STALE,
    retry: 1,
  });
}

export function useUpdateAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { ad_id: string; name?: string; status?: string }) =>
      metaApi("update_ad", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-ads"] });
      toast.success("Advertentie bijgewerkt");
    },
  });
}

// ── Insights ──

export function useMetaInsights(datePreset = "last_30d", level?: string) {
  return useQuery({
    queryKey: ["meta-insights", datePreset, level],
    queryFn: () => metaApi("insights", { date_preset: datePreset, level }),
    staleTime: STALE,
    retry: 1,
  });
}

export function useMetaCampaignInsights(datePreset = "last_30d") {
  return useQuery({
    queryKey: ["meta-campaign-insights", datePreset],
    queryFn: () => metaApi("campaign_insights", { date_preset: datePreset }),
    staleTime: STALE,
    retry: 1,
  });
}

// ── Facebook Page ──

export function useMetaPagePosts() {
  return useQuery({
    queryKey: ["meta-page-posts"],
    queryFn: () => metaApi("page_posts"),
    staleTime: STALE,
    retry: 1,
  });
}

export function useCreatePagePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { message: string; link?: string; published?: boolean }) =>
      metaApi("create_page_post", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-page-posts"] });
      toast.success("Bericht geplaatst");
    },
  });
}

export function useDeletePagePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => metaApi("delete_page_post", { post_id: postId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-page-posts"] });
      toast.success("Bericht verwijderd");
    },
  });
}

// ── Instagram ──

export function useMetaInstagramMedia() {
  return useQuery({
    queryKey: ["meta-instagram-media"],
    queryFn: () => metaApi("instagram_media"),
    staleTime: STALE,
    retry: 1,
  });
}

export function useMetaInstagramInsights() {
  return useQuery({
    queryKey: ["meta-instagram-insights"],
    queryFn: () => metaApi("instagram_insights"),
    staleTime: STALE,
    retry: 1,
  });
}

export function useInstagramPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { image_url: string; caption?: string }) =>
      metaApi("instagram_publish", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-instagram-media"] });
      toast.success("Instagram post gepubliceerd");
    },
  });
}

// ── Ad Preview ──

export function useAdPreview() {
  return useMutation({
    mutationFn: (params: { creative_id: string; ad_format?: string }) =>
      metaApi("ad_preview", params),
  });
}



// ── Lead Forms ──

export function useMetaLeadForms() {
  return useQuery({
    queryKey: ["meta-lead-forms"],
    queryFn: () => metaApi("lead_forms"),
    staleTime: STALE,
    retry: 1,
  });
}

export function useCreateLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      name: string;
      questions: Array<{ type: string; key?: string; label?: string; inline_context?: string; options?: Array<{ value: string; key?: string }> }>;
      privacy_policy_url: string;
      follow_up_action_url?: string;
      is_optimized_for_quality?: boolean;
      block_display_for_non_targeted_viewer?: boolean;
      tracking_parameters?: Record<string, string>;
    }) => metaApi("create_lead_form", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-lead-forms"] });
      toast.success("Lead formulier aangemaakt");
    },
  });
}

export function useArchiveLeadForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { form_id: string; status: "ARCHIVED" | "ACTIVE" }) =>
      metaApi("archive_lead_form", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-lead-forms"] });
      toast.success("Formulierstatus bijgewerkt");
    },
  });
}

export function useSyncLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => metaApi("sync_leads"),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["meta-leads"] });
      toast.success(`${data?.new_leads || 0} nieuwe leads gesynchroniseerd`);
    },
  });
}

// ── Leads ──

export function useMetaLeads(status?: string) {
  return useQuery({
    queryKey: ["meta-leads", status],
    queryFn: () => metaApi("leads", { status }),
    staleTime: STALE,
    retry: 1,
  });
}

export function useMetaImportLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => metaApi("import_lead", { lead_id: leadId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-leads"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Lead geïmporteerd als contact");
    },
  });
}

// ── Messenger ──

export function useMetaConversations() {
  return useQuery({
    queryKey: ["meta-conversations"],
    queryFn: () => metaApi("conversations"),
    staleTime: STALE,
    retry: 1,
  });
}

export function useMetaConversationMessages(conversationId?: string) {
  return useQuery({
    queryKey: ["meta-conversation-messages", conversationId],
    enabled: !!conversationId,
    queryFn: () => metaApi("conversation_messages", { conversation_id: conversationId }),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { recipient_id: string; message: string }) =>
      metaApi("send_message", params),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["meta-conversation-messages"] });
      qc.invalidateQueries({ queryKey: ["meta-conversations"] });
    },
  });
}

// ── Connect/Manage ──

export function useMetaRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => metaManage("register"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-health"] });
      qc.invalidateQueries({ queryKey: ["meta-config"] });
    },
  });
}

export function useMetaDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => metaManage("disconnect"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-health"] });
      qc.invalidateQueries({ queryKey: ["meta-config"] });
      qc.invalidateQueries({ queryKey: ["meta-assets"] });
      toast.success("Meta koppeling verwijderd");
    },
  });
}

export function useMetaStatus() {
  return useQuery({
    queryKey: ["meta-status"],
    queryFn: () => metaManage("status"),
    staleTime: STALE,
    retry: 1,
  });
}
