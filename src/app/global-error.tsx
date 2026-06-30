"use client";

import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { getHtmlLang } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const locale = useMemo(() => {
    if (typeof window === "undefined") {
      return "en-US" as const;
    }

    const language = window.document.documentElement.lang || window.navigator.language;

    return language.toLowerCase().startsWith("pt") ? "pt-BR" : "en-US";
  }, []);

  const copy = getMessages(locale);

  return (
    <html lang={getHtmlLang(locale)}>
      <body className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-50">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {copy.errors.globalLabel}
          </p>
          <h1 className="mt-4 font-heading text-3xl tracking-tight">
            {copy.errors.globalTitle}
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            {copy.errors.globalDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => reset()}>{copy.errors.retry}</Button>
            <Button variant="outline" onClick={() => window.location.assign("/")}>
              {copy.errors.backHome}
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
