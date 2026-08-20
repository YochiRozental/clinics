import { RoomKey } from "@/generated/prisma/client";

export const ROOM_LABELS: Record<RoomKey, string> = {
  ROOM1: "חדר 1",
  ROOM2: "חדר 2",
  WORKSHOP: "חדר סדנאות",
  ROOM1_2: "חדר 1+2 (משולב)",
};

export const ROOM_SEED: {
  key: RoomKey;
  name: string;
  description: string;
  isCombo: boolean;
}[] = [
  { key: "ROOM1", name: "חדר 1", description: "חדר טיפולים 1", isCombo: false },
  { key: "ROOM2", name: "חדר 2", description: "חדר טיפולים 2", isCombo: false },
  {
    key: "WORKSHOP",
    name: "חדר סדנאות",
    description: "חדר עצמאי לסדנאות ומפגשים קבוצתיים",
    isCombo: false,
  },
  {
    key: "ROOM1_2",
    name: "חדר 1+2 (משולב)",
    description: "חדר 1 וחדר 2 מחוברים לשטח אחד",
    isCombo: true,
  },
];

/**
 * חדר 1 וחדר 2 מחוברים פיזית וניתן לחבר אותם לחדר 1+2 אחד.
 * הזמנה של ROOM1_2 חוסמת גם ROOM1 וגם ROOM2 ולהפך, כדי למנוע התנגשות פיזית.
 * חדר הסדנאות עצמאי לחלוטין ואינו משפיע על אף חדר אחר.
 */
export const CONFLICTING_ROOM_KEYS: Record<RoomKey, RoomKey[]> = {
  ROOM1: ["ROOM1", "ROOM1_2"],
  ROOM2: ["ROOM2", "ROOM1_2"],
  ROOM1_2: ["ROOM1", "ROOM2", "ROOM1_2"],
  WORKSHOP: ["WORKSHOP"],
};
