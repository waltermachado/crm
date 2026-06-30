"use client";

import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GripVertical, Phone, UserRound } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DealCardRecord } from "@/types/deals";

export function DealCard({
  deal,
  onOpen,
  isOverlay = false,
}: {
  deal: DealCardRecord;
  onOpen?: (dealId: string) => void;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: {
      type: "deal",
      stageId: deal.stageId,
      dealId: deal.id,
    },
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.78))] p-4 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_32px_70px_-40px_rgba(15,23,42,0.6)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.82))]",
        isDragging && "opacity-40",
        isOverlay && "rotate-1 shadow-[0_35px_90px_-45px_rgba(15,23,42,0.85)]",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 rounded-lg border border-border/70 bg-background/70 p-1.5 text-muted-foreground transition hover:text-foreground"
          aria-label={`Arrastar ${deal.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen?.(deal.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">
                {deal.title}
              </h3>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {deal.companyName}
              </p>
            </div>
            <Badge className="rounded-full bg-primary/10 px-2 py-0.5 text-primary hover:bg-primary/10">
              {deal.displayValue}
            </Badge>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-3.5" />
              <span>{deal.expectedCloseLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserRound className="size-3.5" />
              <span>{deal.owner.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-3.5" />
              <span>{deal.contactPhone ?? "Telefone não informado"}</span>
            </div>
          </div>
        </button>
      </div>
    </article>
  );
}
