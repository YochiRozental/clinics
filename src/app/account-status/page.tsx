import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AccountStatusPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status === "APPROVED") redirect("/booking");

  const isBlocked = session.user.status === "BLOCKED";

  return (
    <div className="max-w-md mx-auto text-center bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      <h1 className="text-xl font-bold mb-3">
        {isBlocked ? "החשבון שלך חסום" : "ההרשמה שלך התקבלה"}
      </h1>
      {isBlocked ? (
        <p className="text-slate-600">
          החשבון שלך נחסם על ידי מנהל המערכת ולא ניתן לקבוע דרכו תורים כרגע. לבירור יש ליצור קשר עם מנהל המערכת.
        </p>
      ) : (
        <p className="text-slate-600">
          החשבון שלך ממתין לאישור מנהל המערכת. לאחר האישור תקבל/י הודעה (במייל או בשיחת טלפון, בהתאם לאופן ההרשמה) ותוכל/י להתחיל לקבוע תורים.
        </p>
      )}
    </div>
  );
}
