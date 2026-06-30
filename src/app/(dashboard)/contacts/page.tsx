import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { getRequestI18n } from "@/lib/i18n/request";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const { messages } = await getRequestI18n();

  return (
    <ModulePlaceholder
      title={messages.modules.contacts.title}
      badge={messages.modules.contacts.badge}
      description={messages.modules.contacts.description}
      ctaLabel={messages.modules.cta}
      helperText={messages.modules.helper}
    />
  );
}
