import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Download, Send, MoreHorizontal, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProjectPlan, useUpdateProjectPlan, useUpdateSection, useAddSection, useDeleteSection } from "@/hooks/useProjectPlans";
import { useOrganization } from "@/hooks/useOrganization";
import { useBranding } from "@/contexts/BrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import SectionList from "@/components/project-plans/SectionList";
import SectionEditor from "@/components/project-plans/SectionEditor";
import PlanPreview from "@/components/project-plans/PlanPreview";
import PlanSendDialog from "@/components/project-plans/PlanSendDialog";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type SectionRow = Database["public"]["Tables"]["project_plan_sections"]["Row"];

const STATUS_OPTIONS = [
  { value: "draft", label: "Concept" },
  { value: "review", label: "Review" },
  { value: "sent", label: "Verstuurd" },
  { value: "accepted", label: "Geaccepteerd" },
  { value: "declined", label: "Afgewezen" },
];

const statusColors: Record<string, string> = {
  draft: "bg-erp-bg4 text-erp-text2",
  review: "bg-blue-500/20 text-blue-400",
  sent: "bg-amber-500/20 text-amber-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-red-500/20 text-red-400",
};

export default function ProjectPlanBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading, refetch } = useProjectPlan(id);
  const updatePlan = useUpdateProjectPlan();
  const updateSec = useUpdateSection();
  const addSec = useAddSection();
  const delSec = useDeleteSection();
  const { data: org } = useOrganization();
  const { org: brandOrg } = useBranding();
  const { user } = useAuth();

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [localSections, setLocalSections] = useState<SectionRow[] | null>(null);

  const sections = localSections ?? plan?.project_plan_sections ?? [];
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null;

  // Sync local sections when plan loads
  if (plan && !localSections) {
    // Will set on first render
  }
  const effectiveSections = plan ? (localSections ?? plan.project_plan_sections) : [];

  const handleReorder = async (newOrder: SectionRow[]) => {
    setLocalSections(newOrder);
    // Update sort_order for each
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i].sort_order !== i) {
        updateSec.mutate({ id: newOrder[i].id, sort_order: i });
      }
    }
  };

  const handleToggleVisibility = (sectionId: string, visible: boolean) => {
    setLocalSections(prev => (prev ?? effectiveSections).map(s => s.id === sectionId ? { ...s, is_visible: visible } : s));
    updateSec.mutate({ id: sectionId, is_visible: visible });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!confirm("Sectie verwijderen?")) return;
    setLocalSections(prev => (prev ?? effectiveSections).filter(s => s.id !== sectionId));
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
    delSec.mutate({ id: sectionId, planId: id! });
  };

  const handleAddSection = async (type: string) => {
    if (!org?.organization_id || !id) return;
    const maxOrder = Math.max(0, ...effectiveSections.map(s => s.sort_order));
    const titleMap: Record<string, string> = {
      scope: "Scope", deliverables: "Deliverables", timeline: "Timeline",
      investment: "Investering", assumptions: "Aannames", terms: "Voorwaarden",
      sla: "SLA", security: "Beveiliging", custom: "Nieuwe sectie",
    };
    try {
      const result = await addSec.mutateAsync({
        plan_id: id,
        organization_id: org.organization_id,
        section_type: type,
        title: titleMap[type] || "Sectie",
        sort_order: maxOrder + 1,
      });
      setLocalSections(prev => [...(prev ?? effectiveSections), result]);
      setSelectedSectionId(result.id);
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  const handleTitleChange = (sectionId: string, title: string) => {
    setLocalSections(prev => (prev ?? effectiveSections).map(s => s.id === sectionId ? { ...s, title } : s));
  };

  const handleContentChange = (sectionId: string, html: string) => {
    setLocalSections(prev => (prev ?? effectiveSections).map(s => s.id === sectionId ? { ...s, content_html: html } : s));
  };

  const handleStatusChange = (status: string) => {
    if (!id) return;
    updatePlan.mutate({ id, status }, { onSuccess: () => refetch() });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <div className="p-6 text-erp-text3">Laden...</div>;
  }
  if (!plan) {
    return <div className="p-6 text-erp-text3">Plan niet gevonden</div>;
  }

  const orgName = brandOrg?.name || "SiteJob";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-erp-border0 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/project-plans")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-semibold text-erp-text0 flex-1 truncate">{plan.title}</h1>
        <Select value={plan.status} onValueChange={handleStatusChange}>
          <SelectTrigger className={`w-auto h-7 text-xs border-none gap-1 ${statusColors[plan.status] || ""}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-erp-bg3 border-erp-border0">
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value} className="text-erp-text1 focus:bg-erp-hover text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPreview(!showPreview)} title={showPreview ? "Verberg preview" : "Toon preview"}>
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 bg-erp-bg3 border-erp-border0" onClick={handlePrint}>
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setSendDialogOpen(true)}>
          <Send className="w-3.5 h-3.5" /> Versturen
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-erp-bg3 border-erp-border0">
            <DropdownMenuItem className="text-erp-text1 focus:bg-erp-hover text-xs"><Copy className="w-3.5 h-3.5 mr-2" /> Dupliceren</DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 focus:bg-erp-hover text-xs"
              onClick={() => {
                if (confirm("Plan verwijderen?")) {
                  updatePlan.mutate({ id: plan.id }, { onSuccess: () => navigate("/project-plans") });
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className={`flex flex-col overflow-hidden border-r border-erp-border0 ${showPreview ? "w-1/2" : "flex-1"}`}>
          <div className="flex overflow-hidden flex-1">
            {/* Section list */}
            <div className="w-[240px] min-w-[240px] border-r border-erp-border0 overflow-y-auto p-3">
              <SectionList
                sections={effectiveSections}
                selectedId={selectedSectionId}
                onSelect={setSelectedSectionId}
                onReorder={handleReorder}
                onToggleVisibility={handleToggleVisibility}
                onDelete={handleDeleteSection}
                onAdd={handleAddSection}
              />
            </div>

            {/* Section editor */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedSection ? (
                <SectionEditor
                  key={selectedSection.id}
                  section={selectedSection}
                  onTitleChange={(title) => handleTitleChange(selectedSection.id, title)}
                  onContentChange={(html) => handleContentChange(selectedSection.id, html)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-erp-text3 text-sm">
                  Selecteer een sectie om te bewerken
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        {showPreview && (
          <div className="w-1/2 overflow-y-auto bg-gray-100 p-8 print:p-0 print:bg-white" id="plan-preview">
            <PlanPreview plan={plan} sections={effectiveSections} orgName={orgName} />
          </div>
        )}
      </div>

      {/* Send dialog */}
      <PlanSendDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen} plan={plan} onSent={() => refetch()} />

      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#plan-preview) { display: none !important; }
          #plan-preview { position: fixed; inset: 0; z-index: 9999; overflow: visible; }
        }
      `}</style>
    </div>
  );
}
