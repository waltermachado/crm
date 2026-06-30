"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/prisma";
import { getCalendarContext } from "@/lib/calendar/context";
import {
  createDemoCalendarEvent,
  deleteDemoCalendarEvent,
  disconnectDemoCalendarConnection,
  reactivateDemoCalendarConnection,
  saveDemoAppleCalendarConnection,
  updateDemoCalendarEvent,
} from "@/lib/calendar/demo-store";
import { AXE_CALENDAR_ID } from "@/lib/calendar/constants";
import { CALENDAR_AGENDA_PATH, CALENDAR_SETTINGS_PATH } from "@/lib/calendar/routes";
import { dispatchCalendarSyncJob } from "@/lib/calendar/sync";
import { hasDatabaseConfig } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";
import { encryptSecret, hasSecretEncryptionConfig } from "@/lib/security/secrets";
import type {
  CalendarActionResult,
  CreateCalendarEventInput,
  DisconnectCalendarConnectionInput,
  DeleteCalendarEventInput,
  ReactivateCalendarConnectionInput,
  SaveAppleCalendarConnectionInput,
  UpdateCalendarEventInput,
} from "@/types/calendar";

const logger = createLogger("calendar-actions");

const baseEventSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    description: z.string().trim().max(4000).optional(),
    location: z.string().trim().max(240).optional(),
    startDatetime: z.string().datetime(),
    endDatetime: z.string().datetime(),
    isAllDay: z.boolean(),
    eventType: z.enum(["MEETING", "TASK", "SCHEDULE", "PERSONAL"]),
    sourceCalendarId: z.string().optional(),
    contactId: z.string().optional(),
    dealId: z.string().optional(),
  })
  .refine((value) => new Date(value.endDatetime).getTime() > new Date(value.startDatetime).getTime(), {
    message: "O término deve ser maior que o início.",
    path: ["endDatetime"],
  });

const createEventSchema = baseEventSchema;
const updateEventSchema = baseEventSchema.extend({
  eventId: z.string().min(1),
});
const deleteEventSchema = z.object({
  eventId: z.string().min(1),
});

async function resolveIntegrationAccountId(
  prisma: ReturnType<typeof getPrismaClient>,
  workspaceId: string,
  sourceCalendarId?: string,
) {
  if (!sourceCalendarId || sourceCalendarId === AXE_CALENDAR_ID) {
    return null;
  }

  const integrationAccount = await prisma.integrationAccount.findFirst({
    where: {
      id: sourceCalendarId,
      workspaceId,
      isActive: true,
    },
  });

  return integrationAccount?.id ?? null;
}

export async function createEventAction(
  input: CreateCalendarEventInput,
): Promise<CalendarActionResult> {
  const parsed = createEventSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await createDemoCalendarEvent(parsed);
    revalidateCalendarViews();
    return result;
  }

  try {
    const prisma = getPrismaClient();
    const context = await getCalendarContext(prisma);
    const integrationAccountId = await resolveIntegrationAccountId(
      prisma,
      context.workspaceId,
      parsed.sourceCalendarId,
    );

    const event = await prisma.calendarEvent.create({
      data: {
        workspaceId: context.workspaceId,
        ownerMembershipId: context.actor.id,
        integrationAccountId,
        userId: context.actor.userId,
        contactId: parsed.contactId || null,
        dealId: parsed.dealId || null,
        title: parsed.title,
        description: parsed.description,
        location: parsed.location,
        startDatetime: new Date(parsed.startDatetime),
        endDatetime: new Date(parsed.endDatetime),
        isAllDay: parsed.isAllDay,
        eventType: parsed.eventType,
      },
    });

    await dispatchCalendarSyncJob({
      eventId: event.id,
      operation: "create",
    });

    revalidateCalendarViews();

    return {
      status: "success",
      message: "Evento criado com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to create calendar event.", error);

    return {
      status: "error",
      message: "Não foi possível criar o evento.",
    };
  }
}

export async function updateEventAction(
  input: UpdateCalendarEventInput,
): Promise<CalendarActionResult> {
  const parsed = updateEventSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await updateDemoCalendarEvent(parsed);
    revalidateCalendarViews();
    return result;
  }

  try {
    const prisma = getPrismaClient();
    const context = await getCalendarContext(prisma);
    const integrationAccountId = await resolveIntegrationAccountId(
      prisma,
      context.workspaceId,
      parsed.sourceCalendarId,
    );

    const existing = await prisma.calendarEvent.findFirst({
      where: {
        id: parsed.eventId,
        workspaceId: context.workspaceId,
      },
    });

    if (!existing) {
      throw new Error("Calendar event not found.");
    }

    const event = await prisma.calendarEvent.update({
      where: {
        id: parsed.eventId,
      },
      data: {
        integrationAccountId,
        contactId: parsed.contactId || null,
        dealId: parsed.dealId || null,
        title: parsed.title,
        description: parsed.description,
        location: parsed.location,
        startDatetime: new Date(parsed.startDatetime),
        endDatetime: new Date(parsed.endDatetime),
        isAllDay: parsed.isAllDay,
        eventType: parsed.eventType,
      },
    });

    await dispatchCalendarSyncJob({
      eventId: event.id,
      operation: "update",
    });

    revalidateCalendarViews();

    return {
      status: "success",
      message: "Evento atualizado com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to update calendar event.", error);

    return {
      status: "error",
      message: "Não foi possível atualizar o evento.",
    };
  }
}

