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
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
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

export interface Conversation {
  phone_number: string;
  contact_id: string | null;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string;
  last_direction: string;
  unread_count: number;
}

export function useWhatsAppConversations() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["whatsapp-conversations", orgId],
    enabled: !!orgId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*, contacts(first_name, last_name)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      if (!data) return [];

      // Group by phone_number
      const map = new Map<string, Conversation>();
      for (const msg of data) {
        const phone = msg.phone_number;
        if (!phone) continue;
        if (!map.has(phone)) {
          const contact = msg.contacts as any;
          const contactName = contact
            ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
            : null;
          map.set(phone, {
            phone_number: phone,
            contact_id: msg.contact_id,
            contact_name: contactName || null,
            last_message: msg.content,
            last_message_at: msg.created_at,
            last_direction: msg.direction,
            unread_count: 0,
          });
        }
        // Count inbound unread (no read status tracking on our side, so skip for now)
      }

      return Array.from(map.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
  });
}

export function useWhatsAppChatMessages(phoneNumber: string | null) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["whatsapp-chat", orgId, phoneNumber],
    enabled: !!orgId && !!phoneNumber,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("phone_number", phoneNumber!)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });
}
