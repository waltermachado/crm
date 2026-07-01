import "server-only";

import { cookies } from "next/headers";

import { LOCALE_COOKIE_NAME, type AppLocale } from "@/lib/i18n/config";
import { getCurrencyForLocale } from "@/lib/i18n/config";
import { DEFAULT_ACTOR, DEFAULT_PIPELINE_ID, DEFAULT_PIPELINE_NAME, DEFAULT_PIPELINE_STAGES, DEFAULT_WORKSPACE_ID, createDemoStageId } from "@/lib/deals/stage-definitions";
import type {
  DealCardRecord,
  DealDetailsRecord,
  DealsBoardSnapshot,
  DealMoveInput,
  DealStageRecord,
  PipelineStageSlug,
  SaveDealInput,
} from "@/types/deals";
import { formatCurrencyFromCents } from "@/lib/utils/format";
import { moveDealBetweenStages } from "@/lib/deals/reorder";

type StoredStage = {
  id: string;
  slug: PipelineStageSlug;
  name: string;
  position: number;
  colorClassName: string;
};

type StoredDeal = {
  id: string;
  pipelineId: string;
  stageId: string;
  stageSlug: PipelineStageSlug;
  position: number;
  title: string;
  description?: string | null;
  companyName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string | null;
  value: number;
  expectedCloseAt?: string | null;
  enteredStageAt: string;
  createdAt: string;
  updatedAt: string;
};

type StoredPipelineState = {
  workspaceId: string;
  pipelineId: string;
  pipelineName: string;
  stages: StoredStage[];
  deals: StoredDeal[];
};

declare global {
  var __oslernotesDemoPipelineState__: StoredPipelineState | undefined;
}

function createInitialDemoState(): StoredPipelineState {
  const now = new Date();
  const inDays = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  return {
    workspaceId: DEFAULT_WORKSPACE_ID,
    pipelineId: DEFAULT_PIPELINE_ID,
    pipelineName: DEFAULT_PIPELINE_NAME,
    stages: DEFAULT_PIPELINE_STAGES.map((stage) => ({
      id: createDemoStageId(stage.slug),
      slug: stage.slug,
      name: stage.name,
      position: stage.order,
      colorClassName: stage.colorClassName,
    })),
    deals: [
      {
        id: "deal-demo-1",
        pipelineId: DEFAULT_PIPELINE_ID,
        stageId: createDemoStageId("NOVO_LEAD"),
        stageSlug: "NOVO_LEAD",
        position: 0,
        title: "Reativação da Conta Atlas",
        description: "Pipeline de expansão para a operação nacional com automação comercial.",
        companyName: "Atlas Freight",
        contactName: "Camila Azevedo",
        contactPhone: "+55 11 99876-1001",
        ownerId: DEFAULT_ACTOR.id,
        ownerName: DEFAULT_ACTOR.name,
        ownerEmail: DEFAULT_ACTOR.email,
        value: 18500,
        expectedCloseAt: inDays(9),
        enteredStageAt: new Date(now.getTime() - 1000 * 60 * 60 * 20).toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "deal-demo-2",
        pipelineId: DEFAULT_PIPELINE_ID,
        stageId: createDemoStageId("NOVO_LEAD"),
        stageSlug: "NOVO_LEAD",
        position: 1,
        title: "Pacote de Onboarding Plus",
        companyName: "Lunar Health",
        contactName: "Pedro Nogueira",
        contactPhone: "+55 21 99765-2002",
        ownerId: DEFAULT_ACTOR.id,
        ownerName: DEFAULT_ACTOR.name,
        ownerEmail: DEFAULT_ACTOR.email,
        value: 7200,
        expectedCloseAt: inDays(15),
        enteredStageAt: new Date(now.getTime() - 1000 * 60 * 60 * 7).toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 30).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "deal-demo-3",
        pipelineId: DEFAULT_PIPELINE_ID,
        stageId: createDemoStageId("PRIMEIRO_CONTATO"),
        stageSlug: "PRIMEIRO_CONTATO",
        position: 0,
        title: "Migração de CRM Regional",
        companyName: "Vértice Energia",
        contactName: "Rafael Costa",
        contactPhone: "+55 31 99654-3003",
        ownerId: DEFAULT_ACTOR.id,
        ownerName: DEFAULT_ACTOR.name,
        ownerEmail: DEFAULT_ACTOR.email,
        value: 25900,
        expectedCloseAt: inDays(21),
        enteredStageAt: new Date(now.getTime() - 1000 * 60 * 60 * 36).toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "deal-demo-4",
        pipelineId: DEFAULT_PIPELINE_ID,
        stageId: createDemoStageId("PROPOSTA_ENVIADA"),
        stageSlug: "PROPOSTA_ENVIADA",
        position: 0,
        title: "Suite Comercial Enterprise",
        companyName: "Harbor Systems",
        contactName: "Luana Ferraz",
        contactPhone: "+55 41 99543-4004",
        ownerId: DEFAULT_ACTOR.id,
        ownerName: DEFAULT_ACTOR.name,
        ownerEmail: DEFAULT_ACTOR.email,
        value: 48000,
        expectedCloseAt: inDays(11),
        enteredStageAt: new Date(now.getTime() - 1000 * 60 * 60 * 56).toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 120).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "deal-demo-5",
        pipelineId: DEFAULT_PIPELINE_ID,
        stageId: createDemoStageId("NEGOCIACAO"),
        stageSlug: "NEGOCIACAO",
        position: 0,
        title: "Renovação com Upsell Global",
        companyName: "Granite Bio",
        contactName: "Marina Lopes",
        contactPhone: "+55 51 99432-5005",
        ownerId: DEFAULT_ACTOR.id,
        ownerName: DEFAULT_ACTOR.name,
        ownerEmail: DEFAULT_ACTOR.email,
        value: 91500,
        expectedCloseAt: inDays(4),
        enteredStageAt: new Date(now.getTime() - 1000 * 60 * 60 * 92).toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 180).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "deal-demo-6",
        pipelineId: DEFAULT_PIPELINE_ID,
        stageId: createDemoStageId("FECHADO_GANHO"),
        stageSlug: "FECHADO_GANHO",
        position: 0,
        title: "Expansão de Atendimento Omnichannel",
        companyName: "Summit Grid",
        contactName: "Henrique Mota",
        contactPhone: "+55 61 99321-6006",
        ownerId: DEFAULT_ACTOR.id,
        ownerName: DEFAULT_ACTOR.name,
        ownerEmail: DEFAULT_ACTOR.email,
        value: 124000,
        expectedCloseAt: inDays(-1),
        enteredStageAt: new Date(now.getTime() - 1000 * 60 * 60 * 140).toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 240).toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
  };
}

