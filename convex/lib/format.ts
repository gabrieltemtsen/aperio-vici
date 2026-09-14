/** Server-side helpers. Money is always kobo (integer). */

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

/**
 * Nigerian numbers arrive as 0803..., +234803..., 234803... and with spaces.
 * Everything is stored as 0XXXXXXXXXX so one customer is one record.
 */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return "0" + digits.slice(3);
  if (digits.startsWith("0") && digits.length === 11) return digits;
  if (digits.length === 10) return "0" + digits;
  return digits;
}

export function isValidPhone(input: string): boolean {
  return /^0[789][01]\d{8}$/.test(normalisePhone(input));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
}
