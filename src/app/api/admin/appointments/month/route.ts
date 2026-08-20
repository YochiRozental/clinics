import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month")); // 1-12

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "פרמטרים לא תקינים" }, { status: 400 });
  }

  const rangeStart = new Date(year, month - 1, 1);
  const rangeEnd = new Date(year, month, 0, 23, 59, 59);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startTime: { lte: rangeEnd },
      endTime: { gte: rangeStart },
    },
    select: { startTime: true },
  });

  const dates = new Set(
    appointments.map((a) => {
      const d = a.startTime;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })
  );

  return NextResponse.json(Array.from(dates));
}
