"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

import { DealCard } from "@/components/deals/deal-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DealStageRecord } from "@/types/deals";

export function DealColumn({
  stage,
  onOpenDeal,
}: {
  stage: DealStageRecord;
  onOpenDeal: (dealId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: "stage",
      stageId: stage.id,
    },
  });

  return (
    <section
      className={cn(
        "flex h-full min-h-[540px] w-[320px] shrink-0 flex-col rounded-[30px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.5))] p-4 shadow-[0_28px_80px_-58px_rgba(15,23,42,0.75)] backdrop-blur dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.7))]",
        isOver && "ring-2 ring-primary/25",
      )}
    >
      <div
        className={cn(
          "rounded-[24px] border border-border/70 bg-radial-[at_top] p-4",
          stage.colorClassName,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {stage.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stage.dealCount} negócios ativos
            </p>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-border/80 bg-background/70 px-2.5 py-1 text-[11px]"
          >
            {stage.displayTotalValue}
          </Badge>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="mt-4 flex flex-1 flex-col gap-3 rounded-[24px] border border-dashed border-border/70 bg-background/25 p-2"
      >
        <SortableContext
          items={stage.items.map((deal) => deal.id)}
          strategy={verticalListSortingStrategy}
        >
          {stage.items.map((deal) => (
            <DealCard key={deal.id} deal={deal} onOpen={onOpenDeal} />
          ))}
        </SortableContext>

        {stage.items.length === 0 ? (
          <div className="flex min-h-36 items-center justify-center rounded-[20px] border border-dashed border-border/70 bg-background/60 px-4 text-center text-sm text-muted-foreground">
            Arraste um negócio para iniciar esta etapa.
          </div>
        ) : null}
      </div>
    </section>
  );
}
