import { CalendarBoard } from "@/components/calendar/calendar-board";
import { getCalendarSnapshot } from "@/lib/calendar/board";
import { getRequestI18n } from "@/lib/i18n/request";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const { locale } = await getRequestI18n();
  const snapshot = await getCalendarSnapshot(locale);

  return <CalendarBoard snapshot={snapshot} />;
}
