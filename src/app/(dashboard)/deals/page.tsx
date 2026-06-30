import { getRequestI18n } from "@/lib/i18n/request";
import { getDealsBoardSnapshot } from "@/lib/deals/board";
import { DealsBoard } from "@/components/deals/deals-board";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const { locale } = await getRequestI18n();
  const snapshot = await getDealsBoardSnapshot(locale);

  return <DealsBoard snapshot={snapshot} />;
}
