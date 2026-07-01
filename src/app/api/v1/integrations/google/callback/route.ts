import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/db/supabase";
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
  const cookieState = request.cookies.get("oslernotes-google-oauth-state")?.value;
  const returnTo = request.cookies.get("oslernotes-google-oauth-return-to")?.value ?? CALENDAR_SETTINGS_PATH;

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

    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);

    const { data: existing } = await supabase
      .from("IntegrationAccount")
      .select("id")
      .eq("provider", "GOOGLE")
      .eq("userId", context.actor.userId)
      .eq("externalCalendarId", primaryCalendar.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("IntegrationAccount").update({
        membershipId: context.actor.id,
        calendarName: primaryCalendar.summary ?? "Google Calendar",
        providerAccountEmail: user.email ?? null,
        accessToken: encryptSecret(tokenResponse.access_token),
        refreshToken: tokenResponse.refresh_token
          ? encryptSecret(tokenResponse.refresh_token)
          : undefined,
        expiresAt: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
          : null,
        isActive: true,
        settings: {
          scope: tokenResponse.scope ?? null,
          providerName: user.name ?? null,
          primary: primaryCalendar.primary ?? false,
          timeZone: primaryCalendar.timeZone ?? null,
        } as any,
        updatedAt: new Date().toISOString()
      }).eq("id", existing.id);
    } else {
      await supabase.from("IntegrationAccount").insert({
        id: crypto.randomUUID(),
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
          ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
          : null,
        externalCalendarId: primaryCalendar.id,
        settings: {
          scope: tokenResponse.scope ?? null,
          providerName: user.name ?? null,
          primary: primaryCalendar.primary ?? false,
          timeZone: primaryCalendar.timeZone ?? null,
        } as any,
        updatedAt: new Date().toISOString()
      });
    }

    const response = NextResponse.redirect(buildRedirectUrl(request, returnTo, "connected"));
    response.cookies.delete("oslernotes-google-oauth-state");
    response.cookies.delete("oslernotes-google-oauth-return-to");
    return response;
  } catch {
    const response = NextResponse.redirect(
      buildRedirectUrl(request, returnTo, "error", "google-oauth-callback-failed"),
    );
    response.cookies.delete("oslernotes-google-oauth-state");
    response.cookies.delete("oslernotes-google-oauth-return-to");
    return response;
  }
}
