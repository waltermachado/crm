import { CalendarConnectionsManager } from "@/components/calendar/calendar-connections-manager";
import { SettingsShell } from "@/components/settings/settings-shell";
import { getCalendarSnapshot } from "@/lib/calendar/board";
import { getRequestI18n } from "@/lib/i18n/request";

export const dynamic = "force-dynamic";

export default async function SettingsCalendarPage() {
  const { locale, messages } = await getRequestI18n();
  const snapshot = await getCalendarSnapshot(locale);

  return (
    <SettingsShell messages={messages}>
      <CalendarConnectionsManager snapshot={snapshot} />
    </SettingsShell>
  );
}