function formatExpectedClose(expectedCloseAt: string | null | undefined, locale: AppLocale) {
  if (!expectedCloseAt) {
    return locale === "pt-BR" ? "Sem previsão" : "No forecast";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(expectedCloseAt));
}

function mapStoredDealToCard(deal: StoredDeal, locale: AppLocale): DealCardRecord {
  return {
    id: deal.id,
    title: deal.title,
    companyName: deal.contactName
      ? `${deal.companyName} · ${deal.contactName}`
      : deal.companyName,
    displayValue: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: getCurrencyForLocale(locale),
      maximumFractionDigits: 0,
    }).format(deal.value),
    value: deal.value,
    expectedCloseAt: deal.expectedCloseAt,
    expectedCloseLabel: formatExpectedClose(deal.expectedCloseAt, locale),
    owner: {
      id: deal.ownerId,
      name: deal.ownerName,
      email: deal.ownerEmail,
    },
    contactName: deal.contactName,
    contactPhone: deal.contactPhone,
    stageId: deal.stageId,
    stageSlug: deal.stageSlug,
    position: deal.position,
  };
}

function mapStoredDealToDetails(deal: StoredDeal, locale: AppLocale): DealDetailsRecord {
  return {
    id: deal.id,
    title: deal.title,
    description: deal.description,
    companyName: deal.companyName,
    contactName: deal.contactName,
    contactPhone: deal.contactPhone,
    owner: {
      id: deal.ownerId,
      name: deal.ownerName,
      email: deal.ownerEmail,
    },
    value: deal.value,
    displayValue: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: getCurrencyForLocale(locale),
      maximumFractionDigits: 0,
    }).format(deal.value),
    expectedCloseAt: deal.expectedCloseAt,
    expectedCloseLabel: formatExpectedClose(deal.expectedCloseAt, locale),
    stageId: deal.stageId,
    stageSlug: deal.stageSlug,
    pipelineId: deal.pipelineId,
    position: deal.position,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

function buildBoardSnapshot(state: StoredPipelineState, locale: AppLocale): DealsBoardSnapshot {
  const stages: DealStageRecord[] = state.stages
    .sort((a, b) => a.position - b.position)
    .map((stage) => {
      const items = state.deals
        .filter((deal) => deal.stageId === stage.id)
        .sort((a, b) => a.position - b.position)
        .map((deal) => mapStoredDealToCard(deal, locale));
      const totalValue = items.reduce((sum, item) => sum + item.value, 0);

      return {
        id: stage.id,
        slug: stage.slug,
        label: stage.name,
        colorClassName: stage.colorClassName,
        dealCount: items.length,
        totalValue,
        displayTotalValue: formatCurrencyFromCents(Math.round(totalValue * 100), locale),
        items,
      };
    });

  const dealsById = Object.fromEntries(
    state.deals.map((deal) => [deal.id, mapStoredDealToDetails(deal, locale)]),
  );

  const openDeals = state.deals.filter(
    (deal) => deal.stageSlug !== "FECHADO_GANHO" && deal.stageSlug !== "FECHADO_PERDIDO",
  );
  const openValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);

  return {
    pipelineId: state.pipelineId,
    pipelineName: state.pipelineName,
    stages,
    dealsById,
    owners: [
      {
        id: DEFAULT_ACTOR.id,
        name: DEFAULT_ACTOR.name,
        email: DEFAULT_ACTOR.email,
      },
    ],
    canPersistToDatabase: false,
    webhookEnabled: false,
    totals: {
      openDeals: openDeals.length,
      openValue,
      displayOpenValue: formatCurrencyFromCents(Math.round(openValue * 100), locale),
    },
  };
}

