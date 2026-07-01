import "server-only";

import type { Database } from "@/types/database";
type IntegrationProvider = Database["public"]["Enums"]["IntegrationProvider"];

import { supabaseAdmin } from "@/lib/db/supabase";
import { getCalendarContext } from "@/lib/calendar/context";
import { OSLERNOTES_CALENDAR_ID, CALENDAR_EVENT_TYPE_META, CALENDAR_PROVIDER_META } from "@/lib/calendar/constants";
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
    throw new Error("Database configuration is missing.");
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);
    const now = new Date();
    const rangeStartDate = addDays(startOfDay(now), -14);
    const rangeEndDate = addDays(startOfDay(now), 45);

    const [{ data: integrationAccountsData }, { data: eventsData }, { data: contactsData }, { data: dealsData }] = await Promise.all([
      supabase
        .from("IntegrationAccount")
        .select("*")
        .eq("workspaceId", context.workspaceId)
        .order("provider", { ascending: true })
        .order("createdAt", { ascending: true }),
      supabase
        .from("CalendarEvent")
        .select("*, integrationAccount:IntegrationAccount(*), contact:Contact(*), deal:Deal(*), ownerMembership:Membership(*)")
        .eq("workspaceId", context.workspaceId)
        .gte("startDatetime", rangeStartDate.toISOString())
        .lte("startDatetime", rangeEndDate.toISOString())
        .order("startDatetime", { ascending: true })
        .order("endDatetime", { ascending: true }),
      supabase
        .from("Contact")
        .select("*")
        .eq("workspaceId", context.workspaceId)
        .order("fullName", { ascending: true })
        .limit(100),
      supabase
        .from("Deal")
        .select("*, company:Company(*)")
        .eq("workspaceId", context.workspaceId)
        .order("updatedAt", { ascending: false })
        .limit(100),
    ]);
    
    const integrationAccounts = integrationAccountsData || [];
    const events = eventsData || [];
    const contacts = contactsData || [];
    const deals = dealsData || [];

    const mappedConnections: CalendarConnectionRecord[] = [
      {
        id: OSLERNOTES_CALENDAR_ID,
        provider: "OSLERNOTES_CRM",
        label: "OslerNotes CRM",
        description: "Calendário operacional local do workspace.",
        colorClassName: CALENDAR_PROVIDER_META.OSLERNOTES_CRM.colorClassName,
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
        lastSyncedAt: account.updatedAt,
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
        const provider = event.integrationAccount?.provider ?? "OSLERNOTES_CRM";
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          startDatetime: event.startDatetime,
          endDatetime: event.endDatetime,
          isAllDay: event.isAllDay,
          eventType: event.eventType,
          sourceCalendarId: event.integrationAccountId ?? OSLERNOTES_CALENDAR_ID,
          sourceProvider: provider,
          sourceLabel: event.integrationAccount?.calendarName ?? "OslerNotes CRM",
          sourceColorClassName: CALENDAR_PROVIDER_META[provider].colorClassName,
          externalEventId: event.externalEventId,
          lastSyncedAt: event.lastSyncedAt ?? null,
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
    logger.error("Failed to load calendar snapshot.", error);
    throw error;
  }
}
