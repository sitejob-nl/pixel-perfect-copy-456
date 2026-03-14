import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useEffect } from "react";

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
      qc.invalidateQueries({ queryKey: ["whatsapp-chat"] });
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
  company_name: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string;
  last_direction: string;
  last_message_type: string | null;
  last_status: string | null;
  unread_count: number;
  whatsapp_opt_in: boolean;
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
        .select("*, contacts(first_name, last_name, avatar_url, whatsapp_opt_in, companies(name))")
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
          const companyName = contact?.companies?.name || null;
          
          map.set(phone, {
            phone_number: phone,
            contact_id: msg.contact_id,
            contact_name: contactName || null,
            company_name: companyName,
            avatar_url: contact?.avatar_url || null,
            last_message: msg.content,
            last_message_at: msg.created_at,
            last_direction: msg.direction,
            last_message_type: msg.message_type,
            last_status: msg.status,
            unread_count: 0,
            whatsapp_opt_in: contact?.whatsapp_opt_in ?? false,
          });
        }
        
        // Count unread: inbound messages that are after the last outbound
        const conv = map.get(phone)!;
        if (msg.direction === "inbound") {
          conv.unread_count++;
        }
      }
      
      // Adjust unread: only count inbound messages after last outbound
      for (const [phone, conv] of map) {
        const phoneMessages = data.filter(m => m.phone_number === phone);
        const lastOutboundIdx = phoneMessages.findIndex(m => m.direction === "outbound");
        if (lastOutboundIdx === -1) {
          // No outbound = all inbound are "unread"
          conv.unread_count = phoneMessages.filter(m => m.direction === "inbound").length;
        } else {
          // Count inbound before (newer than) last outbound in desc-sorted list
          conv.unread_count = phoneMessages.slice(0, lastOutboundIdx).filter(m => m.direction === "inbound").length;
        }
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

export function useWhatsAppRealtime() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel("whatsapp-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
          qc.invalidateQueries({ queryKey: ["whatsapp-chat"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["whatsapp-chat"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);
}

export function useWhatsAppContactMessages(contactId: string | null) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["whatsapp-contact-messages", orgId, contactId],
    enabled: !!orgId && !!contactId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useLinkContactToMessages() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useMutation({
    mutationFn: async ({ phoneNumber, contactId }: { phoneNumber: string; contactId: string }) => {
      const { error } = await supabase
        .from("whatsapp_messages")
        .update({ contact_id: contactId })
        .eq("phone_number", phoneNumber)
        .eq("organization_id", orgId!);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-chat"] });
    },
  });
}

export function useWhatsAppWebhookLogs() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["whatsapp-webhook-logs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_webhook_logs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });
}
