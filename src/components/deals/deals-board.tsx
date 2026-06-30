"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowRightLeft, Bot, Plus, Rows3, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

import { moveDealAction } from "@/app/actions/deals";
import { DealCard } from "@/components/deals/deal-card";
import { DealColumn } from "@/components/deals/deal-column";
import { DealSheet } from "@/components/deals/deal-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { moveDealBetweenStages, normalizeDealMoveTargetIndex } from "@/lib/deals/reorder";
import type { DealCardRecord, DealsBoardSnapshot, DealStageRecord } from "@/types/deals";

function findStageByDealId(stages: DealStageRecord[], dealId: string) {
  return stages.find((stage) => stage.items.some((item) => item.id === dealId));
}

function findDealById(stages: DealStageRecord[], dealId: string): DealCardRecord | undefined {
  return stages.flatMap((stage) => stage.items).find((item) => item.id === dealId);
}

export function DealsBoard({ snapshot }: { snapshot: DealsBoardSnapshot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [stages, setStages] = useState(snapshot.stages);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    setStages(snapshot.stages);
  }, [snapshot.stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedDeal = selectedDealId ? snapshot.dealsById[selectedDealId] ?? null : null;
  const activeDeal = activeDealId ? findDealById(stages, activeDealId) : undefined;

  const analytics = useMemo(
    () => [
      {
        icon: Rows3,
        label: "Etapas ativas",
        value: String(stages.length),
        hint: "Quadro horizontal com foco em throughput comercial.",
      },
      {
        icon: TrendingUp,
        label: "Pipeline aberto",
        value: snapshot.totals.displayOpenValue,
        hint: `${snapshot.totals.openDeals} negócios em andamento.`,
      },
      {
        icon: ArrowRightLeft,
        label: "Persistência",
        value: snapshot.canPersistToDatabase ? "Banco + Actions" : "Demo + Actions",
        hint: "Atualização otimista com confirmação assíncrona.",
      },
      {
        icon: Bot,
        label: "Webhooks",
        value: snapshot.webhookEnabled ? "Ativos" : "Configuráveis",
        hint: "Eventos DEAL_* emitidos por ação de servidor.",
      },
    ],
    [snapshot.canPersistToDatabase, snapshot.totals.displayOpenValue, snapshot.totals.openDeals, snapshot.webhookEnabled, stages.length],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null);

    const { active, over } = event;

    // #region debug-point A:dnd-raw-event
    fetch("http://127.0.0.1:7778/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"kanban-reorder",runId:"pre-fix",hypothesisId:"A",location:"deals-board.tsx:handleDragEnd:raw",msg:"[DEBUG] drag end raw event",data:{activeId:String(active.id),overId:over?String(over.id):null},ts:Date.now()})}).catch(()=>{});
    // #endregion

    if (!over || active.id === over.id) {
      return;
    }

    const sourceStage = findStageByDealId(stages, String(active.id));

    if (!sourceStage) {
      return;
    }

    const targetStage =
      stages.find((stage) => stage.id === String(over.id)) ??
      findStageByDealId(stages, String(over.id));

    if (!targetStage) {
      return;
    }

    const sourceIndex = sourceStage.items.findIndex((item) => item.id === active.id);
    const targetIndex =
      targetStage.items.findIndex((item) => item.id === over.id) >= 0
        ? targetStage.items.findIndex((item) => item.id === over.id)
        : targetStage.items.length;
    const normalizedTargetIndex = normalizeDealMoveTargetIndex({
      sourceStageId: sourceStage.id,
      targetStageId: targetStage.id,
      sourceIndex,
      targetIndex,
      targetLength: targetStage.items.length,
    });

    // #region debug-point B:dnd-computed-target
    fetch("http://127.0.0.1:7778/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"kanban-reorder",runId:"pre-fix",hypothesisId:"B",location:"deals-board.tsx:handleDragEnd:computed",msg:"[DEBUG] drag end computed move",data:{dealId:String(active.id),sourceStageId:sourceStage.id,targetStageId:targetStage.id,sourceIndex,targetIndex,normalizedTargetIndex,targetLength:targetStage.items.length,targetItems:targetStage.items.map((item)=>item.id)},ts:Date.now()})}).catch(()=>{});
    // #endregion

    if (sourceStage.id === targetStage.id && sourceIndex === normalizedTargetIndex) {
      return;
    }

    const nextStages = moveDealBetweenStages(stages, {
      dealId: String(active.id),
      sourceStageId: sourceStage.id,
      targetStageId: targetStage.id,
      sourceIndex,
      targetIndex: normalizedTargetIndex,
    });

    setStages(nextStages);
    setStatusMessage("Movimentando negócio...");

    startTransition(async () => {
      const result = await moveDealAction({
        dealId: String(active.id),
        sourceStageId: sourceStage.id,
        targetStageId: targetStage.id,
        sourceIndex,
        targetIndex: normalizedTargetIndex,
      });

      // #region debug-point C:dnd-server-result
      fetch("http://127.0.0.1:7778/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"kanban-reorder",runId:"pre-fix",hypothesisId:"C",location:"deals-board.tsx:handleDragEnd:result",msg:"[DEBUG] drag end server result",data:{dealId:String(active.id),sourceStageId:sourceStage.id,targetStageId:targetStage.id,sourceIndex,normalizedTargetIndex,resultStatus:result.status,resultMessage:result.message},ts:Date.now()})}).catch(()=>{});
      // #endregion

      setStatusMessage(result.message);

      if (result.status === "error") {
        setStages(snapshot.stages);
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Card className="border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.88),rgba(255,255,255,0.62))] shadow-[0_30px_90px_-60px_rgba(15,23,42,0.8)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.82))]">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                Pipeline operacional
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-background/70 px-3 py-1 text-[11px]"
              >
                Experiência estilo HubSpot com automação por eventos
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight">
                Quadro de negócios com arrastar e soltar, métricas ao vivo e contexto de automação.
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6 text-foreground/75">
                Atualize etapas de forma instantânea na interface enquanto as Server Actions
                persistem a posição do card e disparam webhooks descritivos para integrações.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {analytics.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{item.label}</p>
                    <Icon className="size-4 text-primary" />
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.hint}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/80 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.85)]">
          <CardHeader>
            <CardTitle className="text-lg">Ações rápidas</CardTitle>
            <CardDescription>
              Abra um novo negócio ou acompanhe o status da sincronização.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-center rounded-xl" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Novo negócio
            </Button>
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground"
            >
              {statusMessage || "Pronto para registrar transições e emitir eventos DEAL_*."}
            </div>
            {isPending ? (
              <p className="text-xs text-muted-foreground">
                Sincronizando atualização do pipeline...
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {stages.map((stage) => (
              <DealColumn
                key={stage.id}
                stage={stage}
                onOpenDeal={(dealId) => setSelectedDealId(dealId)}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <DealSheet
        open={Boolean(selectedDeal)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDealId(null);
          }
        }}
        deal={selectedDeal}
        stages={snapshot.stages}
        owners={snapshot.owners}
      />

      <DealSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        deal={null}
        stages={snapshot.stages}
        owners={snapshot.owners}
      />
    </div>
  );
}
