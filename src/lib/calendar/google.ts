import "server-only";

import type { PrismaClient } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { getServerEnv } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";
import { decryptSecret, encryptSecret } from "@/lib/security/secrets";

const logger = createLogger("google-calendar");
const GOOGLE_SCOPE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
].join(" ");

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  primary?: boolean;
  timeZone?: string;
};

function getRequiredGoogleConfig() {
  const env = getServerEnv();

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new AppError("Google Calendar OAuth is not configured.", {
      code: "GOOGLE_OAUTH_NOT_CONFIGURED",
      statusCode: 500,
    });
  }

  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

export function isGoogleOAuthConfigured() {
  const env = getServerEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function buildGoogleOAuthUrl(input: { redirectUri: string; state: string }) {
  const config = getRequiredGoogleConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", input.state);

  return url.toString();
}

export async function exchangeGoogleAuthCode(input: {
  code: string;
  redirectUri: string;
}) {
  const config = getRequiredGoogleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code: input.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError("Failed to exchange Google OAuth code.", {
      code: "GOOGLE_TOKEN_EXCHANGE_FAILED",
      statusCode: response.status,
    });
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(input: {
  refreshToken: string;
}) {
  const config = getRequiredGoogleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError("Failed to refresh Google access token.", {
      code: "GOOGLE_TOKEN_REFRESH_FAILED",
      statusCode: response.status,
    });
  }

  return (await response.json()) as GoogleTokenResponse;
}

export async function getGoogleUser(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError("Failed to fetch Google user info.", {
      code: "GOOGLE_USERINFO_FAILED",
      statusCode: response.status,
    });
  }

  return (await response.json()) as {
    email?: string;
    name?: string;
  };
}

export async function getGooglePrimaryCalendar(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new AppError("Failed to fetch Google calendars.", {
      code: "GOOGLE_CALENDAR_LIST_FAILED",
      statusCode: response.status,
    });
  }

  const payload = (await response.json()) as { items?: GoogleCalendarListEntry[] };
  const primary =
    payload.items?.find((calendar) => calendar.primary) ??
    payload.items?.find((calendar) => calendar.id === "primary") ??
    payload.items?.[0];

  if (!primary) {
    throw new AppError("No Google calendar found for account.", {
      code: "GOOGLE_PRIMARY_CALENDAR_NOT_FOUND",
      statusCode: 404,
    });
  }

  return primary;
}

export async function getValidGoogleAccessToken(input: {
  prisma: PrismaClient;
  integrationAccount: {
    id: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
  };
}) {
  const now = Date.now();
  const expiresAt = input.integrationAccount.expiresAt?.getTime() ?? 0;
  const accessToken =
    input.integrationAccount.accessToken ? decryptSecret(input.integrationAccount.accessToken) : null;

  if (accessToken && expiresAt > now + 60_000) {
    return accessToken;
  }

  if (!input.integrationAccount.refreshToken) {
    throw new AppError("Google refresh token is missing.", {
      code: "GOOGLE_REFRESH_TOKEN_MISSING",
      statusCode: 401,
    });
  }

  const refreshed = await refreshGoogleAccessToken({
    refreshToken: decryptSecret(input.integrationAccount.refreshToken),
  });

  await input.prisma.integrationAccount.update({
    where: {
      id: input.integrationAccount.id,
    },
    data: {
      accessToken: encryptSecret(refreshed.access_token),
      expiresAt: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000)
        : null,
    },
  });

  logger.info("Google access token refreshed.", {
    integrationAccountId: input.integrationAccount.id,
  });

  return refreshed.access_token;
}

export async function googleCalendarRequest(
  input: {
    accessToken: string;
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    body?: Record<string, unknown>;
  },
) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${input.path}`, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      ...(input.body ? { "content-type": "application/json" } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("Google Calendar request failed.", {
      path: input.path,
      status: response.status,
      body: errorBody,
    });

    throw new AppError("Google Calendar request failed.", {
      code: "GOOGLE_CALENDAR_REQUEST_FAILED",
      statusCode: response.status,
    });
  }

  if (input.method === "DELETE") {
    return null;
  }

  return (await response.json()) as Record<string, unknown>;
}
