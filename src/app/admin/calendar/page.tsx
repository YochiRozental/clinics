"use client";

import { useEffect, useState } from "react";
import { MonthCalendar } from "@/components/month-calendar";
import { ROOM_LABELS } from "@/lib/rooms";
import { BUSINESS_HOURS } from "@/lib/business-rules";
import { todayIsoDate } from "@/lib/slots";
import type { RoomKey } from "@/generated/prisma/client";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "CANCELLED";
  notes: string | null;
  room: { key: RoomKey; name: string };
  user: { id: string; name: string; email: string; phone: string | null };
};

const ROOM_KEYS: RoomKey[] = ["ROOM1", "ROOM2", "WORKSHOP", "ROOM1_2"];
const PX_PER_MINUTE = 0.9;
const DAY_START_MIN = BUSINESS_HOURS.startHour * 60;
const DAY_END_MIN = BUSINESS_HOURS.endHour * 60;
const DAY_HEIGHT = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MINUTE;

const HOUR_MARKS = Array.from(
  { length: BUSINESS_HOURS.endHour - BUSINESS_HOURS.startHour + 1 },
  (_, i) => BUSINESS_HOURS.startHour + i
);

function parseIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export default function AdminCalendarPage() {
  const [date, setDate] = useState(todayIsoDate());
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function loadMonth(year: number, month: number) {
    fetch(`/api/admin/appointments/month?year=${year}&month=${month + 1}`)
      .then((res) => res.json())
      .then((data) => setMarkedDates(new Set(Array.isArray(data) ? data : [])));
  }

  function loadDay() {
    fetch(`/api/admin/appointments?date=${date}`)
      .then((res) => res.json())
      .then((data) => setAppointments(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    const { year, month } = parseIsoDate(date);
    loadMonth(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(loadDay, [date]);

  async function handleCancel(id: string) {
    if (!confirm("לבטל את התור?")) return;
    setCancellingId(id);
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    setCancellingId(null);
    loadDay();
  }

  const confirmed = appointments?.filter((a) => a.status === "CONFIRMED") ?? [];

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-fit">
        <MonthCalendar
          value={date}
          onChange={setDate}
          markedDates={markedDates}
          onMonthChange={loadMonth}
        />
        <p className="text-xs text-slate-400 mt-3 text-center">
          נקודה מתחת לתאריך מציינת יום עם תורים
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <p className="font-medium text-slate-800">
            {new Date(`${date}T00:00:00`).toLocaleDateString("he-IL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-sm text-slate-500">{confirmed.length} תורים</p>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-[640px]">
            <div className="w-14 shrink-0 border-l border-slate-100">
              <div className="h-10 border-b border-slate-200" />
              <div className="relative" style={{ height: DAY_HEIGHT }}>
                {HOUR_MARKS.map((h) => (
                  <div
                    key={h}
                    className="absolute right-1 text-xs text-slate-400 -translate-y-1/2"
                    style={{ top: (h * 60 - DAY_START_MIN) * PX_PER_MINUTE }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {ROOM_KEYS.map((roomKey) => (
              <div key={roomKey} className="flex-1 min-w-[140px] border-l border-slate-100 last:border-l-0">
                <div className="h-10 border-b border-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                  {ROOM_LABELS[roomKey]}
                </div>
                <div className="relative" style={{ height: DAY_HEIGHT }}>
                  {HOUR_MARKS.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full border-t border-slate-100"
                      style={{ top: (h * 60 - DAY_START_MIN) * PX_PER_MINUTE }}
                    />
                  ))}

                  {confirmed
                    .filter((a) => a.room.key === roomKey)
                    .map((a) => {
                      const start = new Date(a.startTime);
                      const end = new Date(a.endTime);
                      const startMin = start.getHours() * 60 + start.getMinutes();
                      const endMin = end.getHours() * 60 + end.getMinutes();
                      const top = (startMin - DAY_START_MIN) * PX_PER_MINUTE;
                      const height = Math.max((endMin - startMin) * PX_PER_MINUTE, 20);

                      return (
                        <button
                          key={a.id}
                          onClick={() => handleCancel(a.id)}
                          disabled={cancellingId === a.id}
                          title="לחץ לביטול התור"
                          className="absolute right-1 left-1 rounded-md bg-teal-50 border border-teal-200 hover:bg-red-50 hover:border-red-300 text-right px-2 py-1 overflow-hidden transition-colors disabled:opacity-50"
                          style={{ top, height }}
                        >
                          <p className="text-xs font-medium text-teal-800 truncate">
                            {start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                            {" "}
                            {a.user.name}
                          </p>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
