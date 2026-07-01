import type { AppLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { DashboardSnapshot } from "@/types/contracts";
import { formatCompactNumber, formatCurrencyFromCents } from "@/lib/utils/format";

const placeholderRevenue = 124_500_000;

export function createPlaceholderDashboardSnapshot(
  locale: AppLocale = "en-US",
): DashboardSnapshot {
  const copy = getMessages(locale);

  return {
    workspaceName: "OslerNotes CRM",
    reportingRange: copy.dashboard.reportingRange.placeholder,
    metrics: [
      {
        id: "totalContacts",
        label: copy.dashboard.metrics.totalContacts,
        value: 2847,
        displayValue: formatCompactNumber(2847, locale),
        hint: copy.dashboard.metrics.contactsHint,
        trendLabel: copy.dashboard.metrics.contactsTrend,
        trendDirection: "up",
      },
      {
        id: "companies",
        label: copy.dashboard.metrics.companies,
        value: 318,
        displayValue: formatCompactNumber(318, locale),
        hint: copy.dashboard.metrics.companiesHint,
        trendLabel: copy.dashboard.metrics.companiesTrend,
        trendDirection: "up",
      },
      {
        id: "dealPipelineRevenue",
        label: copy.dashboard.metrics.dealPipelineRevenue,
        value: placeholderRevenue / 100,
        displayValue: formatCurrencyFromCents(placeholderRevenue, locale),
        hint: copy.dashboard.metrics.revenueHint,
        trendLabel: copy.dashboard.metrics.revenueTrend,
        trendDirection: "up",
      },
      {
        id: "supportTickets",
        label: copy.dashboard.metrics.supportTickets,
        value: 46,
        displayValue: formatCompactNumber(46, locale),
        hint: copy.dashboard.metrics.ticketsHint,
        trendLabel: copy.dashboard.metrics.ticketsTrend,
        trendDirection: "down",
      },
    ],
    pipeline: [
      {
        id: "qualification",
        label: copy.dashboard.pipeline.stages.qualification,
        dealCount: 8,
        displayRevenue: formatCurrencyFromCents(1_845_000, locale),
        items: [
          {
            id: "deal-1",
            title: "Northwind Expansion",
            companyName: "Northwind Labs",
            ownerName: "Mila Santos",
            displayValue: formatCurrencyFromCents(525_000, locale),
            closeDateLabel: `${copy.dashboard.pipeline.placeholders.closesOn} Jul 18`,
          },
          {
            id: "deal-2",
            title: "Support Bundle Rollout",
            companyName: "Atlas Freight",
            ownerName: "Jon Carter",
            displayValue: formatCurrencyFromCents(335_000, locale),
            closeDateLabel: `${copy.dashboard.pipeline.placeholders.closesOn} Jul 24`,
          },
        ],
      },
      {
        id: "discovery",
        label: copy.dashboard.pipeline.stages.discovery,
        dealCount: 6,
        displayRevenue: formatCurrencyFromCents(3_410_000, locale),
        items: [
          {
            id: "deal-3",
            title: "Ops Hub Migration",
            companyName: "Summit Grid",
            ownerName: "Ava Kim",
            displayValue: formatCurrencyFromCents(1_240_000, locale),
            closeDateLabel: `${copy.dashboard.pipeline.placeholders.closesOn} Aug 02`,
          },
          {
            id: "deal-4",
            title: "Renewal Consolidation",
            companyName: "Clearline Group",
            ownerName: "Noah Ellis",
            displayValue: formatCurrencyFromCents(940_000, locale),
            closeDateLabel: `${copy.dashboard.pipeline.placeholders.closesOn} Aug 09`,
          },
        ],
      },
      {
        id: "proposal",
        label: copy.dashboard.pipeline.stages.proposal,
        dealCount: 5,
        displayRevenue: formatCurrencyFromCents(4_125_000, locale),
        items: [
          {
            id: "deal-5",
            title: "OslerNotes Enterprise Suite",
            companyName: "Harbor Systems",
            ownerName: "Lena Hart",
            displayValue: formatCurrencyFromCents(1_980_000, locale),
            closeDateLabel: `${copy.dashboard.pipeline.placeholders.closesOn} Jul 30`,
          },
          {
            id: "deal-6",
            title: "Customer Data Unification",
            companyName: "Granite Bio",
            ownerName: "Mason Reed",
            displayValue: formatCurrencyFromCents(1_155_000, locale),
            closeDateLabel: `${copy.dashboard.pipeline.placeholders.closesOn} Aug 14`,
          },
        ],
      },
      {
        id: "negotiation",
        label: copy.dashboard.pipeline.stages.negotiation,
        dealCount: 3,
        displayRevenue: formatCurrencyFromCents(2_880_000, locale),
        items: [
          {
            id: "deal-7",
            title: "Global CRM Standardization",
            companyName: "Vantage Retail",
            ownerName: "Sofia Nguyen",
            displayValue: formatCurrencyFromCents(1_350_000, locale),
            closeDateLabel: `${copy.dashboard.pipeline.placeholders.closesOn} Jul 11`,
          },
          {
            id: "deal-8",
            title: "Executive Success Program",
            companyName: "Orion Partners",
            ownerName: "Aria Coleman",
            displayValue: formatCurrencyFromCents(980_000, locale),
            closeDateLabel: `${copy.dashboard.pipeline.placeholders.closesOn} Jul 16`,
          },
        ],
      },
    ],
    activities: [
      {
        id: "activity-1",
        type: "deal",
        summary: copy.dashboard.activities.placeholder.one,
        actorName: "Lena Hart",
        occurredAt: locale === "pt-BR" ? "Hoje, 09:42" : "Today, 09:42",
      },
      {
        id: "activity-2",
        type: "contact",
        summary: copy.dashboard.activities.placeholder.two,
        actorName: "Mila Santos",
        occurredAt: locale === "pt-BR" ? "Hoje, 08:15" : "Today, 08:15",
      },
      {
        id: "activity-3",
        type: "ticket",
        summary: copy.dashboard.activities.placeholder.three,
        actorName: "Jon Carter",
        occurredAt: locale === "pt-BR" ? "Ontem, 16:28" : "Yesterday, 16:28",
      },
      {
        id: "activity-4",
        type: "company",
        summary: copy.dashboard.activities.placeholder.four,
        actorName: "Ava Kim",
        occurredAt: locale === "pt-BR" ? "Ontem, 14:05" : "Yesterday, 14:05",
      },
    ],
  };
}
