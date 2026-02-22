import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateCompany } from "@/hooks/useCompanies";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

const fields: { key: string; label: string; required?: boolean; type?: string }[] = [
  { key: "name", label: "Bedrijfsnaam", required: true },
  { key: "industry", label: "Branche" },
  { key: "city", label: "Stad" },
  { key: "phone", label: "Telefoon" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "website", label: "Website" },
  { key: "kvk_number", label: "KVK-nummer" },
];

export default function CreateCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const createCompany = useCreateCompany();
  const { data: org } = useOrganization();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org?.organization_id || !form.name?.trim()) return;
    try {
      await createCompany.mutateAsync({
        organization_id: org.organization_id,
        name: form.name.trim(),
        industry: form.industry || null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        kvk_number: form.kvk_number || null,
      });
      toast({ title: "Bedrijf aangemaakt" });
      setForm({});
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuw bedrijf</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-erp-text1 mb-1">{f.label}</label>
              <input
                type={('type' in f ? f.type : 'text') as string}
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
