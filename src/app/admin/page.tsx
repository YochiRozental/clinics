import { prisma } from "@/lib/prisma";
import { ROOM_LABELS } from "@/lib/rooms";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [todayAppointments, totalUsers, totalUpcoming, rooms] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "CONFIRMED", startTime: { gte: todayStart, lte: todayEnd } },
      include: { room: true, user: { select: { name: true, phone: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.user.count(),
    prisma.appointment.count({ where: { status: "CONFIRMED", startTime: { gte: now } } }),
    prisma.room.findMany(),
  ]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500">תורים היום</p>
          <p className="text-2xl font-bold text-teal-700">{todayAppointments.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500">תורים עתידיים</p>
          <p className="text-2xl font-bold text-teal-700">{totalUpcoming}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500">משתמשים רשומים</p>
          <p className="text-2xl font-bold text-teal-700">{totalUsers}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">התורים של היום</h2>
          <Link href="/admin/appointments" className="text-sm text-teal-700 hover:underline">
            לכל התורים
          </Link>
        </div>
        {todayAppointments.length === 0 ? (
          <p className="text-slate-400 text-sm">אין תורים קבועים להיום</p>
        ) : (
          <ul className="space-y-2">
            {todayAppointments.map((a) => (
              <li
                key={a.id}
                className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-sm"
              >
                <span className="font-medium text-slate-700">
                  {a.startTime.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {a.endTime.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {ROOM_LABELS[a.room.key]}
                </span>
                <span className="text-sm text-slate-500">
                  {a.user.name}
                  {a.user.phone ? ` · ${a.user.phone}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">מצב חדרים</h2>
        <ul className="grid grid-cols-2 gap-3">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-sm"
            >
              <span className="font-medium text-slate-700">{room.name}</span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  room.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}
              >
                {room.active ? "פעיל" : "מושבת"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
