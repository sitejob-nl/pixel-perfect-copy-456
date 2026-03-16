import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { XCircle } from "lucide-react";

interface Props {
  open: boolean;
  dealTitle: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export default function DealLostDialog({ open, dealTitle, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-erp-text0 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-erp-red" /> Deal verloren
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-erp-text2">
          <span className="font-semibold text-erp-text0">{dealTitle}</span> wordt als verloren gemarkeerd.
        </p>
        <div>
          <label className="block text-xs font-medium text-erp-text1 mb-1">Reden (verplicht)</label>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm"
            placeholder="Waarom is de deal verloren?"
            required
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={onCancel} className="flex-1 bg-erp-bg3 text-erp-text0 border border-erp-border1 rounded-lg py-2 text-sm font-medium hover:bg-erp-hover transition-colors">
            Annuleren
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 bg-erp-red text-white rounded-lg py-2 text-sm font-medium hover:brightness-110 transition-colors disabled:opacity-50"
          >
            Bevestigen
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
