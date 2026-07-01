import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import { supabaseAdmin } from "@/lib/db/supabase";
import { hasDatabaseConfig } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";
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

type Deal = Database["public"]["Tables"]["Deal"]["Row"];
type PipelineStage = Database["public"]["Tables"]["PipelineStage"]["Row"];
type Membership = Database["public"]["Tables"]["Membership"]["Row"];

const logger = createLogger("deals-board");

type PipelineContext = {
  workspaceId: string;
  pipelineId: string;
  stages: Array<Pick<PipelineStage, "id" | "name" | "slug" | "position" | "colorToken">>;
  actor: DealOwnerSummary;
};

function formatExpectedClose(expectedCloseAt: string | null, locale: AppLocale) {
  if (!expectedCloseAt) {
    return locale === "pt-BR" ? "Sem previsão" : "No forecast";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(expectedCloseAt));
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
  deal: Deal & {
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
    displayValue: formatCurrencyFromCents(Number(deal.valueCents), locale),
    expectedCloseAt: deal.expectedCloseAt ?? null,
    expectedCloseLabel: formatExpectedClose(deal.expectedCloseAt, locale),
    stageId: deal.stageId ?? "",
    stageSlug: (deal.stageRecord?.slug as PipelineStageSlug | undefined) ?? "NOVO_LEAD",
    pipelineId: deal.pipelineId ?? "",
    position: deal.position,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

async function ensureWorkspace(supabase: SupabaseClient<Database>) {
  const { data: existing } = await supabase
    .from("Workspace")
    .select("*")
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("Workspace")
    .insert({
      id: DEFAULT_WORKSPACE_ID,
      name: "OslerNotes CRM",
      slug: "oslernotes-crm",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

async function ensureActor(supabase: SupabaseClient<Database>, workspaceId: string): Promise<Membership> {
  const { data: existing } = await supabase
    .from("Membership")
    .select("*")
    .eq("workspaceId", workspaceId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("Membership")
    .insert({
      id: crypto.randomUUID(),
      workspaceId,
      userId: DEFAULT_ACTOR.id,
      email: DEFAULT_ACTOR.email,
      fullName: DEFAULT_ACTOR.name,
      role: "admin",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

async function ensureDefaultPipeline(supabase: SupabaseClient<Database>, workspaceId: string) {
  const { data: existing } = await supabase
    .from("Pipeline")
    .select(`
      *,
      stages:PipelineStage(*)
    `)
    .eq("workspaceId", workspaceId)
    .eq("isDefault", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    existing.stages.sort((a, b) => a.position - b.position);
    return existing;
  }

  const { data: pipeline, error: pipeError } = await supabase
    .from("Pipeline")
    .insert({
      id: crypto.randomUUID(),
      workspaceId,
      name: DEFAULT_PIPELINE_NAME,
      isDefault: true,
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (pipeError) throw pipeError;

  const stagesToInsert = DEFAULT_PIPELINE_STAGES.map((stage) => ({
    id: crypto.randomUUID(),
    workspaceId,
    pipelineId: pipeline.id,
    name: stage.name,
    slug: stage.slug,
    position: stage.order,
    colorToken: stage.colorClassName,
    isClosedWon: stage.isClosedWon ?? false,
    isClosedLost: stage.isClosedLost ?? false,
    updatedAt: new Date().toISOString(),
  }));

  const { data: stages, error: stagesError } = await supabase
    .from("PipelineStage")
    .insert(stagesToInsert)
    .select();

  if (stagesError) throw stagesError;

  return {
    ...pipeline,
    stages: stages.sort((a, b) => a.position - b.position),
  };
}

export async function getOrCreatePipelineContext(
  supabase = supabaseAdmin,
): Promise<PipelineContext | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  const workspace = await ensureWorkspace(supabase);
  const actor = await ensureActor(supabase, workspace.id);
  const pipeline = await ensureDefaultPipeline(supabase, workspace.id);

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
    throw new Error("Database configuration is missing.");
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getOrCreatePipelineContext(supabase);

    if (!context) {
      throw new Error("Pipeline context could not be created.");
    }

    const [dealsResult, ownersResult] = await Promise.all([
      supabase
        .from("Deal")
        .select(`
          *,
          stageRecord:PipelineStage(*),
          company:Company(*),
          contact:Contact(*),
          ownerMembership:Membership(*)
        `)
        .eq("pipelineId", context.pipelineId),
      supabase
        .from("Membership")
        .select("*")
        .eq("workspaceId", context.workspaceId)
        .order("fullName", { ascending: true }),
    ]);

    if (dealsResult.error) throw dealsResult.error;
    if (ownersResult.error) throw ownersResult.error;

    const deals = dealsResult.data as any[];
    
    // sorting logic originally from prisma orderby
    deals.sort((a, b) => {
      const stageDiff = (a.stageRecord?.position ?? 0) - (b.stageRecord?.position ?? 0);
      if (stageDiff !== 0) return stageDiff;
      return a.position - b.position;
    });

    const owners = ownersResult.data;

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
    logger.error("Failed to load deals pipeline.", error);
    throw error;
  }
}
