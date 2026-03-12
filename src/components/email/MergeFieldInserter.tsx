import { useState, useRef, useEffect } from "react";

interface MergeFieldGroup {
  category: string;
  icon: string;
  fields: { key: string; label: string }[];
}

const mergeFieldGroups: MergeFieldGroup[] = [
  {
    category: "Contact",
    icon: "👤",
    fields: [
      { key: "{{first_name}}", label: "Voornaam" },
      { key: "{{last_name}}", label: "Achternaam" },
      { key: "{{contact_name}}", label: "Volledige naam" },
      { key: "{{email}}", label: "E-mailadres" },
      { key: "{{phone}}", label: "Telefoonnummer" },
      { key: "{{job_title}}", label: "Functie" },
    ],
  },
  {
    category: "Bedrijf",
    icon: "🏢",
    fields: [
      { key: "{{company_name}}", label: "Bedrijfsnaam" },
      { key: "{{company_email}}", label: "Bedrijfs e-mail" },
      { key: "{{company_phone}}", label: "Bedrijfs telefoon" },
      { key: "{{company_website}}", label: "Website" },
      { key: "{{company_city}}", label: "Stad" },
      { key: "{{company_address}}", label: "Adres" },
    ],
  },
  {
    category: "Organisatie",
    icon: "⚙️",
    fields: [
      { key: "{{org_name}}", label: "Organisatie naam" },
      { key: "{{org_email}}", label: "Organisatie e-mail" },
      { key: "{{website_url}}", label: "Website URL" },
    ],
  },
  {
    category: "Deal / Project",
    icon: "💼",
    fields: [
      { key: "{{deal_title}}", label: "Deal titel" },
      { key: "{{deal_value}}", label: "Deal waarde" },
      { key: "{{project_name}}", label: "Projectnaam" },
      { key: "{{quote_number}}", label: "Offertenummer" },
      { key: "{{invoice_number}}", label: "Factuurnummer" },
    ],
  },
  {
    category: "Systeem",
    icon: "🔗",
    fields: [
      { key: "{{unsubscribe_url}}", label: "Uitschrijflink" },
      { key: "{{current_date}}", label: "Huidige datum" },
      { key: "{{portal_url}}", label: "Portaal link" },
    ],
  },
];

interface Props {
  onInsert: (field: string) => void;
}

export default function MergeFieldInserter({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search.trim()
    ? mergeFieldGroups
        .map((g) => ({
          ...g,
          fields: g.fields.filter(
            (f) =>
              f.label.toLowerCase().includes(search.toLowerCase()) ||
              f.key.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((g) => g.fields.length > 0)
    : mergeFieldGroups;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] px-2 py-1 rounded bg-erp-bg2 border border-erp-border0 text-erp-text2 hover:text-erp-text0 font-mono flex items-center gap-1"
        title="Merge field invoegen"
      >
        <span>{"{{ }}"}</span>
        <span className="text-[9px] text-erp-text3 font-sans font-normal">Variabelen</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-erp-bg3 border border-erp-border0 rounded-xl shadow-xl w-72 max-h-[360px] overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-erp-border0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek variabele..."
              autoFocus
              className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2.5 py-1.5 text-[12px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
          </div>

          {/* Groups */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <div className="text-center py-6 text-[12px] text-erp-text3">
                Geen variabelen gevonden
              </div>
            )}
            {filtered.map((group) => (
              <div key={group.category}>
                <div className="sticky top-0 bg-erp-bg3 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-erp-text3 flex items-center gap-1.5 border-b border-erp-border0/50">
                  <span>{group.icon}</span>
                  <span>{group.category}</span>
                </div>
                {group.fields.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      onInsert(f.key);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full text-left px-3 py-2 text-[12px] hover:bg-erp-hover flex justify-between items-center gap-2 transition-colors"
                  >
                    <span className="text-erp-text0">{f.label}</span>
                    <span className="font-mono text-erp-text3 text-[10px] bg-erp-bg2 px-1.5 py-0.5 rounded shrink-0">
                      {f.key}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-erp-border0 text-[10px] text-erp-text3">
            Variabelen worden bij verzending vervangen door echte data
          </div>
        </div>
      )}
    </div>
  );
}
