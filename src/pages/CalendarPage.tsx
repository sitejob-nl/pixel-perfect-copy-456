import { useState, useMemo, useCallback } from "react";
import { useGoogleConnections, useGoogleCalendarEvents, useGoogleApi, useSyncGoogle } from "@/hooks/useGoogle";
import { ErpCard, PageHeader } from "@/components/erp/ErpPrimitives";
import { Icons } from "@/components/erp/ErpIcons";
import {
  format, parseISO, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth,
  isToday, addMonths, subMonths, getHours, getMinutes, differenceInMinutes,
  setHours, setMinutes, startOfDay,
} from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "day" | "month";

const HOUR_HEIGHT = 56; // px per hour
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 – 21:00
const EVENT_COLORS = [
  "bg-erp-blue/20 border-erp-blue text-erp-blue-light",
  "bg-erp-green/20 border-erp-green text-erp-green",
  "bg-erp-purple/20 border-erp-purple text-erp-purple",
  "bg-erp-amber/20 border-erp-amber text-erp-amber",
  "bg-erp-orange/20 border-erp-orange text-erp-orange",
  "bg-erp-cyan/20 border-erp-cyan text-erp-cyan",
  "bg-erp-red/20 border-erp-red text-erp-red",
];

function getEventColor(index: number) {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

function MiniCalendar({
  currentDate,
  onDateSelect,
  selectedDate,
}: {
  currentDate: Date;
  onDateSelect: (d: Date) => void;
  selectedDate: Date;
}) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(currentDate));
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="p-1 rounded hover:bg-erp-hover text-erp-text2 transition"
        >
          ‹
        </button>
        <span className="text-[12px] font-semibold text-erp-text0 capitalize">
          {format(viewMonth, "MMMM yyyy", { locale: nl })}
        </span>
        <button
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-1 rounded hover:bg-erp-hover text-erp-text2 transition"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-erp-text3 py-1">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "h-7 w-7 mx-auto rounded-md text-[11px] font-medium transition-all",
                !inMonth && "text-erp-text3/40",
                inMonth && !selected && !today && "text-erp-text1 hover:bg-erp-hover",
                today && !selected && "text-erp-blue font-bold",
                selected && "bg-erp-blue text-white"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeGrid({
  days,
  events,
  view,
  onEventClick,
  onSlotClick,
}: {
  days: Date[];
  events: any[];
  view: ViewMode;
  onEventClick: (ev: any) => void;
  onSlotClick: (date: Date, hour: number) => void;
}) {
  const getEventsForDay = useCallback(
    (day: Date) =>
      events.filter((ev) => {
        const start = ev.start?.dateTime || ev.start?.date;
        if (!start) return false;
        return isSameDay(parseISO(start), day);
      }),
    [events]
  );

  const getEventPosition = (ev: any) => {
    const startDt = parseISO(ev.start?.dateTime);
    const endDt = parseISO(ev.end?.dateTime);
    const startH = getHours(startDt) + getMinutes(startDt) / 60;
    const duration = differenceInMinutes(endDt, startDt) / 60;
    const top = (startH - 6) * HOUR_HEIGHT;
    const height = Math.max(duration * HOUR_HEIGHT, 20);
    return { top, height };
  };

  const getAllDayEvents = useCallback(
    (day: Date) =>
      events.filter((ev) => {
        if (ev.start?.dateTime) return false;
        const start = ev.start?.date;
        if (!start) return false;
        return isSameDay(parseISO(start), day);
      }),
    [events]
  );

  const nowIndicatorTop = useMemo(() => {
    const now = new Date();
    const h = getHours(now) + getMinutes(now) / 60;
    if (h < 6 || h > 22) return null;
    return (h - 6) * HOUR_HEIGHT;
  }, []);

  const showNowForDay = (day: Date) => isToday(day);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* All-day row */}
      <div className="flex border-b border-erp-border0 shrink-0">
        <div className="w-14 shrink-0 text-[10px] text-erp-text3 py-1.5 text-right pr-2">hele dag</div>
        {days.map((day) => {
          const allDay = getAllDayEvents(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex-1 min-h-[28px] border-l border-erp-border0 px-1 py-0.5 flex flex-wrap gap-0.5",
                view === "day" && "border-l-0"
              )}
            >
              {allDay.map((ev: any, i: number) => (
                <button
                  key={ev.id || i}
                  onClick={() => onEventClick(ev)}
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded border-l-2 truncate max-w-full",
                    getEventColor(i)
                  )}
                >
                  {ev.summary || "(Geen titel)"}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="flex" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-erp-text3 -translate-y-1/2"
                style={{ top: (h - 6) * HOUR_HEIGHT }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayEvents = getEventsForDay(day).filter((ev) => ev.start?.dateTime);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex-1 relative border-l border-erp-border0",
                  view === "day" && dayIdx === 0 && "border-l-0"
                )}
              >
                {/* Hour grid lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-erp-border0/50 cursor-pointer hover:bg-erp-hover/30 transition"
                    style={{ top: (h - 6) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onSlotClick(day, h)}
                  />
                ))}

                {/* Now indicator */}
                {showNowForDay(day) && nowIndicatorTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: nowIndicatorTop }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-erp-red -ml-1" />
                      <div className="flex-1 h-[2px] bg-erp-red" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {dayEvents.map((ev: any, i: number) => {
                  const { top, height } = getEventPosition(ev);
                  const startTime = format(parseISO(ev.start.dateTime), "HH:mm");
                  const endTime = format(parseISO(ev.end.dateTime), "HH:mm");
                  return (
                    <button
                      key={ev.id || i}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      className={cn(
                        "absolute left-1 right-1 rounded-md border-l-[3px] px-2 py-1 text-left overflow-hidden z-10 transition hover:opacity-80",
                        getEventColor(i)
                      )}
                      style={{ top, height: Math.max(height, 22) }}
                    >
                      <div className="text-[11px] font-semibold truncate leading-tight">
                        {ev.summary || "(Geen titel)"}
                      </div>
                      {height > 30 && (
                        <div className="text-[10px] opacity-70 mt-0.5">
                          {startTime} – {endTime}
                        </div>
                      )}
                      {height > 50 && ev.location && (
                        <div className="text-[9px] opacity-60 mt-0.5 truncate">
                          📍 {ev.location}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { data: connections = [] } = useGoogleConnections();
  const allConns = connections.filter((c) => c.is_active);
  const [activeConnId, setActiveConnId] = useState<string | null>(null);
  const selectedConn = activeConnId || allConns[0]?.id || null;
  const { data: events = [], isLoading } = useGoogleCalendarEvents(selectedConn);
  const { callApi } = useGoogleApi();
  const sync = useSyncGoogle();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("week");

  // Create event dialog state
  const [creating, setCreating] = useState(false);
  const [evSummary, setEvSummary] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evStartTime, setEvStartTime] = useState("09:00");
  const [evEndTime, setEvEndTime] = useState("10:00");
  const [evDescription, setEvDescription] = useState("");
  const [evLocation, setEvLocation] = useState("");
  const [evAttendees, setEvAttendees] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Event detail
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const days = useMemo(() => {
    if (view === "day") return [currentDate];
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    // month view — show as week grid for the full month
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate, view]);

  const navigate = (dir: number) => {
    if (view === "day") setCurrentDate(addDays(currentDate, dir));
    else if (view === "week") setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (view === "day") return format(currentDate, "d MMMM yyyy", { locale: nl });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (ws.getMonth() === we.getMonth()) {
        return `${format(ws, "d")} – ${format(we, "d MMMM yyyy", { locale: nl })}`;
      }
      return `${format(ws, "d MMM", { locale: nl })} – ${format(we, "d MMM yyyy", { locale: nl })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: nl });
  }, [currentDate, view]);

  const handleSync = async () => {
    if (!selectedConn) return;
    try {
      const result = await sync.mutateAsync({ connectionId: selectedConn, type: "calendar" });
      toast.success(`${result.synced} events gesynchroniseerd`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openCreateAt = (date: Date, hour: number) => {
    setEvDate(format(date, "yyyy-MM-dd"));
    setEvStartTime(`${String(hour).padStart(2, "0")}:00`);
    setEvEndTime(`${String(hour + 1).padStart(2, "0")}:00`);
    setEvSummary("");
    setEvDescription("");
    setEvLocation("");
    setEvAttendees("");
    setCreating(true);
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
      toast.success("Afspraak aangemaakt!");
      setCreating(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Upcoming events for sidebar
  const upcoming = useMemo(() => {
    const now = new Date();
    return events
      .filter((ev: any) => {
        const s = ev.start?.dateTime || ev.start?.date;
        return s && parseISO(s) >= now;
      })
      .sort((a: any, b: any) => {
        const sa = a.start?.dateTime || a.start?.date || "";
        const sb = b.start?.dateTime || b.start?.date || "";
        return sa.localeCompare(sb);
      })
      .slice(0, 6);
  }, [events]);

  if (allConns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-erp-bg3 border border-erp-border0 flex items-center justify-center mx-auto mb-4">
            <Icons.Calendar className="w-7 h-7 text-erp-text3" />
          </div>
          <p className="text-[15px] font-semibold text-erp-text0 mb-1">Geen Google account gekoppeld</p>
          <p className="text-[12px] text-erp-text3 mb-4">Ga naar Instellingen → Google om je agenda te koppelen</p>
          <a href="/settings" className="px-4 py-2 text-[12px] font-medium bg-erp-blue text-white rounded-lg hover:bg-erp-blue/90 transition">
            Naar instellingen
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden -m-3 md:-m-[22px]">
      {/* Left sidebar */}
      <div className="w-[240px] shrink-0 border-r border-erp-border0 bg-erp-bg1 flex flex-col p-4 gap-5 overflow-y-auto hidden lg:flex">
        {/* New event button */}
        <button
          onClick={() => {
            setEvDate(format(currentDate, "yyyy-MM-dd"));
            setEvStartTime("09:00");
            setEvEndTime("10:00");
            setEvSummary("");
            setEvDescription("");
            setEvLocation("");
            setEvAttendees("");
            setCreating(true);
          }}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-erp-blue text-white rounded-xl text-[13px] font-semibold hover:bg-erp-blue/90 transition shadow-lg shadow-erp-blue/20"
        >
          <Icons.Plus className="w-4 h-4" />
          Nieuwe afspraak
        </button>

        {/* Mini calendar */}
        <MiniCalendar
          currentDate={currentDate}
          selectedDate={currentDate}
          onDateSelect={(d) => { setCurrentDate(d); setView("day"); }}
        />

        {/* Account selector */}
        {allConns.length > 1 && (
          <div>
            <div className="text-[10px] font-semibold text-erp-text3 uppercase tracking-wider mb-2">Account</div>
            <select
              value={selectedConn || ""}
              onChange={(e) => setActiveConnId(e.target.value)}
              className="w-full bg-erp-bg2 border border-erp-border0 rounded-lg px-2.5 py-1.5 text-[12px] text-erp-text0"
            >
              {allConns.map((c) => (
                <option key={c.id} value={c.id}>{c.email}</option>
              ))}
            </select>
          </div>
        )}

        {/* Upcoming events */}
        <div>
          <div className="text-[10px] font-semibold text-erp-text3 uppercase tracking-wider mb-2">Aankomend</div>
          {upcoming.length === 0 ? (
            <p className="text-[11px] text-erp-text3">Geen komende afspraken</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((ev: any, i: number) => {
                const start = ev.start?.dateTime ? format(parseISO(ev.start.dateTime), "EEE HH:mm", { locale: nl }) : format(parseISO(ev.start.date), "EEE", { locale: nl });
                return (
                  <button
                    key={ev.id || i}
                    onClick={() => setSelectedEvent(ev)}
                    className="w-full text-left p-2 rounded-lg hover:bg-erp-hover transition group"
                  >
                    <div className="text-[11px] font-medium text-erp-text0 truncate group-hover:text-erp-blue transition">
                      {ev.summary || "(Geen titel)"}
                    </div>
                    <div className="text-[10px] text-erp-text3 capitalize">{start}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-erp-border0 bg-erp-bg1 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-[12px] font-medium bg-erp-bg3 border border-erp-border0 rounded-lg text-erp-text1 hover:bg-erp-hover transition"
            >
              Vandaag
            </button>
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-erp-hover text-erp-text2 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-erp-hover text-erp-text2 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <h2 className="text-[15px] font-semibold text-erp-text0 capitalize ml-1">
              {headerLabel}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-erp-bg2 border border-erp-border0 rounded-lg p-0.5">
              {(["day", "week", "month"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-medium rounded-md transition",
                    view === v
                      ? "bg-erp-bg3 text-erp-text0 shadow-sm"
                      : "text-erp-text3 hover:text-erp-text1"
                  )}
                >
                  {v === "day" ? "Dag" : v === "week" ? "Week" : "Maand"}
                </button>
              ))}
            </div>

            <button
              onClick={handleSync}
              disabled={sync.isPending}
              className="p-1.5 rounded-lg hover:bg-erp-hover text-erp-text2 transition"
              title="Synchroniseren"
            >
              <svg className={cn("w-4 h-4", sync.isPending && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Mobile create button */}
            <button
              onClick={() => {
                setEvDate(format(currentDate, "yyyy-MM-dd"));
                setCreating(true);
              }}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-erp-blue text-white rounded-lg hover:bg-erp-blue/90 transition"
            >
              <Icons.Plus className="w-3.5 h-3.5" />
              Nieuw
            </button>
          </div>
        </div>

        {/* Day headers (week/day view) */}
        {(view === "week" || view === "day") && (
          <div className="flex border-b border-erp-border0 shrink-0 bg-erp-bg1">
            <div className="w-14 shrink-0" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex-1 text-center py-2 border-l border-erp-border0",
                  view === "day" && "border-l-0"
                )}
              >
                <div className="text-[10px] font-medium text-erp-text3 uppercase">
                  {format(day, "EEE", { locale: nl })}
                </div>
                <button
                  onClick={() => { setCurrentDate(day); if (view !== "day") setView("day"); }}
                  className={cn(
                    "w-8 h-8 mx-auto rounded-full text-[14px] font-semibold flex items-center justify-center transition",
                    isToday(day) && "bg-erp-blue text-white",
                    !isToday(day) && "text-erp-text0 hover:bg-erp-hover"
                  )}
                >
                  {format(day, "d")}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-[13px] text-erp-text3">Agenda laden...</div>
          </div>
        ) : view === "month" ? (
          /* Month grid view */
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-7 gap-px bg-erp-border0 rounded-xl overflow-hidden">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
                <div key={d} className="bg-erp-bg2 text-center py-2 text-[10px] font-semibold text-erp-text3 uppercase">
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const dayEvts = events.filter((ev: any) => {
                  const s = ev.start?.dateTime || ev.start?.date;
                  return s && isSameDay(parseISO(s), day);
                });
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => { setCurrentDate(day); setView("day"); }}
                    className={cn(
                      "bg-erp-bg1 min-h-[80px] p-1.5 text-left hover:bg-erp-hover transition group",
                      !isSameMonth(day, currentDate) && "opacity-40"
                    )}
                  >
                    <div className={cn(
                      "text-[11px] font-medium mb-1 w-6 h-6 rounded-full flex items-center justify-center",
                      isToday(day) && "bg-erp-blue text-white",
                      !isToday(day) && "text-erp-text1"
                    )}>
                      {format(day, "d")}
                    </div>
                    {dayEvts.slice(0, 3).map((ev: any, i: number) => (
                      <div
                        key={ev.id || i}
                        className={cn(
                          "text-[9px] font-medium px-1 py-0.5 rounded mb-0.5 truncate border-l-2",
                          getEventColor(i)
                        )}
                      >
                        {ev.start?.dateTime && format(parseISO(ev.start.dateTime), "HH:mm") + " "}
                        {ev.summary || "(Geen titel)"}
                      </div>
                    ))}
                    {dayEvts.length > 3 && (
                      <div className="text-[9px] text-erp-text3 px-1">+{dayEvts.length - 3} meer</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Week/Day time grid */
          <TimeGrid
            days={days}
            events={events}
            view={view}
            onEventClick={setSelectedEvent}
            onSlotClick={openCreateAt}
          />
        )}
      </div>

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="bg-erp-bg2 border-erp-border0 text-erp-text0 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">{selectedEvent?.summary || "(Geen titel)"}</DialogTitle>
            <DialogDescription className="text-[12px] text-erp-text3">Afspraak details</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3 mt-1">
              <div className="flex items-center gap-2 text-[12px] text-erp-text1">
                <Icons.Calendar className="w-3.5 h-3.5 text-erp-text3" />
                {selectedEvent.start?.dateTime
                  ? `${format(parseISO(selectedEvent.start.dateTime), "EEEE d MMMM, HH:mm", { locale: nl })} – ${format(parseISO(selectedEvent.end.dateTime), "HH:mm")}`
                  : format(parseISO(selectedEvent.start.date), "EEEE d MMMM", { locale: nl })
                }
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-[12px] text-erp-text1">
                  <span className="text-erp-text3">📍</span> {selectedEvent.location}
                </div>
              )}
              {selectedEvent.description && (
                <div className="text-[12px] text-erp-text2 bg-erp-bg3 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedEvent.description}
                </div>
              )}
              {selectedEvent.attendees?.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-erp-text3 uppercase tracking-wider mb-1.5">Deelnemers</div>
                  <div className="space-y-1">
                    {selectedEvent.attendees.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-erp-text1">
                        <div className="w-5 h-5 rounded-full bg-erp-bg4 flex items-center justify-center text-[9px] font-bold text-erp-text2">
                          {(a.email || "?")[0].toUpperCase()}
                        </div>
                        {a.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvent.htmlLink && (
                <button
                  onClick={() => window.open(selectedEvent.htmlLink, "_blank")}
                  className="w-full text-center py-2 text-[12px] font-medium text-erp-blue hover:text-erp-blue-light transition"
                >
                  Openen in Google Calendar ↗
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2.5 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-erp-text3 mb-1">Datum</label>
                <input
                  type="date"
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[12px] text-erp-text0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-erp-text3 mb-1">Van</label>
                <input
                  type="time"
                  value={evStartTime}
                  onChange={(e) => setEvStartTime(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[12px] text-erp-text0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-erp-text3 mb-1">Tot</label>
                <input
                  type="time"
                  value={evEndTime}
                  onChange={(e) => setEvEndTime(e.target.value)}
                  className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[12px] text-erp-text0"
                />
              </div>
            </div>
            <input
              placeholder="Locatie (optioneel)"
              value={evLocation}
              onChange={(e) => setEvLocation(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
            <input
              placeholder="Deelnemers (e-mails, komma-gescheiden)"
              value={evAttendees}
              onChange={(e) => setEvAttendees(e.target.value)}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue"
            />
            <textarea
              placeholder="Beschrijving (optioneel)"
              value={evDescription}
              onChange={(e) => setEvDescription(e.target.value)}
              rows={3}
              className="w-full bg-erp-bg3 border border-erp-border0 rounded-lg px-3 py-2 text-[13px] text-erp-text0 placeholder:text-erp-text3 focus:outline-none focus:ring-1 focus:ring-erp-blue resize-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 text-[12px] font-medium text-erp-text2 hover:text-erp-text0 transition"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !evSummary || !evDate}
                className="flex items-center gap-2 px-5 py-2 bg-erp-blue text-white text-[13px] font-semibold rounded-lg hover:bg-erp-blue/90 transition disabled:opacity-50"
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
