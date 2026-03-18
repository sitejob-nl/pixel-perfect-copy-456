import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { FileIcon, Download, Trash2, Upload } from "lucide-react";

interface Props {
  entityType: "company" | "contact" | "task";
  entityId: string;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EntityAttachments({ entityType, entityId }: Props) {
  const { data: org } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const orgId = org?.organization_id;

  const queryKey = ["entity-attachments", entityType, entityId];

  const { data: attachments = [] } = useQuery({
    queryKey,
    enabled: !!entityId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_attachments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (file: File) => {
    if (!orgId || !user) return;
    setUploading(true);
    try {
      const filePath = `${orgId}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("entity-attachments")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("entity_attachments").insert({
        organization_id: orgId,
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: user.id,
      });
      if (insertError) throw insertError;

      qc.invalidateQueries({ queryKey });
      toast.success("Bestand geüpload");
    } catch (e: any) {
      toast.error(e.message || "Upload mislukt");
    }
    setUploading(false);
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("entity-attachments")
      .createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast.error("Kan bestand niet downloaden");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.click();
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm("Bestand verwijderen?")) return;
    await supabase.storage.from("entity-attachments").remove([filePath]);
    const { error } = await supabase.from("entity_attachments").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey });
      toast.success("Verwijderd");
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
      <ErpButton onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploaden..." : "Bestand uploaden"}
      </ErpButton>

      {attachments.length === 0 && <p className="text-sm text-erp-text3 py-2">Geen bestanden</p>}

      <div className="space-y-1">
        {attachments.map((a: any) => (
          <div key={a.id} className="flex items-center gap-3 bg-erp-bg3 rounded-lg p-2.5 border border-erp-border0">
            <FileIcon className="w-4 h-4 text-erp-text3 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-erp-text0 truncate">{a.file_name}</div>
              <div className="flex items-center gap-2 text-[10px] text-erp-text3">
                <span>{formatFileSize(a.file_size)}</span>
                <span>{format(new Date(a.created_at), "d MMM yyyy", { locale: nl })}</span>
              </div>
            </div>
            <button onClick={() => handleDownload(a.file_path, a.file_name)} className="text-erp-text3 hover:text-erp-blue transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(a.id, a.file_path)} className="text-erp-text3 hover:text-erp-red transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
