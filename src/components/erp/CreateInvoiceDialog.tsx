import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useCreateInvoice } from "@/hooks/useInvoices";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateInvoiceDialog({ open, onOpenChange }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [linePrice, setLinePrice] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [visibleInPortal, setVisibleInPortal] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");

  const createInvoice = useCreateInvoice();

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

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, first_name, last_name, email").order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, project_number").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { toast.error("Klantnaam is verplicht"); return; }
    if (!orgMembership?.organization_id) { toast.error("Geen organisatie gevonden"); return; }

    const { data: invoiceNumber, error: numError } = await supabase.rpc("generate_document_number", {
      p_org_id: orgMembership.organization_id,
      p_prefix: "INV",
      p_entity: "invoices",
    });
    if (numError) { toast.error(`Fout bij nummering: ${numError.message}`); return; }

    const qty = parseFloat(lineQty) || 1;
    const price = parseFloat(linePrice) || 0;
    const subtotal = qty * price;
    const vatAmount = subtotal * 0.21;
    const total = subtotal + vatAmount;

    const lines = lineDesc.trim() ? [{
      description: lineDesc.trim(),
      quantity: qty,
      unit_price: price,
      vat_rate: 21,
      vat_amount: vatAmount,
      line_total: subtotal,
    }] : [];

    createInvoice.mutate(
      {
        invoice_number: invoiceNumber,
        organization_id: orgMembership.organization_id,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        contact_id: contactId,
        project_id: projectId,
        subtotal,
        vat_amount: vatAmount,
        total_amount: total,
        status: "draft",
        lines,
      },
      {
        onSuccess: () => {
          toast.success("Factuur aangemaakt!");
          onOpenChange(false);
          setCustomerName(""); setCustomerEmail(""); setContactId(null); setProjectId(null);
          setLineDesc(""); setLineQty("1"); setLinePrice("");
        },
        onError: (err) => {
          if (err.message?.toLowerCase().includes("limit reached")) {
            toast.error("Plan limiet bereikt. Upgrade je plan om meer facturen toe te voegen.");
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
          <DialogTitle className="text-erp-text0">Nieuwe factuur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Klantnaam *</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Bedrijf B.V." />
          </div>
          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">E-mail</Label>
            <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1">
              <Label className="text-erp-text2 text-xs">Project</Label>
              <Select value={projectId ?? "none"} onValueChange={v => setProjectId(v === "none" ? null : v)}>
                <SelectTrigger className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-erp-bg2 border-erp-border0">
                  <SelectItem value="none">— Geen —</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_number} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t border-erp-border0 pt-3">
            <Label className="text-erp-text2 text-xs mb-2 block">Factuurregel</Label>
            <div className="space-y-2">
              <Input value={lineDesc} onChange={e => setLineDesc(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Omschrijving" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={lineQty} onChange={e => setLineQty(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Aantal" />
                <Input type="number" value={linePrice} onChange={e => setLinePrice(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Prijs (€)" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
            <ErpButton primary>{createInvoice.isPending ? "Opslaan..." : "Factuur aanmaken"}</ErpButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
