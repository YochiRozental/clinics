import type { Call, Msg } from "yemot-router2";
import { prisma } from "@/lib/prisma";
import { createAppointment, BookingError } from "@/lib/booking";
import { ROOM_LABELS } from "@/lib/rooms";
import { DURATION_OPTIONS } from "@/lib/slots";
import { hashPassword } from "@/lib/password";
import { last9Digits } from "@/ivr/phone";
import { ROOM_DIGIT_MAP, ROOM_MENU_PROMPT, DURATION_DIGIT_MAP, DURATION_MENU_PROMPT } from "@/ivr/ivr-options";

function text(data: string): Msg {
  return { type: "text", data, removeInvalidChars: true };
}

/**
 * מבצע read עם ולידציה + ניסיונות חוזרים. אם המתקשר לא נותן קלט תקין אחרי maxAttempts,
 * הפונקציה מנתקת את השיחה בעצמה (id_list_message זורק שגיאת יציאה פנימית של הספרייה, וזו התנהגות מכוונת).
 */
async function readValidated<T>(
  call: Call,
  prompt: string,
  parse: (raw: string) => T | null,
  invalidMessage: string,
  digits: number,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const messages = attempt === 0 ? [text(prompt)] : [text(invalidMessage), text(prompt)];
    const raw = await call.read(messages, "tap", {
      max_digits: digits,
      min_digits: digits,
      sec_wait: 12,
    });
    const parsed = parse(raw);
    if (parsed !== null) return parsed;
  }
  call.id_list_message([text("לא התקבל קלט תקין. השיחה תנותק, ניתן לנסות שוב.")]);
  throw new Error("unreachable");
}

function parseDdMm(raw: string): { day: number; month: number } | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const day = Number(raw.slice(0, 2));
  const month = Number(raw.slice(2, 4));
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return { day, month };
}

function parseHhMm(raw: string): { hour: number; minute: number } | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const hour = Number(raw.slice(0, 2));
  const minute = Number(raw.slice(2, 4));
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** בונה תאריך יעד מיום/חודש, גולש לשנה הבאה אם התאריך בשנה הנוכחית כבר עבר */
function resolveTargetDate(day: number, month: number): Date {
  const now = new Date();
  let year = now.getFullYear();
  let candidate = new Date(year, month - 1, day);
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (candidate < todayMidnight) {
    year += 1;
    candidate = new Date(year, month - 1, day);
  }
  return candidate;
}

function parsePin(raw: string): string | null {
  return /^\d{4}$/.test(raw) ? raw : null;
}

/**
 * שלוחות יעד ל-go_to_folder, לפי מבנה השלוחות שהוגדר בפאנל ימות המשיח.
 * נתיבים מוחלטים (מתחילים ב-/) כדי שהניווט יעבוד מכל עומק בעץ השלוחות.
 */
const MEMBERS_EXTENSION = "/1";
const NOT_REGISTERED_EXTENSION = "/2";
const EXPLANATION_EXTENSION = "/3";

/** מבקש מהמתקשר שם מלא באמצעות זיהוי דיבור, עם ניסיונות חוזרים */
async function readSpokenName(call: Call): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const prompt =
      attempt === 0 ? "אמרו בבקשה את שמכם המלא, אחרי הצפצוף" : "לא הצלחנו לזהות שם, אנא אמרו שוב את שמכם המלא";
    const raw = await call.read([text(prompt)], "stt");
    const name = raw?.trim();
    if (name && name.length >= 2 && !/^\d+$/.test(name)) return name;
  }
  call.id_list_message([text("לא זוהה שם תקין. השיחה תנותק, ניתן לנסות שוב.")]);
  throw new Error("unreachable");
}

/** מבקש קוד סודי בן 4 ספרות פעמיים ומוודא שהם תואמים, עם ניסיונות חוזרים */
async function readNewPin(call: Call): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const pin = await readValidated(
      call,
      "בחרו קוד סודי אישי בן 4 ספרות לזיהוי עתידי, והקישו אותו",
      parsePin,
      "הקוד שהוקש אינו תקין, יש להקיש 4 ספרות",
      4
    );
    const confirmPin = await readValidated(
      call,
      "לאישור, הקישו שוב את אותו קוד סודי",
      parsePin,
      "הקוד שהוקש אינו תקין, יש להקיש 4 ספרות",
      4
    );
    if (pin === confirmPin) return pin;
  }
  call.id_list_message([text("הקוד שהוקש לא תאם בין שתי ההקשות. השיחה תנותק, ניתן לנסות שוב.")]);
  throw new Error("unreachable");
}

/** קולט שם + קוד סודי ויוצר משתמש חדש. מניח שהמתקשר כבר ביקש להירשם (הכוונה נעשית לפני הקריאה לכאן) */
async function performRegistration(call: Call, phone: string) {
  const name = await readSpokenName(call);
  const pin = await readNewPin(call);
  const passwordHash = await hashPassword(pin);

  try {
    return await prisma.user.create({ data: { name, phone, passwordHash } });
  } catch {
    call.id_list_message([text("אירעה שגיאה בהרשמה, נסו שוב מאוחר יותר")]);
    return null;
  }
}

