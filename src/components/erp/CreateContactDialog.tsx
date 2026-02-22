import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useCreateContact } from "@/hooks/useContacts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateContactDialog({ open, onOpenChange }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [temperature, setTemperature] = useState("warm");
  const [source, setSource] = useState("");
  const [lifecycleStage, setLifecycleStage] = useState("lead");

  const createContact = useCreateContact();

  // Get the user's organization
  const { data: orgMembership } = useQuery({
    queryKey: ["user-org"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("Voornaam is verplicht");
      return;
    }
    if (!orgMembership?.organization_id) {
      toast.error("Geen organisatie gevonden. Ben je ingelogd?");
      return;
    }

    createContact.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        job_title: jobTitle.trim() || null,
        temperature,
        source: source.trim() || null,
        lifecycle_stage: lifecycleStage,
        organization_id: orgMembership.organization_id,
      },
      {
        onSuccess: () => {
          toast.success("Contact aangemaakt!");
          onOpenChange(false);
          resetForm();
        },
        onError: (err) => {
          toast.error(`Fout: ${err.message}`);
        },
      }
    );
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setTemperature("warm");
    setSource("");
    setLifecycleStage("lead");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuw contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-erp-text2 text-xs">Voornaam *</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Jan" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-erp-text2 text-xs">Achternaam</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="de Vries" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-erp-text2 text-xs">E-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="jan@bedrijf.nl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-erp-text2 text-xs">Telefoon</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="+31 6 12345678" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-erp-text2 text-xs">Functietitel</Label>
            <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Directeur" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-erp-text2 text-xs">Temperatuur</Label>
              <Select value={temperature} onValueChange={setTemperature}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="hot">🔥 Hot</SelectItem>
                  <SelectItem value="warm">🟡 Warm</SelectItem>
                  <SelectItem value="cold">❄️ Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-erp-text2 text-xs">Status</Label>
              <Select value={lifecycleStage} onValueChange={setLifecycleStage}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="contacted">Gecontacteerd</SelectItem>
                  <SelectItem value="qualified">Gekwalificeerd</SelectItem>
                  <SelectItem value="opportunity">Kans</SelectItem>
                  <SelectItem value="customer">Klant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-erp-text2 text-xs">Bron</Label>
            <Input value={source} onChange={e => setSource(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Google Maps, LinkedIn, ..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
            <ErpButton primary>{createContact.isPending ? "Opslaan..." : "Contact toevoegen"}</ErpButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
