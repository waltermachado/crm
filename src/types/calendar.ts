export type CalendarViewMode = "month" | "week" | "day";

export type CalendarProvider = "OSLERNOTES_CRM" | "GOOGLE" | "APPLE";

export type CalendarEventType = "MEETING" | "TASK" | "SCHEDULE" | "PERSONAL";

export type CalendarActionResult = {
  status: "idle" | "success" | "error";
  message: string;
};

export type CalendarConnectionRecord = {
  id: string;
  provider: CalendarProvider;
  label: string;
  description: string;
  providerAccountEmail?: string | null;
  colorClassName: string;
  enabled: boolean;
  isConnected: boolean;
  externalCalendarId?: string | null;
  syncToken?: string | null;
  lastSyncedAt?: string | null;
};

export type CalendarContactOption = {
  id: string;
  label: string;
  subtitle?: string | null;
};

export type CalendarDealOption = {
  id: string;
  label: string;
  subtitle?: string | null;
};

export type CalendarEventRecord = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startDatetime: string;
  endDatetime: string;
  isAllDay: boolean;
  eventType: CalendarEventType;
  sourceCalendarId: string;
  sourceProvider: CalendarProvider;
  sourceLabel: string;
  sourceColorClassName: string;
  externalEventId?: string | null;
  lastSyncedAt?: string | null;
  contactId?: string | null;
  contactLabel?: string | null;
  dealId?: string | null;
  dealLabel?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
};

export type CalendarSnapshot = {
  locale: "pt-BR" | "en-US";
  canPersistToDatabase: boolean;
  currentDate: string;
  rangeStart: string;
  rangeEnd: string;
  events: CalendarEventRecord[];
  visibleCalendars: CalendarConnectionRecord[];
  eventTypes: Array<{
    id: CalendarEventType;
    label: string;
    colorClassName: string;
  }>;
  contacts: CalendarContactOption[];
  deals: CalendarDealOption[];
  integrationState: {
    hasGoogleConnected: boolean;
    hasAppleConnected: boolean;
    syncPrepared: boolean;
    webhookPrepared: boolean;
    googleOAuthConfigured: boolean;
    secureCredentialsEnabled: boolean;
  };
};

export type CreateCalendarEventInput = {
  title: string;
  description?: string;
  location?: string;
  startDatetime: string;
  endDatetime: string;
  isAllDay: boolean;
  eventType: CalendarEventType;
  sourceCalendarId?: string;
  contactId?: string;
  dealId?: string;
};

export type UpdateCalendarEventInput = CreateCalendarEventInput & {
  eventId: string;
};

export type DeleteCalendarEventInput = {
  eventId: string;
};

export type CalendarWebhookPayload = {
  provider: CalendarProvider;
  externalEventId?: string;
  externalCalendarId?: string;
  action?: "created" | "updated" | "deleted" | "sync";
  resourceState?: string;
  event?: {
    title?: string;
    description?: string | null;
    location?: string | null;
    startDatetime?: string;
    endDatetime?: string;
    isAllDay?: boolean;
    eventType?: CalendarEventType;
  };
};

export type SaveAppleCalendarConnectionInput = {
  calendarName: string;
  appleId: string;
  appSpecificPassword: string;
  caldavUrl: string;
};

export type DisconnectCalendarConnectionInput = {
  integrationAccountId: string;
};

export type ReactivateCalendarConnectionInput = {
  integrationAccountId: string;
};
