import "server-only";

import type { AppLocale } from "@/lib/i18n/config";
import { AXE_CALENDAR_ID, CALENDAR_EVENT_TYPE_META } from "@/lib/calendar/constants";
import type {
  CalendarActionResult,
  CalendarConnectionRecord,
  CalendarDealOption,
  CalendarEventRecord,
  CalendarSnapshot,
  CreateCalendarEventInput,
  DeleteCalendarEventInput,
  DisconnectCalendarConnectionInput,
  ReactivateCalendarConnectionInput,
  SaveAppleCalendarConnectionInput,
  UpdateCalendarEventInput,
} from "@/types/calendar";

type DemoCalendarState = {
  connections: CalendarConnectionRecord[];
  contacts: CalendarSnapshot["contacts"];
  deals: CalendarDealOption[];
  events: CalendarEventRecord[];
};

declare global {
  var __axeDemoCalendarState__: DemoCalendarState | undefined;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function setTime(date: Date, hours: number, minutes = 0) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function createInitialDemoState(): DemoCalendarState {
  const today = startOfDay(new Date());

  return {
    connections: [
      {
        id: AXE_CALENDAR_ID,
        provider: "AXE_CRM",
        label: "Axe CRM",
        description: "Calendário operacional local do workspace.",
        colorClassName: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-200",
        enabled: true,
        isConnected: true,
      },
      {
        id: "google-primary",
        provider: "GOOGLE",
        label: "Google Calendar",
        description: "Sincronização preparada com watch channel e sync token.",
        providerAccountEmail: "walter@axedemo.com",
        colorClassName:
          "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-200",
        enabled: true,
        isConnected: true,
        externalCalendarId: "primary",
        syncToken: "demo-google-sync-token",
        lastSyncedAt: new Date().toISOString(),
      },
      {
        id: "apple-team",
        provider: "APPLE",
        label: "Apple Calendar",
        description: "Conexão preparada para calendário pessoal e escalas.",
        providerAccountEmail: "walter@icloud.com",
        colorClassName:
          "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-200",
        enabled: true,
        isConnected: true,
        externalCalendarId: "https://caldav.icloud.com/team",
        syncToken: "demo-apple-sync-token",
        lastSyncedAt: new Date().toISOString(),
      },
    ],
    contacts: [
      { id: "contact-camila", label: "Camila Azevedo", subtitle: "Atlas Freight" },
      { id: "contact-marina", label: "Marina Lopes", subtitle: "Granite Bio" },
      { id: "contact-luana", label: "Luana Ferraz", subtitle: "Harbor Systems" },
    ],
    deals: [
      { id: "deal-demo-1", label: "Reativação da Conta Atlas", subtitle: "Atlas Freight" },
      { id: "deal-demo-5", label: "Renovação com Upsell Global", subtitle: "Granite Bio" },
      { id: "deal-demo-4", label: "Suite Comercial Enterprise", subtitle: "Harbor Systems" },
    ],
    events: [
      {
        id: "calendar-demo-1",
        title: "Kickoff de expansão Atlas",
        description: "Definir marcos comerciais, stakeholders e próximos passos do onboarding.",
        location: "Sala Nexus · 12º andar",
        startDatetime: setTime(addDays(today, 1), 9, 0).toISOString(),
        endDatetime: setTime(addDays(today, 1), 10, 0).toISOString(),
        isAllDay: false,
        eventType: "MEETING",
        sourceCalendarId: AXE_CALENDAR_ID,
        sourceProvider: "AXE_CRM",
        sourceLabel: "Axe CRM",
        sourceColorClassName: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-200",
        dealId: "deal-demo-1",
        dealLabel: "Reativação da Conta Atlas",
        contactId: "contact-camila",
        contactLabel: "Camila Azevedo",
        ownerId: "demo-owner-1",
        ownerName: "Walter Machado",
      },
      {
        id: "calendar-demo-2",
        title: "Follow-up com Granite Bio",
        description: "Revisar contraproposta antes da rodada final de negociação.",
        location: "Google Meet",
        startDatetime: setTime(addDays(today, 2), 14, 0).toISOString(),
        endDatetime: setTime(addDays(today, 2), 15, 0).toISOString(),
        isAllDay: false,
        eventType: "TASK",
        sourceCalendarId: "google-primary",
        sourceProvider: "GOOGLE",
        sourceLabel: "Google Calendar",
        sourceColorClassName:
          "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-200",
        externalEventId: "google-event-2001",
        lastSyncedAt: new Date().toISOString(),
        dealId: "deal-demo-5",
        dealLabel: "Renovação com Upsell Global",
        contactId: "contact-marina",
        contactLabel: "Marina Lopes",
        ownerId: "demo-owner-1",
        ownerName: "Walter Machado",
      },
      {
        id: "calendar-demo-3",
        title: "Plantão comercial regional",
        description: "Escala da operação de sábado com time de contingência.",
        location: "Cobertura nacional",
        startDatetime: setTime(addDays(today, 4), 8, 0).toISOString(),
        endDatetime: setTime(addDays(today, 4), 18, 0).toISOString(),
        isAllDay: false,
        eventType: "SCHEDULE",
        sourceCalendarId: "apple-team",
        sourceProvider: "APPLE",
        sourceLabel: "Apple Calendar",
        sourceColorClassName:
          "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-200",
        externalEventId: "apple-event-3101",
        lastSyncedAt: new Date().toISOString(),
        ownerId: "demo-owner-1",
        ownerName: "Walter Machado",
      },
      {
        id: "calendar-demo-4",
        title: "Consulta pessoal",
        description: "Compromisso particular bloqueando a agenda.",
        location: "Clínica Vila Nova",
        startDatetime: setTime(addDays(today, 6), 11, 30).toISOString(),
        endDatetime: setTime(addDays(today, 6), 12, 30).toISOString(),
        isAllDay: false,
        eventType: "PERSONAL",
        sourceCalendarId: AXE_CALENDAR_ID,
        sourceProvider: "AXE_CRM",
        sourceLabel: "Axe CRM",
        sourceColorClassName: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-200",
        ownerId: "demo-owner-1",
        ownerName: "Walter Machado",
      },
      {
        id: "calendar-demo-5",
        title: "Offsite da equipe executiva",
        description: "Dia reservado para estratégia sem reuniões externas.",
        location: "Fazenda Boa Vista",
        startDatetime: addDays(today, 9).toISOString(),
        endDatetime: addDays(today, 10).toISOString(),
        isAllDay: true,
        eventType: "MEETING",
        sourceCalendarId: AXE_CALENDAR_ID,
        sourceProvider: "AXE_CRM",
        sourceLabel: "Axe CRM",
        sourceColorClassName: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-200",
        ownerId: "demo-owner-1",
        ownerName: "Walter Machado",
      },
    ],
  };
}

function getState() {
  if (!globalThis.__axeDemoCalendarState__) {
    globalThis.__axeDemoCalendarState__ = createInitialDemoState();
  }

  return globalThis.__axeDemoCalendarState__;
}

function normalizeSourceCalendar(
  sourceCalendarId: string | undefined,
  state: DemoCalendarState,
) {
  return (
    state.connections.find((connection) => connection.id === sourceCalendarId) ??
    state.connections[0]
  );
}

export async function getDemoCalendarSnapshot(locale: AppLocale): Promise<CalendarSnapshot> {
  const state = getState();
  const now = new Date();
  const rangeStart = addDays(startOfDay(now), -14).toISOString();
  const rangeEnd = addDays(startOfDay(now), 45).toISOString();
  const hasGoogleConnected = state.connections.some(
    (connection) => connection.provider === "GOOGLE" && connection.isConnected,
  );
  const hasAppleConnected = state.connections.some(
    (connection) => connection.provider === "APPLE" && connection.isConnected,
  );

  return {
    locale,
    canPersistToDatabase: false,
    currentDate: now.toISOString(),
    rangeStart,
    rangeEnd,
    events: [...state.events].sort(
      (left, right) =>
        new Date(left.startDatetime).getTime() - new Date(right.startDatetime).getTime(),
    ),
    visibleCalendars: state.connections,
    eventTypes: Object.entries(CALENDAR_EVENT_TYPE_META).map(([id, meta]) => ({
      id: id as keyof typeof CALENDAR_EVENT_TYPE_META,
      label: meta.label,
      colorClassName: meta.colorClassName,
    })),
    contacts: state.contacts,
    deals: state.deals,
    integrationState: {
      hasGoogleConnected,
      hasAppleConnected,
      syncPrepared: true,
      webhookPrepared: true,
      googleOAuthConfigured: true,
      secureCredentialsEnabled: true,
    },
  };
}

export async function createDemoCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<CalendarActionResult> {
  const state = getState();
  const source = normalizeSourceCalendar(input.sourceCalendarId, state);

  state.events.unshift({
    id: `calendar-demo-${Date.now()}`,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    startDatetime: input.startDatetime,
    endDatetime: input.endDatetime,
    isAllDay: input.isAllDay,
    eventType: input.eventType,
    sourceCalendarId: source.id,
    sourceProvider: source.provider,
    sourceLabel: source.label,
    sourceColorClassName: source.colorClassName,
    contactId: input.contactId ?? null,
    contactLabel: state.contacts.find((contact) => contact.id === input.contactId)?.label ?? null,
    dealId: input.dealId ?? null,
    dealLabel: state.deals.find((deal) => deal.id === input.dealId)?.label ?? null,
    lastSyncedAt: source.provider === "AXE_CRM" ? null : new Date().toISOString(),
    externalEventId:
      source.provider === "AXE_CRM" ? null : `${source.provider.toLowerCase()}-${Date.now()}`,
    ownerId: "demo-owner-1",
    ownerName: "Walter Machado",
  });

  return {
    status: "success",
    message: "Evento criado com sucesso.",
  };
}

export async function updateDemoCalendarEvent(
  input: UpdateCalendarEventInput,
): Promise<CalendarActionResult> {
  const state = getState();
  const currentIndex = state.events.findIndex((event) => event.id === input.eventId);

  if (currentIndex === -1) {
    return {
      status: "error",
      message: "Evento não encontrado.",
    };
  }

  const source = normalizeSourceCalendar(input.sourceCalendarId, state);
  const current = state.events[currentIndex];

  state.events[currentIndex] = {
    ...current,
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    startDatetime: input.startDatetime,
    endDatetime: input.endDatetime,
    isAllDay: input.isAllDay,
    eventType: input.eventType,
    sourceCalendarId: source.id,
    sourceProvider: source.provider,
    sourceLabel: source.label,
    sourceColorClassName: source.colorClassName,
    contactId: input.contactId ?? null,
    contactLabel: state.contacts.find((contact) => contact.id === input.contactId)?.label ?? null,
    dealId: input.dealId ?? null,
    dealLabel: state.deals.find((deal) => deal.id === input.dealId)?.label ?? null,
    lastSyncedAt: source.provider === "AXE_CRM" ? current.lastSyncedAt : new Date().toISOString(),
  };

  return {
    status: "success",
    message: "Evento atualizado com sucesso.",
  };
}

export async function deleteDemoCalendarEvent(
  input: DeleteCalendarEventInput,
): Promise<CalendarActionResult> {
  const state = getState();
  const exists = state.events.some((event) => event.id === input.eventId);

  if (!exists) {
    return {
      status: "error",
      message: "Evento não encontrado.",
    };
  }

  state.events = state.events.filter((event) => event.id !== input.eventId);

  return {
    status: "success",
    message: "Evento removido com sucesso.",
  };
}

export async function saveDemoAppleCalendarConnection(
  input: SaveAppleCalendarConnectionInput,
): Promise<CalendarActionResult> {
  const state = getState();
  const existingIndex = state.connections.findIndex((connection) => connection.provider === "APPLE");
  const nextConnection: CalendarConnectionRecord = {
    id: existingIndex >= 0 ? state.connections[existingIndex].id : "apple-team",
    provider: "APPLE",
    label: input.calendarName,
    description: "Conexão preparada para calendário pessoal e escalas.",
    providerAccountEmail: input.appleId,
    colorClassName: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-200",
    enabled: true,
    isConnected: true,
    externalCalendarId: input.caldavUrl,
    syncToken: "demo-apple-sync-token",
    lastSyncedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    state.connections[existingIndex] = nextConnection;
  } else {
    state.connections.push(nextConnection);
  }

  return {
    status: "success",
    message: "Apple Calendar configurado com sucesso.",
  };
}

export async function disconnectDemoCalendarConnection(
  input: DisconnectCalendarConnectionInput,
): Promise<CalendarActionResult> {
  const state = getState();
  const connection = state.connections.find((item) => item.id === input.integrationAccountId);

  if (!connection) {
    return {
      status: "error",
      message: "Integração não encontrada.",
    };
  }

  connection.enabled = false;
  connection.isConnected = false;

  return {
    status: "success",
    message: "Integração desconectada com sucesso.",
  };
}

export async function reactivateDemoCalendarConnection(
  input: ReactivateCalendarConnectionInput,
): Promise<CalendarActionResult> {
  const state = getState();
  const connection = state.connections.find((item) => item.id === input.integrationAccountId);

  if (!connection) {
    return {
      status: "error",
      message: "Integração não encontrada.",
    };
  }

  connection.enabled = true;
  connection.isConnected = true;
  connection.lastSyncedAt = new Date().toISOString();

  return {
    status: "success",
    message: "Sincronização reativada com sucesso.",
  };
}
