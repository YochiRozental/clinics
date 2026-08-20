/** מנרמל מספר טלפון ל-9 הספרות האחרונות שלו, כדי להשוות בין פורמטים שונים (עם/בלי 0 מוביל, עם/בלי 972+) */
export function last9Digits(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-9);
}
