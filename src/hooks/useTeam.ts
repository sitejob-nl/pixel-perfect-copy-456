import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

export interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  joined_at: string | null;
  invited_at: string | null;
  profiles: { full_name: string | null; avatar_url: string | null; email: string | null; phone: string | null } | null;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: string;
  token?: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  invited_by: string;
}

export interface ModuleOverride {
  id: string;
  user_id: string;
  module_key: string;
  is_enabled: boolean;
}

/** Fetches members + pending invites via manage-members edge function */
export function useOrgMembers() {
  return useQuery({
    queryKey: ["org-members"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-members", {
        body: { action: "list" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return {
        members: (data?.members || []) as OrgMember[],
        pending_invites: (data?.pending_invites || []) as OrgInvite[],
      };
    },
  });
}

/** @deprecated Use useOrgMembers().data.pending_invites instead */
export function useOrgInvites() {
  const { data } = useOrgMembers();
  return {
    data: data?.pending_invites || [],
    isLoading: false,
  };
}

export function useMemberModuleOverrides() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["member-module-overrides", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("member_module_overrides")
        .select("id, user_id, module_key, is_enabled")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return (data || []) as ModuleOverride[];
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: {
          email,
          role,
          origin: window.location.origin,
          redirect_url: window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["org-members"] });
      if (data?.email_sent) {
        toast.success("Uitnodiging verstuurd!");
      } else if (data?.action_link) {
        toast.info("Resend niet geconfigureerd. Kopieer de uitnodigingslink handmatig.");
        navigator.clipboard.writeText(data.action_link);
      }
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-members", {
        body: { action: "update-role", member_id: memberId, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-members", {
        body: { action: "remove-member", member_id: memberId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
  });
}

export function useDeleteInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-members", {
        body: { action: "revoke-invite", invite_id: inviteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members"] });
    },
  });
}

export function useSetModuleOverride() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async ({
      userId,
      moduleKey,
      isEnabled,
    }: {
      userId: string;
      moduleKey: string;
      isEnabled: boolean | null;
    }) => {
      const orgId = org?.organization_id;
      if (!orgId) throw new Error("Geen organisatie");

      if (isEnabled === null) {
        const { error } = await (supabase as any)
          .from("member_module_overrides")
          .delete()
          .eq("organization_id", orgId)
          .eq("user_id", userId)
          .eq("module_key", moduleKey);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("member_module_overrides")
          .upsert(
            {
              organization_id: orgId,
              user_id: userId,
              module_key: moduleKey,
              is_enabled: isEnabled,
            },
            { onConflict: "organization_id,user_id,module_key" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member-module-overrides"] });
    },
  });
}
