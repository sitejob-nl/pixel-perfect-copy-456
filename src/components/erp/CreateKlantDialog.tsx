import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useCreateCompany } from "@/hooks/useCompanies";
import { useCreateContact } from "@/hooks/useContacts";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateKlantDialog({ open, onOpenChange }: Props) {
  const { data: org } = useOrganization();
  const orgId = org?.organization_id;
  const createCompany = useCreateCompany();
  const createContact = useCreateContact();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    companyName: "", industry: "", city: "", website: "", kvk: "", companyPhone: "",
    firstName: "", lastName: "", email: "", phone: "", functionTitle: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!orgId || !form.companyName || !form.firstName || !form.email) return;
    setSaving(true);
    try {
      const company = await createCompany.mutateAsync({
        name: form.companyName,
        industry: form.industry || null,
        city: form.city || null,
        website: form.website || null,
        kvk_number: form.kvk || null,
        phone: form.companyPhone || null,
        organization_id: orgId,
      });

      const contact = await createContact.mutateAsync({
        first_name: form.firstName,
        last_name: form.lastName || null,
        email: form.email,
        phone: form.phone || null,
        job_title: form.functionTitle || null,
        company_id: company.id,
        organization_id: orgId,
      });

      await supabase.from("companies").update({ primary_contact_id: contact.id }).eq("id", company.id);

      qc.invalidateQueries({ queryKey: ["klanten"] });
      toast.success("Klant aangemaakt");
      setForm({ companyName: "", industry: "", city: "", website: "", kvk: "", companyPhone: "", firstName: "", lastName: "", email: "", phone: "", functionTitle: "" });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuwe klant</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <div className="text-[12px] font-semibold text-erp-text2 uppercase tracking-wider mb-3">Bedrijfsgegevens</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-erp-text3 text-xs">Bedrijfsnaam *</Label><Input value={form.companyName} onChange={set("companyName")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div><Label className="text-erp-text3 text-xs">Branche</Label><Input value={form.industry} onChange={set("industry")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div><Label className="text-erp-text3 text-xs">Stad</Label><Input value={form.city} onChange={set("city")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div><Label className="text-erp-text3 text-xs">Website</Label><Input value={form.website} onChange={set("website")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div><Label className="text-erp-text3 text-xs">KVK-nummer</Label><Input value={form.kvk} onChange={set("kvk")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div><Label className="text-erp-text3 text-xs">Telefoon bedrijf</Label><Input value={form.companyPhone} onChange={set("companyPhone")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-erp-text2 uppercase tracking-wider mb-3">Contactpersoon</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-erp-text3 text-xs">Voornaam *</Label><Input value={form.firstName} onChange={set("firstName")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div><Label className="text-erp-text3 text-xs">Achternaam</Label><Input value={form.lastName} onChange={set("lastName")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div><Label className="text-erp-text3 text-xs">E-mail *</Label><Input type="email" value={form.email} onChange={set("email")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div><Label className="text-erp-text3 text-xs">Telefoon</Label><Input type="tel" value={form.phone} onChange={set("phone")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
              <div className="col-span-2"><Label className="text-erp-text3 text-xs">Functie</Label><Input value={form.functionTitle} onChange={set("functionTitle")} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm mt-1" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
            <ErpButton primary onClick={handleSubmit} disabled={saving || !form.companyName || !form.firstName || !form.email}>
              {saving ? "Opslaan..." : "Klant aanmaken"}
            </ErpButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
