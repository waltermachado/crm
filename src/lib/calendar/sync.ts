import "server-only";

import type { PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/lib/db/prisma";
import { getValidGoogleAccessToken, googleCalendarRequest } from "@/lib/calendar/google";
import { hasDatabaseConfig } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("calendar-sync");

type SyncOperation = "create" | "update" | "delete";

type SyncJobInput = {
  eventId: string;
  operation: SyncOperation;
  prisma?: PrismaClient;
};

function addOneDay(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

async function syncGoogleCalendarEvent(input: SyncJobInput) {
  const prisma = input.prisma ?? getPrismaClient();
  const event = await prisma.calendarEvent.findUnique({
    where: {
      id: input.eventId,
    },
    include: {
      integrationAccount: true,
      contact: true,
      deal: true,
    },
  });

  if (!event?.integrationAccount) {
    return;
  }

  const accessToken = await getValidGoogleAccessToken({
    prisma,
    integrationAccount: event.integrationAccount,
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
          date: event.startDatetime.toISOString().slice(0, 10),
        }
      : {
          dateTime: event.startDatetime.toISOString(),
          timeZone: "UTC",
        },
    end: event.isAllDay
      ? {
          date: addOneDay(event.endDatetime).toISOString().slice(0, 10),
        }
      : {
          dateTime: event.endDatetime.toISOString(),
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

    await prisma.calendarEvent.update({
      where: {
        id: event.id,
      },
      data: {
        externalEventId: String(created.id),
        lastSyncedAt: new Date(),
      },
    });

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

  await prisma.calendarEvent.update({
    where: {
      id: event.id,
    },
    data: {
      lastSyncedAt: new Date(),
    },
  });

  logger.info("Google Calendar event updated.", {
    eventId: event.id,
    externalEventId: event.externalEventId,
  });
}

async function syncAppleCalendarEvent(input: SyncJobInput) {
  const prisma = input.prisma ?? getPrismaClient();
  const event = await prisma.calendarEvent.findUnique({
    where: {
      id: input.eventId,
    },
    include: {
      integrationAccount: true,
    },
  });

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

  const prisma = input.prisma ?? getPrismaClient();
  const event = await prisma.calendarEvent.findUnique({
    where: {
      id: input.eventId,
    },
    include: {
      integrationAccount: true,
    },
  });

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

  const prisma = getPrismaClient();

  const integrationAccount = await prisma.integrationAccount.findFirst({
    where: {
      provider: input.provider,
      ...(input.externalCalendarId
        ? {
            externalCalendarId: input.externalCalendarId,
          }
        : {}),
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!integrationAccount) {
    return {
      status: "accepted",
      message: "Nenhuma integração correspondente encontrada.",
    };
  }

  const existing = await prisma.calendarEvent.findFirst({
    where: {
      workspaceId: integrationAccount.workspaceId,
      externalEventId: input.externalEventId,
    },
  });

  if (!existing) {
    if (!input.event?.startDatetime || !input.event?.endDatetime || !input.event?.title) {
      return {
        status: "accepted",
        message: "Webhook recebido. Aguardando sync incremental para hidratar o evento.",
      };
    }

    await prisma.calendarEvent.create({
      data: {
        workspaceId: integrationAccount.workspaceId,
        ownerMembershipId: integrationAccount.membershipId,
        integrationAccountId: integrationAccount.id,
        userId: integrationAccount.userId,
        title: input.event.title,
        description: input.event.description,
        location: input.event.location,
        startDatetime: new Date(input.event.startDatetime),
        endDatetime: new Date(input.event.endDatetime),
        isAllDay: input.event.isAllDay ?? false,
        eventType: input.event.eventType ?? "MEETING",
        externalEventId: input.externalEventId,
        lastSyncedAt: new Date(),
      },
    });

    return {
      status: "success",
      message: "Evento externo importado com sucesso.",
    };
  }

  await prisma.calendarEvent.update({
    where: {
      id: existing.id,
    },
    data: {
      title: input.event?.title ?? existing.title,
      description:
        input.event?.description === undefined ? existing.description : input.event.description,
      location: input.event?.location === undefined ? existing.location : input.event.location,
      startDatetime: input.event?.startDatetime
        ? new Date(input.event.startDatetime)
        : existing.startDatetime,
      endDatetime: input.event?.endDatetime ? new Date(input.event.endDatetime) : existing.endDatetime,
      isAllDay: input.event?.isAllDay ?? existing.isAllDay,
      eventType: input.event?.eventType ?? existing.eventType,
      lastSyncedAt: new Date(),
    },
  });

  return {
    status: "success",
    message: "Evento sincronizado com sucesso.",
  };
}
