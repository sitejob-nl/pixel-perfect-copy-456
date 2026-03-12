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
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: string;
  token: string;
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

export function useOrgMembers() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["org-members", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, is_active, joined_at, invited_at, profiles(full_name, avatar_url)")
        .eq("organization_id", orgId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;

      // Fetch emails from auth via a simple approach: get user emails from profiles or use member info
      // We'll enhance with email lookup
      return data as OrgMember[];
    },
  });
}

export function useOrgInvites() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;

  return useQuery({
    queryKey: ["org-invites", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", orgId!)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrgInvite[];
    },
  });
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
      qc.invalidateQueries({ queryKey: ["org-invites"] });
      if (data?.email_sent) {
        // Email was sent via Resend
      } else if (data?.action_link) {
        // No Resend configured — show the link
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
      const { error } = await supabase
        .from("organization_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
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
      const { error } = await supabase
        .from("organization_members")
        .update({ is_active: false })
        .eq("id", memberId);
      if (error) throw error;
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
      const { error } = await supabase
        .from("organization_invites")
        .delete()
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-invites"] });
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
      isEnabled: boolean | null; // null = remove override (inherit)
    }) => {
      const orgId = org?.organization_id;
      if (!orgId) throw new Error("Geen organisatie");

      if (isEnabled === null) {
        // Remove override
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
