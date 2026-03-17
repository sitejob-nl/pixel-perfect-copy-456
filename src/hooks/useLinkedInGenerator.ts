import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface LinkedInTemplate {
  id: string;
  name: string;
  message_type: string;
  tone: string;
  max_length: number;
  example_message: string | null;
}

export function useLinkedInTemplates() {
  const { data: org } = useOrganization();
  return useQuery({
    queryKey: ["linkedin-templates", org?.organization_id],
    enabled: !!org?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("linkedin_message_templates")
        .select("id, name, message_type, tone, max_length, example_message")
        .eq("organization_id", org!.organization_id)
        .eq("is_active", true)
        .order("message_type");
      if (error) throw error;
      return data as LinkedInTemplate[];
    },
  });
}

export function useGenerateLinkedInMessage() {
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async ({
      prospectLeadId,
      templateId,
      extraInstructions,
    }: {
      prospectLeadId: string;
      templateId: string;
      extraInstructions?: string;
    }) => {
      // 1. Build prompt via RPC
      const { data: promptData, error: rpcError } = await supabase.rpc(
        "build_linkedin_prompt" as any,
        {
          p_prospect_lead_id: prospectLeadId,
          p_template_id: templateId,
          p_extra_instructions: extraInstructions || null,
        }
      );
      if (rpcError) throw rpcError;

      const prompt = promptData as any;

      // 2. Send to AI via ask-sitejob edge function
      const { data: aiResult, error: aiError } =
        await supabase.functions.invoke("ask-sitejob", {
          body: {
            system_prompt: prompt.system_prompt,
            user_prompt: prompt.user_prompt,
            max_tokens: prompt.max_tokens,
            model: prompt.model,
            organization_id: org?.organization_id,
          },
        });
      if (aiError) throw aiError;

      const message =
        typeof aiResult === "string"
          ? aiResult
          : aiResult?.content?.[0]?.text ||
            aiResult?.message ||
            aiResult?.text ||
            String(aiResult);

      return {
        message: message.trim(),
        templateName: prompt.template_name,
        contactLinkedInUrl: prompt.contact_linkedin_url,
        maxLength: prompt.max_length,
      };
    },
  });
}

export function useSaveLinkedInMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      prospectLeadId,
      message,
      templateId,
    }: {
      prospectLeadId: string;
      message: string;
      templateId?: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "save_linkedin_message" as any,
        {
          p_prospect_lead_id: prospectLeadId,
          p_message: message,
          p_template_id: templateId || null,
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospect-kanban"] });
      toast.success("LinkedIn bericht opgeslagen");
    },
    onError: () => toast.error("Fout bij opslaan"),
  });
}
