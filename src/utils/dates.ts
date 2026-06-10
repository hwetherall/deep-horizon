export function nowIso(): string {
  return new Date().toISOString();
}

/** YYYY-MM-DD in a given IANA timezone (defaults to the app timezone). */
export function localDateString(
  date: Date = new Date(),
  timeZone: string = process.env.APP_TIMEZONE ?? "America/Denver"
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

/** Start/end of the lookback window for a daily scan. */
export function scanWindow(hours = 36, end: Date = new Date()): {
  start: string;
  end: string;
} {
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function parseDateSafe(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
