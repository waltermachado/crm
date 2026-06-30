import { NextRequest, NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/db/prisma";
import { getCalendarContext } from "@/lib/calendar/context";
import {
  exchangeGoogleAuthCode,
  getGooglePrimaryCalendar,
  getGoogleUser,
} from "@/lib/calendar/google";
import { CALENDAR_SETTINGS_PATH } from "@/lib/calendar/routes";
import { getServerEnv } from "@/lib/env/server";
import { encryptSecret } from "@/lib/security/secrets";

function getAppOrigin(request: Request) {
  const env = getServerEnv();
  return env.APP_URL ?? new URL(request.url).origin;
}

function buildRedirectUrl(request: Request, returnTo: string, status: "connected" | "error", reason?: string) {
  const url = new URL(returnTo, getAppOrigin(request));
  url.searchParams.set("integrationStatus", status);

  if (reason) {
    url.searchParams.set("integrationError", reason);
  }

  return url;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieState = request.cookies.get("axe-google-oauth-state")?.value;
  const returnTo = request.cookies.get("axe-google-oauth-return-to")?.value ?? CALENDAR_SETTINGS_PATH;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      buildRedirectUrl(request, returnTo, "error", "invalid-google-oauth-state"),
    );
  }

  try {
    const redirectUri = `${getAppOrigin(request)}/api/v1/integrations/google/callback`;
    const tokenResponse = await exchangeGoogleAuthCode({
      code,
      redirectUri,
    });

    const [user, primaryCalendar] = await Promise.all([
      getGoogleUser(tokenResponse.access_token),
      getGooglePrimaryCalendar(tokenResponse.access_token),
    ]);

    const prisma = getPrismaClient();
    const context = await getCalendarContext(prisma);

    await prisma.integrationAccount.upsert({
      where: {
        provider_userId_externalCalendarId: {
          provider: "GOOGLE",
          userId: context.actor.userId,
          externalCalendarId: primaryCalendar.id,
        },
      },
      update: {
        membershipId: context.actor.id,
        calendarName: primaryCalendar.summary ?? "Google Calendar",
        providerAccountEmail: user.email ?? null,
        accessToken: encryptSecret(tokenResponse.access_token),
        refreshToken: tokenResponse.refresh_token
          ? encryptSecret(tokenResponse.refresh_token)
          : undefined,
        expiresAt: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : null,
        isActive: true,
        settings: {
          scope: tokenResponse.scope ?? null,
          providerName: user.name ?? null,
          primary: primaryCalendar.primary ?? false,
          timeZone: primaryCalendar.timeZone ?? null,
        },
      },
      create: {
        workspaceId: context.workspaceId,
        membershipId: context.actor.id,
        userId: context.actor.userId,
        provider: "GOOGLE",
        calendarName: primaryCalendar.summary ?? "Google Calendar",
        providerAccountEmail: user.email ?? null,
        accessToken: encryptSecret(tokenResponse.access_token),
        refreshToken: tokenResponse.refresh_token
          ? encryptSecret(tokenResponse.refresh_token)
          : null,
        expiresAt: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : null,
        externalCalendarId: primaryCalendar.id,
        settings: {
          scope: tokenResponse.scope ?? null,
          providerName: user.name ?? null,
          primary: primaryCalendar.primary ?? false,
          timeZone: primaryCalendar.timeZone ?? null,
        },
      },
    });

    const response = NextResponse.redirect(buildRedirectUrl(request, returnTo, "connected"));
    response.cookies.delete("axe-google-oauth-state");
    response.cookies.delete("axe-google-oauth-return-to");
    return response;
  } catch {
    const response = NextResponse.redirect(
      buildRedirectUrl(request, returnTo, "error", "google-oauth-callback-failed"),
    );
    response.cookies.delete("axe-google-oauth-state");
    response.cookies.delete("axe-google-oauth-return-to");
    return response;
  }
}
