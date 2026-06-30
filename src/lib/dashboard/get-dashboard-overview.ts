import "server-only";

import type { User } from "@supabase/supabase-js";

import { createPlaceholderDashboardSnapshot } from "@/lib/dashboard/placeholder-data";
import { hasSupabaseConfig } from "@/lib/env/supabase";
import type { AppLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { createLogger } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCompactNumber, formatCurrencyFromCents, formatRelativeDate } from "@/lib/utils/format";
import type {
  ActivityItem,
  DashboardSnapshot,
  PipelineStage,
  PrivateDashboardNote,
} from "@/types/contracts";
import type { SupabaseTableRow } from "@/types/supabase";

const logger = createLogger("dashboard-overview");

const pipelineStageOrder = ["qualification", "discovery", "proposal", "negotiation"] as const;

type PipelineStageId = (typeof pipelineStageOrder)[number];

function createMetricSnapshot(
  locale: AppLocale,
  input: {
    totalContacts: number;
    companies: number;
    dealPipelineRevenue: number;
    supportTickets: number;
  },
) {
  const copy = getMessages(locale);

  return [
    {
      id: "totalContacts" as const,
      label: copy.dashboard.metrics.totalContacts,
      value: input.totalContacts,
      displayValue: formatCompactNumber(input.totalContacts, locale),
      hint: copy.dashboard.metrics.contactsHint,
      trendLabel: copy.dashboard.metrics.liveCount,
      trendDirection: "neutral" as const,
    },
    {
      id: "companies" as const,
      label: copy.dashboard.metrics.companies,
      value: input.companies,
      displayValue: formatCompactNumber(input.companies, locale),
      hint: copy.dashboard.metrics.companiesHint,
      trendLabel: copy.dashboard.metrics.liveCount,
      trendDirection: "neutral" as const,
    },
    {
      id: "dealPipelineRevenue" as const,
      label: copy.dashboard.metrics.dealPipelineRevenue,
      value: input.dealPipelineRevenue,
      displayValue: formatCurrencyFromCents(input.dealPipelineRevenue * 100, locale),
      hint: copy.dashboard.metrics.revenueHint,
      trendLabel: copy.dashboard.metrics.liveSum,
      trendDirection: "neutral" as const,
    },
    {
      id: "supportTickets" as const,
      label: copy.dashboard.metrics.supportTickets,
      value: input.supportTickets,
      displayValue: formatCompactNumber(input.supportTickets, locale),
      hint: copy.dashboard.metrics.ticketsHint,
      trendLabel: copy.dashboard.metrics.liveCount,
      trendDirection: "neutral" as const,
    },
  ];
}

function createPipelineSnapshot(
  locale: AppLocale,
  deals: Array<
    Pick<
      SupabaseTableRow<"deals">,
      "id" | "name" | "company_name" | "owner_name" | "stage" | "value" | "expected_close_date"
    >
  >,
): PipelineStage[] {
  const copy = getMessages(locale);
  const noCloseDateLabel = locale === "pt-BR" ? "Sem data de fechamento" : "No close date";
  const unassignedAccountLabel = locale === "pt-BR" ? "Conta não atribuída" : "Unassigned account";
  const unassignedOwnerLabel = locale === "pt-BR" ? "Responsável não atribuído" : "Unassigned owner";
  const stageLabels: Record<PipelineStageId, string> = {
    qualification: copy.dashboard.pipeline.stages.qualification,
    discovery: copy.dashboard.pipeline.stages.discovery,
    proposal: copy.dashboard.pipeline.stages.proposal,
    negotiation: copy.dashboard.pipeline.stages.negotiation,
  };

  return pipelineStageOrder.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage);

    return {
      id: stage,
      label: stageLabels[stage],
      dealCount: stageDeals.length,
      displayRevenue: formatCurrencyFromCents(
        stageDeals.reduce((sum, deal) => sum + deal.value, 0) * 100,
        locale,
      ),
      items: stageDeals.slice(0, 3).map((deal) => ({
        id: deal.id,
        title: deal.name,
        companyName: deal.company_name ?? unassignedAccountLabel,
        ownerName: deal.owner_name ?? unassignedOwnerLabel,
        displayValue: formatCurrencyFromCents(deal.value * 100, locale),
        closeDateLabel: deal.expected_close_date
          ? `${copy.dashboard.pipeline.placeholders.closesOn} ${formatRelativeDate(
              deal.expected_close_date,
              locale,
            )}`
          : noCloseDateLabel,
      })),
    };
  });
}

function mapRecentActivities(
  activities: SupabaseTableRow<"activities">[],
  locale: AppLocale,
): ActivityItem[] {
  return activities.map((activity) => ({
    id: activity.id,
    type: activity.entity_type,
    summary: activity.summary,
    actorName: activity.actor_name,
    occurredAt: formatRelativeDate(activity.created_at, locale),
  }));
}

function mapPrivateNotes(
  notes: Array<Pick<SupabaseTableRow<"notes">, "id" | "title" | "content" | "created_at" | "updated_at">>,
): PrivateDashboardNote[] {
  return notes.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content ?? "",
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  }));
}

export async function getDashboardOverview(
  locale: AppLocale = "en-US",
): Promise<DashboardSnapshot> {
  const copy = getMessages(locale);
  const placeholderDashboardSnapshot = createPlaceholderDashboardSnapshot(locale);

  if (!hasSupabaseConfig()) {
    logger.warn("Supabase environment is missing. Returning placeholder dashboard.");
    return placeholderDashboardSnapshot;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const [contactsCount, companiesCount, dealsResult, ticketsCount, activitiesResult] =
      await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase
          .from("deals")
          .select("id, name, company_name, owner_name, stage, value, expected_close_date")
          .in("stage", [...pipelineStageOrder]),
        supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "pending"]),
        supabase
          .from("activities")
          .select("id, entity_type, summary, actor_name, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    if (
      contactsCount.error ||
      companiesCount.error ||
      dealsResult.error ||
      ticketsCount.error ||
      activitiesResult.error
    ) {
      throw (
        contactsCount.error ??
        companiesCount.error ??
        dealsResult.error ??
        ticketsCount.error ??
        activitiesResult.error
      );
    }

    const deals = dealsResult.data ?? [];

    return {
      workspaceName: copy.common.appName,
      reportingRange: copy.dashboard.reportingRange.live,
      metrics: createMetricSnapshot(locale, {
        totalContacts: contactsCount.count ?? 0,
        companies: companiesCount.count ?? 0,
        dealPipelineRevenue: deals.reduce((sum, deal) => sum + deal.value, 0),
        supportTickets: ticketsCount.count ?? 0,
      }),
      pipeline: createPipelineSnapshot(locale, deals),
      activities:
        (activitiesResult.data?.length ?? 0) > 0
          ? mapRecentActivities(activitiesResult.data ?? [], locale)
          : placeholderDashboardSnapshot.activities,
    };
  } catch (error) {
    logger.error("Failed to load dashboard overview. Falling back to placeholders.", error);
    return placeholderDashboardSnapshot;
  }
}

export async function getPrivateDashboardNotes(user: User): Promise<PrivateDashboardNote[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(12);

    if (error) {
      throw error;
    }

    return mapPrivateNotes(data ?? []);
  } catch (error) {
    logger.error("Failed to load private dashboard notes.", error);
    return [];
  }
}
