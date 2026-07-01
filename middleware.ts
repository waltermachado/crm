import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  LOCALE_COOKIE_NAME,
  getCountryHeaders,
  isBrazilCountry,
  normalizeLocale,
} from "./src/lib/i18n/config";
import { hasSupabaseConfig } from "./src/lib/env/supabase";
import { updateSession } from "./src/lib/supabase/middleware";

function detectLocale(request: NextRequest) {
  const cookieLocale = normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value);

  if (cookieLocale) {
    return cookieLocale;
  }

  const countryHeader = getCountryHeaders()
    .map((header) => request.headers.get(header))
    .find(Boolean);

  if (isBrazilCountry(countryHeader)) {
    return "pt-BR";
  }

  const acceptLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";

  if (acceptLanguage.includes("pt-br") || acceptLanguage.startsWith("pt")) {
    return "pt-BR";
  }

  return "en-US";
}

const protectedPrefixes = [
  "/dashboard",
  "/agenda",
  "/deals",
  "/notes",
  "/contacts",
  "/companies",
  "/tickets",
  "/settings",
];

function isProtectedRoute(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const locale = detectLocale(request);
  const pathname = request.nextUrl.pathname;

  let response = NextResponse.next();
  let user = null;

  if (hasSupabaseConfig()) {
    const sessionResult = await updateSession(request);
    response = sessionResult.response;
    user = sessionResult.user;
  }

  if (!request.cookies.get(LOCALE_COOKIE_NAME)?.value) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const isServerAction = request.headers.has("next-action");

  if (!user && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && pathname === "/" && !isServerAction && request.method !== "POST") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
