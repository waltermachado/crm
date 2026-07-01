export const LOCALE_COOKIE_NAME = "oslernotes-locale";

export const SUPPORTED_LOCALES = ["en-US", "pt-BR"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en-US";

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function getHtmlLang(locale: AppLocale) {
  return locale === "pt-BR" ? "pt-BR" : "en";
}

export function getCurrencyForLocale(locale: AppLocale) {
  return locale === "pt-BR" ? "BRL" : "USD";
}

export function getCountryHeaders() {
  return [
    "x-vercel-ip-country",
    "cf-ipcountry",
    "cloudfront-viewer-country",
    "x-country-code",
  ] as const;
}

export function normalizeLocale(input: string | null | undefined): AppLocale | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();

  if (normalized === "pt" || normalized === "pt-br") {
    return "pt-BR";
  }

  if (normalized === "en" || normalized === "en-us") {
    return "en-US";
  }

  return isSupportedLocale(input) ? input : null;
}

export function isBrazilCountry(country: string | null | undefined) {
  return country?.trim().toUpperCase() === "BR";
}
