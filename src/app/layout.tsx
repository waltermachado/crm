import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { getHtmlLang } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/provider";
import { getRequestI18n } from "@/lib/i18n/request";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

const headingFont = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Axe CRM",
    template: "%s | Axe CRM",
  },
  description:
    "Production-ready enterprise CRM baseline built with Next.js 15, Supabase Auth, row-level security, and shadcn/ui.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getRequestI18n();

  return (
    <html lang={getHtmlLang(locale)}>
      <body
        className={`${bodyFont.variable} ${monoFont.variable} ${headingFont.variable} antialiased`}
      >
        <I18nProvider locale={locale} messages={messages}>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
