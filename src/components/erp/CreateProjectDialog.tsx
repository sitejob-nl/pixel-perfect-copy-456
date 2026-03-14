import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useCreateProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("intake");
  const [priority, setPriority] = useState("medium");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [estimatedValue, setEstimatedValue] = useState("");
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [billingFrequency, setBillingFrequency] = useState<string | null>(null);

  const createProject = useCreateProject();

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

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, first_name, last_name").order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Naam is verplicht"); return; }
    if (!orgMembership?.organization_id) { toast.error("Geen organisatie gevonden"); return; }

    const { data: projectNumber, error: numError } = await supabase.rpc("generate_document_number", {
      p_org_id: orgMembership.organization_id,
      p_prefix: "PRJ",
      p_entity: "projects",
    });
    if (numError) { toast.error(`Fout bij nummering: ${numError.message}`); return; }

    createProject.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        status,
        priority,
        project_number: projectNumber,
        organization_id: orgMembership.organization_id,
        company_id: companyId,
        contact_id: contactId,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        service_type: serviceType,
        monthly_amount: monthlyAmount ? parseFloat(monthlyAmount) : null,
        billing_frequency: billingFrequency,
      },
      {
        onSuccess: () => {
          toast.success("Project aangemaakt!");
          onOpenChange(false);
          setName(""); setDescription(""); setStatus("intake"); setPriority("medium");
          setCompanyId(null); setContactId(null); setEstimatedValue("");
          setServiceType(null); setMonthlyAmount(""); setBillingFrequency(null);
        },
        onError: (err) => {
          if (err.message?.toLowerCase().includes("limit reached")) {
            toast.error("Plan limiet bereikt. Upgrade je plan om meer projecten toe te voegen.");
          } else {
            toast.error(`Fout: ${err.message}`);
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuw project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Naam *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Website redesign" />
          </div>
          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Omschrijving</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="quoted">Offerte</SelectItem>
                  <SelectItem value="in_progress">In ontwikkeling</SelectItem>
                  <SelectItem value="delivered">Opgeleverd</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Prioriteit</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="low">Laag</SelectItem>
                  <SelectItem value="medium">Normaal</SelectItem>
                  <SelectItem value="high">Hoog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Type project</Label>
            <Select value={serviceType ?? "none"} onValueChange={v => setServiceType(v === "none" ? null : v)}>
              <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-erp-bg2 border-erp-border0">
                <SelectItem value="none">— Geen type —</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="platform">Platform / Maatwerk</SelectItem>
                <SelectItem value="saas">SaaS Product</SelectItem>
                <SelectItem value="implementatie">Implementatie</SelectItem>
                <SelectItem value="maatwerk">Maatwerk</SelectItem>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Bedrijf</Label>
              <Select value={companyId ?? "none"} onValueChange={v => setCompanyId(v === "none" ? null : v)}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="none">— Geen —</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Contact</Label>
              <Select value={contactId ?? "none"} onValueChange={v => setContactId(v === "none" ? null : v)}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="none">— Geen —</SelectItem>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Geschatte waarde (€)</Label>
            <Input type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="10000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Maandelijks bedrag (€)</Label>
              <Input type="number" value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="350" />
            </div>
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Facturatiefrequentie</Label>
              <Select value={billingFrequency ?? "none"} onValueChange={v => setBillingFrequency(v === "none" ? null : v)}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="none">— Geen —</SelectItem>
                  <SelectItem value="monthly">Maandelijks</SelectItem>
                  <SelectItem value="quarterly">Per kwartaal</SelectItem>
                  <SelectItem value="yearly">Jaarlijks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
            <ErpButton primary>{createProject.isPending ? "Opslaan..." : "Project aanmaken"}</ErpButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
