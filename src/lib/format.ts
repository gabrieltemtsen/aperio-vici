/** Money crosses the wire as kobo. It only becomes naira at the last moment. */

export function formatNaira(kobo: number, opts?: { decimals?: boolean }): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(kobo / 100);
}

/** For compact dashboard figures: ₦1.2m, ₦480k. */
export function formatNairaShort(kobo: number): string {
  const naira = kobo / 100;
  if (Math.abs(naira) >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(naira >= 10_000_000 ? 0 : 1)}m`;
  if (Math.abs(naira) >= 10_000) return `₦${Math.round(naira / 1000)}k`;
  return `₦${Math.round(naira).toLocaleString("en-NG")}`;
}

export function nairaToKobo(naira: number | string): number {
  const value = typeof naira === "string" ? parseFloat(naira.replace(/[^0-9.]/g, "")) : naira;
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return phone;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

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

export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(ms);
}

export function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(ms);
}

export function timeAgo(ms: number): string {
  const seconds = Math.round((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ms);
}
