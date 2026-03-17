import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SectionRow = Database["public"]["Tables"]["project_plan_sections"]["Row"];

export interface ClientContext {
  company: any;
  contacts: any[];
  deal: any;
  websiteAnalysis: any;
  enrichment: any;
  prospect: any;
  recentActivities: any[];
  calls: any[];
  emails: any[];
  whatsapp: any[];
}

export async function gatherClientContext(
  orgId: string,
  companyId: string,
  contactId?: string | null,
  dealId?: string | null
): Promise<ClientContext> {
  // First get contact IDs for this company (needed for call/email/whatsapp matching)
  const { data: companyContacts } = await supabase
    .from("contacts").select("id").eq("company_id", companyId);
  const contactIds = (companyContacts ?? []).map(c => c.id);

  const [company, contacts, deal, scrapes, enrichment, prospects, activities, calls, emails, whatsapp] = await Promise.all([
    // Company
    supabase.from("companies").select("name, website, industry, company_size, annual_revenue, city, postal_code, kvk_number, sbi_description, legal_form, founding_date, employee_count_range, notes, linkedin_url, address_line1").eq("id", companyId).single(),
    // Contacts
    supabase.from("contacts").select("first_name, last_name, email, phone, job_title, linkedin_url").eq("company_id", companyId),
    // Deal
    dealId ? supabase.from("deals").select("title, description, value, probability").eq("id", dealId).single() : Promise.resolve({ data: null }),
    // Website scrapes
    supabase.from("website_scrapes").select("url, summary, ai_analysis, branding").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1),
    // Lead enrichment
    supabase.from("lead_enrichment").select("ai_company_summary, ai_pain_points, ai_opportunity_notes, ai_pitch_brief, tech_stack, has_crm, has_erp, cms_platform").eq("organization_id", orgId).limit(1),
    // Prospect leads
    supabase.from("prospect_leads").select("fit_summary, score, analysis, score_breakdown").eq("company_id", companyId).limit(1),
    // Recent activities
    supabase.from("activities").select("activity_type, subject, description, created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(10),
    // Call log — match on company_id OR contact_id
    supabase.from("call_log")
      .select("direction, caller_name, destination_name, started_at, duration_seconds, transcription_text, transcription_summary, ai_summary, ai_action_items, sentiment, notes")
      .or(`matched_company_id.eq.${companyId}${contactIds.length ? ",matched_contact_id.in.(" + contactIds.join(",") + ")" : ""}`)
      .order("started_at", { ascending: false })
      .limit(20),
    // Google emails — match on company_id OR contact_id
    supabase.from("google_emails")
      .select("subject, snippet, from_name, from_email, to_emails, direction, received_at, ai_summary, category")
      .or(`company_id.eq.${companyId}${contactIds.length ? ",contact_id.in.(" + contactIds.join(",") + ")" : ""}`)
      .order("received_at", { ascending: false })
      .limit(20),
    // WhatsApp messages — only from contacts of this company
    contactIds.length
      ? supabase.from("whatsapp_messages")
          .select("content, direction, message_type, phone_number, created_at")
          .in("contact_id", contactIds)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    company: company.data,
    contacts: contacts.data || [],
    deal: deal.data,
    websiteAnalysis: (scrapes.data as any)?.[0] || null,
    enrichment: (enrichment.data as any)?.[0] || null,
    prospect: (prospects.data as any)?.[0] || null,
    recentActivities: activities.data || [],
    calls: (calls.data as any[]) || [],
    emails: (emails.data as any[]) || [],
    whatsapp: ((whatsapp as any).data as any[]) || [],
  };
}

async function generateSectionViaEdge(
  sectionType: string,
  sectionTitle: string,
  clientContext: ClientContext,
  planMeta: { title: string; totalAmount?: number; estimatedWeeks?: number; paymentStructure?: any[] },
  existingSections?: { type: string; content: string }[],
  extraInstructions?: string
): Promise<{ content: string; model: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Niet ingelogd");

  const res = await supabase.functions.invoke("generate-plan-section", {
    body: {
      section_type: sectionType,
      section_title: sectionTitle,
      client_context: clientContext,
      plan_meta: planMeta,
      existing_sections: existingSections,
      extra_instructions: extraInstructions,
    },
  });

  if (res.error) throw new Error(res.error.message || "AI generatie mislukt");
  return res.data as { content: string; model: string };
}

export interface GenerationProgress {
  isGenerating: boolean;
  currentSectionId: string | null;
  completedSectionIds: string[];
  totalSections: number;
  error: string | null;
}

export function useAIGeneration() {
  const [progress, setProgress] = useState<GenerationProgress>({
    isGenerating: false,
    currentSectionId: null,
    completedSectionIds: [],
    totalSections: 0,
    error: null,
  });
  const abortRef = useRef(false);

  const generateFullPlan = useCallback(async (
    planId: string,
    orgId: string,
    plan: any,
    sections: SectionRow[],
    onSectionComplete: (sectionId: string, html: string) => void
  ) => {
    abortRef.current = false;
    const companyId = plan.company_id;
    if (!companyId) throw new Error("Geen bedrijf gekoppeld");

    // Gather context
    const context = await gatherClientContext(orgId, companyId, plan.contact_id, plan.deal_id);

    // Save context to plan
    await supabase.from("project_plans").update({
      ai_context: context as any,
      generation_status: "generating",
      generation_error: null,
    }).eq("id", planId);

    const aiSections = ["description", "scope", "timeline", "investment", "deliverables", "parties", "assumptions"];
    const librarySections = ["terms", "sla", "security"];
    const skipSections = ["cover", "signatures"];

    const toProcess = sections.filter(s => !skipSections.includes(s.section_type));

    setProgress({
      isGenerating: true,
      currentSectionId: null,
      completedSectionIds: [],
      totalSections: toProcess.length,
      error: null,
    });

    const generated: { type: string; content: string }[] = [];

    try {
      for (const section of toProcess) {
        if (abortRef.current) break;

        setProgress(prev => ({ ...prev, currentSectionId: section.id }));

        if (librarySections.includes(section.section_type)) {
          // Load from library
          const { data: libItem } = await supabase
            .from("project_plan_section_library")
            .select("content_html")
            .eq("organization_id", orgId)
            .eq("section_type", section.section_type)
            .order("use_count", { ascending: false })
            .limit(1)
            .single();

          if (libItem?.content_html) {
            let html = libItem.content_html
              .replace(/\{\{client_company\}\}/g, context.company?.name || "")
              .replace(/\{\{client_name\}\}/g, context.contacts?.[0] ? `${context.contacts[0].first_name} ${context.contacts[0].last_name}` : "")
              .replace(/\{\{client_address\}\}/g, `${context.company?.address_line1 || ""}, ${context.company?.postal_code || ""} ${context.company?.city || ""}`)
              .replace(/\{\{client_kvk\}\}/g, context.company?.kvk_number || "[in te vullen]");

            await supabase.from("project_plan_sections").update({
              content_html: html,
              updated_at: new Date().toISOString(),
            }).eq("id", section.id);

            onSectionComplete(section.id, html);
          }
          setProgress(prev => ({ ...prev, completedSectionIds: [...prev.completedSectionIds, section.id] }));
          continue;
        }

        if (aiSections.includes(section.section_type)) {
          const result = await generateSectionViaEdge(
            section.section_type,
            section.title,
            context,
            {
              title: plan.title,
              totalAmount: plan.total_amount,
              estimatedWeeks: plan.estimated_weeks,
              paymentStructure: plan.payment_structure as any[],
            },
            generated
          );

          await supabase.from("project_plan_sections").update({
            content_html: result.content,
            ai_generated: true,
            ai_model: result.model,
            ai_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", section.id);

          onSectionComplete(section.id, result.content);
          generated.push({ type: section.section_type, content: result.content });
        }

        setProgress(prev => ({ ...prev, completedSectionIds: [...prev.completedSectionIds, section.id] }));
      }

      await supabase.from("project_plans").update({
        generation_status: "completed",
        updated_at: new Date().toISOString(),
      }).eq("id", planId);

      setProgress(prev => ({ ...prev, isGenerating: false, currentSectionId: null }));
    } catch (e: any) {
      await supabase.from("project_plans").update({
        generation_status: "failed",
        generation_error: e.message,
      }).eq("id", planId);
      setProgress(prev => ({ ...prev, isGenerating: false, error: e.message }));
      throw e;
    }
  }, []);

  const rewriteSection = useCallback(async (
    section: SectionRow,
    plan: any,
    orgId: string,
    allSections: SectionRow[],
    extraInstructions?: string
  ): Promise<string> => {
    const cachedContext = plan.ai_context as ClientContext | null;
    const context = cachedContext || (plan.company_id ? await gatherClientContext(orgId, plan.company_id, plan.contact_id, plan.deal_id) : null);

    if (!context) throw new Error("Geen klantcontext beschikbaar");

    const otherSections = allSections
      .filter(s => s.id !== section.id && s.content_html)
      .map(s => ({ type: s.section_type, content: s.content_html!.substring(0, 500) }));

    const result = await generateSectionViaEdge(
      section.section_type,
      section.title,
      context,
      {
        title: plan.title,
        totalAmount: plan.total_amount,
        estimatedWeeks: plan.estimated_weeks,
        paymentStructure: plan.payment_structure as any[],
      },
      otherSections,
      extraInstructions || section.ai_prompt || undefined
    );

    await supabase.from("project_plan_sections").update({
      content_html: result.content,
      ai_generated: true,
      ai_model: result.model,
      ai_prompt: extraInstructions || section.ai_prompt,
      ai_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", section.id);

    return result.content;
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { progress, generateFullPlan, rewriteSection, abort };
}
