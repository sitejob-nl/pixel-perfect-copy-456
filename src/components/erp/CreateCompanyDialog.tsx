import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateCompany } from "@/hooks/useCompanies";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Icons } from "@/components/erp/ErpIcons";

interface KvkResult {
  kvk_number: string | null;
  name: string;
  city: string | null;
  postal_code: string | null;
  address_line1: string | null;
  industry: string | null;
  sbi_code: string | null;
  legal_form: string | null;
}

const manualFields: { key: string; label: string; required?: boolean; type?: string }[] = [
  { key: "industry", label: "Branche" },
  { key: "city", label: "Stad" },
  { key: "phone", label: "Telefoon" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "website", label: "Website" },
];

export default function CreateCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [kvkResults, setKvkResults] = useState<KvkResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [kvkError, setKvkError] = useState<string | null>(null);
  const [selectedFromKvk, setSelectedFromKvk] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const createCompany = useCreateCompany();
  const { data: org } = useOrganization();
  const { toast } = useToast();

  // Search KVK on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setKvkError(null);

    if (!searchQuery || searchQuery.length < 2 || !org?.organization_id) {
      setKvkResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("kvk-search", {
          body: { query: searchQuery, organization_id: org.organization_id },
        });

        if (error) throw error;
        if (data?.error) {
          setKvkError(data.error);
          setKvkResults([]);
        } else {
          setKvkResults(data?.results ?? []);
          setShowDropdown((data?.results ?? []).length > 0);
        }
      } catch (err: any) {
        console.error("KVK search error:", err);
        setKvkError("Kon KVK niet doorzoeken");
        setKvkResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, org?.organization_id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectKvk = (result: KvkResult) => {
    setForm({
      name: result.name,
      kvk_number: result.kvk_number ?? "",
      city: result.city ?? "",
      postal_code: result.postal_code ?? "",
      address_line1: result.address_line1 ?? "",
      industry: result.industry ?? "",
      sbi_code: result.sbi_code ?? "",
      legal_form: result.legal_form ?? "",
    });
    setSearchQuery(result.name);
    setShowDropdown(false);
    setSelectedFromKvk(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = selectedFromKvk ? form.name : (searchQuery.trim() || form.name);
    if (!org?.organization_id || !name) return;
    try {
      await createCompany.mutateAsync({
        organization_id: org.organization_id,
        name: name,
        industry: form.industry || null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        kvk_number: form.kvk_number || null,
        postal_code: form.postal_code || null,
        address_line1: form.address_line1 || null,
        sbi_code: form.sbi_code || null,
        legal_form: form.legal_form || null,
        sbi_description: form.industry || null,
      });
      toast({ title: "Bedrijf aangemaakt" });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("limit reached")) {
        toast({ title: "Plan limiet bereikt", description: "Upgrade je plan om meer bedrijven toe te voegen.", variant: "destructive" });
      } else {
        toast({ title: "Fout", description: err.message, variant: "destructive" });
      }
    }
  };

  const resetForm = () => {
    setForm({});
    setSearchQuery("");
    setKvkResults([]);
    setSelectedFromKvk(false);
    setKvkError(null);
  };

  // Reset on dialog open
  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuw bedrijf</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* KVK Search Field */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-erp-text1 mb-1">
              Bedrijfsnaam of KVK-nummer
            </label>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSelectedFromKvk(false);
                }}
                placeholder="Zoek op naam of KVK-nummer..."
                required
                className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors pr-8"
              />
              {searching && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-erp-text3 border-t-erp-blue rounded-full animate-spin" />
                </div>
              )}
              {!searching && searchQuery.length >= 2 && (
                <Icons.Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-erp-text3" />
              )}
            </div>

            {kvkError && (
              <p className="text-[11px] text-erp-orange mt-1">{kvkError}</p>
            )}

            {/* KVK Results Dropdown */}
            {showDropdown && kvkResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-erp-bg3 border border-erp-border0 rounded-lg shadow-xl overflow-hidden max-h-[240px] overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-medium text-erp-text3 uppercase tracking-wider border-b border-erp-border0 bg-erp-bg2">
                  KVK Resultaten
                </div>
                {kvkResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectKvk(r)}
                    className="w-full text-left px-3 py-2.5 hover:bg-erp-bg2 transition-colors border-b border-erp-border0 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-erp-text0 truncate">{r.name}</span>
                      {r.kvk_number && (
                        <span className="text-[10px] text-erp-text3 font-mono shrink-0">
                          KVK {r.kvk_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.city && <span className="text-[11px] text-erp-text2">{r.city}</span>}
                      {r.industry && (
                        <>
                          <span className="text-erp-text3">·</span>
                          <span className="text-[11px] text-erp-text3 truncate">{r.industry}</span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Show selected KVK info */}
          {selectedFromKvk && form.kvk_number && (
            <div className="bg-erp-bg3 border border-erp-border0 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-erp-green">✓ KVK gegevens overgenomen</span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] text-erp-text3 hover:text-erp-text1 transition-colors"
                >
                  Wissen
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                {form.kvk_number && (
                  <div><span className="text-erp-text3">KVK:</span> <span className="text-erp-text1">{form.kvk_number}</span></div>
                )}
                {form.city && (
                  <div><span className="text-erp-text3">Plaats:</span> <span className="text-erp-text1">{form.city}</span></div>
                )}
                {form.legal_form && (
                  <div><span className="text-erp-text3">Rechtsvorm:</span> <span className="text-erp-text1">{form.legal_form}</span></div>
                )}
                {form.sbi_code && (
                  <div><span className="text-erp-text3">SBI:</span> <span className="text-erp-text1">{form.sbi_code}</span></div>
                )}
                {form.address_line1 && (
                  <div className="col-span-2"><span className="text-erp-text3">Adres:</span> <span className="text-erp-text1">{form.address_line1}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Remaining editable fields */}
          {manualFields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-erp-text1 mb-1">{f.label}</label>
              <input
                type={f.type ?? "text"}
                value={form[f.key] ?? ""}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                required={f.required}
                className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 placeholder:text-erp-text3 outline-none focus:border-erp-blue transition-colors"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={createCompany.isPending}
            className="w-full bg-erp-blue hover:brightness-110 text-white font-medium text-sm rounded-lg py-2.5 transition-colors disabled:opacity-50 mt-2"
          >
            {createCompany.isPending ? "Opslaan..." : "Bedrijf aanmaken"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
