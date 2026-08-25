import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { sendApprovalNotification } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const role = body?.role as "ADMIN" | "CLIENT" | undefined;
  const status = body?.status as "PENDING" | "APPROVED" | "BLOCKED" | undefined;

  if (role === undefined && status === undefined) {
    return NextResponse.json({ error: "אין נתונים לעדכון" }, { status: 400 });
  }
  if (role !== undefined && role !== "ADMIN" && role !== "CLIENT") {
    return NextResponse.json({ error: "תפקיד לא תקין" }, { status: 400 });
  }
  if (status !== undefined && !["PENDING", "APPROVED", "BLOCKED"].includes(status)) {
    return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
  }
  if (id === session.user.id && (role === "CLIENT" || status === "BLOCKED")) {
    return NextResponse.json({ error: "לא ניתן לבצע פעולה זו על החשבון של עצמך" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { status: true, name: true, email: true, phone: true },
  });
  if (!existing) return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });

  const user = await prisma.user.update({
    where: { id },
    data: { ...(role !== undefined && { role }), ...(status !== undefined && { status }) },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true },
  });

  if (status === "APPROVED" && existing.status !== "APPROVED") {
    try {
      await sendApprovalNotification(user);
    } catch (err) {
      console.error("[admin/users] failed to send approval notification", err);
    }
  }

  return NextResponse.json(user);
}
