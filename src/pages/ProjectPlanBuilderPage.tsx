import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, Download, Send, MoreHorizontal, Trash2, Copy, Eye, EyeOff, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useProjectPlan, useUpdateProjectPlan, useUpdateSection, useAddSection, useDeleteSection } from "@/hooks/useProjectPlans";
import { useOrganization } from "@/hooks/useOrganization";
import { useBranding } from "@/contexts/BrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAIGeneration } from "@/hooks/useAIGeneration";
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
  const location = useLocation();
  const { data: plan, isLoading, refetch } = useProjectPlan(id);
  const updatePlan = useUpdateProjectPlan();
  const updateSec = useUpdateSection();
  const addSec = useAddSection();
  const delSec = useDeleteSection();
  const { data: org } = useOrganization();
  const { org: brandOrg } = useBranding();
  const { user } = useAuth();
  const { progress, generateFullPlan, rewriteSection, abort } = useAIGeneration();
  const autoGenerateTriggered = useRef(false);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [localSections, setLocalSections] = useState<SectionRow[] | null>(null);
  const [rewritingId, setRewritingId] = useState<string | null>(null);

  const sections = localSections ?? plan?.project_plan_sections ?? [];
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null;
  const effectiveSections = plan ? (localSections ?? plan.project_plan_sections) : [];

  // Initialize localSections from plan
  useEffect(() => {
    if (plan && !localSections) {
      setLocalSections(plan.project_plan_sections);
    }
  }, [plan]);

  // Auto-generate with AI when navigating from wizard with flag
  useEffect(() => {
    const state = location.state as { autoGenerate?: boolean } | null;
    if (state?.autoGenerate && plan && org?.organization_id && localSections && !autoGenerateTriggered.current && !progress.isGenerating) {
      autoGenerateTriggered.current = true;
      // Clear navigation state
      window.history.replaceState({}, document.title);
      handleGenerateFullPlan();
    }
  }, [plan, org, localSections]);

  const handleReorder = async (newOrder: SectionRow[]) => {
    setLocalSections(newOrder);
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

  // AI: Generate full plan
  const handleGenerateFullPlan = async () => {
    if (!plan || !org?.organization_id) return;
    if (!plan.company_id) {
      toast({ title: "Koppel eerst een bedrijf aan dit plan", variant: "destructive" });
      return;
    }
    try {
      await generateFullPlan(
        plan.id,
        org.organization_id,
        plan,
        effectiveSections,
        (sectionId, html) => {
          setLocalSections(prev =>
            (prev ?? effectiveSections).map(s =>
              s.id === sectionId ? { ...s, content_html: html, ai_generated: true } : s
            )
          );
        }
      );
      toast({ title: "Projectplan gegenereerd", description: "Controleer de inhoud en pas aan waar nodig." });
    } catch (e: any) {
      toast({ title: "Generatie mislukt", description: e.message, variant: "destructive" });
    }
  };

  // AI: Rewrite single section
  const handleRewriteSection = async (section: SectionRow, extraInstructions?: string) => {
    if (!plan || !org?.organization_id) return;
    setRewritingId(section.id);
    try {
      const newContent = await rewriteSection(section, plan, org.organization_id, effectiveSections, extraInstructions);
      setLocalSections(prev =>
        (prev ?? effectiveSections).map(s =>
          s.id === section.id ? { ...s, content_html: newContent, ai_generated: true } : s
        )
      );
      toast({ title: "Sectie herschreven met AI" });
    } catch (e: any) {
      toast({ title: "Herschrijven mislukt", description: e.message, variant: "destructive" });
    } finally {
      setRewritingId(null);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-erp-text3">Laden...</div>;
  }
  if (!plan) {
    return <div className="p-6 text-erp-text3">Plan niet gevonden</div>;
  }

  const orgName = brandOrg?.name || "SiteJob";
  const progressPct = progress.totalSections > 0 ? (progress.completedSectionIds.length / progress.totalSections) * 100 : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* AI Progress bar */}
      {progress.isGenerating && (
        <div className="px-4 py-2 bg-erp-bg3 border-b border-erp-border0 shrink-0">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--erp-blue))]" />
            <span className="text-xs text-erp-text1">
              AI genereert secties ({progress.completedSectionIds.length}/{progress.totalSections})...
            </span>
            <Progress value={progressPct} className="flex-1 h-2" />
            <Button variant="ghost" size="sm" className="h-6 text-xs text-erp-text3" onClick={abort}>Stop</Button>
          </div>
        </div>
      )}

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
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-[hsl(var(--erp-blue))]/30 text-[hsl(var(--erp-blue))] hover:bg-[hsl(var(--erp-blue))]/10"
          onClick={handleGenerateFullPlan}
          disabled={progress.isGenerating}
        >
          {progress.isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Genereer met AI
        </Button>
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
                generatingId={progress.currentSectionId}
                completedIds={progress.completedSectionIds}
              />
            </div>

            {/* Section editor */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedSection ? (
                <SectionEditor
                  key={selectedSection.id}
                  section={selectedSection}
                  plan={plan}
                  allSections={effectiveSections}
                  onTitleChange={(title) => handleTitleChange(selectedSection.id, title)}
                  onContentChange={(html) => handleContentChange(selectedSection.id, html)}
                  onRewrite={handleRewriteSection}
                  isRewriting={rewritingId === selectedSection.id}
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
