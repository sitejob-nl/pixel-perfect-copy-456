import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  dealTitle: string;
  onConfirm: (closedAt: string, note: string) => void;
  onCancel: () => void;
}

export default function DealWonDialog({ open, dealTitle, onConfirm, onCancel }: Props) {
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-erp-text0 flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-erp-green" /> Deal gewonnen!
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-erp-text2">
          <span className="font-semibold text-erp-text0">{dealTitle}</span> wordt als gewonnen gemarkeerd.
        </p>
        <div>
          <label className="block text-xs font-medium text-erp-text1 mb-1">Sluitdatum</label>
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-sm text-erp-text0 text-left flex items-center justify-between">
                {format(date, "d MMMM yyyy", { locale: nl })}
                <CalendarIcon className="w-4 h-4 text-erp-text3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-erp-bg3 border-erp-border0" align="start">
              <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} locale={nl} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label className="block text-xs font-medium text-erp-text1 mb-1">Notitie (optioneel)</label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} className="bg-erp-bg3 border-erp-border0 text-erp-text0 text-sm" placeholder="Bijv. contract getekend..." />
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={onCancel} className="flex-1 bg-erp-bg3 text-erp-text0 border border-erp-border1 rounded-lg py-2 text-sm font-medium hover:bg-erp-hover transition-colors">
            Annuleren
          </button>
          <button onClick={() => onConfirm(date.toISOString(), note)} className="flex-1 bg-erp-green text-white rounded-lg py-2 text-sm font-medium hover:brightness-110 transition-colors">
            Bevestigen
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
