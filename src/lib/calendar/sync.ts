import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAdmin } from "@/lib/db/supabase";
import { getValidGoogleAccessToken, googleCalendarRequest } from "@/lib/calendar/google";
import { hasDatabaseConfig } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("calendar-sync");

type SyncOperation = "create" | "update" | "delete";

type SyncJobInput = {
  eventId: string;
  operation: SyncOperation;
  supabase?: SupabaseClient<Database>;
};

function addOneDay(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

async function syncGoogleCalendarEvent(input: SyncJobInput) {
  const supabase = input.supabase ?? supabaseAdmin;
  const { data: event } = await supabase
    .from("CalendarEvent")
    .select("*, integrationAccount:IntegrationAccount(*), contact:Contact(*), deal:Deal(*)")
    .eq("id", input.eventId)
    .maybeSingle();

  if (!event?.integrationAccount) {
    return;
  }

  const accessToken = await getValidGoogleAccessToken({
    supabase,
    integrationAccount: event.integrationAccount as any,
  });
  const calendarId = encodeURIComponent(event.integrationAccount.externalCalendarId);
  const googlePayload = {
    summary: event.title,
    description: [event.description, event.contact?.fullName, event.deal?.name]
      .filter(Boolean)
      .join("\n\n"),
    location: event.location ?? undefined,
    start: event.isAllDay
      ? {
          date: new Date(event.startDatetime).toISOString().slice(0, 10),
        }
      : {
          dateTime: new Date(event.startDatetime).toISOString(),
          timeZone: "UTC",
        },
    end: event.isAllDay
      ? {
          date: addOneDay(new Date(event.endDatetime)).toISOString().slice(0, 10),
        }
      : {
          dateTime: new Date(event.endDatetime).toISOString(),
          timeZone: "UTC",
        },
  };

  if (input.operation === "delete") {
    if (!event.externalEventId) {
      return;
    }

    await googleCalendarRequest({
      accessToken,
      method: "DELETE",
      path: `/calendars/${calendarId}/events/${encodeURIComponent(event.externalEventId)}`,
    });

    logger.info("Google Calendar event deleted.", {
      eventId: event.id,
      externalEventId: event.externalEventId,
    });
    return;
  }

  if (!event.externalEventId) {
    const created = await googleCalendarRequest({
      accessToken,
      method: "POST",
      path: `/calendars/${calendarId}/events`,
      body: googlePayload,
    });

    if (!created?.id) {
      throw new Error("Google Calendar create response did not include an event id.");
    }

    await supabase.from("CalendarEvent").update({
      externalEventId: String(created.id),
      lastSyncedAt: new Date().toISOString(),
    }).eq("id", event.id);

    logger.info("Google Calendar event created.", {
      eventId: event.id,
      externalEventId: String(created.id),
    });
    return;
  }

  await googleCalendarRequest({
    accessToken,
    method: "PATCH",
    path: `/calendars/${calendarId}/events/${encodeURIComponent(event.externalEventId)}`,
    body: googlePayload,
  });

  await supabase.from("CalendarEvent").update({
    lastSyncedAt: new Date().toISOString(),
  }).eq("id", event.id);

  logger.info("Google Calendar event updated.", {
    eventId: event.id,
    externalEventId: event.externalEventId,
  });
}

async function syncAppleCalendarEvent(input: SyncJobInput) {
  const supabase = input.supabase ?? supabaseAdmin;
  const { data: event } = await supabase
    .from("CalendarEvent")
    .select("*, integrationAccount:IntegrationAccount(*)")
    .eq("id", input.eventId)
    .maybeSingle();

  logger.info("Apple Calendar sync placeholder queued.", {
    eventId: input.eventId,
    operation: input.operation,
    caldavUrl: event?.integrationAccount?.externalCalendarId ?? null,
  });
}

export async function dispatchCalendarSyncJob(input: SyncJobInput) {
  if (!hasDatabaseConfig()) {
    return;
  }

  const supabase = input.supabase ?? supabaseAdmin;
  const { data: event } = await supabase
    .from("CalendarEvent")
    .select("*, integrationAccount:IntegrationAccount(*)")
    .eq("id", input.eventId)
    .maybeSingle();

  if (!event?.integrationAccount) {
    return;
  }

  const job = async () => {
    if (event.integrationAccount?.provider === "GOOGLE") {
      await syncGoogleCalendarEvent(input);
      return;
    }

    if (event.integrationAccount?.provider === "APPLE") {
      await syncAppleCalendarEvent(input);
    }
  };

  void job().catch((error) => {
    logger.error("Failed to dispatch calendar sync job.", error);
  });
}

type WebhookUpsertInput = {
  externalEventId: string;
  externalCalendarId?: string | null;
  provider: "GOOGLE" | "APPLE";
  event?: {
    title?: string;
    description?: string | null;
    location?: string | null;
    startDatetime?: string;
    endDatetime?: string;
    isAllDay?: boolean;
    eventType?: "MEETING" | "TASK" | "SCHEDULE" | "PERSONAL";
  };
};

export async function applyWebhookCalendarChange(input: WebhookUpsertInput) {
  if (!hasDatabaseConfig()) {
    return {
      status: "accepted",
      message: "Webhook aceito em modo demo.",
    };
  }

  const supabase = supabaseAdmin;

  let query = supabase
    .from("IntegrationAccount")
    .select("*")
    .eq("provider", input.provider)
    .order("createdAt", { ascending: true })
    .limit(1);

  if (input.externalCalendarId) {
    query = query.eq("externalCalendarId", input.externalCalendarId);
  }

  const { data: accounts } = await query;
  const integrationAccount = accounts?.[0];

  if (!integrationAccount) {
    return {
      status: "accepted",
      message: "Nenhuma integração correspondente encontrada.",
    };
  }

  const { data: existing } = await supabase
    .from("CalendarEvent")
    .select("*")
    .eq("workspaceId", integrationAccount.workspaceId)
    .eq("externalEventId", input.externalEventId)
    .maybeSingle();

  if (!existing) {
    if (!input.event?.startDatetime || !input.event?.endDatetime || !input.event?.title) {
      return {
        status: "accepted",
        message: "Webhook recebido. Aguardando sync incremental para hidratar o evento.",
      };
    }

    await supabase.from("CalendarEvent").insert({
      id: crypto.randomUUID(),
      workspaceId: integrationAccount.workspaceId,
      ownerMembershipId: integrationAccount.membershipId,
      integrationAccountId: integrationAccount.id,
      userId: integrationAccount.userId,
      title: input.event.title,
      description: input.event.description ?? null,
      location: input.event.location ?? null,
      startDatetime: new Date(input.event.startDatetime).toISOString(),
      endDatetime: new Date(input.event.endDatetime).toISOString(),
      isAllDay: input.event.isAllDay ?? false,
      eventType: input.event.eventType ?? "MEETING",
      externalEventId: input.externalEventId,
      lastSyncedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return {
      status: "success",
      message: "Evento externo importado com sucesso.",
    };
  }

  await supabase.from("CalendarEvent").update({
    title: input.event?.title ?? existing.title,
    description:
      input.event?.description === undefined ? existing.description : input.event.description,
    location: input.event?.location === undefined ? existing.location : input.event.location,
    startDatetime: input.event?.startDatetime
      ? new Date(input.event.startDatetime).toISOString()
      : existing.startDatetime,
    endDatetime: input.event?.endDatetime ? new Date(input.event.endDatetime).toISOString() : existing.endDatetime,
    isAllDay: input.event?.isAllDay ?? existing.isAllDay,
    eventType: input.event?.eventType ?? existing.eventType,
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }).eq("id", existing.id);

  return {
    status: "success",
    message: "Evento sincronizado com sucesso.",
  };
}
