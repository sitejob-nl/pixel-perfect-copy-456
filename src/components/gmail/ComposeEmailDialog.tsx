import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Icons } from "@/components/erp/ErpIcons";
import { useGoogleApi, useGoogleConnections } from "@/hooks/useGoogle";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string | null;
  replyTo?: string;
  replySubject?: string;
}

export default function ComposeEmailDialog({ open, onOpenChange, connectionId, replyTo, replySubject }: Props) {
  const [to, setTo] = useState(replyTo || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(replySubject ? `Re: ${replySubject}` : "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { callApi } = useGoogleApi();
  const { data: connections = [] } = useGoogleConnections();
  const connEmail = connections.find(c => c.id === connectionId)?.email;

  const handleSend = async () => {
    if (!connectionId || !to || !subject) return;
    setSending(true);
    try {
      await callApi(connectionId, "send_email", {
        to,
        cc: cc || undefined,
        subject,
        body_html: body.replace(/\n/g, "<br>"),
      });
      toast.success("E-mail verzonden!");
      onOpenChange(false);
      setTo(""); setCc(""); setSubject(""); setBody("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  // Reset fields when dialog opens with reply data
  const handleOpenChange = (val: boolean) => {
    if (val && replyTo) setTo(replyTo);
    if (val && replySubject) setSubject(`Re: ${replySubject}`);
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            {replyTo ? "Beantwoorden" : "Nieuwe e-mail"}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-erp-text3">
            Verstuur via {connEmail || "gekoppeld account"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <input
            placeholder="Aan..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
          />
          <input
            placeholder="CC (optioneel)"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
          />
          <input
            placeholder="Onderwerp"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
          />
          <textarea
            placeholder="Bericht..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={sending || !to || !subject}
              className="flex items-center gap-2 px-4 py-2 bg-erp-blue text-white text-[13px] font-medium rounded-lg hover:bg-erp-blue/90 transition disabled:opacity-50"
            >
              <Icons.Send className="w-3.5 h-3.5" />
              {sending ? "Verzenden..." : "Versturen"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
