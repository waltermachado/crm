"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Link2,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";

import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/app/actions/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CALENDAR_SETTINGS_PATH } from "@/lib/calendar/routes";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type {
  CalendarConnectionRecord,
  CalendarEventRecord,
  CalendarSnapshot,
  CalendarViewMode,
} from "@/types/calendar";

type DraftSelection = {
  start: Date;
  end: Date;
  isAllDay: boolean;
};

type EventFormValues = {
  title: string;
  description: string;
  location: string;
  eventType: "MEETING" | "TASK" | "SCHEDULE" | "PERSONAL";
  sourceCalendarId: string;
  contactId: string;
  dealId: string;
  isAllDay: boolean;
  startDatetime: string;
  endDatetime: string;
  startDate: string;
  endDate: string;
};

const inputClassName =
  "flex h-11 w-full rounded-2xl border border-border/70 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";

const textareaClassName =
  "flex w-full rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const normalized = startOfDay(date);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(normalized, diff);
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function clampDateToMonthGrid(date: Date) {
  const first = startOfMonth(date);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  return addDays(first, -offset);
}

function buildMonthGrid(date: Date) {
  const days: Date[] = [];
  let cursor = clampDateToMonthGrid(date);

  for (let index = 0; index < 42; index += 1) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDatetimeLocal(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromLocalInput(value: string) {
  return new Date(value);
}

function buildDraft(date: Date, hour = 9): DraftSelection {
  const start = new Date(date);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return {
    start,
    end,
    isAllDay: false,
  };
}

function buildAllDayDraft(date: Date): DraftSelection {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setHours(23, 59, 0, 0);
  return {
    start,
    end,
    isAllDay: true,
  };
}

function buildInitialValues(
  event: CalendarEventRecord | null,
  draft: DraftSelection | null,
  connections: CalendarConnectionRecord[],
): EventFormValues {
  const defaultSource = connections.find((connection) => connection.enabled)?.id ?? "axe-crm";
  const start = event ? new Date(event.startDatetime) : draft?.start ?? new Date();
  const end =
    event ? new Date(event.endDatetime) : draft?.end ?? new Date(Date.now() + 1000 * 60 * 60);
  const isAllDay = event?.isAllDay ?? draft?.isAllDay ?? false;

  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    location: event?.location ?? "",
    eventType: event?.eventType ?? "MEETING",
    sourceCalendarId: event?.sourceCalendarId ?? defaultSource,
    contactId: event?.contactId ?? "",
    dealId: event?.dealId ?? "",
    isAllDay,
    startDatetime: toDatetimeLocal(start),
    endDatetime: toDatetimeLocal(end),
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
}

function formatRangeLabel(view: CalendarViewMode, date: Date, locale: string) {
  if (view === "month") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  if (view === "week") {
    const first = startOfWeek(date);
    const last = endOfWeek(date);
    const sameMonth = first.getMonth() === last.getMonth();
    const firstLabel = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: sameMonth ? undefined : "short",
    }).format(first);
    const lastLabel = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(last);
    return `${firstLabel} – ${lastLabel}`;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function eventIntersectsDay(event: CalendarEventRecord, date: Date) {
  const start = new Date(event.startDatetime);
  const end = new Date(event.endDatetime);
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return start < dayEnd && end >= dayStart;
}

function getMinutesIntoDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatHour(hour: number) {
  return `${`${hour}`.padStart(2, "0")}:00`;
}

export function CalendarBoard({ snapshot }: { snapshot: CalendarSnapshot }) {
  const router = useRouter();
  const { locale } = useI18n();
  const [view, setView] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date(snapshot.currentDate));
  const [selectedEventTypes, setSelectedEventTypes] = useState(
    snapshot.eventTypes.map((type) => type.id),
  );
  const [selectedCalendars, setSelectedCalendars] = useState(
    snapshot.visibleCalendars.filter((calendar) => calendar.enabled).map((calendar) => calendar.id),
  );
  const [createDraft, setCreateDraft] = useState<DraftSelection | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const copy = locale === "pt-BR"
    ? {
        badge: "Agenda conectada",
        title: "Agenda e calendário operacional",
        description:
          "Gerencie tarefas, reuniões e escalas em uma superfície única, preparada para sync bidirecional com Google Calendar e Apple Calendar.",
        addEvent: "Novo evento",
        month: "Mês",
        week: "Semana",
        day: "Dia",
        today: "Hoje",
        miniCalendar: "Mini calendário",
        eventTypes: "Tipos de evento",
        calendars: "Calendários conectados",
        integrations: "Gerenciamento de agendas",
        integrationsDescription:
          "Acesse Configurações > Calendário para conectar provedores, editar credenciais e retomar sincronizações suspensas.",
        manageIntegrations: "Abrir configurações de calendário",
        createTitle: "Criar evento",
        createDescription: "Preencha os dados do compromisso sem sair da agenda.",
        editTitle: "Detalhes do evento",
        editDescription: "Atualize os dados e vínculos com contatos, negócios e calendário externo.",
        titleLabel: "Título",
        descriptionLabel: "Descrição",
        locationLabel: "Local",
        calendarLabel: "Calendário",
        typeLabel: "Tipo",
        contactLabel: "Contato",
        dealLabel: "Negócio",
        allDayLabel: "Dia inteiro",
        startLabel: "Início",
        endLabel: "Fim",
        startDateLabel: "Data inicial",
        endDateLabel: "Data final",
        cancel: "Cancelar",
        createSubmit: "Criar evento",
        updateSubmit: "Salvar evento",
        deleting: "Excluindo...",
        delete: "Excluir evento",
        saving: "Salvando...",
        emptyMonth: "Clique no dia para criar um novo compromisso.",
        emptyDay: "Sem eventos visíveis neste recorte.",
        noContact: "Sem contato vinculado",
        noDeal: "Sem negócio vinculado",
        noFilters: "Ajuste os filtros para visualizar mais eventos.",
        connectBadgeReady: "Pronto para sync",
        connectBadgePending: "Aguardando conexão",
        noEvents: "Nenhum evento visível",
        allDayStrip: "Dia inteiro",
        owner: "Responsável",
        syncReady: "Webhooks e sync tokens preparados",
      }
    : {
        badge: "Connected calendar",
        title: "Agenda and operational calendar",
        description:
          "Manage tasks, meetings, and schedules in one surface prepared for bidirectional sync with Google Calendar and Apple Calendar.",
        addEvent: "New event",
        month: "Month",
        week: "Week",
        day: "Day",
        today: "Today",
        miniCalendar: "Mini calendar",
        eventTypes: "Event types",
        calendars: "Connected calendars",
        integrations: "Calendar management",
        integrationsDescription:
          "Open Settings > Calendar to connect providers, edit credentials, and restore paused synchronizations.",
        manageIntegrations: "Open calendar settings",
        createTitle: "Create event",
        createDescription: "Fill in the appointment details without leaving the calendar.",
        editTitle: "Event details",
        editDescription: "Update links to contacts, deals, and the external calendar.",
        titleLabel: "Title",
        descriptionLabel: "Description",
        locationLabel: "Location",
        calendarLabel: "Calendar",
        typeLabel: "Type",
        contactLabel: "Contact",
        dealLabel: "Deal",
        allDayLabel: "All day",
        startLabel: "Start",
        endLabel: "End",
        startDateLabel: "Start date",
        endDateLabel: "End date",
        cancel: "Cancel",
        createSubmit: "Create event",
        updateSubmit: "Save event",
        deleting: "Deleting...",
        delete: "Delete event",
        saving: "Saving...",
        emptyMonth: "Click a day to create a new event.",
        emptyDay: "No visible events in this range.",
        noContact: "No linked contact",
        noDeal: "No linked deal",
        noFilters: "Adjust the filters to reveal more events.",
        connectBadgeReady: "Sync ready",
        connectBadgePending: "Pending connection",
        noEvents: "No visible events",
        allDayStrip: "All day",
        owner: "Owner",
        syncReady: "Webhooks and sync tokens prepared",
      };

  const visibleEvents = useMemo(() => {
    return snapshot.events.filter(
      (event) =>
        selectedEventTypes.includes(event.eventType) &&
        selectedCalendars.includes(event.sourceCalendarId),
    );
  }, [selectedCalendars, selectedEventTypes, snapshot.events]);

  const monthDays = useMemo(() => buildMonthGrid(currentDate), [currentDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(currentDate), index)),
    [currentDate],
  );
  const dayEvents = useMemo(
    () => visibleEvents.filter((event) => eventIntersectsDay(event, currentDate)),
    [currentDate, visibleEvents],
  );
  const connectedExternalCalendars = useMemo(
    () =>
      snapshot.visibleCalendars.filter(
        (calendar) => calendar.provider !== "AXE_CRM" && calendar.isConnected,
      ),
    [snapshot.visibleCalendars],
  );

  function toggleSelection<T extends string>(currentValues: T[], value: T): T[] {
    return currentValues.includes(value)
      ? currentValues.filter((current) => current !== value)
      : [...currentValues, value];
  }

  function shiftPeriod(direction: 1 | -1) {
    if (view === "month") {
      setCurrentDate((value) => addMonths(value, direction));
      return;
    }

    if (view === "week") {
      setCurrentDate((value) => addDays(value, direction * 7));
      return;
    }

    setCurrentDate((value) => addDays(value, direction));
  }

  function jumpToToday() {
    setCurrentDate(new Date());
  }

  function openCreateModal(draft: DraftSelection) {
    setCreateDraft(draft);
    setEditingEvent(null);
    setStatusMessage("");
  }

  function openEventSheet(event: CalendarEventRecord) {
    setEditingEvent(event);
    setCreateDraft(null);
    setStatusMessage("");
  }

  useEffect(() => {
    if (!editingEvent) {
      return;
    }

    const refreshed = snapshot.events.find((event) => event.id === editingEvent.id) ?? null;
    setEditingEvent(refreshed);
  }, [editingEvent, snapshot.events]);

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge className="w-fit rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                {copy.badge}
              </Badge>
              <div className="space-y-2">
                <CardTitle className="text-3xl tracking-tight">{copy.title}</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-6 text-foreground/75">
                  {copy.description}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={jumpToToday}>
                {copy.today}
              </Button>
              <Button onClick={() => openCreateModal(buildDraft(currentDate))}>
                <Plus className="size-4" />
                {copy.addEvent}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground"
        >
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle>{copy.miniCalendar}</CardTitle>
              <CardDescription>{copy.noFilters}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MiniCalendar
                locale={locale}
                currentDate={currentDate}
                selectedDate={currentDate}
                onSelectDate={setCurrentDate}
              />
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle>{copy.eventTypes}</CardTitle>
              <CardDescription>{copy.noFilters}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.eventTypes.map((eventType) => {
                const checked = selectedEventTypes.includes(eventType.id);
                return (
                  <label
                    key={eventType.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3"
                  >
                    <span className="inline-flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedEventTypes((current) =>
                            toggleSelection(current, eventType.id),
                          )
                        }
                      />
                      <span className="text-sm font-medium">{eventType.label}</span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-1 text-[11px] ring-1",
                        eventType.colorClassName,
                      )}
                    >
                      {eventType.id}
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle>{copy.calendars}</CardTitle>
              <CardDescription>{copy.syncReady}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.visibleCalendars.map((calendar) => {
                const checked = selectedCalendars.includes(calendar.id);
                return (
                  <label
                    key={calendar.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3",
                      !calendar.isConnected && "opacity-65",
                    )}
                  >
                    <span className="space-y-1">
                      <span className="inline-flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!calendar.enabled}
                          onChange={() =>
                            setSelectedCalendars((current) =>
                              toggleSelection(current, calendar.id),
                            )
                          }
                        />
                        <span className="text-sm font-medium">{calendar.label}</span>
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {calendar.description}
                      </span>
                    </span>
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-0.5 ring-1",
                        calendar.colorClassName,
                      )}
                    >
                      {calendar.isConnected ? copy.connectBadgeReady : copy.connectBadgePending}
                    </Badge>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle>{copy.integrations}</CardTitle>
              <CardDescription>{copy.integrationsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {connectedExternalCalendars.length > 0
                    ? connectedExternalCalendars
                        .map((calendar) => `${calendar.label} (${calendar.provider})`)
                        .join(" · ")
                    : copy.connectBadgePending}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{copy.syncReady}</p>
              </div>

              <Link href={CALENDAR_SETTINGS_PATH} className="block">
                <Button className="w-full" variant="outline">
                  {copy.manageIntegrations}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => shiftPeriod(-1)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => shiftPeriod(1)}>
                    <ChevronRight className="size-4" />
                  </Button>
                  <div className="ml-2">
                    <CardTitle className="text-2xl capitalize tracking-tight">
                      {formatRangeLabel(view, currentDate, locale)}
                    </CardTitle>
                    <CardDescription>{copy.syncReady}</CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {([
                    ["month", copy.month, CalendarDays],
                    ["week", copy.week, CalendarRange],
                    ["day", copy.day, Clock3],
                  ] as const).map(([nextView, label, Icon]) => (
                    <Button
                      key={nextView}
                      type="button"
                      variant={view === nextView ? "default" : "outline"}
                      onClick={() => setView(nextView)}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-h-[860px]">
              {view === "month" ? (
                <MonthView
                  locale={locale}
                  currentDate={currentDate}
                  days={monthDays}
                  events={visibleEvents}
                  onSelectDate={(date) => openCreateModal(buildAllDayDraft(date))}
                  onSelectEvent={openEventSheet}
                  emptyLabel={copy.emptyMonth}
                />
              ) : view === "week" ? (
                <TimeGridView
                  locale={locale}
                  days={weekDays}
                  events={visibleEvents}
                  onSelectHour={(date, hour) => openCreateModal(buildDraft(date, hour))}
                  onSelectEvent={openEventSheet}
                  allDayLabel={copy.allDayStrip}
                  emptyLabel={copy.emptyDay}
                />
              ) : (
                <TimeGridView
                  locale={locale}
                  days={[currentDate]}
                  events={dayEvents}
                  onSelectHour={(date, hour) => openCreateModal(buildDraft(date, hour))}
                  onSelectEvent={openEventSheet}
                  allDayLabel={copy.allDayStrip}
                  emptyLabel={copy.emptyDay}
                />
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <EventComposer
        open={Boolean(createDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDraft(null);
          }
        }}
        mode="create"
        event={null}
        draft={createDraft}
        connections={snapshot.visibleCalendars.filter((connection) => connection.enabled)}
        contacts={snapshot.contacts}
        deals={snapshot.deals}
        copy={copy}
        onCompleted={(message) => {
          setStatusMessage(message);
          setCreateDraft(null);
          router.refresh();
        }}
      />

      <EventComposer
        open={Boolean(editingEvent)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEvent(null);
          }
        }}
        mode="edit"
        event={editingEvent}
        draft={null}
        connections={snapshot.visibleCalendars.filter((connection) => connection.enabled)}
        contacts={snapshot.contacts}
        deals={snapshot.deals}
        copy={copy}
        onCompleted={(message) => {
          setStatusMessage(message);
          setEditingEvent(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function MiniCalendar({
  locale,
  currentDate,
  selectedDate,
  onSelectDate,
}: {
  locale: string;
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [displayDate, setDisplayDate] = useState(startOfMonth(currentDate));

  useEffect(() => {
    setDisplayDate(startOfMonth(currentDate));
  }, [currentDate]);

  const days = useMemo(() => buildMonthGrid(displayDate), [displayDate]);
  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
    [locale],
  );
  const weekHeaders = useMemo(
    () => Array.from({ length: 7 }, (_, index) => weekdayFormatter.format(addDays(startOfWeek(new Date()), index))),
    [weekdayFormatter],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon-sm" onClick={() => setDisplayDate((value) => addMonths(value, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium capitalize">
          {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(displayDate)}
        </p>
        <Button variant="outline" size="icon-sm" onClick={() => setDisplayDate((value) => addMonths(value, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        {weekHeaders.map((day) => (
          <span key={day}>{day.slice(0, 3)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <button
            type="button"
            key={day.toISOString()}
            onClick={() => onSelectDate(day)}
            className={cn(
              "flex h-9 items-center justify-center rounded-xl text-sm transition hover:bg-primary/10",
              !isSameMonth(day, displayDate) && "text-muted-foreground/55",
              isSameDay(day, selectedDate) && "bg-primary text-primary-foreground hover:bg-primary",
              isSameDay(day, new Date()) &&
                !isSameDay(day, selectedDate) &&
                "border border-primary/30 text-primary",
            )}
          >
            {day.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

function MonthView({
  locale,
  currentDate,
  days,
  events,
  onSelectDate,
  onSelectEvent,
  emptyLabel,
}: {
  locale: string;
  currentDate: Date;
  days: Date[];
  events: CalendarEventRecord[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEventRecord) => void;
  emptyLabel: string;
}) {
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
          addDays(startOfWeek(currentDate), index),
        ),
      ),
    [currentDate, locale],
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {weekdayLabels.map((weekday) => (
          <div key={weekday} className="px-2">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const dayEvents = events
            .filter((event) => eventIntersectsDay(event, day))
            .sort(
              (left, right) =>
                new Date(left.startDatetime).getTime() - new Date(right.startDatetime).getTime(),
            );

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "min-h-[132px] rounded-[26px] border border-border/70 bg-background/70 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5",
                !isSameMonth(day, currentDate) && "opacity-55",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full text-sm font-medium",
                    isSameDay(day, new Date()) && "bg-primary text-primary-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {dayEvents.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    type="button"
                    key={event.id}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onSelectEvent(event);
                    }}
                    className={cn(
                      "block w-full rounded-2xl border border-border/70 px-2.5 py-2 text-left text-xs ring-1 transition hover:brightness-95",
                      event.sourceColorClassName,
                    )}
                  >
                    <p className="truncate font-medium">{event.title}</p>
                    <p className="mt-1 truncate opacity-80">
                      {event.isAllDay
                        ? "Dia inteiro"
                        : new Intl.DateTimeFormat(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(event.startDatetime))}
                    </p>
                  </button>
                ))}
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{emptyLabel}</p>
                ) : null}
                {dayEvents.length > 3 ? (
                  <p className="text-xs font-medium text-primary">+{dayEvents.length - 3} itens</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeGridView({
  locale,
  days,
  events,
  onSelectHour,
  onSelectEvent,
  allDayLabel,
  emptyLabel,
}: {
  locale: string;
  days: Date[];
  events: CalendarEventRecord[];
  onSelectHour: (date: Date, hour: number) => void;
  onSelectEvent: (event: CalendarEventRecord) => void;
  allDayLabel: string;
  emptyLabel: string;
}) {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const columnHeight = 24 * 72;
  const timedEvents = events.filter((event) => !event.isAllDay);
  const allDayEvents = events.filter((event) => event.isAllDay);

  return (
    <div className="space-y-4 overflow-x-auto">
      <div
        className="grid min-w-[760px] gap-3"
        style={{ gridTemplateColumns: `84px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{allDayLabel}</div>
        {days.map((day) => (
          <div
            key={`all-day-${day.toISOString()}`}
            className="rounded-2xl border border-border/70 bg-background/70 p-2"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium capitalize">
                {new Intl.DateTimeFormat(locale, {
                  weekday: days.length === 1 ? "long" : "short",
                  day: "2-digit",
                  month: "short",
                }).format(day)}
              </span>
              <span className="text-xs text-muted-foreground">
                {allDayEvents.filter((event) => eventIntersectsDay(event, day)).length}
              </span>
            </div>
            <div className="space-y-2">
              {allDayEvents
                .filter((event) => eventIntersectsDay(event, day))
                .map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className={cn(
                      "block w-full rounded-2xl border border-border/70 px-3 py-2 text-left text-xs ring-1",
                      event.sourceColorClassName,
                    )}
                  >
                    {event.title}
                  </button>
                ))}
              {allDayEvents.filter((event) => eventIntersectsDay(event, day)).length === 0 ? (
                <p className="text-xs text-muted-foreground">{emptyLabel}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div
        className="grid min-w-[760px] gap-3"
        style={{ gridTemplateColumns: `84px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="space-y-0.5 pt-12">
          {hours.map((hour) => (
            <div key={hour} className="h-[72px] pr-3 text-right text-xs text-muted-foreground">
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayTimedEvents = timedEvents.filter((event) => eventIntersectsDay(event, day));
          return (
            <div key={day.toISOString()} className="relative">
              <div className="mb-3 flex h-9 items-center rounded-2xl border border-border/70 bg-background/70 px-3 text-sm font-medium capitalize">
                {new Intl.DateTimeFormat(locale, {
                  weekday: days.length === 1 ? "long" : "short",
                  day: "2-digit",
                  month: "short",
                }).format(day)}
              </div>
              <div
                className="relative overflow-hidden rounded-[28px] border border-border/70 bg-background/70"
                style={{ height: columnHeight }}
              >
                <div className="absolute inset-0">
                  {hours.map((hour) => (
                    <button
                      key={`${day.toISOString()}-${hour}`}
                      type="button"
                      onClick={() => onSelectHour(day, hour)}
                      className="block h-[72px] w-full border-b border-dashed border-border/60 transition hover:bg-primary/5"
                    />
                  ))}
                </div>
                {dayTimedEvents.map((event) => {
                  const start = new Date(event.startDatetime);
                  const end = new Date(event.endDatetime);
                  const top = (getMinutesIntoDay(start) / (24 * 60)) * columnHeight;
                  const bottomMinutes = Math.max(
                    getMinutesIntoDay(end),
                    getMinutesIntoDay(start) + 30,
                  );
                  const height =
                    ((bottomMinutes - getMinutesIntoDay(start)) / (24 * 60)) * columnHeight;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className={cn(
                        "absolute left-2 right-2 overflow-hidden rounded-2xl border border-border/70 px-3 py-2 text-left text-xs shadow-sm ring-1 transition hover:brightness-95",
                        event.sourceColorClassName,
                      )}
                      style={{
                        top,
                        minHeight: Math.max(height, 52),
                      }}
                    >
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="mt-1 opacity-80">
                        {new Intl.DateTimeFormat(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(start)}
                        {" · "}
                        {new Intl.DateTimeFormat(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(end)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventComposer({
  open,
  onOpenChange,
  mode,
  event,
  draft,
  connections,
  contacts,
  deals,
  copy,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  event: CalendarEventRecord | null;
  draft: DraftSelection | null;
  connections: CalendarConnectionRecord[];
  contacts: CalendarSnapshot["contacts"];
  deals: CalendarSnapshot["deals"];
  copy: Record<string, string>;
  onCompleted: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [values, setValues] = useState<EventFormValues>(() =>
    buildInitialValues(event, draft, connections),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(buildInitialValues(event, draft, connections));
    setMessage("");
  }, [connections, draft, event, open]);

  function handleSubmit() {
    startTransition(async () => {
      const startDatetime = values.isAllDay
        ? new Date(`${values.startDate}T00:00:00`)
        : fromLocalInput(values.startDatetime);
      const endDatetime = values.isAllDay
        ? new Date(`${values.endDate}T23:59:00`)
        : fromLocalInput(values.endDatetime);

      const payload = {
        title: values.title,
        description: values.description || undefined,
        location: values.location || undefined,
        startDatetime: startDatetime.toISOString(),
        endDatetime: endDatetime.toISOString(),
        isAllDay: values.isAllDay,
        eventType: values.eventType,
        sourceCalendarId: values.sourceCalendarId,
        contactId: values.contactId || undefined,
        dealId: values.dealId || undefined,
      } as const;

      const result =
        mode === "create"
          ? await createEventAction(payload)
          : await updateEventAction({
              eventId: event?.id ?? "",
              ...payload,
            });

      setMessage(result.message);

      if (result.status === "success") {
        onCompleted(result.message);
      }
    });
  }

  function handleDelete() {
    if (!event) {
      return;
    }

    startTransition(async () => {
      const result = await deleteEventAction({
        eventId: event.id,
      });

      setMessage(result.message);

      if (result.status === "success") {
        onCompleted(result.message);
      }
    });
  }

  const content = (
    <div className="space-y-6 px-6 py-5">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor={`${mode}-title`}>
            {copy.titleLabel}
          </label>
          <input
            id={`${mode}-title`}
            className={inputClassName}
            value={values.title}
            onChange={(inputEvent) =>
              setValues((current) => ({ ...current, title: inputEvent.target.value }))
            }
            placeholder="Ex.: Reunião com a conta Atlas"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${mode}-calendar`}>
            {copy.calendarLabel}
          </label>
          <select
            id={`${mode}-calendar`}
            className={inputClassName}
            value={values.sourceCalendarId}
            onChange={(inputEvent) =>
              setValues((current) => ({ ...current, sourceCalendarId: inputEvent.target.value }))
            }
          >
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${mode}-type`}>
            {copy.typeLabel}
          </label>
          <select
            id={`${mode}-type`}
            className={inputClassName}
            value={values.eventType}
            onChange={(inputEvent) =>
              setValues((current) => ({
                ...current,
                eventType: inputEvent.target.value as EventFormValues["eventType"],
              }))
            }
          >
            <option value="MEETING">Reunião</option>
            <option value="TASK">Tarefa</option>
            <option value="SCHEDULE">Escala de Plantão</option>
            <option value="PERSONAL">Pessoal</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${mode}-contact`}>
            {copy.contactLabel}
          </label>
          <select
            id={`${mode}-contact`}
            className={inputClassName}
            value={values.contactId}
            onChange={(inputEvent) =>
              setValues((current) => ({ ...current, contactId: inputEvent.target.value }))
            }
          >
            <option value="">{copy.noContact}</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`${mode}-deal`}>
            {copy.dealLabel}
          </label>
          <select
            id={`${mode}-deal`}
            className={inputClassName}
            value={values.dealId}
            onChange={(inputEvent) =>
              setValues((current) => ({ ...current, dealId: inputEvent.target.value }))
            }
          >
            <option value="">{copy.noDeal}</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
          <input
            type="checkbox"
            checked={values.isAllDay}
            onChange={(inputEvent) =>
              setValues((current) => ({ ...current, isAllDay: inputEvent.target.checked }))
            }
          />
          <span className="text-sm font-medium">{copy.allDayLabel}</span>
        </label>

        {values.isAllDay ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`${mode}-start-date`}>
                {copy.startDateLabel}
              </label>
              <input
                id={`${mode}-start-date`}
                type="date"
                className={inputClassName}
                value={values.startDate}
                onChange={(inputEvent) =>
                  setValues((current) => ({ ...current, startDate: inputEvent.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`${mode}-end-date`}>
                {copy.endDateLabel}
              </label>
              <input
                id={`${mode}-end-date`}
                type="date"
                className={inputClassName}
                value={values.endDate}
                onChange={(inputEvent) =>
                  setValues((current) => ({ ...current, endDate: inputEvent.target.value }))
                }
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`${mode}-start`}>
                {copy.startLabel}
              </label>
              <input
                id={`${mode}-start`}
                type="datetime-local"
                className={inputClassName}
                value={values.startDatetime}
                onChange={(inputEvent) =>
                  setValues((current) => ({ ...current, startDatetime: inputEvent.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`${mode}-end`}>
                {copy.endLabel}
              </label>
              <input
                id={`${mode}-end`}
                type="datetime-local"
                className={inputClassName}
                value={values.endDatetime}
                onChange={(inputEvent) =>
                  setValues((current) => ({ ...current, endDatetime: inputEvent.target.value }))
                }
              />
            </div>
          </>
        )}

        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor={`${mode}-location`}>
            {copy.locationLabel}
          </label>
          <input
            id={`${mode}-location`}
            className={inputClassName}
            value={values.location}
            onChange={(inputEvent) =>
              setValues((current) => ({ ...current, location: inputEvent.target.value }))
            }
            placeholder="Google Meet, Sala Atlas, Cliente"
          />
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${mode}-description`}>
          {copy.descriptionLabel}
        </label>
        <textarea
          id={`${mode}-description`}
          rows={6}
          className={textareaClassName}
          value={values.description}
          onChange={(inputEvent) =>
            setValues((current) => ({ ...current, description: inputEvent.target.value }))
          }
          placeholder="Notas, objetivos da reunião, próximos passos ou contexto da tarefa."
        />
      </section>

      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground"
        >
          {message}
        </div>
      ) : null}
    </div>
  );

  if (mode === "create") {
    return open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
        <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] shadow-[0_40px_120px_-70px_rgba(15,23,42,0.55)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.92))]">
          <div className="border-b border-border/70 px-6 py-5">
            <p className="text-xl font-semibold">{copy.createTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.createDescription}</p>
          </div>
          {content}
          <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-5 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {copy.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? copy.saving : copy.createSubmit}
            </Button>
          </div>
        </div>
      </div>
    ) : null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-[680px] overflow-y-auto border-l border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-0 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.92))]"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-5">
          <SheetTitle className="text-xl">{copy.editTitle}</SheetTitle>
          <SheetDescription>{copy.editDescription}</SheetDescription>
          {event ? (
            <div className="mt-4 grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="size-4" />
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(event.startDatetime))}
              </div>
              {event.location ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4" />
                  {event.location}
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Link2 className="size-4" />
                {event.sourceLabel}
              </div>
            </div>
          ) : null}
        </SheetHeader>
        {content}
        <SheetFooter className="border-t border-border/70 px-6 py-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              <Trash2 className="size-4" />
              {isPending ? copy.deleting : copy.delete}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {copy.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? copy.saving : copy.updateSubmit}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
