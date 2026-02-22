import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErpButton } from "@/components/erp/ErpPrimitives";
import { useCreateQuote } from "@/hooks/useQuotes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateQuoteDialog({ open, onOpenChange }: Props) {
  const [contactId, setContactId] = useState<string | null>(null);
  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [linePrice, setLinePrice] = useState("");
  const [notes, setNotes] = useState("");

  const createQuote = useCreateQuote();

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
      const { data, error } = await supabase.from("contacts").select("id, first_name, last_name").order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgMembership?.organization_id) { toast.error("Geen organisatie gevonden"); return; }

    const { data: quoteNumber, error: numError } = await supabase.rpc("generate_document_number", {
      p_org_id: orgMembership.organization_id,
      p_prefix: "OFF",
      p_entity: "quotes",
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
      line_total: subtotal,
    }] : [];

    createQuote.mutate(
      {
        quote_number: quoteNumber,
        organization_id: orgMembership.organization_id,
        contact_id: contactId,
        subtotal,
        vat_amount: vatAmount,
        total_amount: total,
        notes: notes.trim() || null,
        status: "draft",
        lines,
      },
      {
        onSuccess: () => {
          toast.success("Offerte aangemaakt!");
          onOpenChange(false);
          setContactId(null); setLineDesc(""); setLineQty("1"); setLinePrice(""); setNotes("");
        },
        onError: (err) => toast.error(`Fout: ${err.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Nieuwe offerte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
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

          <div className="border-t border-erp-border0 pt-3">
            <Label className="text-erp-text2 text-xs mb-2 block">Offerteregel</Label>
            <div className="space-y-2">
              <Input value={lineDesc} onChange={e => setLineDesc(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Omschrijving" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={lineQty} onChange={e => setLineQty(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Aantal" />
                <Input type="number" value={linePrice} onChange={e => setLinePrice(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Prijs (€)" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-erp-text2 text-xs">Notities</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} className="bg-erp-bg3 border-erp-border1 text-erp-text0 text-sm" placeholder="Opmerkingen..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ErpButton onClick={() => onOpenChange(false)}>Annuleren</ErpButton>
            <ErpButton primary>{createQuote.isPending ? "Opslaan..." : "Offerte aanmaken"}</ErpButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
