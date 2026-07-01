import type { DealStage } from "@prisma/client";

import type { PipelineStageSlug } from "@/types/deals";

export const DEFAULT_PIPELINE_NAME = "Revenue Pipeline";

export const DEFAULT_PIPELINE_STAGES: Array<{
  slug: PipelineStageSlug;
  name: string;
  colorClassName: string;
  order: number;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
  stageEnum: DealStage;
}> = [
  {
    slug: "NOVO_LEAD",
    name: "Novo Lead",
    colorClassName: "from-sky-500/18 via-sky-500/8 to-transparent border-sky-500/25",
    order: 0,
    stageEnum: "qualification",
  },
  {
    slug: "PRIMEIRO_CONTATO",
    name: "Primeiro Contato",
    colorClassName: "from-indigo-500/18 via-indigo-500/8 to-transparent border-indigo-500/25",
    order: 1,
    stageEnum: "discovery",
  },
  {
    slug: "PROPOSTA_ENVIADA",
    name: "Proposta Enviada",
    colorClassName: "from-violet-500/18 via-violet-500/8 to-transparent border-violet-500/25",
    order: 2,
    stageEnum: "proposal",
  },
  {
    slug: "NEGOCIACAO",
    name: "Negociação",
    colorClassName: "from-amber-500/18 via-amber-500/8 to-transparent border-amber-500/25",
    order: 3,
    stageEnum: "negotiation",
  },
  {
    slug: "FECHADO_GANHO",
    name: "Fechado Ganho",
    colorClassName: "from-emerald-500/18 via-emerald-500/8 to-transparent border-emerald-500/25",
    order: 4,
    isClosedWon: true,
    stageEnum: "closed",
  },
  {
    slug: "FECHADO_PERDIDO",
    name: "Fechado Perdido",
    colorClassName: "from-rose-500/18 via-rose-500/8 to-transparent border-rose-500/25",
    order: 5,
    isClosedLost: true,
    stageEnum: "closed",
  },
];

export const DEFAULT_WORKSPACE_ID = "demo-workspace";
export const DEFAULT_PIPELINE_ID = "demo-pipeline";
export const DEFAULT_ACTOR = {
  id: "demo-owner-1",
  name: "Walter Machado",
  email: "walter@oslernotes.local",
};

export function getStageMetaBySlug(slug: PipelineStageSlug) {
  return DEFAULT_PIPELINE_STAGES.find((stage) => stage.slug === slug);
}

export function getStageMetaById(stageId: string) {
  return DEFAULT_PIPELINE_STAGES.find((stage) => createDemoStageId(stage.slug) === stageId);
}

export function createDemoStageId(slug: PipelineStageSlug) {
  return `stage-${slug.toLowerCase()}`;
}
