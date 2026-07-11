export type Locale = "en" | "es" | "pt";

export const LOCALES: readonly Locale[] = ["en", "es", "pt"] as const;

export const LOCALE_PATH: Record<Locale, string> = {
  en: "/",
  es: "/es",
  pt: "/pt",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  pt: "PT",
};

export function localeFromPath(pathname: string): Locale {
  if (pathname === "/es" || pathname.startsWith("/es/")) return "es";
  if (pathname === "/pt" || pathname.startsWith("/pt/")) return "pt";
  return "en";
}

export function pathForLocale(locale: Locale): string {
  return LOCALE_PATH[locale];
}
