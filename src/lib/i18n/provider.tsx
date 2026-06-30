"use client";

import { createContext, useContext } from "react";

import type { AppLocale } from "@/lib/i18n/config";
import type { I18nMessages } from "@/lib/i18n/messages";

type I18nContextValue = {
  locale: AppLocale;
  messages: I18nMessages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: React.PropsWithChildren<I18nContextValue>) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used within I18nProvider.");
  }

  return value;
}
