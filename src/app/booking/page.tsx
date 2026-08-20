"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_LABELS } from "@/lib/rooms";
import { buildTimeOptions, combineDateAndTime, todayIsoDate, DURATION_OPTIONS } from "@/lib/slots";
import { MonthCalendar } from "@/components/month-calendar";
import { TimeSlotGrid } from "@/components/time-slot-grid";
import type { RoomKey } from "@/generated/prisma/client";

type BusyInterval = { startTime: string; endTime: string; room: { key: RoomKey; name: string } };

const ROOM_KEYS: RoomKey[] = ["ROOM1", "ROOM2", "WORKSHOP", "ROOM1_2"];
const TIME_OPTIONS = buildTimeOptions();
const LAST_SELECTION_KEY = "booking:lastSelection";

type StoredSelection = {
  date: string;
  roomKey: RoomKey;
  startTime: string;
  durationMinutes: number;
};

export default function BookingPage() {
  const router = useRouter();
  const [roomKey, setRoomKey] = useState<RoomKey>("ROOM1");
  const [date, setDate] = useState(todayIsoDate());
  const [startTime, setStartTime] = useState(TIME_OPTIONS[0]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState<BusyInterval[]>([]);
  const [loadingBusy, setLoadingBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // restore the last date/room/time the user had selected, instead of always resetting to today
  useEffect(() => {
    const raw = window.localStorage.getItem(LAST_SELECTION_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as Partial<StoredSelection>;
      if (stored.date && stored.date >= todayIsoDate()) setDate(stored.date);
      if (stored.roomKey && ROOM_KEYS.includes(stored.roomKey)) setRoomKey(stored.roomKey);
      if (stored.startTime && TIME_OPTIONS.includes(stored.startTime)) setStartTime(stored.startTime);
      if (stored.durationMinutes) setDurationMinutes(stored.durationMinutes);
    } catch {
      // ignore corrupt storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // skip the very first commit: at that point state still holds the pre-restore defaults
  // (the restore effect's setState calls above haven't flushed into this closure yet), so
  // persisting here would immediately overwrite the stored selection with those defaults.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const selection: StoredSelection = { date, roomKey, startTime, durationMinutes };
    window.localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify(selection));
  }, [date, roomKey, startTime, durationMinutes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for a client-side fetch triggered by date/room changes
    setLoadingBusy(true);
    setError(null);
    fetch(`/api/appointments/day?date=${date}&roomKey=${roomKey}`)
      .then((res) => res.json())
      .then((data) => setBusy(Array.isArray(data) ? data : []))
      .catch(() => setBusy([]))
      .finally(() => setLoadingBusy(false));
  }, [date, roomKey]);

  const { conflict, endTimeLabel } = useMemo(() => {
    const start = combineDateAndTime(date, startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const hasConflict = busy.some((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return start < bEnd && end > bStart;
    });
    return {
      conflict: hasConflict,
      endTimeLabel: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
    };
  }, [busy, date, startTime, durationMinutes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const start = combineDateAndTime(date, startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomKey,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "שגיאה בקביעת התור");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/booking/my"), 1200);
    } catch {
      setError("שגיאה בלתי צפויה, נסה שוב");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">קביעת תור</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">בחרו חדר</label>
          <div className="grid grid-cols-2 gap-2">
            {ROOM_KEYS.map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setRoomKey(key)}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  roomKey === key
                    ? "border-teal-600 bg-teal-50 text-teal-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {ROOM_LABELS[key]}
              </button>
            ))}
          </div>
          {roomKey === "ROOM1_2" && (
            <p className="text-xs text-slate-500 mt-2">
              שים לב: הזמנת חדר 1+2 חוסמת גם את חדר 1 וגם את חדר 2 בטווח הזמן שנבחר.
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">תאריך</label>
            <div className="border border-slate-200 rounded-lg p-3">
              <MonthCalendar value={date} onChange={setDate} minDate={todayIsoDate()} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">שעת התחלה</label>
              {loadingBusy && <span className="text-xs text-slate-400">בודק זמינות...</span>}
            </div>
            <div className="border border-slate-200 rounded-lg">
              <TimeSlotGrid
                date={date}
                timeOptions={TIME_OPTIONS}
                selected={startTime}
                onSelect={setStartTime}
                busy={busy}
              />
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-1 mt-4">משך התור</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.minutes} value={opt.minutes}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {startTime} – {endTimeLabel}
              {conflict && <span className="text-red-600 font-medium"> · השעה מתנגשת עם תור קיים</span>}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">הערות (לא חובה)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">התור נקבע בהצלחה! מעביר אותך לתורים שלי...</p>}

        <button
          type="submit"
          disabled={submitting || conflict}
          className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "קובע תור..." : "קביעת תור"}
        </button>
      </form>
    </div>
  );
}
