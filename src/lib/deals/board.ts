import "server-only";

import type { Membership, PipelineStage, PrismaClient } from "@prisma/client";

import { getPrismaClient } from "@/lib/db/prisma";
import { hasDatabaseConfig } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";
import { getDemoPipelineSnapshot } from "@/lib/deals/demo-store";
import {
  DEFAULT_ACTOR,
  DEFAULT_PIPELINE_NAME,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_WORKSPACE_ID,
} from "@/lib/deals/stage-definitions";
import type {
  DealDetailsRecord,
  DealsBoardSnapshot,
  DealOwnerSummary,
  PipelineStageSlug,
} from "@/types/deals";
import type { AppLocale } from "@/lib/i18n/config";
import { formatCurrencyFromCents } from "@/lib/utils/format";

const logger = createLogger("deals-board");

type PipelineContext = {
  workspaceId: string;
  pipelineId: string;
  stages: Array<Pick<PipelineStage, "id" | "name" | "slug" | "position" | "colorToken">>;
  actor: DealOwnerSummary;
};

function formatExpectedClose(expectedCloseAt: Date | null, locale: AppLocale) {
  if (!expectedCloseAt) {
    return locale === "pt-BR" ? "Sem previsão" : "No forecast";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(expectedCloseAt);
}

function buildStageColorClass(slug: string, colorToken: string | null) {
  if (colorToken) {
    return colorToken;
  }

  return (
    DEFAULT_PIPELINE_STAGES.find((stage) => stage.slug === slug)?.colorClassName ??
    "from-slate-500/18 via-slate-500/8 to-transparent border-slate-500/25"
  );
}

function mapDealDetails(
  deal: {
    id: string;
    name: string;
    description: string | null;
    valueCents: bigint;
    expectedCloseAt: Date | null;
    stageId: string | null;
    pipelineId: string | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    stageRecord: { slug: string } | null;
    company: { name: string } | null;
    contact: { fullName: string; phone: string | null } | null;
    ownerMembership: { id: string; fullName: string; email: string } | null;
  },
  locale: AppLocale,
): DealDetailsRecord {
  const value = Number(deal.valueCents) / 100;

  return {
    id: deal.id,
    title: deal.name,
    description: deal.description,
    companyName: deal.company?.name ?? (locale === "pt-BR" ? "Sem empresa" : "No company"),
    contactName: deal.contact?.fullName ?? null,
    contactPhone: deal.contact?.phone ?? null,
    owner: {
      id: deal.ownerMembership?.id ?? DEFAULT_ACTOR.id,
      name: deal.ownerMembership?.fullName ?? DEFAULT_ACTOR.name,
      email: deal.ownerMembership?.email ?? DEFAULT_ACTOR.email,
    },
    value,
    displayValue: formatCurrencyFromCents(deal.valueCents, locale),
    expectedCloseAt: deal.expectedCloseAt?.toISOString() ?? null,
    expectedCloseLabel: formatExpectedClose(deal.expectedCloseAt, locale),
    stageId: deal.stageId ?? "",
    stageSlug: (deal.stageRecord?.slug as PipelineStageSlug | undefined) ?? "NOVO_LEAD",
    pipelineId: deal.pipelineId ?? "",
    position: deal.position,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}

async function ensureWorkspace(prisma: PrismaClient) {
  const existing = await prisma.workspace.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.workspace.create({
    data: {
      id: DEFAULT_WORKSPACE_ID,
      name: "Axe CRM",
      slug: "axe-crm",
    },
  });
}

async function ensureActor(prisma: PrismaClient, workspaceId: string): Promise<Membership> {
  const existing = await prisma.membership.findFirst({
    where: {
      workspaceId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.membership.create({
    data: {
      workspaceId,
      userId: DEFAULT_ACTOR.id,
      email: DEFAULT_ACTOR.email,
      fullName: DEFAULT_ACTOR.name,
      role: "admin",
    },
  });
}

async function ensureDefaultPipeline(prisma: PrismaClient, workspaceId: string) {
  const existing = await prisma.pipeline.findFirst({
    where: {
      workspaceId,
      isDefault: true,
    },
    include: {
      stages: {
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.pipeline.create({
    data: {
      workspaceId,
      name: DEFAULT_PIPELINE_NAME,
      isDefault: true,
      stages: {
        create: DEFAULT_PIPELINE_STAGES.map((stage) => ({
          workspaceId,
          name: stage.name,
          slug: stage.slug,
          position: stage.order,
          colorToken: stage.colorClassName,
          isClosedWon: stage.isClosedWon ?? false,
          isClosedLost: stage.isClosedLost ?? false,
        })),
      },
    },
    include: {
      stages: {
        orderBy: {
          position: "asc",
        },
      },
    },
  });
}

export async function getOrCreatePipelineContext(
  prisma = getPrismaClient(),
): Promise<PipelineContext | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  const workspace = await ensureWorkspace(prisma);
  const actor = await ensureActor(prisma, workspace.id);
  const pipeline = await ensureDefaultPipeline(prisma, workspace.id);

  return {
    workspaceId: workspace.id,
    pipelineId: pipeline.id,
    stages: pipeline.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      slug: stage.slug,
      position: stage.position,
      colorToken: stage.colorToken,
    })),
    actor: {
      id: actor.id,
      name: actor.fullName,
      email: actor.email,
    },
  };
}

export async function getDealsBoardSnapshot(
  locale: AppLocale,
): Promise<DealsBoardSnapshot> {
  if (!hasDatabaseConfig()) {
    return getDemoPipelineSnapshot(locale);
  }

  try {
    const prisma = getPrismaClient();
    const context = await getOrCreatePipelineContext(prisma);

    if (!context) {
      return getDemoPipelineSnapshot(locale);
    }

    const [deals, owners] = await Promise.all([
      prisma.deal.findMany({
        where: {
          pipelineId: context.pipelineId,
        },
        include: {
          stageRecord: true,
          company: true,
          contact: true,
          ownerMembership: true,
        },
        orderBy: [{ stageRecord: { position: "asc" } }, { position: "asc" }],
      }),
      prisma.membership.findMany({
        where: {
          workspaceId: context.workspaceId,
        },
        orderBy: {
          fullName: "asc",
        },
      }),
    ]);

    const dealsById = Object.fromEntries(
      deals.map((deal) => [deal.id, mapDealDetails(deal, locale)]),
    ) as Record<string, DealDetailsRecord>;

    const stages = context.stages.map((stage) => {
      const items = deals
        .filter((deal) => deal.stageId === stage.id)
        .sort((a, b) => a.position - b.position)
        .map((deal) => {
          const details = dealsById[deal.id];

          return {
            id: details.id,
            title: details.title,
            companyName: details.contactName
              ? `${details.companyName} · ${details.contactName}`
              : details.companyName,
            displayValue: details.displayValue,
            value: details.value,
            expectedCloseAt: details.expectedCloseAt,
            expectedCloseLabel: details.expectedCloseLabel,
            owner: details.owner,
            contactName: details.contactName,
            contactPhone: details.contactPhone,
            stageId: details.stageId,
            stageSlug: details.stageSlug,
            position: details.position,
          };
        });
      const totalValue = items.reduce((sum, item) => sum + item.value, 0);

      return {
        id: stage.id,
        slug: stage.slug as PipelineStageSlug,
        label: stage.name,
        colorClassName: buildStageColorClass(stage.slug, stage.colorToken),
        dealCount: items.length,
        totalValue,
        displayTotalValue: formatCurrencyFromCents(Math.round(totalValue * 100), locale),
        items,
      };
    });

    const openDeals = deals.filter(
      (deal) =>
        deal.stageRecord?.slug !== "FECHADO_GANHO" &&
        deal.stageRecord?.slug !== "FECHADO_PERDIDO",
    );
    const openValue =
      openDeals.reduce((sum, deal) => sum + Number(deal.valueCents), 0) / 100;

    return {
      pipelineId: context.pipelineId,
      pipelineName: DEFAULT_PIPELINE_NAME,
      stages,
      dealsById,
      owners: owners.map((owner) => ({
        id: owner.id,
        name: owner.fullName,
        email: owner.email,
      })),
      canPersistToDatabase: true,
      webhookEnabled: false,
      totals: {
        openDeals: openDeals.length,
        openValue,
        displayOpenValue: formatCurrencyFromCents(Math.round(openValue * 100), locale),
      },
    };
  } catch (error) {
    logger.error("Failed to load deals pipeline. Falling back to demo state.", error);
    return getDemoPipelineSnapshot(locale);
  }
}
