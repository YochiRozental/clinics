import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAppointment, BookingError } from "@/lib/booking";
import type { RoomKey } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const appointments = await prisma.appointment.findMany({
    where: { userId: session.user.id },
    include: { room: true },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "יש להתחבר כדי לקבוע תור" }, { status: 401 });
  }
  if (session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "החשבון שלך טרם אושר לקביעת תורים" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const roomKey = body?.roomKey as RoomKey | undefined;
  const startTime = body?.startTime as string | undefined;
  const endTime = body?.endTime as string | undefined;
  const notes = body?.notes as string | undefined;

  if (!roomKey || !startTime || !endTime) {
    return NextResponse.json({ error: "חסרים פרטים לקביעת התור" }, { status: 400 });
  }

  try {
    const appointment = await createAppointment({
      userId: session.user.id,
      roomKey,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes,
      source: "WEB",
    });
    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "שגיאה בקביעת התור" }, { status: 500 });
  }
}
