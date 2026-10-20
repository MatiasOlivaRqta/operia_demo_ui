const argentinaTimeZone = "America/Argentina/Buenos_Aires";

export function greetingFor(now: Date): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: argentinaTimeZone,
    })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value,
  );
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 20) return "afternoon";
  return "evening";
}

export function formatHomeDate(now: Date, locale: "es" | "en" = "es"): string {
  const parts = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: argentinaTimeZone,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  const weekday = part("weekday");
  const capitalizedWeekday = `${weekday.charAt(0).toLocaleUpperCase(locale)}${weekday.slice(1)}`;
  return locale === "en"
    ? `${capitalizedWeekday}, ${part("month")} ${part("day")}`
    : `${capitalizedWeekday}, ${part("day")} de ${part("month")}`;
}

export function firstNameOf(name?: string | null): string {
  return name?.trim().split(/\s+/u)[0] ?? "";
}
