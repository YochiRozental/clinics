import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const role = body?.role as "ADMIN" | "CLIENT" | undefined;

  if (role !== "ADMIN" && role !== "CLIENT") {
    return NextResponse.json({ error: "תפקיד לא תקין" }, { status: 400 });
  }

  if (id === session.user.id && role === "CLIENT") {
    return NextResponse.json({ error: "לא ניתן להסיר הרשאת מנהל מעצמך" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user);
}
