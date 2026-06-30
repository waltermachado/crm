import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { getRequestI18n } from "@/lib/i18n/request";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const { messages } = await getRequestI18n();

  return (
    <ModulePlaceholder
      title={messages.modules.tickets.title}
      badge={messages.modules.tickets.badge}
      description={messages.modules.tickets.description}
      ctaLabel={messages.modules.cta}
      helperText={messages.modules.helper}
    />
  );
}
