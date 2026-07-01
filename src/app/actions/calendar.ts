"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAdmin } from "@/lib/db/supabase";
import { getCalendarContext } from "@/lib/calendar/context";
import { OSLERNOTES_CALENDAR_ID } from "@/lib/calendar/constants";
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
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  sourceCalendarId?: string,
) {
  if (!sourceCalendarId || sourceCalendarId === OSLERNOTES_CALENDAR_ID) {
    return null;
  }

  const { data: integrationAccount } = await supabase
    .from("IntegrationAccount")
    .select("id")
    .eq("id", sourceCalendarId)
    .eq("workspaceId", workspaceId)
    .eq("isActive", true)
    .maybeSingle();

  return integrationAccount?.id ?? null;
}

export async function createEventAction(
  input: CreateCalendarEventInput,
): Promise<CalendarActionResult> {
  const parsed = createEventSchema.parse(input);

  if (!hasDatabaseConfig()) {
    return {
      status: "error",
      message: "Database config is missing.",
    };
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);
    const integrationAccountId = await resolveIntegrationAccountId(
      supabase,
      context.workspaceId,
      parsed.sourceCalendarId,
    );

    const { data: event, error } = await supabase.from("CalendarEvent").insert({
      id: crypto.randomUUID(),
      workspaceId: context.workspaceId,
      ownerMembershipId: context.actor.id,
      integrationAccountId,
      userId: context.actor.userId,
      contactId: parsed.contactId || null,
      dealId: parsed.dealId || null,
      title: parsed.title,
      description: parsed.description ?? null,
      location: parsed.location ?? null,
      startDatetime: new Date(parsed.startDatetime).toISOString(),
      endDatetime: new Date(parsed.endDatetime).toISOString(),
      isAllDay: parsed.isAllDay,
      eventType: parsed.eventType,
      updatedAt: new Date().toISOString()
    }).select().single();

    if (error) throw error;

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
    return {
      status: "error",
      message: "Database config is missing.",
    };
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);
    const integrationAccountId = await resolveIntegrationAccountId(
      supabase,
      context.workspaceId,
      parsed.sourceCalendarId,
    );

    const { data: existing } = await supabase
      .from("CalendarEvent")
      .select("id")
      .eq("id", parsed.eventId)
      .eq("workspaceId", context.workspaceId)
      .maybeSingle();

    if (!existing) {
      throw new Error("Calendar event not found.");
    }

    const { data: event, error } = await supabase.from("CalendarEvent").update({
      integrationAccountId,
      contactId: parsed.contactId || null,
      dealId: parsed.dealId || null,
      title: parsed.title,
      description: parsed.description ?? null,
      location: parsed.location ?? null,
      startDatetime: new Date(parsed.startDatetime).toISOString(),
      endDatetime: new Date(parsed.endDatetime).toISOString(),
      isAllDay: parsed.isAllDay,
      eventType: parsed.eventType,
      updatedAt: new Date().toISOString()
    }).eq("id", parsed.eventId).select().single();

    if (error) throw error;

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
    return {
      status: "error",
      message: "Database config is missing.",
    };
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);
    const { data: existing } = await supabase
      .from("CalendarEvent")
      .select("id")
      .eq("id", parsed.eventId)
      .eq("workspaceId", context.workspaceId)
      .maybeSingle();

    if (!existing) {
      throw new Error("Calendar event not found.");
    }

    await dispatchCalendarSyncJob({
      eventId: existing.id,
      operation: "delete",
    });

    await supabase.from("CalendarEvent").delete().eq("id", existing.id);

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
    return {
      status: "error",
      message: "Database config is missing.",
    };
  }

  if (!hasSecretEncryptionConfig()) {
    return {
      status: "error",
      message:
        "Defina INTEGRATION_ENCRYPTION_KEY para salvar credenciais da Apple com segurança.",
    };
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);

    const { data: existing } = await supabase.from("IntegrationAccount").select("id").eq("provider", "APPLE").eq("userId", context.actor.userId).eq("externalCalendarId", parsed.data.caldavUrl).maybeSingle();

    if (existing) {
      await supabase.from("IntegrationAccount").update({
        calendarName: parsed.data.calendarName,
        providerAccountEmail: parsed.data.appleId,
        accessToken: encryptSecret(parsed.data.appSpecificPassword),
        refreshToken: encryptSecret(parsed.data.appleId),
        isActive: true,
        settings: {
          caldavUrl: parsed.data.caldavUrl,
          authentication: "app-specific-password",
        },
        updatedAt: new Date().toISOString()
      }).eq("id", existing.id);
    } else {
      await supabase.from("IntegrationAccount").insert({
        id: crypto.randomUUID(),
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
        updatedAt: new Date().toISOString()
      });
    }

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
    return {
      status: "error",
      message: "Database config is missing.",
    };
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);

    await supabase.from("IntegrationAccount").update({
      isActive: false,
      updatedAt: new Date().toISOString()
    }).eq("id", parsed.data.integrationAccountId).eq("workspaceId", context.workspaceId);

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
    return {
      status: "error",
      message: "Database config is missing.",
    };
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);

    await supabase.from("IntegrationAccount").update({
      isActive: true,
      updatedAt: new Date().toISOString()
    }).eq("id", parsed.data.integrationAccountId).eq("workspaceId", context.workspaceId);

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
