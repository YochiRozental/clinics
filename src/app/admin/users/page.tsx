"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "CLIENT" | "ADMIN";
  status: "PENDING" | "APPROVED" | "BLOCKED";
  createdAt: string;
  _count: { appointments: number };
};

const STATUS_LABELS: Record<UserRow["status"], string> = {
  PENDING: "ממתין לאישור",
  APPROVED: "מאושר",
  BLOCKED: "חסום",
};

const STATUS_CLASSES: Record<UserRow["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  BLOCKED: "bg-red-50 text-red-700",
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/admin/users${params}`)
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function setStatus(user: UserRow, status: UserRow["status"]) {
    setSavingId(user.id);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSavingId(null);
    load();
  }

  async function deleteUser(user: UserRow) {
    const warning =
      user._count.appointments > 0
        ? `למחוק את ${user.name}? יימחקו גם ${user._count.appointments} התורים שלו/שלה. פעולה זו בלתי הפיכה.`
        : `למחוק את ${user.name}? פעולה זו בלתי הפיכה.`;
    if (!confirm(warning)) return;

    setSavingId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setSavingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "שגיאה במחיקת המשתמש");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="חיפוש לפי שם או אימייל..."
        className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm"
      />

      {users === null ? (
        <p className="text-slate-500 text-sm">טוען...</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">שם</th>
                <th className="px-4 py-2 font-medium">אימייל</th>
                <th className="px-4 py-2 font-medium">טלפון</th>
                <th className="px-4 py-2 font-medium">תורים</th>
                <th className="px-4 py-2 font-medium">תפקיד</th>
                <th className="px-4 py-2 font-medium">סטטוס</th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 text-slate-500">{u.email ?? "נרשם/ה דרך הטלפון"}</td>
                  <td className="px-4 py-2 text-slate-500">{u.phone ?? "—"}</td>
                  <td className="px-4 py-2">{u._count.appointments}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        u.role === "ADMIN" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role === "ADMIN" ? "מנהל" : "לקוח"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CLASSES[u.status]}`}>
                      {STATUS_LABELS[u.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {u.status === "PENDING" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setStatus(u, "APPROVED")}
                          disabled={savingId === u.id}
                          className="text-xs text-emerald-700 hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          אישור
                        </button>
                        <button
                          onClick={() => setStatus(u, "BLOCKED")}
                          disabled={savingId === u.id || u.id === session?.user?.id}
                          className="text-xs text-red-700 hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          חסימה
                        </button>
                      </div>
                    )}
                    {u.status === "APPROVED" && (
                      <button
                        onClick={() => setStatus(u, "BLOCKED")}
                        disabled={savingId === u.id || u.id === session?.user?.id}
                        className="text-xs text-red-700 hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        חסימה
                      </button>
                    )}
                    {u.status === "BLOCKED" && (
                      <button
                        onClick={() => setStatus(u, "APPROVED")}
                        disabled={savingId === u.id}
                        className="text-xs text-emerald-700 hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        ביטול חסימה
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => deleteUser(u)}
                      disabled={savingId === u.id || u.id === session?.user?.id}
                      className="text-xs text-red-700 hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
