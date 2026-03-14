import { useState } from "react";
import { PageHeader, ErpCard, ErpButton, StatCard, FilterButton } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const triggerColors: Record<string, string> = {
  offerte: "#3b82f6", oplevering: "#22c55e", kennismaking: "#8b5cf6", overdue: "#ef4444",
};

type DraftFilter = "draft" | "sent" | "all";

export default function EmailDraftsPage() {
  const { data: org } = useOrganization();
  const { user } = useAuth();
  const orgId = org?.organization_id;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<DraftFilter>("draft");
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["email-drafts", orgId, filter],
    enabled: !!orgId,
    queryFn: async () => {
      let query = (supabase as any)
        .from("v_email_drafts")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (filter === "draft") query = query.eq("status", "draft");
      else if (filter === "sent") query = query.in("status", ["queued", "sent"]);

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const draftCount = drafts.filter((d: any) => d.status === "draft").length;
  const sentWeekCount = drafts.filter((d: any) => {
    if (d.status !== "sent") return false;
    const sent = new Date(d.sent_at || d.created_at);
    return Date.now() - sent.getTime() < 7 * 86400000;
  }).length;

  const approveMut = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await (supabase as any).rpc("fn_approve_email_draft", {
        p_email_id: draftId,
        p_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-drafts"] });
      toast.success("Email wordt verstuurd");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await (supabase as any).from("email_sends").delete().eq("id", draftId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-drafts"] });
      toast.success("Draft verwijderd");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const saveDraft = async () => {
    if (!editDraft) return;
    const { error } = await (supabase as any)
      .from("email_sends")
      .update({ subject: editSubject, body_html: editBody })
      .eq("id", editDraft.id);
    if (error) { toast.error("Fout bij opslaan"); return; }
    qc.invalidateQueries({ queryKey: ["email-drafts"] });
    toast.success("Opgeslagen");
  };

  const openEdit = (draft: any) => {
    setEditDraft(draft);
    setEditSubject(draft.subject || "");
    setEditBody(draft.body_html || draft.body_text || "");
  };

  return (
    <div className="animate-fade-up max-w-[1200px]">
      <PageHeader title="Email Drafts" desc="Concept-emails die wachten op goedkeuring" />

      <div className="grid grid-cols-3 gap-[14px] mb-6">
        <StatCard label="Te reviewen" value={String(draftCount)} change="wachten op goedkeuring" up={false} />
        <StatCard label="Verstuurd deze week" value={String(sentWeekCount)} change="afgelopen 7 dagen" up />
        <StatCard label="Actieve sequences" value="—" change="binnenkort beschikbaar" up />
      </div>

      <div className="flex gap-2 mb-4">
        <FilterButton active={filter === "draft"} onClick={() => setFilter("draft")}>Te reviewen</FilterButton>
        <FilterButton active={filter === "sent"} onClick={() => setFilter("sent")}>Goedgekeurd</FilterButton>
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Alle</FilterButton>
      </div>

      {isLoading && <ErpCard className="p-8 text-center text-erp-text2 text-sm">Laden...</ErpCard>}

      {!isLoading && drafts.length === 0 && (
        <ErpCard className="p-8 text-center text-erp-text3 text-sm">Geen email drafts gevonden</ErpCard>
      )}

      <div className="space-y-3">
        {drafts.map((d: any) => {
          const triggerColor = triggerColors[d.trigger_type] || "#6b7280";
          return (
            <ErpCard key={d.id} className="p-0 overflow-hidden">
              <div className="flex">
                <div className="w-1 flex-shrink-0" style={{ background: triggerColor }} />
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]">📧</span>
                      <span className="text-[13px] font-semibold text-erp-text0">{d.subject || "Geen onderwerp"}</span>
                    </div>
                    <span className="text-[11px] text-erp-text3">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: nl })}
                    </span>
                  </div>
                  <div className="text-[12px] text-erp-text2 mb-1">
                    Aan: {d.contact_name ?? "—"}{d.company_name ? ` — ${d.company_name}` : ""}
                  </div>
                  <div className="text-[12px] text-erp-text1 font-medium mb-2">
                    Onderwerp: {d.subject}
                  </div>
                  {d.trigger_label && (
                    <div className="text-[11px] text-erp-text3 mb-3">
                      Trigger: {d.trigger_label}
                      {d.sequence_step && ` · Stap ${d.sequence_step}/${d.sequence_total || "?"}`}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <ErpButton onClick={() => openEdit(d)}>Bekijk & bewerk</ErpButton>
                    {d.status === "draft" && (
                      <>
                        <ErpButton primary onClick={() => approveMut.mutate(d.id)} disabled={approveMut.isPending}>
                          ✓ Verstuur
                        </ErpButton>
                        <button
                          onClick={() => deleteMut.mutate(d.id)}
                          className="text-[12px] text-erp-red hover:text-erp-red/80 bg-transparent border-none cursor-pointer px-2"
                        >
                          ✗ Verwijder
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </ErpCard>
          );
        })}
      </div>

      {/* Edit Sheet */}
      <Sheet open={!!editDraft} onOpenChange={(o) => { if (!o) setEditDraft(null); }}>
        <SheetContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="text-erp-text0">Email bewerken</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-[11px] text-erp-text3 block mb-1">Onderwerp</label>
              <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-erp-text3 block mb-1">Body</label>
              <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={12} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
            </div>
            {editDraft?.merge_data && (
              <div>
                <label className="text-[11px] text-erp-text3 block mb-1">Merge data</label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(editDraft.merge_data).map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-erp-bg4 text-erp-text2 px-2 py-0.5 rounded">{k}: {String(v)}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <ErpButton onClick={saveDraft}>Opslaan</ErpButton>
              {editDraft?.status === "draft" && (
                <ErpButton primary onClick={() => { approveMut.mutate(editDraft.id); setEditDraft(null); }}>
                  Verstuur
                </ErpButton>
              )}
              {editDraft?.status === "draft" && (
                <button
                  onClick={() => { deleteMut.mutate(editDraft.id); setEditDraft(null); }}
                  className="text-[12px] text-erp-red hover:text-erp-red/80 bg-transparent border-none cursor-pointer px-2"
                >
                  Verwijder
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
