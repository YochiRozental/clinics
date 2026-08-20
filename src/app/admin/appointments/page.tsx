"use client";

import { useEffect, useState } from "react";
import { ROOM_LABELS } from "@/lib/rooms";
import { buildTimeOptions, combineDateAndTime, todayIsoDate, DURATION_OPTIONS } from "@/lib/slots";
import type { RoomKey } from "@/generated/prisma/client";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "CANCELLED";
  notes: string | null;
  source: "WEB" | "IVR" | "ADMIN";
  room: { key: RoomKey; name: string };
  user: { id: string; name: string; email: string; phone: string | null };
};

type UserOption = { id: string; name: string; email: string };

const ROOM_KEYS: RoomKey[] = ["ROOM1", "ROOM2", "WORKSHOP", "ROOM1_2"];
const TIME_OPTIONS = buildTimeOptions();

export default function AdminAppointmentsPage() {
  const [date, setDate] = useState(todayIsoDate());
  const [roomFilter, setRoomFilter] = useState<RoomKey | "">("");
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newRoomKey, setNewRoomKey] = useState<RoomKey>("ROOM1");
  const [newDate, setNewDate] = useState(todayIsoDate());
  const [newTime, setNewTime] = useState(TIME_OPTIONS[0]);
  const [newDuration, setNewDuration] = useState(30);
  const [newNotes, setNewNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  function loadAppointments() {
    const params = new URLSearchParams({ date });
    if (roomFilter) params.set("roomKey", roomFilter);
    fetch(`/api/admin/appointments?${params}`)
      .then((res) => res.json())
      .then((data) => setAppointments(Array.isArray(data) ? data : []));
  }

  useEffect(loadAppointments, [date, roomFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (userSearch.trim().length < 2) {
        setUserOptions([]);
        return;
      }
      fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`)
        .then((res) => res.json())
        .then((data) => setUserOptions(Array.isArray(data) ? data : []));
    }, 300);
    return () => clearTimeout(handle);
  }, [userSearch]);

  async function handleCancel(id: string) {
    setCancellingId(id);
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    setCancellingId(null);
    loadAppointments();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!selectedUserId) {
      setFormError("יש לבחור לקוח קיים (חיפוש לפי אימייל או שם)");
      return;
    }
    setFormSubmitting(true);

    const start = combineDateAndTime(newDate, newTime);
    const end = new Date(start.getTime() + newDuration * 60000);

    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          roomKey: newRoomKey,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: newNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "שגיאה בקביעת התור");
        return;
      }
      setShowForm(false);
      setSelectedUserId("");
      setUserSearch("");
      setNewNotes("");
      loadAppointments();
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">תאריך</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">חדר</label>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value as RoomKey | "")}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">כל החדרים</option>
            {ROOM_KEYS.map((key) => (
              <option key={key} value={key}>
                {ROOM_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="mr-auto px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
        >
          {showForm ? "ביטול" : "+ קביעת תור ידנית"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">חיפוש לקוח (שם או אימייל)</label>
            <input
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setSelectedUserId("");
              }}
              placeholder="לדוגמה: israel@example.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            {userOptions.length > 0 && !selectedUserId && (
              <ul className="mt-1 border border-slate-200 rounded-lg divide-y max-h-40 overflow-auto">
                {userOptions.map((u) => (
                  <li
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setUserSearch(`${u.name} (${u.email})`);
                      setUserOptions([]);
                    }}
                    className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    {u.name} · {u.email}
                  </li>
                ))}
              </ul>
            )}
            {selectedUserId && <p className="text-xs text-emerald-600 mt-1">לקוח נבחר</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">חדר</label>
              <select
                value={newRoomKey}
                onChange={(e) => setNewRoomKey(e.target.value as RoomKey)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {ROOM_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {ROOM_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">משך</label>
              <select
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.minutes} value={opt.minutes}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">תאריך</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">שעה</label>
              <select
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">הערות</label>
            <input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={formSubmitting}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {formSubmitting ? "קובע..." : "קביעת תור"}
          </button>
        </form>
      )}

      <div>
        {appointments === null ? (
          <p className="text-slate-500 text-sm">טוען...</p>
        ) : appointments.length === 0 ? (
          <p className="text-slate-400 text-sm">אין תורים בטווח הנבחר</p>
        ) : (
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">שעה</th>
                  <th className="px-4 py-2 font-medium">חדר</th>
                  <th className="px-4 py-2 font-medium">לקוח</th>
                  <th className="px-4 py-2 font-medium">טלפון</th>
                  <th className="px-4 py-2 font-medium">מקור</th>
                  <th className="px-4 py-2 font-medium">סטטוס</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((a) => (
                  <tr key={a.id} className={a.status === "CANCELLED" ? "opacity-50" : ""}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(a.startTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(a.endTime).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2">{ROOM_LABELS[a.room.key]}</td>
                    <td className="px-4 py-2">
                      {a.user.name}
                      <div className="text-xs text-slate-400">{a.user.email}</div>
                    </td>
                    <td className="px-4 py-2">{a.user.phone ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">
                      {a.source === "WEB" ? "אתר" : a.source === "ADMIN" ? "ניהול" : "IVR"}
                    </td>
                    <td className="px-4 py-2">
                      {a.status === "CONFIRMED" ? (
                        <span className="text-emerald-700 text-xs">מאושר</span>
                      ) : (
                        <span className="text-red-500 text-xs">מבוטל</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {a.status === "CONFIRMED" && (
                        <button
                          onClick={() => handleCancel(a.id)}
                          disabled={cancellingId === a.id}
                          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {cancellingId === a.id ? "מבטל..." : "ביטול"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
