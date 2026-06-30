"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/lib/i18n/config";

const languagePreferenceSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES),
});

export async function saveLanguagePreferenceAction(formData: FormData) {
  const parsed = languagePreferenceSchema.parse({
    locale: formData.get("locale"),
  });

  const cookieStore = await cookies();

  cookieStore.set(LOCALE_COOKIE_NAME, parsed.locale as AppLocale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/settings?saved=language");
}
