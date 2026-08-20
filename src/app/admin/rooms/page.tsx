"use client";

import { useEffect, useState } from "react";
import type { RoomKey } from "@/generated/prisma/client";

type Room = {
  id: string;
  key: RoomKey;
  name: string;
  description: string | null;
  isCombo: boolean;
  active: boolean;
};

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/rooms")
      .then((res) => res.json())
      .then((data) => setRooms(Array.isArray(data) ? data : []));
  }

  useEffect(load, []);

  async function toggleActive(room: Room) {
    setSavingId(room.id);
    await fetch(`/api/admin/rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !room.active }),
    });
    setSavingId(null);
    load();
  }

  return (
    <div className="space-y-3">
      {rooms === null ? (
        <p className="text-slate-500 text-sm">טוען...</p>
      ) : (
        rooms.map((room) => (
          <div
            key={room.id}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm"
          >
            <div>
              <p className="font-medium text-slate-800">{room.name}</p>
              {room.description && <p className="text-sm text-slate-500">{room.description}</p>}
              {room.isCombo && (
                <p className="text-xs text-amber-600 mt-1">
                  חדר משולב — חוסם את החדרים המרכיבים אותו בזמן ההזמנה
                </p>
              )}
            </div>
            <button
              onClick={() => toggleActive(room)}
              disabled={savingId === room.id}
              className={`text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-50 ${
                room.active
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              {room.active ? "פעיל · לחץ להשבתה" : "מושבת · לחץ להפעלה"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
