import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface SignatureField {
  id: string;
  type: "signature" | "name" | "date" | "initials" | "text";
  label: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage
  height: number; // percentage
  page: number;
  required: boolean;
  signerIndex: number;
}

interface Props {
  pages: string[]; // HTML content per page (or single page)
  fields: SignatureField[];
  onChange: (fields: SignatureField[]) => void;
  signerCount?: number;
  readOnly?: boolean;
}

const FIELD_TYPES: { type: SignatureField["type"]; label: string; icon: string }[] = [
  { type: "signature", label: "Handtekening", icon: "✍️" },
  { type: "name", label: "Naam", icon: "👤" },
  { type: "date", label: "Datum", icon: "📅" },
  { type: "initials", label: "Initialen", icon: "🔤" },
  { type: "text", label: "Tekstveld", icon: "📝" },
];

const SIGNER_COLORS = [
  "border-blue-400 bg-blue-50",
  "border-emerald-400 bg-emerald-50",
  "border-amber-400 bg-amber-50",
  "border-purple-400 bg-purple-50",
];

const DEFAULT_SIZES: Record<SignatureField["type"], { w: number; h: number }> = {
  signature: { w: 25, h: 8 },
  name: { w: 20, h: 4 },
  date: { w: 15, h: 4 },
  initials: { w: 8, h: 5 },
  text: { w: 25, h: 4 },
};

let fieldIdCounter = 0;
function newFieldId() {
  return `field_${Date.now()}_${++fieldIdCounter}`;
}

