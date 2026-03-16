import { useMemo } from "react";
import type { Database, Json } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

type PlanRow = Database["public"]["Tables"]["project_plans"]["Row"];
type SectionRow = Database["public"]["Tables"]["project_plan_sections"]["Row"];

const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

interface Props {
  plan: PlanRow;
  sections: SectionRow[];
  orgName?: string;
}

function replaceVars(html: string, plan: PlanRow): string {
  return html
    .replace(/\{\{client_company\}\}/g, plan.client_company || "—")
    .replace(/\{\{client_name\}\}/g, plan.client_name || "—")
    .replace(/\{\{client_email\}\}/g, plan.client_email || "—")
    .replace(/\{\{client_address\}\}/g, plan.client_address || "—")
    .replace(/\{\{client_kvk\}\}/g, plan.client_kvk || "—")
    .replace(/\{\{total_amount\}\}/g, plan.total_amount ? eur.format(plan.total_amount) : "—")
    .replace(/\{\{estimated_weeks\}\}/g, String(plan.estimated_weeks ?? "—"))
    .replace(/\{\{estimated_start\}\}/g, plan.estimated_start ? format(new Date(plan.estimated_start), "d MMMM yyyy", { locale: nl }) : "—");
}

export default function PlanPreview({ plan, sections, orgName = "SiteJob" }: Props) {
  const visibleSections = useMemo(() => sections.filter(s => s.is_visible), [sections]);

  return (
    <div className="bg-white text-gray-800 max-w-[800px] mx-auto shadow-2xl" style={{ fontFamily: "'Inter', sans-serif" }}>
      {visibleSections.map((section, idx) => (
        <div key={section.id}>
          {section.is_page_break_before && idx > 0 && (
            <div className="border-t-2 border-dashed border-gray-300 my-0" />
          )}
          <SectionBlock section={section} plan={plan} orgName={orgName} isFirst={idx === 0} />
        </div>
      ))}
    </div>
  );
}

function SectionBlock({ section, plan, orgName, isFirst }: { section: SectionRow; plan: PlanRow; orgName: string; isFirst: boolean }) {
  if (section.section_type === "cover") return <CoverSection plan={plan} orgName={orgName} />;
  if (section.section_type === "parties") return <PartiesSection plan={plan} orgName={orgName} />;
  if (section.section_type === "investment") return <InvestmentSection plan={plan} section={section} />;
  if (section.section_type === "signatures") return <SignaturesSection plan={plan} orgName={orgName} />;

  const html = replaceVars(section.content_html || "", plan);

  return (
    <div className="px-[60px] py-8">
      <h3 className="text-lg font-bold mb-1" style={{ color: "#0B1020" }}>{section.title}</h3>
      <div className="h-[2px] w-12 mb-4" style={{ backgroundColor: "#32C5FF" }} />
      <div
        className="prose prose-sm max-w-none text-gray-700 [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-300 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-gray-100"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

function CoverSection({ plan, orgName }: { plan: PlanRow; orgName: string }) {
  return (
    <div className="px-[60px] py-16 min-h-[500px] flex flex-col justify-between">
      <div>
        <div className="text-2xl font-bold tracking-tight" style={{ color: "#32C5FF" }}>{orgName}</div>
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold" style={{ color: "#0B1020" }}>{plan.title}</h1>
        <p className="text-lg text-gray-600">{plan.client_company}</p>
        <div className="h-[3px] w-20" style={{ backgroundColor: "#32C5FF" }} />
        <div className="text-sm text-gray-500 space-y-1">
          <p>{format(new Date(plan.created_at), "d MMMM yyyy", { locale: nl })}</p>
          <p>Versie {plan.version}</p>
        </div>
      </div>
    </div>
  );
}

function PartiesSection({ plan, orgName }: { plan: PlanRow; orgName: string }) {
  return (
    <div className="px-[60px] py-8">
      <h3 className="text-lg font-bold mb-1" style={{ color: "#0B1020" }}>Partijen</h3>
      <div className="h-[2px] w-12 mb-4" style={{ backgroundColor: "#32C5FF" }} />
      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Opdrachtgever</p>
          <p className="font-semibold">{plan.client_company || "—"}</p>
          <p className="text-sm text-gray-600">{plan.client_name || "—"}</p>
          <p className="text-sm text-gray-600">{plan.client_address || "—"}</p>
          {plan.client_kvk && <p className="text-sm text-gray-600">KvK: {plan.client_kvk}</p>}
          {plan.client_email && <p className="text-sm text-gray-600">{plan.client_email}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Opdrachtnemer</p>
          <p className="font-semibold">{orgName}</p>
        </div>
      </div>
    </div>
  );
}

function InvestmentSection({ plan, section }: { plan: PlanRow; section: SectionRow }) {
  const payments = plan.payment_structure as any[] | null;

  return (
    <div className="px-[60px] py-8">
      <h3 className="text-lg font-bold mb-1" style={{ color: "#0B1020" }}>{section.title}</h3>
      <div className="h-[2px] w-12 mb-4" style={{ backgroundColor: "#32C5FF" }} />
      {plan.total_amount && (
        <p className="text-2xl font-bold mb-4" style={{ color: "#0B1020" }}>{eur.format(plan.total_amount)}</p>
      )}
      {payments && payments.length > 0 && (
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-600">Fase</th>
              <th className="text-right py-2 font-semibold text-gray-600">Percentage</th>
              {plan.total_amount && <th className="text-right py-2 font-semibold text-gray-600">Bedrag</th>}
            </tr>
          </thead>
          <tbody>
            {payments.map((p: any, i: number) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2">{p.label || `Fase ${i + 1}`}</td>
                <td className="text-right py-2">{p.percentage}%</td>
                {plan.total_amount && <td className="text-right py-2">{eur.format((plan.total_amount * p.percentage) / 100)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-gray-500">Alle bedragen zijn exclusief {plan.vat_rate ?? 21}% BTW</p>
      {section.content_html && (
        <div className="prose prose-sm max-w-none text-gray-700 mt-4" dangerouslySetInnerHTML={{ __html: replaceVars(section.content_html, plan) }} />
      )}
    </div>
  );
}

function SignaturesSection({ plan, orgName }: { plan: PlanRow; orgName: string }) {
  return (
    <div className="px-[60px] py-8">
      <h3 className="text-lg font-bold mb-1" style={{ color: "#0B1020" }}>Ondertekening</h3>
      <div className="h-[2px] w-12 mb-4" style={{ backgroundColor: "#32C5FF" }} />
      <div className="grid grid-cols-2 gap-8 mt-8">
        {["Opdrachtgever", "Opdrachtnemer"].map(role => (
          <div key={role} className="space-y-6">
            <p className="text-xs font-semibold uppercase text-gray-400">{role}</p>
            <div className="border-b border-dashed border-gray-400 h-12" />
            <div className="text-sm text-gray-600 space-y-1">
              <p>Naam: {role === "Opdrachtgever" ? (plan.client_name || "_________________") : orgName}</p>
              <p>Datum: _________________</p>
              <p>Plaats: _________________</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
