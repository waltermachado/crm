import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { getRequestI18n } from "@/lib/i18n/request";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const { messages } = await getRequestI18n();

  return (
    <ModulePlaceholder
      title={messages.modules.companies.title}
      badge={messages.modules.companies.badge}
      description={messages.modules.companies.description}
      ctaLabel={messages.modules.cta}
      helperText={messages.modules.helper}
    />
  );
}
