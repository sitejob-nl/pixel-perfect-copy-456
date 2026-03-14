import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUpdateDeal, useDeleteDeal, usePipelineStages, DealWithRelations } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useOrgMembers } from "@/hooks/useTeam";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import InlineEditField from "./InlineEditField";
import { ErpButton, Dot } from "./ErpPrimitives";
import { Icons } from "./ErpIcons";

interface Props {
  deal: DealWithRelations | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function EditDealSheet({ deal, open, onOpenChange }: Props) {
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const { data: stages = [] } = usePipelineStages();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: membersData } = useOrgMembers();
  const members = membersData?.members ?? [];
  const navigate = useNavigate();

  if (!deal) return null;

  const saveField = async (field: string, value: any) => {
    try {
      await updateDeal.mutateAsync({ id: deal.id, [field]: value });
      toast.success("Opgeslagen");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Deal "${deal.title}" verwijderen?`)) return;
    try {
      await deleteDeal.mutateAsync(deal.id);
      toast.success("Deal verwijderd");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at));
  const stageOptions = stages.filter(s => !s.is_won && !s.is_lost).map(s => ({ value: s.id, label: s.name }));
  const wonLostOptions = stages.filter(s => s.is_won || s.is_lost).map(s => ({ value: s.id, label: s.name }));
  const allStageOptions = [...stageOptions, ...wonLostOptions];

  const contactOptions = contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name ?? ""}`.trim() }));
  const companyOptions = companies.map(c => ({ value: c.id, label: c.name }));
  const memberOptions = members.map(m => ({ value: m.user_id, label: m.profiles?.full_name ?? m.profiles?.email ?? "—" }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-erp-text0 sr-only">Deal bewerken</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-2">
          {/* Title */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Titel</div>
            <InlineEditField value={deal.title} field="title" onSave={saveField} />
          </div>

          {/* Company */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Bedrijf</div>
            <InlineEditField value={deal.company_id} field="company_id" type="select" options={companyOptions} onSave={saveField} />
            {deal.company_id && (
              <button onClick={() => navigate(`/klanten/${deal.company_id}`)} className="text-[11px] text-erp-blue hover:underline mt-0.5">
                Bekijk bedrijf →
              </button>
            )}
          </div>

          {/* Contact */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Contact</div>
            <InlineEditField value={deal.contact_id} field="contact_id" type="select" options={contactOptions} onSave={saveField} />
          </div>

          {/* Value */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Waarde</div>
            <InlineEditField value={deal.value} field="value" type="number" prefix="€" onSave={saveField} />
          </div>

          {/* Probability */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Kans (%)</div>
            <InlineEditField value={deal.probability} field="probability" type="number" suffix="%" onSave={saveField} />
          </div>

          {/* Expected close */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Verwachte sluitdatum</div>
            <InlineEditField value={deal.expected_close} field="expected_close" type="date" onSave={saveField} />
          </div>

          {/* Stage */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Fase</div>
            <InlineEditField value={deal.stage_id} field="stage_id" type="select" options={allStageOptions} onSave={saveField} />
          </div>

          {/* Assigned to */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Toegewezen aan</div>
            <InlineEditField value={deal.assigned_to} field="assigned_to" type="select" options={memberOptions} onSave={saveField} />
          </div>

          {/* Description */}
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Omschrijving</div>
            <InlineEditField value={deal.description} field="description" type="textarea" placeholder="Voeg omschrijving toe..." onSave={saveField} />
          </div>

          {/* Project link */}
          {deal.project_id && (
            <div>
              <div className="text-[11px] text-erp-text3 mb-1">Project</div>
              <button onClick={() => navigate(`/projects/${deal.project_id}`)} className="text-[13px] text-erp-blue hover:underline">
                Bekijk project →
              </button>
            </div>
          )}

          {/* Meta info */}
          <div className="border-t border-erp-border0 pt-4 space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-erp-text3">Aangemaakt</span>
              <span className="text-erp-text1">{format(new Date(deal.created_at), "d MMM yyyy", { locale: nl })}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-erp-text3">Dagen in huidige fase</span>
              <span className="text-erp-text1">{daysInStage}d</span>
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="w-full text-center text-sm text-erp-red hover:bg-erp-red/10 rounded-lg py-2.5 transition-colors border border-erp-red/20"
          >
            <Icons.Trash className="w-3.5 h-3.5 inline mr-1.5" />
            Verwijderen
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
