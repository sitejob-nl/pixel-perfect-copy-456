import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isBefore, isToday, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Check, Calendar, MapPin, Video, Loader2 } from "lucide-react";

const API_URL = `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/booking-service`;

async function callApi(body: any) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

type Step = 1 | 2 | 3 | 4;

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Step 2
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotDuration, setSlotDuration] = useState(30);

  // Step 3
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCompany, setGuestCompany] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 4
  const [booking, setBooking] = useState<any>(null);

  const primaryColor = page?.primary_color || "#2563EB";

  useEffect(() => {
    if (!slug) return;
    callApi({ action: "get_page", slug }).then((data) => {
      if (data.error) setError(data.error);
      else setPage(data);
      setLoading(false);
    }).catch(() => { setError("Kon pagina niet laden"); setLoading(false); });
  }, [slug]);

  // Fetch slots when date selected
  useEffect(() => {
    if (!selectedDate || !selectedEvent || !slug) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    callApi({
      action: "get_slots",
      page_slug: slug,
      event_type_slug: selectedEvent.slug,
      date: format(selectedDate, "yyyy-MM-dd"),
    }).then((data) => {
      setSlots(data.slots || []);
      setSlotDuration(data.duration || 30);
      setLoadingSlots(false);
    }).catch(() => setLoadingSlots(false));
  }, [selectedDate, selectedEvent, slug]);

  const maxDate = page?.max_days_ahead ? addDays(new Date(), page.max_days_ahead) : addDays(new Date(), 60);

  // Calendar data
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = (getDay(monthDays[0]) + 6) % 7; // Mon=0

  const handleSubmit = async () => {
    if (!guestName || !guestEmail) return;
    setSubmitting(true);
    try {
      const startAt = `${format(selectedDate!, "yyyy-MM-dd")}T${selectedSlot}:00`;
      const data = await callApi({
        action: "create_booking",
        page_slug: slug,
        event_type_slug: selectedEvent.slug,
        start_at: startAt,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || undefined,
        guest_company: guestCompany || undefined,
        guest_notes: guestNotes || undefined,
        timezone: "Europe/Amsterdam",
      });
      if (data.error) {
        alert(data.error);
      } else {
        setBooking(data);
        setStep(4);
      }
    } catch {
      alert("Er ging iets mis bij het boeken.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Pagina niet gevonden</h1>
          <p className="text-gray-500">{error || "Deze booking pagina bestaat niet."}</p>
        </div>
      </div>
    );
  }

  const eventTypes = page.booking_event_types || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: step >= s ? primaryColor : "#D1D5DB" }}
              />
            ))}
          </div>

          {/* Host header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-lg font-bold" style={{ background: primaryColor }}>
              {page.avatar_url ? (
                <img src={page.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                page.display_name?.slice(0, 2).toUpperCase()
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{page.display_name}</h1>
            {page.title && <p className="text-sm text-gray-500 mt-1">{page.title}</p>}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* ─── STEP 1: Select event type ─── */}
            {step === 1 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Kies een afspraaktype</h2>
                <p className="text-sm text-gray-500 mb-6">{page.description || "Selecteer het type gesprek dat je wilt inplannen."}</p>
                <div className="space-y-3">
                  {eventTypes.map((et: any) => (
                    <button
                      key={et.id}
                      onClick={() => { setSelectedEvent(et); setStep(2); }}
                      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all flex items-center gap-4 group"
                      style={{ borderLeftWidth: 4, borderLeftColor: et.color || primaryColor }}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 group-hover:text-gray-700">{et.name}</div>
                        {et.description && <div className="text-sm text-gray-500 mt-0.5">{et.description}</div>}
                      </div>
                      <span className="flex items-center gap-1 text-sm text-gray-400 shrink-0">
                        <Clock className="w-4 h-4" /> {et.duration_minutes} min
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── STEP 2: Select date + time ─── */}
            {step === 2 && (
              <div className="p-6 sm:p-8">
                <button onClick={() => { setStep(1); setSelectedEvent(null); setSelectedDate(null); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                  <ChevronLeft className="w-4 h-4" /> Terug
                </button>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full" style={{ background: selectedEvent?.color || primaryColor }} />
                  <h2 className="text-lg font-semibold text-gray-900">{selectedEvent?.name}</h2>
                  <span className="text-sm text-gray-400 ml-auto">{selectedEvent?.duration_minutes} min</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Calendar */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => setCurrentMonth(addDays(startOfMonth(currentMonth), -1))} className="p-1 rounded-lg hover:bg-gray-100">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: nl })}
                      </span>
                      <button onClick={() => setCurrentMonth(addDays(endOfMonth(currentMonth), 1))} className="p-1 rounded-lg hover:bg-gray-100">
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
                        <div key={d} className="text-xs font-medium text-gray-400 py-1">{d}</div>
                      ))}
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`e-${i}`} />
                      ))}
                      {monthDays.map((day) => {
                        const past = isBefore(day, new Date()) && !isToday(day);
                        const tooFar = isBefore(maxDate, day);
                        const disabled = past || tooFar;
                        const weekend = getDay(day) === 0 || getDay(day) === 6;
                        const selected = selectedDate && isSameDay(day, selectedDate);
                        return (
                          <button
                            key={day.toISOString()}
                            disabled={disabled || weekend}
                            onClick={() => setSelectedDate(day)}
                            className={`py-2 text-sm rounded-lg transition-all ${
                              selected ? "text-white font-semibold" : disabled || weekend ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-100"
                            }`}
                            style={selected ? { background: primaryColor } : undefined}
                          >
                            {format(day, "d")}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Tijdzone: Europe/Amsterdam</p>
                  </div>

                  {/* Time slots */}
                  <div>
                    {!selectedDate ? (
                      <div className="flex items-center justify-center h-full text-sm text-gray-400">
                        <Calendar className="w-5 h-5 mr-2" /> Selecteer een datum
                      </div>
                    ) : loadingSlots ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-gray-400">
                        Geen beschikbare tijden
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          {format(selectedDate, "EEEE d MMMM", { locale: nl })}
                        </p>
                        <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
                          {slots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2 px-3 text-sm rounded-lg border transition-all font-medium ${
                                selectedSlot === slot
                                  ? "text-white border-transparent"
                                  : "text-gray-700 border-gray-200 hover:border-gray-300"
                              }`}
                              style={selectedSlot === slot ? { background: primaryColor } : undefined}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                        {selectedSlot && (
                          <button
                            onClick={() => setStep(3)}
                            className="w-full mt-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                            style={{ background: primaryColor }}
                          >
                            Verder
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 3: Guest details ─── */}
            {step === 3 && (
              <div className="p-6 sm:p-8">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                  <ChevronLeft className="w-4 h-4" /> Terug
                </button>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Jouw gegevens</h2>
                <p className="text-sm text-gray-500 mb-6">
                  {selectedEvent?.name} · {format(selectedDate!, "d MMMM yyyy", { locale: nl })} om {selectedSlot}
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                    <input
                      type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Je volledige naam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres *</label>
                    <input
                      type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="je@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefoonnummer</label>
                    <input
                      type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+31 6 12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijf</label>
                    <input
                      type="text" value={guestCompany} onChange={(e) => setGuestCompany(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bedrijfsnaam"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
                    <textarea
                      value={guestNotes} onChange={(e) => setGuestNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Waar wil je het over hebben?"
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!guestName || !guestEmail || submitting}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: primaryColor }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Afspraak bevestigen"}
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 4: Confirmation ─── */}
            {step === 4 && booking && (
              <div className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
                  <Check className="w-8 h-8" style={{ color: primaryColor }} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Je afspraak is bevestigd!</h2>
                <p className="text-sm text-gray-500 mb-6">Er is een bevestiging gestuurd naar {guestEmail}</p>

                <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {format(new Date(booking.start_at), "EEEE d MMMM yyyy", { locale: nl })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {format(new Date(booking.start_at), "HH:mm")} — {format(new Date(booking.end_at), "HH:mm")}
                      {" "}({slotDuration} min)
                    </span>
                  </div>
                  {booking.meeting_url && (
                    <div className="flex items-center gap-3">
                      <Video className="w-4 h-4 text-gray-400" />
                      <a href={booking.meeting_url} target="_blank" rel="noopener" className="text-sm text-blue-600 hover:underline">
                        Google Meet link
                      </a>
                    </div>
                  )}
                </div>

                {page.confirmation_message && (
                  <p className="text-sm text-gray-600 mb-4">{page.confirmation_message}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">Powered by SiteJob</p>
        </div>
      </div>
    </div>
  );
}
