import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CONFLICTING_ROOM_KEYS } from "@/lib/rooms";
import type { RoomKey } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const roomKey = searchParams.get("roomKey") as RoomKey | null;

  if (!date || !roomKey || !CONFLICTING_ROOM_KEYS[roomKey]) {
    return NextResponse.json({ error: "פרמטרים חסרים" }, { status: 400 });
  }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      room: { key: { in: CONFLICTING_ROOM_KEYS[roomKey] } },
      startTime: { lte: dayEnd },
      endTime: { gte: dayStart },
    },
    select: { startTime: true, endTime: true, room: { select: { key: true, name: true } } },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(appointments);
}
