import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export function useWhatsAppAccount() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["whatsapp-account", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_accounts")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
  });
}

export function useWhatsAppRegister() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (tenantName?: string) => {
      const res = await supabase.functions.invoke("whatsapp-send", {
        body: { action: "register_tenant", tenant_name: tenantName },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data as { success: boolean; setup_url: string; tenant_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-account"] });
    },
  });
}

export function useWhatsAppDisconnect() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("whatsapp-send", {
        body: { action: "disconnect" },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-account"] });
    },
  });
}

export function useWhatsAppSend() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      to: string;
      message?: string;
      message_type?: "text" | "template" | "read_receipt";
      template_name?: string;
      template_params?: any;
      template_language?: string;
      contact_id?: string;
      message_id?: string;
    }) => {
      const res = await supabase.functions.invoke("whatsapp-send", {
        body: { action: "send_message", ...payload },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      return res.data as { success: boolean; message_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    },
  });
}

export function useWhatsAppMessages(contactId?: string) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["whatsapp-messages", orgId, contactId],
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);

      if (contactId) query = query.eq("contact_id", contactId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
