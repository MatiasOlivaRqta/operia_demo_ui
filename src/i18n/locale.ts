export const locales = ["es", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "es";

export function isAppLocale(value: unknown): value is AppLocale {
  return value === "es" || value === "en";
}

export function resolveLocale(cookieValue?: string, acceptLanguage?: string): AppLocale {
  if (isAppLocale(cookieValue)) return cookieValue;
  if (!acceptLanguage) return defaultLocale;

  const preferences = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [tag = "", ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
      const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase().split("-")[0], quality, index };
    })
    .filter(({ quality }) => Number.isFinite(quality) && quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  const preferred = preferences.find(({ tag }) => isAppLocale(tag))?.tag;
  return isAppLocale(preferred) ? preferred : defaultLocale;
}
