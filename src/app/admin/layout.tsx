import type { ReactNode } from "react";
import { AdminTabs } from "@/components/admin-tabs";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">ניהול קליניקה</h1>
      <AdminTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
