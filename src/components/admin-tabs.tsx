"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "סקירה כללית" },
  { href: "/admin/calendar", label: "לוח שנה" },
  { href: "/admin/appointments", label: "תורים" },
  { href: "/admin/rooms", label: "חדרים" },
  { href: "/admin/users", label: "משתמשים" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
