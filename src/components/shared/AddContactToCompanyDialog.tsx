import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErpButton, ErpTabs } from "@/components/erp/ErpPrimitives";
import { useContacts, useCreateContact } from "@/hooks/useContacts";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, User } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName?: string;
}

export default function AddContactToCompanyDialog({ open, onOpenChange, companyId, companyName }: Props) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState(false);

  // New contact form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const { data: allContacts = [] } = useContacts();
  const createContact = useCreateContact();
  const { data: org } = useOrganization();
  const qc = useQueryClient();

  // Show contacts without a company or all contacts for reassignment
  const filteredContacts = allContacts.filter(c => {
    const name = `${c.first_name} ${c.last_name ?? ""} ${c.email ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase()) && c.company_id !== companyId;
  });

  const linkExisting = async (contactId: string) => {
    setLinking(true);
    const { error } = await supabase.from("contacts").update({ company_id: companyId }).eq("id", contactId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Contact gekoppeld");
      qc.invalidateQueries({ queryKey: ["company-contacts", companyId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      onOpenChange(false);
    }
    setLinking(false);
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !org?.organization_id) return;

    createContact.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        job_title: jobTitle.trim() || null,
        company_id: companyId,
        organization_id: org.organization_id,
      },
      {
        onSuccess: () => {
          toast.success("Contact aangemaakt en gekoppeld");
          qc.invalidateQueries({ queryKey: ["company-contacts", companyId] });
          onOpenChange(false);
          resetForm();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const resetForm = () => {
    setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setJobTitle("");
    setSearch("");
  };

  const inputClass = "bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Contact toevoegen{companyName ? ` aan ${companyName}` : ""}</DialogTitle>
        </DialogHeader>

        <ErpTabs
          items={[
            ["existing", "Bestaand contact"],
            ["new", "Nieuw contact"],
          ]}
          active={mode}
          onChange={(v) => setMode(v as "existing" | "new")}
        />

        {mode === "existing" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-erp-text3" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Zoek op naam of email..."
                className={`${inputClass} pl-9`}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {filteredContacts.length === 0 && (
                <p className="text-sm text-erp-text3 py-4 text-center">Geen contacten gevonden</p>
              )}
              {filteredContacts.slice(0, 50).map(c => (
                <button
                  key={c.id}
                  onClick={() => linkExisting(c.id)}
                  disabled={linking}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-erp-bg3 border border-erp-border0 hover:border-erp-blue/50 transition-colors text-left disabled:opacity-50"
                >
                  <User className="w-4 h-4 text-erp-text3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-erp-text0">{c.first_name} {c.last_name ?? ""}</div>
                    <div className="flex items-center gap-2 text-[11px] text-erp-text3">
                      {c.email && <span>{c.email}</span>}
                      {c.companies?.name && <span className="text-erp-text3">• {c.companies.name}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "new" && (
          <form onSubmit={handleCreateNew} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-erp-text2 text-xs">Voornaam *</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="Jan" />
              </div>
              <div className="space-y-1">
                <Label className="text-erp-text2 text-xs">Achternaam</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="de Vries" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="jan@bedrijf.nl" />
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Telefoon</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+31 6 12345678" />
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Functietitel</Label>
              <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className={inputClass} placeholder="Directeur" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
              <ErpButton primary>{createContact.isPending ? "Opslaan..." : "Contact toevoegen"}</ErpButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