export async function deleteEventAction(
  input: DeleteCalendarEventInput,
): Promise<CalendarActionResult> {
  const parsed = deleteEventSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await deleteDemoCalendarEvent(parsed);
    revalidateCalendarViews();
    return result;
  }

  try {
    const prisma = getPrismaClient();
    const context = await getCalendarContext(prisma);
    const existing = await prisma.calendarEvent.findFirst({
      where: {
        id: parsed.eventId,
        workspaceId: context.workspaceId,
      },
    });

    if (!existing) {
      throw new Error("Calendar event not found.");
    }

    await dispatchCalendarSyncJob({
      eventId: existing.id,
      operation: "delete",
    });

    await prisma.calendarEvent.delete({
      where: {
        id: existing.id,
      },
    });

    revalidateCalendarViews();

    return {
      status: "success",
      message: "Evento removido com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to delete calendar event.", error);

    return {
      status: "error",
      message: "Não foi possível remover o evento.",
    };
  }
}

const saveAppleCalendarConnectionSchema = z.object({
  calendarName: z.string().trim().min(2).max(120),
  appleId: z.string().trim().email(),
  appSpecificPassword: z.string().trim().min(8).max(120),
  caldavUrl: z.string().trim().url(),
});

const disconnectCalendarConnectionSchema = z.object({
  integrationAccountId: z.string().min(1),
});

const reactivateCalendarConnectionSchema = z.object({
  integrationAccountId: z.string().min(1),
});

function revalidateCalendarViews() {
  revalidatePath(CALENDAR_AGENDA_PATH);
  revalidatePath(CALENDAR_SETTINGS_PATH);
}

export async function saveAppleCalendarConnectionAction(
  input: SaveAppleCalendarConnectionInput,
): Promise<CalendarActionResult> {
  const parsed = saveAppleCalendarConnectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revise os dados informados da agenda Apple.",
    };
  }

  if (!hasDatabaseConfig()) {
    const result = await saveDemoAppleCalendarConnection(parsed.data);
    revalidateCalendarViews();
    return result;
  }

  if (!hasSecretEncryptionConfig()) {
    return {
      status: "error",
      message:
        "Defina INTEGRATION_ENCRYPTION_KEY para salvar credenciais da Apple com segurança.",
    };
  }

  try {
    const prisma = getPrismaClient();
    const context = await getCalendarContext(prisma);

    await prisma.integrationAccount.upsert({
      where: {
        provider_userId_externalCalendarId: {
          provider: "APPLE",
          userId: context.actor.userId,
          externalCalendarId: parsed.data.caldavUrl,
        },
      },
      update: {
        calendarName: parsed.data.calendarName,
        providerAccountEmail: parsed.data.appleId,
        accessToken: encryptSecret(parsed.data.appSpecificPassword),
        refreshToken: encryptSecret(parsed.data.appleId),
        isActive: true,
        settings: {
          caldavUrl: parsed.data.caldavUrl,
          authentication: "app-specific-password",
        },
      },
      create: {
        workspaceId: context.workspaceId,
        membershipId: context.actor.id,
        userId: context.actor.userId,
        provider: "APPLE",
        calendarName: parsed.data.calendarName,
        providerAccountEmail: parsed.data.appleId,
        accessToken: encryptSecret(parsed.data.appSpecificPassword),
        refreshToken: encryptSecret(parsed.data.appleId),
        externalCalendarId: parsed.data.caldavUrl,
        settings: {
          caldavUrl: parsed.data.caldavUrl,
          authentication: "app-specific-password",
        },
      },
    });

    revalidateCalendarViews();

    return {
      status: "success",
      message: "Apple Calendar configurado com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to save Apple Calendar connection.", error);

    return {
      status: "error",
      message: "Não foi possível salvar a configuração do Apple Calendar.",
    };
  }
}

export async function disconnectCalendarConnectionAction(
  input: DisconnectCalendarConnectionInput,
): Promise<CalendarActionResult> {
  const parsed = disconnectCalendarConnectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Integração inválida.",
    };
  }

  if (!hasDatabaseConfig()) {
    const result = await disconnectDemoCalendarConnection(parsed.data);
    revalidateCalendarViews();
    return result;
  }

  try {
    const prisma = getPrismaClient();
    const context = await getCalendarContext(prisma);

    await prisma.integrationAccount.updateMany({
      where: {
        id: parsed.data.integrationAccountId,
        workspaceId: context.workspaceId,
      },
      data: {
        isActive: false,
      },
    });

    revalidateCalendarViews();

    return {
      status: "success",
      message: "Integração desconectada com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to disconnect calendar integration.", error);

    return {
      status: "error",
      message: "Não foi possível desconectar a integração.",
    };
  }
}

export async function reactivateCalendarConnectionAction(
  input: ReactivateCalendarConnectionInput,
): Promise<CalendarActionResult> {
  const parsed = reactivateCalendarConnectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Integração inválida.",
    };
  }

  if (!hasDatabaseConfig()) {
    const result = await reactivateDemoCalendarConnection(parsed.data);
    revalidateCalendarViews();
    return result;
  }

  try {
    const prisma = getPrismaClient();
    const context = await getCalendarContext(prisma);

    await prisma.integrationAccount.updateMany({
      where: {
        id: parsed.data.integrationAccountId,
        workspaceId: context.workspaceId,
      },
      data: {
        isActive: true,
      },
    });

    revalidateCalendarViews();

    return {
      status: "success",
      message: "Sincronização reativada com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to reactivate calendar integration.", error);

    return {
      status: "error",
      message: "Não foi possível reativar a sincronização.",
    };
  }
}
