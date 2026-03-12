import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useOrgDetails, useUpdateOrgDetails, useUploadOrgLogo } from "@/hooks/useOrgDetails";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#2563EB", "#7C3AED", "#059669", "#DC2626", "#D97706",
  "#0891B2", "#DB2777", "#4F46E5", "#0D9488", "#EA580C",
  "#6366F1", "#16A34A", "#9333EA", "#E11D48", "#CA8A04",
];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={cn(
                "w-7 h-7 rounded-lg border-2 transition-all",
                value === color ? "border-erp-text0 scale-110" : "border-transparent hover:border-erp-border1"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer border border-erp-border0 bg-transparent"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-[90px] bg-erp-bg2 border border-erp-border0 rounded-lg px-2 py-1.5 text-[12px] text-erp-text0 font-mono focus:outline-none focus:ring-1 focus:ring-erp-blue"
          />
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-erp-text2 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue disabled:opacity-50"
      />
    </div>
  );
}

export default function OrgSettings() {
  const { data: org, isLoading } = useOrgDetails();
  const { data: membership } = useOrganization();
  const updateOrg = useUpdateOrgDetails();
  const uploadLogo = useUploadOrgLogo();
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postal_code: "",
    country: "NL",
    kvk_number: "",
    vat_number: "",
    iban: "",
    primary_color: "#2563EB",
    secondary_color: "#1E40AF",
    invoice_prefix: "INV",
    quote_prefix: "OFF",
    project_prefix: "PRJ",
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || "",
        email: org.email || "",
        phone: org.phone || "",
        website: org.website || "",
        address_line1: org.address_line1 || "",
        address_line2: org.address_line2 || "",
        city: org.city || "",
        postal_code: org.postal_code || "",
        country: org.country || "NL",
        kvk_number: org.kvk_number || "",
        vat_number: org.vat_number || "",
        iban: org.iban || "",
        primary_color: org.primary_color || "#2563EB",
        secondary_color: org.secondary_color || "#1E40AF",
        invoice_prefix: org.invoice_prefix || "INV",
        quote_prefix: org.quote_prefix || "OFF",
        project_prefix: org.project_prefix || "PRJ",
      });
    }
  }, [org]);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    try {
      await updateOrg.mutateAsync(form);
      toast.success("Organisatie bijgewerkt");
    } catch (e: any) {
      toast.error(e.message || "Kon niet opslaan");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo mag maximaal 2MB zijn");
      return;
    }
    try {
      await uploadLogo.mutateAsync(file);
      toast.success("Logo geüpload");
    } catch (err: any) {
      toast.error(err.message || "Upload mislukt");
    }
  };

  if (isLoading) {
    return <div className="text-[13px] text-erp-text3 py-8 text-center">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Logo & Branding */}
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Huisstijl</h3>

        {/* Logo */}
        <div className="mb-5">
          <label className="block text-[12px] font-medium text-erp-text2 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => isAdmin && fileRef.current?.click()}
              className={cn(
                "w-[72px] h-[72px] rounded-xl border-2 border-dashed border-erp-border1 flex items-center justify-center overflow-hidden bg-erp-bg2 transition-colors",
                isAdmin && "cursor-pointer hover:border-erp-blue/50"
              )}
            >
              {org?.logo_url ? (
                <img
                  src={org.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <span className="text-[24px]">📷</span>
              )}
            </div>
            <div>
              <div className="text-[13px] text-erp-text1">
                {org?.logo_url ? "Klik om te wijzigen" : "Klik om logo te uploaden"}
              </div>
              <div className="text-[11px] text-erp-text3 mt-0.5">PNG, JPG, SVG of WebP · Max 2MB</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-4">
          <ColorPicker
            label="Primaire kleur"
            value={form.primary_color}
            onChange={set("primary_color")}
          />
          <ColorPicker
            label="Secundaire kleur"
            value={form.secondary_color}
            onChange={set("secondary_color")}
          />
        </div>

        {/* Preview */}
        <div className="mt-4 p-3 rounded-lg bg-erp-bg2 border border-erp-border0">
          <div className="text-[11px] text-erp-text3 mb-2 uppercase tracking-wider font-medium">Voorbeeld</div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-bold"
              style={{
                background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
              }}
            >
              {form.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-erp-text0">{form.name || "Organisatie"}</div>
              <div className="text-[11px]" style={{ color: form.primary_color }}>
                Dashboard accentkleur
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
                style={{ backgroundColor: form.primary_color }}
              >
                Primair
              </button>
              <button
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
                style={{ backgroundColor: form.secondary_color }}
              >
                Secundair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Bedrijfsgegevens</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InputField label="Bedrijfsnaam" value={form.name} onChange={set("name")} disabled={!isAdmin} />
          </div>
          <InputField label="E-mail" value={form.email} onChange={set("email")} type="email" placeholder="info@bedrijf.nl" disabled={!isAdmin} />
          <InputField label="Telefoon" value={form.phone} onChange={set("phone")} placeholder="+31 6 12345678" disabled={!isAdmin} />
          <InputField label="Website" value={form.website} onChange={set("website")} placeholder="https://bedrijf.nl" disabled={!isAdmin} />
          <InputField label="KVK nummer" value={form.kvk_number} onChange={set("kvk_number")} disabled={!isAdmin} />
          <InputField label="BTW nummer" value={form.vat_number} onChange={set("vat_number")} disabled={!isAdmin} />
          <InputField label="IBAN" value={form.iban} onChange={set("iban")} disabled={!isAdmin} />
        </div>
      </div>

      {/* Address */}
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Adres</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <InputField label="Adresregel 1" value={form.address_line1} onChange={set("address_line1")} disabled={!isAdmin} />
          </div>
          <div className="col-span-2">
            <InputField label="Adresregel 2" value={form.address_line2} onChange={set("address_line2")} disabled={!isAdmin} />
          </div>
          <InputField label="Postcode" value={form.postal_code} onChange={set("postal_code")} disabled={!isAdmin} />
          <InputField label="Plaats" value={form.city} onChange={set("city")} disabled={!isAdmin} />
          <InputField label="Land" value={form.country} onChange={set("country")} disabled={!isAdmin} />
        </div>
      </div>

      {/* Prefixes */}
      <div className="bg-erp-bg3 rounded-xl border border-erp-border0 p-5">
        <h3 className="text-[15px] font-semibold text-erp-text0 mb-4">Nummering</h3>
        <div className="grid grid-cols-3 gap-4">
          <InputField label="Factuur prefix" value={form.invoice_prefix} onChange={set("invoice_prefix")} disabled={!isAdmin} />
          <InputField label="Offerte prefix" value={form.quote_prefix} onChange={set("quote_prefix")} disabled={!isAdmin} />
          <InputField label="Project prefix" value={form.project_prefix} onChange={set("project_prefix")} disabled={!isAdmin} />
        </div>
      </div>

      {/* Save */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={updateOrg.isPending}
            className="bg-erp-blue hover:bg-erp-blue-light text-white px-6 py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {updateOrg.isPending ? "Opslaan..." : "Wijzigingen opslaan"}
          </button>
        </div>
      )}
    </div>
  );
}
