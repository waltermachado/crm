import type { DealCardRecord, DealMoveInput, DealStageRecord } from "@/types/deals";

function reorderStageItems(items: DealCardRecord[]) {
  return items.map((item, index) => ({
    ...item,
    position: index,
  }));
}

export function normalizeDealMoveTargetIndex(input: {
  sourceStageId: string;
  targetStageId: string;
  sourceIndex: number;
  targetIndex: number;
  targetLength: number;
}) {
  const isSameStage = input.sourceStageId === input.targetStageId;
  const adjustedIndex =
    isSameStage && input.sourceIndex < input.targetIndex
      ? input.targetIndex - 1
      : input.targetIndex;

  return Math.max(0, Math.min(adjustedIndex, input.targetLength));
}

export function moveDealBetweenStages(
  stages: DealStageRecord[],
  input: DealMoveInput,
): DealStageRecord[] {
  const nextStages = stages.map((stage) => ({
    ...stage,
    items: [...stage.items],
  }));

  const sourceStage = nextStages.find((stage) => stage.id === input.sourceStageId);
  const targetStage = nextStages.find((stage) => stage.id === input.targetStageId);

  if (!sourceStage || !targetStage) {
    return stages;
  }

  const [movedCard] = sourceStage.items.splice(input.sourceIndex, 1);

  if (!movedCard) {
    return stages;
  }

  const normalizedTargetIndex = normalizeDealMoveTargetIndex({
    sourceStageId: input.sourceStageId,
    targetStageId: input.targetStageId,
    sourceIndex: input.sourceIndex,
    targetIndex: input.targetIndex,
    targetLength: targetStage.items.length,
  });

  const updatedCard: DealCardRecord = {
    ...movedCard,
    stageId: targetStage.id,
    stageSlug: targetStage.slug,
  };

  targetStage.items.splice(normalizedTargetIndex, 0, updatedCard);

  sourceStage.items = reorderStageItems(sourceStage.items);
  targetStage.items = reorderStageItems(targetStage.items);

  return nextStages.map((stage) => {
    const totalValue = stage.items.reduce((sum, item) => sum + item.value, 0);

    return {
      ...stage,
      dealCount: stage.items.length,
      totalValue,
    };
  });
}
