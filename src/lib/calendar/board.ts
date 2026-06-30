import "server-only";

import type { IntegrationProvider } from "@prisma/client";

import { getPrismaClient } from "@/lib/db/prisma";
import { getDemoCalendarSnapshot } from "@/lib/calendar/demo-store";
import { getCalendarContext } from "@/lib/calendar/context";
import { AXE_CALENDAR_ID, CALENDAR_EVENT_TYPE_META, CALENDAR_PROVIDER_META } from "@/lib/calendar/constants";
import { hasDatabaseConfig } from "@/lib/env/server";
import type { AppLocale } from "@/lib/i18n/config";
import { createLogger } from "@/lib/logger";
import { isGoogleOAuthConfigured } from "@/lib/calendar/google";
import { hasSecretEncryptionConfig } from "@/lib/security/secrets";
import type { CalendarConnectionRecord, CalendarSnapshot } from "@/types/calendar";

const logger = createLogger("calendar-board");

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function buildPlaceholderConnection(provider: Exclude<IntegrationProvider, never>): CalendarConnectionRecord {
  return {
    id: `${provider.toLowerCase()}-placeholder`,
    provider,
    label: CALENDAR_PROVIDER_META[provider].label,
    description: CALENDAR_PROVIDER_META[provider].description,
    colorClassName: CALENDAR_PROVIDER_META[provider].colorClassName,
    enabled: false,
    isConnected: false,
  };
}

export async function getCalendarSnapshot(locale: AppLocale): Promise<CalendarSnapshot> {
  if (!hasDatabaseConfig()) {
    return getDemoCalendarSnapshot(locale);
  }

  try {
    const prisma = getPrismaClient();
    const context = await getCalendarContext(prisma);
    const now = new Date();
    const rangeStartDate = addDays(startOfDay(now), -14);
    const rangeEndDate = addDays(startOfDay(now), 45);

    const [integrationAccounts, events, contacts, deals] = await Promise.all([
      prisma.integrationAccount.findMany({
        where: {
          workspaceId: context.workspaceId,
        },
        orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
      }),
      prisma.calendarEvent.findMany({
        where: {
          workspaceId: context.workspaceId,
          startDatetime: {
            gte: rangeStartDate,
            lte: rangeEndDate,
          },
        },
        include: {
          integrationAccount: true,
          contact: true,
          deal: true,
          ownerMembership: true,
        },
        orderBy: [{ startDatetime: "asc" }, { endDatetime: "asc" }],
      }),
      prisma.contact.findMany({
        where: {
          workspaceId: context.workspaceId,
        },
        orderBy: {
          fullName: "asc",
        },
        take: 100,
      }),
      prisma.deal.findMany({
        where: {
          workspaceId: context.workspaceId,
        },
        include: {
          company: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 100,
      }),
    ]);

    const mappedConnections: CalendarConnectionRecord[] = [
      {
        id: AXE_CALENDAR_ID,
        provider: "AXE_CRM",
        label: "Axe CRM",
        description: "Calendário operacional local do workspace.",
        colorClassName: CALENDAR_PROVIDER_META.AXE_CRM.colorClassName,
        enabled: true,
        isConnected: true,
      },
      ...integrationAccounts.map((account) => ({
        id: account.id,
        provider: account.provider,
        label: account.calendarName,
        description: CALENDAR_PROVIDER_META[account.provider].description,
        providerAccountEmail: account.providerAccountEmail,
        colorClassName: CALENDAR_PROVIDER_META[account.provider].colorClassName,
        enabled: account.isActive,
        isConnected: account.isActive,
        externalCalendarId: account.externalCalendarId,
        syncToken: account.syncToken,
        lastSyncedAt: account.updatedAt.toISOString(),
      })),
    ];

    const hasGoogleConnected = mappedConnections.some(
      (connection) => connection.provider === "GOOGLE" && connection.isConnected,
    );
    const hasAppleConnected = mappedConnections.some(
      (connection) => connection.provider === "APPLE" && connection.isConnected,
    );
    const hasGoogleRecord = mappedConnections.some((connection) => connection.provider === "GOOGLE");
    const hasAppleRecord = mappedConnections.some((connection) => connection.provider === "APPLE");

    if (!hasGoogleRecord) {
      mappedConnections.push(buildPlaceholderConnection("GOOGLE"));
    }

    if (!hasAppleRecord) {
      mappedConnections.push(buildPlaceholderConnection("APPLE"));
    }

    return {
      locale,
      canPersistToDatabase: true,
      currentDate: now.toISOString(),
      rangeStart: rangeStartDate.toISOString(),
      rangeEnd: rangeEndDate.toISOString(),
      events: events.map((event) => {
        const provider = event.integrationAccount?.provider ?? "AXE_CRM";
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          startDatetime: event.startDatetime.toISOString(),
          endDatetime: event.endDatetime.toISOString(),
          isAllDay: event.isAllDay,
          eventType: event.eventType,
          sourceCalendarId: event.integrationAccountId ?? AXE_CALENDAR_ID,
          sourceProvider: provider,
          sourceLabel: event.integrationAccount?.calendarName ?? "Axe CRM",
          sourceColorClassName: CALENDAR_PROVIDER_META[provider].colorClassName,
          externalEventId: event.externalEventId,
          lastSyncedAt: event.lastSyncedAt?.toISOString() ?? null,
          contactId: event.contactId,
          contactLabel: event.contact?.fullName ?? null,
          dealId: event.dealId,
          dealLabel: event.deal?.name ?? null,
          ownerId: event.ownerMembershipId,
          ownerName: event.ownerMembership?.fullName ?? context.actor.fullName,
        };
      }),
      visibleCalendars: mappedConnections,
      eventTypes: Object.entries(CALENDAR_EVENT_TYPE_META).map(([id, meta]) => ({
        id: id as keyof typeof CALENDAR_EVENT_TYPE_META,
        label: meta.label,
        colorClassName: meta.colorClassName,
      })),
      contacts: contacts.map((contact) => ({
        id: contact.id,
        label: contact.fullName,
        subtitle: contact.email ?? contact.phone ?? null,
      })),
      deals: deals.map((deal) => ({
        id: deal.id,
        label: deal.name,
        subtitle: deal.company?.name ?? null,
      })),
      integrationState: {
        hasGoogleConnected,
        hasAppleConnected,
        syncPrepared: true,
        webhookPrepared: true,
        googleOAuthConfigured: isGoogleOAuthConfigured(),
        secureCredentialsEnabled: hasSecretEncryptionConfig(),
      },
    };
  } catch (error) {
    logger.error("Failed to load calendar snapshot. Falling back to demo state.", error);
    return getDemoCalendarSnapshot(locale);
  }
}
