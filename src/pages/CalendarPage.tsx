import { useState } from "react";
import { useGoogleConnections, useGoogleCalendarEvents, useGoogleApi, useSyncGoogle } from "@/hooks/useGoogle";
import { ErpCard, PageHeader } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import { format, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function CalendarPage() {
  const { data: connections = [] } = useGoogleConnections();
  const allConns = connections.filter((c) => c.is_active);
  const [activeConnId, setActiveConnId] = useState<string | null>(null);
  const selectedConn = activeConnId || allConns[0]?.id || null;
  const { data: events = [], isLoading } = useGoogleCalendarEvents(selectedConn);
  const { callApi } = useGoogleApi();
  const sync = useSyncGoogle();

  // Create event dialog
  const [creating, setCreating] = useState(false);
  const [evSummary, setEvSummary] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evStartTime, setEvStartTime] = useState("09:00");
  const [evEndTime, setEvEndTime] = useState("10:00");
  const [evDescription, setEvDescription] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evAttendees, setEvAttendees] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSync = async () => {
    if (!selectedConn) return;
    try {
      const result = await sync.mutateAsync({ connectionId: selectedConn, type: "calendar" });
      toast.success(`${result.synced} events gesynchroniseerd`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreate = async () => {
    if (!selectedConn || !evSummary || !evDate) return;
    setSubmitting(true);
    try {
      await callApi(selectedConn, "create_event", {
        summary: evSummary,
        description: evDescription || undefined,
        location: evLocation || undefined,
        start: { dateTime: `${evDate}T${evStartTime}:00`, timeZone: "Europe/Amsterdam" },
        end: { dateTime: `${evDate}T${evEndTime}:00`, timeZone: "Europe/Amsterdam" },
        attendees: evAttendees ? evAttendees.split(",").map((e) => e.trim()).filter(Boolean) : undefined,
      });
      toast.success("Afspraak aangemaakt in Google Calendar!");
      setCreating(false);
      setEvSummary(""); setEvDate(""); setEvDescription(""); setEvLocation(""); setEvAttendees("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Group events by day
  const grouped = events.reduce((acc: Record<string, any[]>, ev: any) => {
    const start = ev.start?.dateTime || ev.start?.date || "";
    const day = start.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(ev);
    return acc;
  }, {} as Record<string, any[]>);

  const sortedDays = Object.keys(grouped).sort();

  const dayLabel = (day: string) => {
    const d = parseISO(day);
    if (isToday(d)) return "Vandaag";
    if (isTomorrow(d)) return "Morgen";
    return format(d, "EEEE d MMMM", { locale: nl });
  };

  if (allConns.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader title="Agenda" />
        <ErpCard>
          <div className="text-center py-12">
            <Icons.Calendar className="w-10 h-10 text-erp-text3 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-erp-text0 mb-1">Geen Google account gekoppeld</p>
            <p className="text-[12px] text-erp-text3">Ga naar Instellingen → Google om een account te koppelen</p>
          </div>
        </ErpCard>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Agenda" />
        <div className="flex items-center gap-2">
          {allConns.length > 1 && (
            <select
              value={selectedConn || ""}
              onChange={(e) => setActiveConnId(e.target.value)}
              className="bg-erp-bg2 border border-erp-border0 rounded-lg px-3 py-1.5 text-[13px] text-erp-text0"
            >
              {allConns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleSync}
            disabled={sync.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-erp-bg3 border border-erp-border0 rounded-lg text-erp-text1 hover:bg-erp-hover transition"
          >
            {sync.isPending ? "Syncing..." : "Synchroniseren"}
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-erp-blue text-white rounded-lg hover:bg-erp-blue/90 transition"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            Afspraak
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-erp-text3 text-[13px]">Agenda laden...</div>
      ) : sortedDays.length === 0 ? (
        <ErpCard>
          <div className="text-center py-8 text-erp-text3 text-[13px]">Geen aankomende afspraken</div>
        </ErpCard>
      ) : (
        <div className="space-y-4">
          {sortedDays.map((day) => (
            <div key={day}>
              <div className="text-[12px] font-semibold text-erp-text2 uppercase tracking-wider mb-2">
                {dayLabel(day)}
              </div>
              <div className="space-y-1">
                {grouped[day].map((ev: any, i: number) => {
                  const startTime = ev.start?.dateTime
                    ? format(parseISO(ev.start.dateTime), "HH:mm")
                    : "Hele dag";
                  const endTime = ev.end?.dateTime
                    ? format(parseISO(ev.end.dateTime), "HH:mm")
                    : "";
                  return (
                    <div
                      key={ev.id || i}
                      className="flex items-start gap-3 p-3 bg-erp-bg2 border border-erp-border0 rounded-lg hover:bg-erp-hover transition cursor-pointer"
                      onClick={() => ev.htmlLink && window.open(ev.htmlLink, "_blank")}
                    >
                      <div className="w-1 h-8 rounded-full bg-erp-blue flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-erp-text0 truncate">
                          {ev.summary || "(Geen titel)"}
                        </div>
                        <div className="text-[11px] text-erp-text3 flex items-center gap-2 mt-0.5">
                          <span>{startTime}{endTime ? ` – ${endTime}` : ""}</span>
                          {ev.location && <span>📍 {ev.location}</span>}
                        </div>
                        {ev.attendees?.length > 0 && (
                          <div className="text-[10px] text-erp-text3 mt-1">
                            {ev.attendees.slice(0, 3).map((a: any) => a.email).join(", ")}
                            {ev.attendees.length > 3 && ` +${ev.attendees.length - 3}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create event dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Nieuwe afspraak</DialogTitle>
            <DialogDescription className="text-[12px] text-erp-text3">Wordt aangemaakt in Google Calendar</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input
              placeholder="Titel *"
              value={evSummary}
              onChange={(e) => setEvSummary(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={evDate}
                onChange={(e) => setEvDate(e.target.value)}
                className="bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0"
              />
              <input
                type="time"
                value={evStartTime}
                onChange={(e) => setEvStartTime(e.target.value)}
                className="bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0"
              />
              <input
                type="time"
                value={evEndTime}
                onChange={(e) => setEvEndTime(e.target.value)}
                className="bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0"
              />
            </div>
            <input
              placeholder="Locatie (optioneel)"
              value={evLocation}
              onChange={(e) => setEvLocation(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
            <input
              placeholder="Deelnemers (e-mails, komma-gescheiden)"
              value={evAttendees}
              onChange={(e) => setEvAttendees(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
            <textarea
              placeholder="Beschrijving (optioneel)"
              value={evDescription}
              onChange={(e) => setEvDescription(e.target.value)}
              rows={3}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 focus:outline-none focus:ring-1 focus:ring-erp-blue resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleCreate}
                disabled={submitting || !evSummary || !evDate}
                className="flex items-center gap-2 px-4 py-2 bg-erp-blue text-white text-[13px] font-medium rounded-lg hover:bg-erp-blue/90 transition disabled:opacity-50"
              >
                {submitting ? "Aanmaken..." : "Aanmaken"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
