import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const registerSchema = z.object({
  name: z.string().trim().min(2, "יש להזין שם מלא"),
  email: z.string().trim().email("כתובת אימייל לא תקינה"),
  phone: z.string().trim().min(9, "מספר טלפון לא תקין").optional().or(z.literal("")),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" },
      { status: 400 }
    );
  }

  const { name, email, phone, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "כתובת האימייל כבר רשומה במערכת" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone: phone || null,
      passwordHash,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
