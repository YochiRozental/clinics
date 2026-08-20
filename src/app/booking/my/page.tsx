"use client";

import { useEffect, useState } from "react";
import { ROOM_LABELS } from "@/lib/rooms";
import type { RoomKey } from "@/generated/prisma/client";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "CANCELLED";
  notes: string | null;
  room: { key: RoomKey; name: string };
};

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  function load() {
    setNow(Date.now());
    fetch("/api/appointments")
      .then((res) => res.json())
      .then((data) => setAppointments(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- snapshot "now" once on mount to classify upcoming/past appointments
    load();
  }, []);

  async function handleCancel(id: string) {
    setCancellingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "שגיאה בביטול התור");
        return;
      }
      load();
    } finally {
      setCancellingId(null);
    }
  }

  const upcoming = appointments?.filter(
    (a) => a.status === "CONFIRMED" && new Date(a.endTime).getTime() >= (now ?? 0)
  );
  const past = appointments?.filter(
    (a) => a.status === "CANCELLED" || new Date(a.endTime).getTime() < (now ?? 0)
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">התורים שלי</h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {appointments === null ? (
        <p className="text-slate-500">טוען...</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">תורים קרובים</h2>
            {upcoming && upcoming.length > 0 ? (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li
                    key={a.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{ROOM_LABELS[a.room.key]}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(a.startTime).toLocaleDateString("he-IL")}
                        {" · "}
                        {new Date(a.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(a.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {a.notes && <p className="text-sm text-slate-400 mt-1">{a.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleCancel(a.id)}
                      disabled={cancellingId === a.id}
                      className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 cursor-pointer"
                    >
                      {cancellingId === a.id ? "מבטל..." : "ביטול"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">אין תורים קרובים</p>
            )}
          </section>

          {past && past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">היסטוריה</h2>
              <ul className="space-y-2">
                {past.map((a) => (
                  <li
                    key={a.id}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-500 flex items-center justify-between"
                  >
                    <span>
                      {ROOM_LABELS[a.room.key]} ·{" "}
                      {new Date(a.startTime).toLocaleDateString("he-IL")}{" "}
                      {new Date(a.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={a.status === "CANCELLED" ? "text-red-400" : "text-slate-400"}>
                      {a.status === "CANCELLED" ? "בוטל" : "הסתיים"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
