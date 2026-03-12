import { useState, useRef } from "react";

const mergeFields = [
  { key: "{{first_name}}", label: "Voornaam" },
  { key: "{{last_name}}", label: "Achternaam" },
  { key: "{{contact_name}}", label: "Volledige naam" },
  { key: "{{company_name}}", label: "Bedrijfsnaam" },
  { key: "{{email}}", label: "E-mailadres" },
  { key: "{{org_name}}", label: "Organisatie naam" },
  { key: "{{org_email}}", label: "Organisatie email" },
  { key: "{{website_url}}", label: "Website" },
  { key: "{{unsubscribe_url}}", label: "Uitschrijflink" },
];

interface Props {
  onInsert: (field: string) => void;
}

export default function MergeFieldInserter({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] px-2 py-1 rounded bg-erp-bg2 border border-erp-border0 text-erp-text2 hover:text-erp-text0 font-mono"
        title="Merge field invoegen"
      >
        {"{{ }}"}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-erp-bg3 border border-erp-border0 rounded-lg shadow-lg py-1 w-56">
          {mergeFields.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { onInsert(f.key); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-erp-hover flex justify-between items-center"
            >
              <span className="text-erp-text0">{f.label}</span>
              <span className="font-mono text-erp-text3 text-[10px]">{f.key}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
