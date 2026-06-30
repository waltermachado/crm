import type { CalendarEventType, CalendarProvider } from "@/types/calendar";

export const AXE_CALENDAR_ID = "axe-crm";

export const CALENDAR_PROVIDER_META: Record<
  CalendarProvider,
  { label: string; colorClassName: string; description: string }
> = {
  AXE_CRM: {
    label: "Axe CRM",
    colorClassName: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-200",
    description: "Calendário operacional nativo do CRM.",
  },
  GOOGLE: {
    label: "Google Calendar",
    colorClassName: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-200",
    description: "Sincronização bidirecional preparada via OAuth2, Watch e Sync Tokens.",
  },
  APPLE: {
    label: "Apple Calendar",
    colorClassName: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-200",
    description: "Integração preparada para CalDAV e credenciais app-specific.",
  },
};

export const CALENDAR_EVENT_TYPE_META: Record<
  CalendarEventType,
  { label: string; colorClassName: string }
> = {
  MEETING: {
    label: "Reunião",
    colorClassName: "bg-sky-500/12 text-sky-700 ring-sky-500/20 dark:text-sky-200",
  },
  TASK: {
    label: "Tarefa",
    colorClassName: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-200",
  },
  SCHEDULE: {
    label: "Escala de Plantão",
    colorClassName: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-200",
  },
  PERSONAL: {
    label: "Pessoal",
    colorClassName: "bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:text-rose-200",
  },
};
