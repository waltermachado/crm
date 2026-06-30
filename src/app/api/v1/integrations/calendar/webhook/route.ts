import { NextResponse } from "next/server";

import { applyWebhookCalendarChange } from "@/lib/calendar/sync";
import type { CalendarWebhookPayload } from "@/types/calendar";

export const dynamic = "force-dynamic";

function inferProvider(
  payload: Partial<CalendarWebhookPayload>,
  headers: Headers,
): "GOOGLE" | "APPLE" | null {
  if (payload.provider === "GOOGLE" || payload.provider === "APPLE") {
    return payload.provider;
  }

  const googleChannel = headers.get("x-goog-channel-id");

  if (googleChannel) {
    return "GOOGLE";
  }

  const userAgent = headers.get("user-agent")?.toLowerCase() ?? "";

  if (userAgent.includes("apple")) {
    return "APPLE";
  }

  return null;
}

export async function POST(request: Request) {
  const bodyText = await request.text();
  const payload = bodyText ? (JSON.parse(bodyText) as Partial<CalendarWebhookPayload>) : {};
  const provider = inferProvider(payload, request.headers);

  if (!provider) {
    return NextResponse.json(
      {
        status: "error",
        message: "Provider de calendário não identificado.",
      },
      { status: 400 },
    );
  }

  const externalEventId =
    payload.externalEventId ??
    request.headers.get("x-goog-message-number") ??
    undefined;

  if (!externalEventId) {
    return NextResponse.json(
      {
        status: "accepted",
        message:
          "Webhook recebido sem externalEventId. Use este ponto para acionar sync incremental com syncToken.",
      },
      { status: 202 },
    );
  }

  const result = await applyWebhookCalendarChange({
    provider,
    externalEventId,
    externalCalendarId: payload.externalCalendarId,
    event: payload.event,
  });

  return NextResponse.json(result, {
    status: result.status === "success" ? 200 : 202,
  });
}
