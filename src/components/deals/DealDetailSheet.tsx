import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUpdateDeal, useDeleteDeal, usePipelineStages, DealWithRelations } from "@/hooks/useDeals";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useOrgMembers } from "@/hooks/useTeam";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import InlineEditField from "@/components/erp/InlineEditField";
import { ErpTabs, Badge, Avatar } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { useState } from "react";
import DealActivitiesTab from "./DealActivitiesTab";
import DealTasksTab from "./DealTasksTab";
import { Phone, Mail, Linkedin, MessageCircle } from "lucide-react";

const eur = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v);

interface Props {
  deal: DealWithRelations | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function DealDetailSheet({ deal, open, onOpenChange }: Props) {
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const { data: stages = [] } = usePipelineStages();
  const { data: contacts = [] } = useContacts();
  const { data: companies = [] } = useCompanies();
  const { data: membersData } = useOrgMembers();
  const members = membersData?.members ?? [];
  const navigate = useNavigate();
  const [tab, setTab] = useState("activities");

  if (!deal) return null;

  const saveField = async (field: string, value: any) => {
    try {
      await updateDeal.mutateAsync({ id: deal.id, [field]: value, updated_at: new Date().toISOString() });
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

  const stageColor = deal.pipeline_stages?.color ?? "#6b7280";
  const daysInStage = differenceInDays(new Date(), new Date(deal.updated_at));
  const stageOptions = stages.map(s => ({ value: s.id, label: s.name }));
  const contactOptions = contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name ?? ""}`.trim() }));
  const companyOptions = companies.map(c => ({ value: c.id, label: c.name }));
  const memberOptions = members.map(m => ({ value: m.user_id, label: m.profiles?.full_name ?? m.profiles?.email ?? "—" }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 w-[460px] sm:max-w-[460px] overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Deal details</SheetTitle>
        </SheetHeader>

        <div className="p-5 border-b border-erp-border0">
          {/* Title */}
          <InlineEditField value={deal.title} field="title" onSave={saveField} />

          {/* Stage badge */}
          <div className="mt-2">
            <Badge color={stageColor}>{deal.pipeline_stages?.name ?? "—"}</Badge>
            <span className="text-[10px] text-erp-text3 ml-2">{daysInStage}d in fase</span>
          </div>

          {/* Company & Contact links */}
          <div className="flex flex-wrap gap-3 mt-3 text-[13px]">
            {deal.companies?.name && (
              <button onClick={() => navigate(`/klanten/${deal.company_id}`)} className="text-erp-blue hover:underline">
                {deal.companies.name}
              </button>
            )}
            {deal.contacts && (
              <span className="text-erp-text1">
                {deal.contacts.first_name} {deal.contacts.last_name ?? ""}
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-1.5 mt-3">
            {deal.contacts?.phone && (
              <a href={`tel:${deal.contacts.phone}`} className="p-1.5 rounded-md bg-erp-bg3 hover:bg-erp-hover text-erp-text2 transition-colors">
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
            {deal.contacts?.email && (
              <a href={`mailto:${deal.contacts.email}`} className="p-1.5 rounded-md bg-erp-bg3 hover:bg-erp-hover text-erp-text2 transition-colors">
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
            {deal.contacts?.linkedin_url && (
              <a href={deal.contacts.linkedin_url} target="_blank" rel="noopener" className="p-1.5 rounded-md bg-erp-bg3 hover:bg-erp-hover text-erp-text2 transition-colors">
                <Linkedin className="w-3.5 h-3.5" />
              </a>
            )}
            {deal.contacts?.phone && (
              <a href={`https://wa.me/${deal.contacts.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="p-1.5 rounded-md bg-erp-bg3 hover:bg-erp-hover text-erp-text2 transition-colors">
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="p-5 border-b border-erp-border0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-erp-text3 mb-1">Waarde</div>
              <InlineEditField value={deal.value} field="value" type="number" prefix="€" onSave={saveField} />
            </div>
            <div>
              <div className="text-[11px] text-erp-text3 mb-1">Kans (%)</div>
              <InlineEditField value={deal.probability} field="probability" type="number" suffix="%" onSave={saveField} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-erp-text3 mb-1">Verwachte sluitdatum</div>
              <InlineEditField value={deal.expected_close} field="expected_close" type="date" onSave={saveField} />
            </div>
            <div>
              <div className="text-[11px] text-erp-text3 mb-1">Fase</div>
              <InlineEditField value={deal.stage_id} field="stage_id" type="select" options={stageOptions} onSave={saveField} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-erp-text3 mb-1">Bedrijf</div>
              <InlineEditField value={deal.company_id} field="company_id" type="select" options={companyOptions} onSave={saveField} />
            </div>
            <div>
              <div className="text-[11px] text-erp-text3 mb-1">Contact</div>
              <InlineEditField value={deal.contact_id} field="contact_id" type="select" options={contactOptions} onSave={saveField} />
            </div>
          </div>
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Toegewezen aan</div>
            <InlineEditField value={deal.assigned_to} field="assigned_to" type="select" options={memberOptions} onSave={saveField} />
          </div>
          <div>
            <div className="text-[11px] text-erp-text3 mb-1">Omschrijving</div>
            <InlineEditField value={deal.description} field="description" type="textarea" placeholder="Voeg omschrijving toe..." onSave={saveField} />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3">
          <ErpTabs
            items={[["activities", "Activiteiten"], ["tasks", "Taken"], ["quotes", "Offerte & Factuur"]]}
            active={tab}
            onChange={setTab}
          />
        </div>
        <div className="px-5 pb-5">
          {tab === "activities" && <DealActivitiesTab dealId={deal.id} contactId={deal.contact_id} companyId={deal.company_id} />}
          {tab === "tasks" && <DealTasksTab dealId={deal.id} />}
          {tab === "quotes" && (
            <div className="text-sm text-erp-text3 py-4">
              {deal.quote_id ? (
                <button onClick={() => navigate(`/quotes`)} className="text-erp-blue hover:underline">Bekijk offerte →</button>
              ) : (
                "Nog geen offerte gekoppeld"
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-erp-border0">
          <div className="flex justify-between text-[11px] text-erp-text3 mb-4">
            <span>Aangemaakt: {format(new Date(deal.created_at), "d MMM yyyy", { locale: nl })}</span>
            <span>{daysInStage}d in huidige fase</span>
          </div>
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
