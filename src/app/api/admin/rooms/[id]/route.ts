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

  const data: { active?: boolean; description?: string } = {};
  if (typeof body?.active === "boolean") data.active = body.active;
  if (typeof body?.description === "string") data.description = body.description;

  const room = await prisma.room.update({ where: { id }, data });
  return NextResponse.json(room);
}
