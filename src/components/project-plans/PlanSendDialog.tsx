import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PlanRow = Database["public"]["Tables"]["project_plans"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: PlanRow;
  onSent: () => void;
}

export default function PlanSendDialog({ open, onOpenChange, plan, onSent }: Props) {
  const [to, setTo] = useState(plan.client_email || "");
  const [subject, setSubject] = useState(`Projectplan: ${plan.title}`);
  const [message, setMessage] = useState(
    `Beste ${plan.client_name || ""},\n\nHierbij ontvangt u het projectplan voor ${plan.title}.\nU kunt het plan bekijken via onderstaande link.\n\nMet vriendelijke groet,\nSiteJob`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to) { toast({ title: "Vul een e-mailadres in", variant: "destructive" }); return; }
    setSending(true);
    try {
      // Generate slug if needed
      let slug = plan.public_slug;
      if (!slug) {
        slug = crypto.randomUUID().slice(0, 8);
        await supabase.from("project_plans").update({ public_slug: slug }).eq("id", plan.id);
      }

      const planUrl = `${window.location.origin}/plan/${slug}`;
      const htmlContent = `<div style="font-family:sans-serif;color:#333"><p>${message.replace(/\n/g, "<br>")}</p><p style="margin-top:24px"><a href="${planUrl}" style="background:#32C5FF;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Projectplan bekijken</a></p></div>`;

      const { error } = await supabase.functions.invoke("send-email", {
        body: { action: "send", to, subject, html_content: htmlContent },
      });
      if (error) throw error;

      await supabase.from("project_plans").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", plan.id);
      toast({ title: `Projectplan verstuurd naar ${to}` });
      onSent();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Verzenden mislukt", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-erp-text0">Projectplan versturen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-erp-text1 text-xs">Aan</Label>
            <Input value={to} onChange={e => setTo(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
          </div>
          <div>
            <Label className="text-erp-text1 text-xs">Onderwerp</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
          </div>
          <div>
            <Label className="text-erp-text1 text-xs">Bericht</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="bg-erp-bg3 border-erp-border0 text-erp-text0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={handleSend} disabled={sending}>{sending ? "Versturen..." : "Versturen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