export default function PDFFieldEditor({ pages, fields, onChange, signerCount = 1, readOnly = false }: Props) {
  const [activePage, setActivePage] = useState(0);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const pageFields = fields.filter((f) => f.page === activePage);

  const addField = useCallback(
    (type: SignatureField["type"]) => {
      const size = DEFAULT_SIZES[type];
      const newField: SignatureField = {
        id: newFieldId(),
        type,
        label: FIELD_TYPES.find((t) => t.type === type)?.label || type,
        x: 10,
        y: 70,
        width: size.w,
        height: size.h,
        page: activePage,
        required: true,
        signerIndex: 0,
      };
      onChange([...fields, newField]);
      setSelectedField(newField.id);
    },
    [fields, onChange, activePage]
  );

  const updateField = useCallback(
    (id: string, updates: Partial<SignatureField>) => {
      onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    },
    [fields, onChange]
  );

  const removeField = useCallback(
    (id: string) => {
      onChange(fields.filter((f) => f.id !== id));
      if (selectedField === id) setSelectedField(null);
    },
    [fields, onChange, selectedField]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, fieldId: string) => {
      if (readOnly) return;
      e.preventDefault();
      e.stopPropagation();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;

      const fieldXPx = (field.x / 100) * rect.width;
      const fieldYPx = (field.y / 100) * rect.height;

      setDragOffset({
        x: e.clientX - rect.left - fieldXPx,
        y: e.clientY - rect.top - fieldYPx,
      });
      setDragging(fieldId);
      setSelectedField(fieldId);
    },
    [fields, readOnly]
  );

  useEffect(() => {
    if (!dragging) return;
    const container = containerRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
      updateField(dragging, {
        x: Math.max(0, Math.min(85, x)),
        y: Math.max(0, Math.min(92, y)),
      });
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, dragOffset, updateField]);

  const selField = fields.find((f) => f.id === selectedField);

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Document preview with draggable fields */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page tabs */}
        {pages.length > 1 && (
          <div className="flex gap-1 mb-2">
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePage(i)}
                className={cn(
                  "px-3 py-1 text-xs rounded-lg font-medium transition-colors",
                  i === activePage
                    ? "bg-erp-blue text-white"
                    : "bg-erp-bg3 text-erp-text2 hover:bg-erp-bg4"
                )}
              >
                Pagina {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Document with overlay fields */}
        <div className="relative border border-erp-border0 rounded-xl bg-white overflow-hidden flex-1" ref={containerRef}>
          {pages[activePage]?.startsWith("data:image") || pages[activePage]?.startsWith("blob:") ? (
            <img
              src={pages[activePage]}
              alt={`Pagina ${activePage + 1}`}
              className="w-full select-none"
              draggable={false}
              onClick={() => setSelectedField(null)}
            />
          ) : (
            <div
              className="p-8 text-sm text-gray-900 leading-relaxed min-h-[500px] select-none"
              dangerouslySetInnerHTML={{ __html: pages[activePage] || "<p>Geen content</p>" }}
              onClick={() => setSelectedField(null)}
            />
          )}

          {/* Draggable fields overlay */}
          {pageFields.map((field) => {
            const colorClass = SIGNER_COLORS[field.signerIndex % SIGNER_COLORS.length];
            const isSelected = selectedField === field.id;
            return (
              <div
                key={field.id}
                onMouseDown={(e) => handleMouseDown(e, field.id)}
                className={cn(
                  "absolute border-2 border-dashed rounded-lg flex items-center justify-center gap-1.5 cursor-move transition-shadow text-xs font-medium select-none",
                  colorClass,
                  isSelected && "ring-2 ring-erp-blue shadow-lg",
                  dragging === field.id && "opacity-70",
                  readOnly && "cursor-default"
                )}
                style={{
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  width: `${field.width}%`,
                  height: `${field.height}%`,
                  minHeight: 24,
                }}
              >
                <span className="text-[10px]">
                  {FIELD_TYPES.find((t) => t.type === field.type)?.icon}
                </span>
                <span className="truncate text-[11px] text-gray-600">{field.label}</span>
                {!readOnly && isSelected && (
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => removeField(field.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Field palette & properties */}
      {!readOnly && (
        <div className="w-56 shrink-0 space-y-4">
          {/* Add fields */}
          <div>
            <h4 className="text-xs font-semibold text-erp-text2 mb-2 uppercase tracking-wider">Velden toevoegen</h4>
            <div className="space-y-1">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.type}
                  onClick={() => addField(ft.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-erp-bg3 hover:bg-erp-bg4 text-xs text-erp-text0 font-medium transition-colors border border-erp-border0"
                >
                  <span>{ft.icon}</span>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field properties */}
          {selField && (
            <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-3 space-y-3">
              <h4 className="text-xs font-semibold text-erp-text2 uppercase tracking-wider">Veldeigenschappen</h4>

              <div>
                <label className="block text-[10px] text-erp-text3 mb-0.5">Label</label>
                <input
                  value={selField.label}
                  onChange={(e) => updateField(selField.id, { label: e.target.value })}
                  className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2 py-1 text-xs text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                />
              </div>

              <div>
                <label className="block text-[10px] text-erp-text3 mb-0.5">Ondertekenaar</label>
                <select
                  value={selField.signerIndex}
                  onChange={(e) => updateField(selField.id, { signerIndex: Number(e.target.value) })}
                  className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2 py-1 text-xs text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
                >
                  {Array.from({ length: signerCount }).map((_, i) => (
                    <option key={i} value={i}>Ondertekenaar {i + 1}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-erp-text1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selField.required}
                  onChange={(e) => updateField(selField.id, { required: e.target.checked })}
                  className="rounded border-erp-border0"
                />
                Verplicht veld
              </label>

              <button
                onClick={() => removeField(selField.id)}
                className="w-full text-xs text-red-500 hover:text-red-600 font-medium py-1"
              >
                Veld verwijderen
              </button>
            </div>
          )}

          {/* Field list */}
          {fields.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-erp-text2 mb-2 uppercase tracking-wider">Alle velden ({fields.length})</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setActivePage(f.page); setSelectedField(f.id); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-left transition-colors",
                      selectedField === f.id
                        ? "bg-erp-blue/10 text-erp-blue"
                        : "text-erp-text1 hover:bg-erp-bg4"
                    )}
                  >
                    <span>{FIELD_TYPES.find((t) => t.type === f.type)?.icon}</span>
                    <span className="truncate">{f.label}</span>
                    {pages.length > 1 && <span className="text-erp-text3 ml-auto">p{f.page + 1}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
