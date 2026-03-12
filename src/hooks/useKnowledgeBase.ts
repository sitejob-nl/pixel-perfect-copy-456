import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface KBDocument {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null } | null;
}

export function useKBDocuments() {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  return useQuery({
    queryKey: ["kb-documents", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("knowledge_base_documents")
        .select("*, profiles:uploaded_by(full_name)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KBDocument[];
    },
  });
}

export function useKBCategories() {
  const { data: docs } = useKBDocuments();
  const categories = Array.from(new Set((docs || []).map(d => d.category))).sort();
  return categories.length > 0 ? categories : ["Algemeen"];
}

export function useUploadKBDocument() {
  const qc = useQueryClient();
  const { data: org } = useOrganization();

  return useMutation({
    mutationFn: async ({
      file,
      title,
      description,
      category,
    }: {
      file: File;
      title: string;
      description?: string;
      category: string;
    }) => {
      const orgId = org!.organization_id;
      const ext = file.name.split(".").pop();
      const filePath = `${orgId}/${crypto.randomUUID()}.${ext}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("knowledge-base")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("knowledge-base")
        .getPublicUrl(filePath);

      // Since bucket is private, we'll store the path and use signed URLs
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("knowledge_base_documents")
        .insert({
          organization_id: orgId,
          title,
          description: description || null,
          category,
          file_url: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.user?.id || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-documents"] }),
  });
}

export function useUpdateKBDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; category?: string }) => {
      const { error } = await (supabase as any)
        .from("knowledge_base_documents")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-documents"] }),
  });
}

export function useDeleteKBDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fileUrl }: { id: string; fileUrl: string }) => {
      // Delete from storage
      await supabase.storage.from("knowledge-base").remove([fileUrl]);
      // Delete from DB
      const { error } = await (supabase as any)
        .from("knowledge_base_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-documents"] }),
  });
}

export async function getKBSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from("knowledge-base")
    .createSignedUrl(filePath, 3600); // 1 hour
  if (error) throw error;
  return data.signedUrl;
}
