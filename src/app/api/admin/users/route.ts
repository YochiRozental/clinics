import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { appointments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: search ? 20 : 100,
  });

  return NextResponse.json(users);
}
