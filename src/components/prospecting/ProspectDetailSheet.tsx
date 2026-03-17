import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton, Badge } from "@/components/erp/ErpPrimitives";
import ProspectStatusBadge from "./ProspectStatusBadge";
import { useUpdateProspectLead, useDeleteProspectLead } from "@/hooks/useProspectKanban";
import type { ProspectLead, KanbanStage } from "@/hooks/useProspectKanban";
import { useLinkedInTemplates, useGenerateLinkedInMessage, useSaveLinkedInMessage } from "@/hooks/useLinkedInGenerator";
import { toast } from "sonner";
import {
  ExternalLink, Phone, Linkedin, Globe, Eye, MessageCircle, Mail,
  Copy, Trash2, Clock, Sparkles, RefreshCw, Save, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  lead: ProspectLead | null;
  stages: KanbanStage[];
  open: boolean;
  onClose: () => void;
  onConvert: (lead: ProspectLead) => void;
  onReject: (lead: ProspectLead, status: string) => void;
}

function TimelineItem({ date, label }: { date?: string; label: string }) {
  if (!date) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-erp-blue mt-1.5" />
        <div className="w-px h-full bg-erp-border0 min-h-[16px]" />
      </div>
      <div>
        <div className="text-[12px] text-erp-text0 font-medium">{label}</div>
        <div className="text-[11px] text-erp-text3">
          {new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

export default function ProspectDetailSheet({ lead, stages, open, onClose, onConvert, onReject }: Props) {
  const updateLead = useUpdateProspectLead();
  const deleteLead = useDeleteProspectLead();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [localNotes, setLocalNotes] = useState("");
  const [contactChannel, setContactChannel] = useState<string | null>(null);

  // LinkedIn AI state
  const { data: templates } = useLinkedInTemplates();
  const generateMessage = useGenerateLinkedInMessage();
  const saveMessage = useSaveLinkedInMessage();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [showExtraInstructions, setShowExtraInstructions] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [maxLength, setMaxLength] = useState(300);

  // Sync notes when lead changes
  const notes = lead?.notes || "";

  // Smart default template selection based on prospect status
  useEffect(() => {
    if (!templates?.length || selectedTemplateId) return;
    const status = lead?.status || "";
    const typeMap: Record<string, string> = {
      new: "intro", analyzed: "intro", demo_ready: "intro",
      demo_sent: "demo_share", demo_viewed: "after_view",
      contacted: "follow_up",
    };
    const targetType = typeMap[status] || "intro";
    const match = templates.find(t => t.message_type === targetType) || templates[0];
    if (match) {
      setSelectedTemplateId(match.id);
      setMaxLength(match.max_length);
    }
  }, [templates, lead?.status, selectedTemplateId]);

  // Pre-fill with existing draft
  useEffect(() => {
    if (lead?.linkedin_message_draft && !generatedMessage) {
      setGeneratedMessage(lead.linkedin_message_draft);
    }
  }, [lead?.id]);

  // Reset state when lead changes
  useEffect(() => {
    setGeneratedMessage(lead?.linkedin_message_draft || "");
    setSelectedTemplateId("");
    setExtraInstructions("");
    setShowExtraInstructions(false);
  }, [lead?.id]);

  const selectedTemplate = useMemo(
    () => templates?.find(t => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  if (!lead) return null;

  const handleSaveNotes = async () => {
    try {
      await updateLead.mutateAsync({ id: lead.id, notes: localNotes || notes });
      toast.success("Notities opgeslagen");
    } catch {
      toast.error("Fout bij opslaan");
    }
  };

  const handleLogContact = async (channel: string) => {
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        last_contacted_at: new Date().toISOString(),
        last_contact_channel: channel,
      });
      toast.success("Contact gelogd");
      setContactChannel(null);
    } catch {
      toast.error("Fout bij loggen");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "converted") {
      onConvert(lead);
      return;
    }
    if (newStatus === "not_interested" || newStatus === "disqualified") {
      onReject(lead, newStatus);
      return;
    }
    try {
      await updateLead.mutateAsync({ id: lead.id, status: newStatus });
      toast.success("Status bijgewerkt");
    } catch {
      toast.error("Fout bij bijwerken");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success("Prospect verwijderd");
      onClose();
    } catch {
      toast.error("Fout bij verwijderen");
    }
    setDeleteConfirm(false);
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast.error("Kies eerst een template");
      return;
    }
    try {
      const result = await generateMessage.mutateAsync({
        prospectLeadId: lead.id,
        templateId: selectedTemplateId,
        extraInstructions: extraInstructions || undefined,
      });
      setGeneratedMessage(result.message);
      if (result.maxLength) setMaxLength(result.maxLength);
    } catch (err: any) {
      toast.error(err?.message || "Fout bij genereren");
    }
  };

  const handleSaveMessage = async () => {
    if (!generatedMessage.trim()) return;
    await saveMessage.mutateAsync({
      prospectLeadId: lead.id,
      message: generatedMessage,
      templateId: selectedTemplateId || undefined,
    });
  };

  const charCount = generatedMessage.length;
  const isOverLimit = charCount > maxLength;

  // Context indicators
  const hasAnalysis = !!(lead as any).analysis || !!(lead as any).fit_summary;
  const hasWebsite = !!lead.website_url;

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent className="bg-erp-bg1 border-erp-border0 w-[480px] sm:max-w-[480px] flex flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-erp-text0 text-lg">{lead.company_name}</SheetTitle>
          </SheetHeader>

          {/* Header info */}
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <ProspectStatusBadge status={lead.status} stages={stages} />
              {lead.score != null && lead.score > 0 && (
                <span className={cn(
                  "text-[11px] font-bold px-1.5 py-0.5 rounded",
                  lead.score >= 61 ? "bg-green-500/15 text-green-500" : lead.score >= 41 ? "bg-yellow-500/15 text-yellow-500" : "bg-red-500/15 text-red-500"
                )}>Score: {lead.score}</span>
              )}
              {lead.google_rating != null && (
                <span className="text-[11px] text-erp-text2">⭐ {lead.google_rating}</span>
              )}
            </div>
            {lead.city && <div className="text-[12px] text-erp-text2">{lead.city}</div>}
            {lead.phone && <div className="text-[12px] text-erp-text2">{lead.phone}</div>}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap mt-3">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-[11px] font-medium text-erp-text1 bg-erp-bg3 px-2.5 py-1.5 rounded-lg hover:bg-erp-hover">
                <Phone className="w-3.5 h-3.5" /> Bellen
              </a>
            )}
            {lead.contact_linkedin_url && (
              <a href={lead.contact_linkedin_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[11px] font-medium text-erp-text1 bg-erp-bg3 px-2.5 py-1.5 rounded-lg hover:bg-erp-hover">
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn
              </a>
            )}
            {lead.website_url && (
              <a href={lead.website_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[11px] font-medium text-erp-text1 bg-erp-bg3 px-2.5 py-1.5 rounded-lg hover:bg-erp-hover">
                <Globe className="w-3.5 h-3.5" /> Website
              </a>
            )}
            {lead.demo_url && (
              <a href={lead.demo_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[11px] font-medium text-erp-blue bg-erp-blue/10 px-2.5 py-1.5 rounded-lg hover:bg-erp-blue/20">
                <Eye className="w-3.5 h-3.5" /> Demo
              </a>
            )}
            {lead.phone && (
              <a href={`https://wa.me/${lead.phone.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-[11px] font-medium text-green-500 bg-green-500/10 px-2.5 py-1.5 rounded-lg hover:bg-green-500/20">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            {lead.contact_email && (
              <a href={`mailto:${lead.contact_email}`} className="flex items-center gap-1 text-[11px] font-medium text-erp-text1 bg-erp-bg3 px-2.5 py-1.5 rounded-lg hover:bg-erp-hover">
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="mt-4 flex-1">
            <TabsList className="bg-erp-bg3 border border-erp-border0">
              <TabsTrigger value="overview" className="text-[11px]">Overzicht</TabsTrigger>
              <TabsTrigger value="notes" className="text-[11px]">Notities</TabsTrigger>
              <TabsTrigger value="linkedin" className="text-[11px]">LinkedIn</TabsTrigger>
              <TabsTrigger value="demo" className="text-[11px]">Demo & Email</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4 mt-3">
              {lead.fit_summary && (
                <div className="bg-erp-bg3 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-erp-text2 mb-1">Fit samenvatting</div>
                  <p className="text-[12px] text-erp-text1">{lead.fit_summary}</p>
                </div>
              )}

              {lead.score_breakdown && Object.keys(lead.score_breakdown).length > 0 && (
                <div className="bg-erp-bg3 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-erp-text2 mb-2">Score breakdown</div>
                  <div className="space-y-1.5">
                    {Object.entries(lead.score_breakdown).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[11px] text-erp-text2 w-24 truncate capitalize">{k}</span>
                        <div className="flex-1 h-1.5 bg-erp-bg4 rounded-full overflow-hidden">
                          <div className="h-full bg-erp-blue rounded-full" style={{ width: `${Math.min(v as number, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-erp-text3 w-6 text-right">{v as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact info */}
              {(lead.contact_name || lead.contact_email || lead.contact_phone) && (
                <div className="bg-erp-bg3 rounded-lg p-3">
                  <div className="text-[11px] font-semibold text-erp-text2 mb-1.5">Contact</div>
                  {lead.contact_name && <div className="text-[12px] text-erp-text0 font-medium">{lead.contact_name}</div>}
                  {lead.contact_job_title && <div className="text-[11px] text-erp-text2">{lead.contact_job_title}</div>}
                  {lead.contact_email && <div className="text-[11px] text-erp-text2">{lead.contact_email}</div>}
                  {lead.contact_phone && <div className="text-[11px] text-erp-text2">{lead.contact_phone}</div>}
                </div>
              )}

              {/* Timeline */}
              <div className="bg-erp-bg3 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-erp-text2 mb-2">Tijdlijn</div>
                <div className="space-y-1">
                  <TimelineItem date={lead.created_at} label="Toegevoegd" />
                  <TimelineItem date={lead.analyzed_at} label="Geanalyseerd" />
                  <TimelineItem date={lead.demo_built_at} label="Demo gebouwd" />
                  <TimelineItem date={lead.email_sent_at} label="Email verstuurd" />
                  <TimelineItem date={lead.demo_viewed_at} label={`Demo bekeken (${lead.demo_view_count || 1}x)`} />
                  <TimelineItem date={lead.last_contacted_at} label={`Laatst contact${lead.last_contact_channel ? ` (via ${lead.last_contact_channel})` : ""}`} />
                  <TimelineItem date={lead.converted_at} label="Geconverteerd naar deal" />
                </div>
              </div>
            </TabsContent>

            {/* Notes */}
            <TabsContent value="notes" className="space-y-4 mt-3">
              <Textarea
                defaultValue={notes}
                onChange={e => setLocalNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Notities over deze prospect..."
                className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[13px] min-h-[120px]"
              />

              {lead.last_contacted_at && (
                <div className="text-[11px] text-erp-text3">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Laatst contact: {new Date(lead.last_contacted_at).toLocaleDateString("nl-NL")}
                  {lead.last_contact_channel && ` via ${lead.last_contact_channel}`}
                </div>
              )}

              <div>
                <div className="text-[11px] font-semibold text-erp-text2 mb-2">Contact loggen</div>
                <div className="flex gap-2">
                  {["linkedin", "whatsapp", "email", "phone"].map(ch => (
                    <button
                      key={ch}
                      onClick={() => handleLogContact(ch)}
                      className="text-[11px] font-medium text-erp-text1 bg-erp-bg3 px-2.5 py-1.5 rounded-lg hover:bg-erp-hover capitalize"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* LinkedIn AI */}
            <TabsContent value="linkedin" className="space-y-3 mt-3">
              {/* Context indicators */}
              <div className="flex flex-wrap gap-1.5">
                {hasAnalysis && (
                  <span className="text-[10px] bg-erp-bg3 text-erp-text2 px-2 py-0.5 rounded-full">📊 Analyse beschikbaar</span>
                )}
                {hasWebsite && (
                  <span className="text-[10px] bg-erp-bg3 text-erp-text2 px-2 py-0.5 rounded-full">🌐 Website bekend</span>
                )}
                {lead.contact_name && (
                  <span className="text-[10px] bg-erp-bg3 text-erp-text2 px-2 py-0.5 rounded-full">👤 Contact bekend</span>
                )}
              </div>

              {/* Template selection */}
              <div>
                <div className="text-[11px] font-semibold text-erp-text2 mb-1.5">Template</div>
                <Select
                  value={selectedTemplateId}
                  onValueChange={id => {
                    setSelectedTemplateId(id);
                    const t = templates?.find(t => t.id === id);
                    if (t) setMaxLength(t.max_length);
                  }}
                >
                  <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[12px] h-8">
                    <SelectValue placeholder="Kies template..." />
                  </SelectTrigger>
                  <SelectContent className="bg-erp-bg2 border-erp-border0">
                    {templates?.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-erp-text0 text-[12px]">
                        {t.name} · {t.max_length} tekens · {t.tone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Extra instructions toggle */}
              <div>
                <button
                  onClick={() => setShowExtraInstructions(!showExtraInstructions)}
                  className="flex items-center gap-1 text-[11px] text-erp-text2 hover:text-erp-text1"
                >
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showExtraInstructions && "rotate-180")} />
                  Extra instructies
                </button>
                {showExtraInstructions && (
                  <Textarea
                    value={extraInstructions}
                    onChange={e => setExtraInstructions(e.target.value)}
                    placeholder="Bijv. 'Focus op hun Excel-probleem' of 'Noem dat we ook voor makelaars werken'"
                    className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[12px] min-h-[60px] mt-1.5"
                  />
                )}
              </div>

              {/* Generate button */}
              <ErpButton
                primary
                onClick={handleGenerate}
                disabled={generateMessage.isPending || !selectedTemplateId}
              >
                {generateMessage.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Genereren...
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Genereer bericht
                  </>
                )}
              </ErpButton>

              {/* Message area */}
              {(generatedMessage || generateMessage.isPending) && (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-erp-text2">
                    {lead.linkedin_message_draft && generatedMessage === lead.linkedin_message_draft
                      ? "Opgeslagen bericht"
                      : "Gegenereerd bericht"}
                  </div>
                  {generateMessage.isPending ? (
                    <div className="bg-erp-bg3 rounded-lg p-3 space-y-2 animate-pulse">
                      <div className="h-3 bg-erp-bg4 rounded w-3/4" />
                      <div className="h-3 bg-erp-bg4 rounded w-full" />
                      <div className="h-3 bg-erp-bg4 rounded w-2/3" />
                    </div>
                  ) : (
                    <>
                      <Textarea
                        value={generatedMessage}
                        onChange={e => setGeneratedMessage(e.target.value)}
                        className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[12px] min-h-[120px] font-sans"
                      />
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[10px] font-medium",
                          isOverLimit ? "text-red-500" : "text-green-500"
                        )}>
                          {charCount} / {maxLength} tekens
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { navigator.clipboard.writeText(generatedMessage); toast.success("Gekopieerd!"); }}
                            className="flex items-center gap-1 text-[11px] text-erp-text1 bg-erp-bg3 px-2 py-1 rounded hover:bg-erp-hover"
                          >
                            <Copy className="w-3 h-3" /> Kopieer
                          </button>
                          <button
                            onClick={handleGenerate}
                            disabled={generateMessage.isPending}
                            className="flex items-center gap-1 text-[11px] text-erp-text1 bg-erp-bg3 px-2 py-1 rounded hover:bg-erp-hover"
                          >
                            <RefreshCw className="w-3 h-3" /> Opnieuw
                          </button>
                          <button
                            onClick={handleSaveMessage}
                            disabled={saveMessage.isPending}
                            className="flex items-center gap-1 text-[11px] text-white bg-erp-blue px-2 py-1 rounded hover:bg-erp-blue/90"
                          >
                            <Save className="w-3 h-3" /> Opslaan
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Open LinkedIn profile */}
              {lead.contact_linkedin_url && (
                <a href={lead.contact_linkedin_url} target="_blank" rel="noopener"
                   className="flex items-center gap-1.5 text-[12px] text-erp-blue hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> Open LinkedIn profiel
                </a>
              )}
            </TabsContent>

            {/* Demo & Email */}
            <TabsContent value="demo" className="space-y-4 mt-3">
              {lead.demo_url ? (
                <div className="bg-erp-bg3 rounded-lg p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-erp-text2">Demo</div>
                  <a href={lead.demo_url} target="_blank" rel="noopener"
                     className="flex items-center gap-1 text-[12px] text-erp-blue hover:underline">
                    <Eye className="w-3.5 h-3.5" /> Bekijk demo
                  </a>
                  <div className="text-[11px] text-erp-text3">
                    {lead.demo_view_count || 0}x bekeken
                    {lead.demo_viewed_at && ` · Laatst: ${new Date(lead.demo_viewed_at).toLocaleDateString("nl-NL")}`}
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-erp-text3 text-center py-4">Geen demo beschikbaar</div>
              )}

              {(lead.email_subject || lead.email_body) && (
                <div className="bg-erp-bg3 rounded-lg p-3 space-y-2">
                  <div className="text-[11px] font-semibold text-erp-text2">Email</div>
                  {lead.email_subject && <div className="text-[12px] text-erp-text0 font-medium">{lead.email_subject}</div>}
                  {lead.email_body && <div className="text-[12px] text-erp-text1 whitespace-pre-wrap">{lead.email_body}</div>}
                  {lead.email_opened_at && (
                    <div className="text-[11px] text-erp-text3">Geopend: {new Date(lead.email_opened_at).toLocaleDateString("nl-NL")}</div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="border-t border-erp-border0 pt-3 mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-erp-text2 font-medium">Status:</span>
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-[12px] h-8 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  {stages.map(s => (
                    <SelectItem key={s.status_key} value={s.status_key} className="text-erp-text0 text-[12px]">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <ErpButton primary onClick={() => onConvert(lead)}>Converteren naar Deal</ErpButton>
              <ErpButton onClick={() => onReject(lead, "not_interested")}>Niet geïnteresseerd</ErpButton>
              <button onClick={() => setDeleteConfirm(true)} className="text-erp-text3 hover:text-red-500 ml-auto">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent className="bg-erp-bg2 border-erp-border0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-erp-text0">Prospect verwijderen</AlertDialogTitle>
            <AlertDialogDescription className="text-erp-text2">
              Weet je zeker dat je {lead.company_name} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-erp-bg3 text-erp-text0 border-erp-border0">Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Verwijderen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
