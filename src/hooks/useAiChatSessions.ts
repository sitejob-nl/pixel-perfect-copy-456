import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolUses?: { name: string; status: "running" | "done" | "error" }[];
}

export interface AiChatSession {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export function useAiChatSessions() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["ai_chat_sessions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_sessions")
        .select("*")
        .eq("organization_id", orgId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AiChatSession[];
    },
  });
}

export function useCreateChatSession() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async ({ title, messages }: { title: string; messages: ChatMessage[] }) => {
      const { data, error } = await supabase
        .from("ai_chat_sessions")
        .insert({
          organization_id: org!.organization_id,
          user_id: user!.id,
          title,
          messages: JSON.parse(JSON.stringify(messages)),
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AiChatSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_chat_sessions"] });
    },
  });
}

export function useUpdateChatSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, messages, title }: { id: string; messages: ChatMessage[]; title?: string }) => {
      const update: any = { messages: JSON.parse(JSON.stringify(messages)) };
      if (title) update.title = title;
      const { error } = await supabase
        .from("ai_chat_sessions")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_chat_sessions"] });
    },
  });
}

export function useDeleteChatSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_chat_sessions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_chat_sessions"] });
    },
  });
}
