export type DealEventName =
  | "DEAL_CREATED"
  | "DEAL_UPDATED"
  | "DEAL_MOVED"
  | "DEAL_DELETED";

export type PipelineStageSlug =
  | "NOVO_LEAD"
  | "PRIMEIRO_CONTATO"
  | "PROPOSTA_ENVIADA"
  | "NEGOCIACAO"
  | "FECHADO_GANHO"
  | "FECHADO_PERDIDO";

export type DealOwnerSummary = {
  id: string;
  name: string;
  email?: string | null;
};

export type DealCompanySummary = {
  id?: string | null;
  name: string;
};

export type DealCardRecord = {
  id: string;
  title: string;
  companyName: string;
  displayValue: string;
  value: number;
  expectedCloseAt?: string | null;
  expectedCloseLabel: string;
  owner: DealOwnerSummary;
  contactName?: string | null;
  contactPhone?: string | null;
  stageId: string;
  stageSlug: PipelineStageSlug;
  position: number;
};

export type DealStageRecord = {
  id: string;
  slug: PipelineStageSlug;
  label: string;
  colorClassName: string;
  dealCount: number;
  totalValue: number;
  displayTotalValue: string;
  items: DealCardRecord[];
};

export type DealDetailsRecord = {
  id: string;
  title: string;
  description?: string | null;
  companyName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  owner: DealOwnerSummary;
  value: number;
  displayValue: string;
  expectedCloseAt?: string | null;
  expectedCloseLabel: string;
  stageId: string;
  stageSlug: PipelineStageSlug;
  pipelineId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type DealsBoardSnapshot = {
  pipelineId: string;
  pipelineName: string;
  stages: DealStageRecord[];
  dealsById: Record<string, DealDetailsRecord>;
  owners: DealOwnerSummary[];
  canPersistToDatabase: boolean;
  webhookEnabled: boolean;
  totals: {
    openDeals: number;
    openValue: number;
    displayOpenValue: string;
  };
};

export type DealMoveInput = {
  dealId: string;
  sourceStageId: string;
  targetStageId: string;
  sourceIndex: number;
  targetIndex: number;
};

export type SaveDealInput = {
  id?: string;
  title: string;
  description?: string;
  value: number;
  expectedCloseAt?: string;
  stageId: string;
  companyName: string;
  contactName?: string;
  contactPhone?: string;
  ownerId: string;
};

export type DeleteDealInput = {
  dealId: string;
};

export type DealActionResult = {
  status: "idle" | "success" | "error";
  message: string;
};

export type DealMovedEventPayload = {
  event: "DEAL_MOVED";
  timestamp: string;
  actor: { id: string; name: string };
  data: {
    dealId: string;
    title: string;
    value: number;
    fromStage: PipelineStageSlug;
    toStage: PipelineStageSlug;
    durationInPreviousStageSeconds: number;
  };
};
