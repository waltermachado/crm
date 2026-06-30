import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type AppLocale,
  isBrazilCountry,
} from "@/lib/i18n/config";

export type ResolveLocaleInput = {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  country?: string | null;
};

function getLocaleFromAcceptLanguage(header: string | null | undefined) {
  if (!header) {
    return null;
  }

  const languages = header
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean);

  for (const language of languages) {
    const normalized = normalizeLocale(language);

    if (normalized) {
      return normalized;
    }

    if (language?.toLowerCase().startsWith("pt")) {
      return "pt-BR";
    }
  }

  return null;
}

export function resolveLocale(input: ResolveLocaleInput): AppLocale {
  const cookieLocale = normalizeLocale(input.cookieLocale);

  if (cookieLocale) {
    return cookieLocale;
  }

  if (isBrazilCountry(input.country)) {
    return "pt-BR";
  }

  return getLocaleFromAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}