export async function getDemoPipelineState() {
  if (!globalThis.__oslernotesDemoPipelineState__) {
    globalThis.__oslernotesDemoPipelineState__ = createInitialDemoState();
  }

  return globalThis.__oslernotesDemoPipelineState__;
}

export async function getDemoPipelineSnapshot(locale: AppLocale) {
  const state = await getDemoPipelineState();
  return buildBoardSnapshot(state, locale);
}

export async function writeDemoPipelineState(state: StoredPipelineState) {
  globalThis.__oslernotesDemoPipelineState__ = state;
}

export async function moveDemoDeal(input: DealMoveInput) {
  const locale = ((await cookies()).get(LOCALE_COOKIE_NAME)?.value as AppLocale) ?? "pt-BR";
  const state = await getDemoPipelineState();
  const snapshot = buildBoardSnapshot(state, locale);
  const nextStages = moveDealBetweenStages(snapshot.stages, input);
  const movedDeal = state.deals.find((deal) => deal.id === input.dealId);

  if (!movedDeal) {
    return null;
  }

  const nextDeals = nextStages.flatMap((stage) =>
    stage.items.map((item) => {
      const current = state.deals.find((deal) => deal.id === item.id);

      return {
        ...(current as StoredDeal),
        stageId: stage.id,
        stageSlug: stage.slug,
        position: item.position,
        enteredStageAt:
          current?.stageId === stage.id ? current.enteredStageAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }),
  );

  const nextState: StoredPipelineState = {
    ...state,
    deals: nextDeals,
  };

  await writeDemoPipelineState(nextState);

  return {
    previousStageSlug: movedDeal.stageSlug,
    previousEnteredStageAt: movedDeal.enteredStageAt,
    nextDeal: nextState.deals.find((deal) => deal.id === input.dealId) ?? null,
  };
}

export async function saveDemoDeal(input: SaveDealInput) {
  const state = await getDemoPipelineState();
  const targetStage = state.stages.find((stage) => stage.id === input.stageId);

  if (!targetStage) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const existing = input.id ? state.deals.find((deal) => deal.id === input.id) : undefined;
  const nextPosition = state.deals.filter((deal) => deal.stageId === input.stageId).length;

  const nextDeal: StoredDeal = existing
    ? {
        ...existing,
        title: input.title,
        description: input.description,
        value: input.value,
        expectedCloseAt: input.expectedCloseAt || null,
        companyName: input.companyName,
        contactName: input.contactName || null,
        contactPhone: input.contactPhone || null,
        ownerId: DEFAULT_ACTOR.id,
        ownerName: DEFAULT_ACTOR.name,
        ownerEmail: DEFAULT_ACTOR.email,
        stageId: input.stageId,
        stageSlug: targetStage.slug,
        updatedAt: timestamp,
        enteredStageAt:
          existing.stageId === input.stageId ? existing.enteredStageAt : timestamp,
        position: existing.stageId === input.stageId ? existing.position : nextPosition,
      }
    : {
        id: `deal-demo-${crypto.randomUUID()}`,
        pipelineId: state.pipelineId,
        stageId: input.stageId,
        stageSlug: targetStage.slug,
        position: nextPosition,
        title: input.title,
        description: input.description,
        companyName: input.companyName,
        contactName: input.contactName || null,
        contactPhone: input.contactPhone || null,
        ownerId: DEFAULT_ACTOR.id,
        ownerName: DEFAULT_ACTOR.name,
        ownerEmail: DEFAULT_ACTOR.email,
        value: input.value,
        expectedCloseAt: input.expectedCloseAt || null,
        enteredStageAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

  const deals = existing
    ? state.deals.map((deal) => (deal.id === existing.id ? nextDeal : deal))
    : [...state.deals, nextDeal];

  await writeDemoPipelineState({
    ...state,
    deals,
  });

  return {
    deal: nextDeal,
    isNew: !existing,
    previousStageSlug: existing?.stageSlug ?? null,
    previousEnteredStageAt: existing?.enteredStageAt ?? null,
  };
}

export async function deleteDemoDeal(dealId: string) {
  const state = await getDemoPipelineState();
  const deal = state.deals.find((item) => item.id === dealId);

  if (!deal) {
    return null;
  }

  await writeDemoPipelineState({
    ...state,
    deals: state.deals
      .filter((item) => item.id !== dealId)
      .map((item, index) =>
        item.stageId === deal.stageId ? { ...item, position: index } : item,
      ),
  });

  return deal;
}
