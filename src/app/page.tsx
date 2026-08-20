import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">
        ברוכים הבאים למערכת קביעת התורים
      </h1>
      <p className="text-slate-600 mb-8 leading-relaxed">
        קבעו תור בקלות לחדר 1, חדר 2, חדר הסדנאות, או לחדר 1+2 המשולב.
        <br />
        יש להתחבר או להירשם כדי לקבוע תור.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/booking"
          className="px-5 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
        >
          קביעת תור
        </Link>
        <Link
          href="/register"
          className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
        >
          הרשמה
        </Link>
      </div>
    </div>
  );
}
