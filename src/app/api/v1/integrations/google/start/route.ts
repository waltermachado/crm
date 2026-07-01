import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { buildGoogleOAuthUrl, isGoogleOAuthConfigured } from "@/lib/calendar/google";
import { CALENDAR_SETTINGS_PATH } from "@/lib/calendar/routes";
import { getServerEnv } from "@/lib/env/server";
import { hasSecretEncryptionConfig } from "@/lib/security/secrets";

function getAppOrigin(request: Request) {
  const env = getServerEnv();
  return env.APP_URL ?? new URL(request.url).origin;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("returnTo") ?? CALENDAR_SETTINGS_PATH;
  const secureCookie = getAppOrigin(request).startsWith("https://");

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL(`${returnTo}?integrationError=google-oauth-not-configured`, getAppOrigin(request)),
    );
  }

  if (!hasSecretEncryptionConfig()) {
    return NextResponse.redirect(
      new URL(`${returnTo}?integrationError=encryption-key-missing`, getAppOrigin(request)),
    );
  }

  const state = randomUUID();
  const redirectUri = `${getAppOrigin(request)}/api/v1/integrations/google/callback`;
  const authorizationUrl = buildGoogleOAuthUrl({
    redirectUri,
    state,
  });
  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set("oslernotes-google-oauth-state", state, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set("oslernotes-google-oauth-return-to", returnTo, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