async function runBookingDialog(call: Call, user: { id: string; name: string }, greeting: string) {
  const roomDigit = await call.read([text(`${greeting}${ROOM_MENU_PROMPT}`)], "tap", {
    max_digits: 1,
    min_digits: 1,
    digits_allowed: [1, 2, 3, 4],
    sec_wait: 10,
  });
  const roomKey = ROOM_DIGIT_MAP[roomDigit];

  const dateDigit = await call.read(
    [text("לתור היום הקישו 1. למחר הקישו 2. למחרתיים הקישו 3. לתאריך אחר הקישו 4")],
    "tap",
    { max_digits: 1, min_digits: 1, digits_allowed: [1, 2, 3, 4], sec_wait: 10 }
  );

  let targetDate: Date;
  if (dateDigit === "4") {
    const { day, month } = await readValidated(
      call,
      "הקישו את היום והחודש בארבע ספרות. לדוגמה, החמישי בספטמבר מוקלד 0509",
      parseDdMm,
      "התאריך שהוקש אינו תקין",
      4
    );
    targetDate = resolveTargetDate(day, month);
  } else {
    const now = new Date();
    const offset = { "1": 0, "2": 1, "3": 2 }[dateDigit] ?? 0;
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  }

  const { hour, minute } = await readValidated(
    call,
    "הקישו את שעת ההתחלה בארבע ספרות. לדוגמה, השעה 14:30 מוקלדת 1430",
    parseHhMm,
    "השעה שהוקשה אינה תקינה",
    4
  );

  const durationDigit = await call.read([text(DURATION_MENU_PROMPT)], "tap", {
    max_digits: 1,
    min_digits: 1,
    digits_allowed: [1, 2, 3, 4, 5, 6, 7],
    sec_wait: 10,
  });
  const durationMinutes = DURATION_DIGIT_MAP[durationDigit];

  const startTime = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    hour,
    minute
  );
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  const durationLabel = DURATION_OPTIONS.find((o) => o.minutes === durationMinutes)?.label ?? "";

  const confirmDigit = await call.read(
    [
      text(
        `נקבע תור ל${ROOM_LABELS[roomKey]}, בתאריך ${String(startTime.getDate()).padStart(2, "0")} ל${String(
          startTime.getMonth() + 1
        ).padStart(2, "0")}, בשעה ${String(hour).padStart(2, "0")} ${String(minute).padStart(
          2,
          "0"
        )}, למשך ${durationLabel}. לאישור הקישו 1. לביטול הקישו 2`
      ),
    ],
    "tap",
    { max_digits: 1, min_digits: 1, digits_allowed: [1, 2], sec_wait: 10 }
  );

  if (confirmDigit !== "1") {
    return call.id_list_message([text("התור בוטל. תודה ולהתראות")]);
  }

  try {
    await createAppointment({
      userId: user.id,
      roomKey,
      startTime,
      endTime,
      source: "IVR",
    });
    return call.id_list_message([text("התור נקבע בהצלחה. תודה ולהתראות")]);
  } catch (err) {
    const message = err instanceof BookingError ? err.message : "אירעה שגיאה בקביעת התור, נסו שוב מאוחר יותר";
    return call.id_list_message([text(message)]);
  }
}

async function findUserByCallerPhone(call: Call) {
  const phone = last9Digits(call.phone);
  return phone ? prisma.user.findFirst({ where: { phone: { endsWith: phone } } }) : null;
}

/** שלוחת הבדיקה — הכניסה הראשונית לשיחה. בודקת אם המספר רשום ומנתבת לשלוחת המחוברים (1) או ללא-רשומים (2) */
export async function handleCheckCall(call: Call) {
  const user = await findUserByCallerPhone(call);
  return call.go_to_folder(user ? MEMBERS_EXTENSION : NOT_REGISTERED_EXTENSION);
}

/** שלוחה 1 — "מחוברים": מניחה שהמתקשר רשום (הגיע דרך שלוחת הבדיקה), ומריצה את שיחת קביעת התור */
export async function handleMembersCall(call: Call) {
  const user = await findUserByCallerPhone(call);
  if (!user) {
    // הגעה ישירה לשלוחה זו בלי לעבור דרך שלוחת הבדיקה (מקרה קצה) — מנתבים חזרה למסלול הנכון
    return call.go_to_folder(NOT_REGISTERED_EXTENSION);
  }
  return runBookingDialog(call, user, `שלום ${user.name}. `);
}

/** שלוחה 2 — מספר לא רשום: הרשמה / הסבר על המערכת (שלוחה 3) / ניתוק */
export async function handleNotRegisteredCall(call: Call) {
  const choice = await call.read(
    [
      text(
        "מספר הטלפון שלך אינו רשום במערכת. להרשמה הקישו 1. לשמיעת הסבר על המערכת הקישו 2. לניתוק הקישו 3"
      ),
    ],
    "tap",
    { max_digits: 1, min_digits: 1, digits_allowed: [1, 2, 3], sec_wait: 10 }
  );

  if (choice === "2") return call.go_to_folder(EXPLANATION_EXTENSION);
  if (choice !== "1") return call.hangup();

  const newUser = await performRegistration(call, call.phone);
  if (!newUser) return; // performRegistration כבר סיימה את השיחה עם הודעת שגיאה

  return call.go_to_folder(MEMBERS_EXTENSION);
}
