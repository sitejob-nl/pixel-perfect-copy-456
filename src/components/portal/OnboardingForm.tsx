import { useState } from "react";
import { submitOnboarding } from "@/hooks/useClientPortal";

interface Props {
  token: string;
  questions: any[];
  onReload: () => void;
}

export default function OnboardingForm({ token, questions, onReload }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    questions.forEach(q => {
      if (q.response?.response_text) init[q.id] = q.response.response_text;
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const answeredCount = Object.values(answers).filter(v => v.trim()).length;
  const totalCount = questions.length;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Group by section
  const sections: { title: string; questions: any[] }[] = [];
  let currentSection = "";
  questions.forEach(q => {
    const sec = q.section_title || "";
    if (sec !== currentSection || sections.length === 0) {
      currentSection = sec;
      sections.push({ title: sec, questions: [q] });
    } else {
      sections[sections.length - 1].questions.push(q);
    }
  });

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const payload = Object.entries(answers)
        .filter(([, v]) => v.trim())
        .map(([qId, text]) => ({ question_id: qId, response_text: text }));
      await submitOnboarding(token, payload);
      setSuccess(true);
      onReload();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const renderInput = (q: any) => {
    const value = answers[q.id] || "";
    const onChange = (val: string) => setAnswers(prev => ({ ...prev, [q.id]: val }));
    const baseClass = "w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white";

    switch (q.question_type) {
      case "textarea":
        return <textarea value={value} onChange={e => onChange(e.target.value)} className={`${baseClass} resize-none h-24`} placeholder={q.placeholder || ""} />;
      case "select":
        return (
          <select value={value} onChange={e => onChange(e.target.value)} className={baseClass}>
            <option value="">Selecteer...</option>
            {(q.options || []).map((opt: any, i: number) => {
              const optValue = typeof opt === "string" ? opt : opt.value || opt.label;
              const optLabel = typeof opt === "string" ? opt : opt.label || opt.value;
              return optValue ? <option key={i} value={optValue}>{optLabel}</option> : null;
            })}
          </select>
        );
      case "boolean":
        return (
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={q.id} value="true" checked={value === "true"} onChange={() => onChange("true")} className="text-blue-600" />
              <span className="text-sm">Ja</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={q.id} value="false" checked={value === "false"} onChange={() => onChange("false")} className="text-blue-600" />
              <span className="text-sm">Nee</span>
            </label>
          </div>
        );
      case "number":
        return <input type="number" value={value} onChange={e => onChange(e.target.value)} className={baseClass} placeholder={q.placeholder || ""} />;
      case "email":
        return <input type="email" value={value} onChange={e => onChange(e.target.value)} className={baseClass} placeholder={q.placeholder || ""} />;
      case "phone":
        return <input type="tel" value={value} onChange={e => onChange(e.target.value)} className={baseClass} placeholder={q.placeholder || ""} />;
      case "url":
        return <input type="url" value={value} onChange={e => onChange(e.target.value)} className={baseClass} placeholder={q.placeholder || "https://..."} />;
      case "date":
        return <input type="date" value={value} onChange={e => onChange(e.target.value)} className={baseClass} />;
      default: // text
        return <input type="text" value={value} onChange={e => onChange(e.target.value)} className={baseClass} placeholder={q.placeholder || ""} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{answeredCount} van {totalCount} vragen beantwoord</span>
          <span className="text-sm font-semibold text-blue-600">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {sections.map((section, si) => (
        <div key={si} className="space-y-4">
          {section.title && (
            <h3 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">
              {section.title}
            </h3>
          )}
          {section.questions.map(q => (
            <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                {q.question}
                {q.is_required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {q.description && (
                <p className="text-xs text-gray-500 mb-2">{q.description}</p>
              )}
              {renderInput(q)}
            </div>
          ))}
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
        {success && <span className="text-green-600 text-sm font-medium">✓ Opgeslagen!</span>}
      </div>
    </div>
  );
}
