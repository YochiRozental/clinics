import type { RoomKey } from "@/generated/prisma/client";
import { DURATION_OPTIONS } from "@/lib/slots";

/** מיפוי בין ספרה שהמתקשר מקיש לבין מפתח החדר במערכת */
export const ROOM_DIGIT_MAP: Record<string, RoomKey> = {
  "1": "ROOM1",
  "2": "ROOM2",
  "3": "WORKSHOP",
  "4": "ROOM1_2",
};

export const ROOM_MENU_PROMPT =
  "לקביעת תור לחדר 1 הקישו 1. לחדר 2 הקישו 2. לחדר סדנאות הקישו 3. לחדר 1 ו-2 יחד הקישו 4";

/** מיפוי בין ספרה שהמתקשר מקיש לבין משך התור בדקות (תואם לסדר DURATION_OPTIONS) */
export const DURATION_DIGIT_MAP: Record<string, number> = Object.fromEntries(
  DURATION_OPTIONS.map((opt, i) => [String(i + 1), opt.minutes])
);

export const DURATION_MENU_PROMPT = [
  "לרבע שעה הקישו 1",
  "לחצי שעה הקישו 2",
  "ל-45 דקות הקישו 3",
  "לשעה הקישו 4",
  "לשעה וחצי הקישו 5",
  "לשעתיים הקישו 6",
  "לשלוש שעות הקישו 7",
].join(". ");
