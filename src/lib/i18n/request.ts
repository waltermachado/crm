import "server-only";

import { cookies, headers } from "next/headers";

import {
  type AppLocale,
  getCountryHeaders,
  LOCALE_COOKIE_NAME,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const countryHeader = getCountryHeaders()
    .map((header) => headerStore.get(header))
    .find(Boolean);

  return resolveLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: headerStore.get("accept-language"),
    country: countryHeader,
  });
}

export async function getRequestI18n() {
  const locale = await getRequestLocale();

  return {
    locale,
    messages: getMessages(locale),
  };
}
