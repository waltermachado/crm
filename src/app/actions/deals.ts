"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getPrismaClient } from "@/lib/db/prisma";
import { getOrCreatePipelineContext } from "@/lib/deals/board";
import {
  deleteDemoDeal,
  moveDemoDeal,
  saveDemoDeal,
} from "@/lib/deals/demo-store";
import { buildDealMovedPayload, emitDealEvent } from "@/lib/deals/events";
import { normalizeDealMoveTargetIndex } from "@/lib/deals/reorder";
import { getStageMetaById } from "@/lib/deals/stage-definitions";
import { hasDatabaseConfig } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";
import type {
  DealActionResult,
  DeleteDealInput,
  DealMoveInput,
  PipelineStageSlug,
  SaveDealInput,
} from "@/types/deals";

const logger = createLogger("deal-actions");

const moveDealSchema = z.object({
  dealId: z.string().min(1),
  sourceStageId: z.string().min(1),
  targetStageId: z.string().min(1),
  sourceIndex: z.number().int().min(0),
  targetIndex: z.number().int().min(0),
});

const saveDealSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3).max(120),
  description: z.string().max(2000).optional(),
  value: z.number().min(0),
  expectedCloseAt: z.string().optional(),
  stageId: z.string().min(1),
  companyName: z.string().trim().min(2).max(120),
  contactName: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  ownerId: z.string().min(1),
});

const deleteDealSchema = z.object({
  dealId: z.string().min(1),
});

function normalizeStageSlug(value?: string | null): PipelineStageSlug {
  const slug = value ?? "NOVO_LEAD";

  if (
    slug === "NOVO_LEAD" ||
    slug === "PRIMEIRO_CONTATO" ||
    slug === "PROPOSTA_ENVIADA" ||
    slug === "NEGOCIACAO" ||
    slug === "FECHADO_GANHO" ||
    slug === "FECHADO_PERDIDO"
  ) {
    return slug;
  }

  return "NOVO_LEAD";
}

async function resequenceStagePositions({
  prisma,
  stageId,
  excludeDealId,
}: {
  prisma: ReturnType<typeof getPrismaClient>;
  stageId: string;
  excludeDealId?: string;
}) {
  const deals = await prisma.deal.findMany({
    where: {
      stageId,
      ...(excludeDealId ? { id: { not: excludeDealId } } : {}),
    },
    orderBy: {
      position: "asc",
    },
    select: {
      id: true,
    },
  });

  await Promise.all(
    deals.map((deal, index) =>
      prisma.deal.update({
        where: {
          id: deal.id,
        },
        data: {
          position: index,
        },
      }),
    ),
  );
}

async function resolveAuxiliaryRelations({
  prisma,
  workspaceId,
  ownerId,
  companyName,
  contactName,
  contactPhone,
}: {
  prisma: ReturnType<typeof getPrismaClient>;
  workspaceId: string;
  ownerId: string;
  companyName: string;
  contactName?: string;
  contactPhone?: string;
}) {
  const owner = await prisma.membership.findFirst({
    where: {
      id: ownerId,
      workspaceId,
    },
  });

  const fallbackOwner =
    owner ??
    (await prisma.membership.findFirst({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: "asc",
      },
    }));

  const company = await prisma.company.upsert({
    where: {
      id: `${workspaceId}-${companyName.toLowerCase().replace(/\s+/g, "-")}`,
    },
    update: {
      name: companyName,
    },
    create: {
      id: `${workspaceId}-${companyName.toLowerCase().replace(/\s+/g, "-")}`,
      workspaceId,
      name: companyName,
    },
  });

  const contact =
    contactName && contactName.trim().length > 0
      ? await prisma.contact.upsert({
          where: {
            id: `${workspaceId}-${contactName.toLowerCase().replace(/\s+/g, "-")}`,
          },
          update: {
            fullName: contactName,
            phone: contactPhone || null,
            companyId: company.id,
          },
          create: {
            id: `${workspaceId}-${contactName.toLowerCase().replace(/\s+/g, "-")}`,
            workspaceId,
            companyId: company.id,
            fullName: contactName,
            phone: contactPhone || null,
            ownerMembershipId: fallbackOwner?.id ?? null,
          },
        })
      : null;

  return {
    owner: fallbackOwner,
    company,
    contact,
  };
}

export async function moveDealAction(input: DealMoveInput): Promise<DealActionResult> {
  const parsed = moveDealSchema.parse(input);

  // #region debug-point D:server-action-input
  fetch("http://127.0.0.1:7778/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"kanban-reorder",runId:"pre-fix",hypothesisId:"D",location:"actions/deals.ts:moveDealAction:input",msg:"[DEBUG] move action input",data:parsed,ts:Date.now()})}).catch(()=>{});
  // #endregion

  if (!hasDatabaseConfig()) {
    const result = await moveDemoDeal(parsed);

    if (!result?.nextDeal) {
      return {
        status: "error",
        message: "Não foi possível mover o negócio.",
      };
    }

    const durationInPreviousStageSeconds = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(result.previousEnteredStageAt).getTime()) / 1000,
      ),
    );

    // #region debug-point E:server-action-demo-result
    fetch("http://127.0.0.1:7778/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"kanban-reorder",runId:"pre-fix",hypothesisId:"E",location:"actions/deals.ts:moveDealAction:demo",msg:"[DEBUG] move action demo result",data:{previousStageSlug:result.previousStageSlug,nextStageSlug:result.nextDeal.stageSlug,nextStageId:result.nextDeal.stageId,nextPosition:result.nextDeal.position},ts:Date.now()})}).catch(()=>{});
    // #endregion

    if (result.previousStageSlug !== result.nextDeal.stageSlug) {
      await emitDealEvent({
        workspaceId: "demo-workspace",
        pipelineId: result.nextDeal.pipelineId,
        stageId: result.nextDeal.stageId,
        dealId: result.nextDeal.id,
        actor: {
          id: result.nextDeal.ownerId,
          name: result.nextDeal.ownerName,
        },
        type: "DEAL_MOVED",
        payload: buildDealMovedPayload({
          actor: {
            id: result.nextDeal.ownerId,
            name: result.nextDeal.ownerName,
          },
          dealId: result.nextDeal.id,
          title: result.nextDeal.title,
          value: result.nextDeal.value,
          fromStage: result.previousStageSlug,
          toStage: result.nextDeal.stageSlug,
          durationInPreviousStageSeconds,
        }).data,
      });
    }

    revalidatePath("/deals");

    return {
      status: "success",
      message: "Negócio movido com sucesso.",
    };
  }

  try {
    const prisma = getPrismaClient();
    const context = await getOrCreatePipelineContext(prisma);

    if (!context) {
      throw new Error("Pipeline context unavailable.");
    }

    const stageMeta = getStageMetaById(parsed.targetStageId);
    const deal = await prisma.deal.findUnique({
      where: {
        id: parsed.dealId,
      },
      include: {
        ownerMembership: true,
        stageRecord: true,
      },
    });

    if (!deal || !stageMeta) {
      throw new Error("Deal or target stage not found.");
    }

    const isStageChange = parsed.sourceStageId !== parsed.targetStageId;

    const sourceDeals = await prisma.deal.findMany({
      where: {
        stageId: parsed.sourceStageId,
        id: {
          not: parsed.dealId,
        },
      },
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
      },
    });

    const targetDeals = await prisma.deal.findMany({
      where: {
        stageId: parsed.targetStageId,
        id: {
          not: parsed.dealId,
        },
      },
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
      },
    });

    const normalizedTargetIndex = normalizeDealMoveTargetIndex({
      sourceStageId: parsed.sourceStageId,
      targetStageId: parsed.targetStageId,
      sourceIndex: parsed.sourceIndex,
      targetIndex: parsed.targetIndex,
      targetLength: targetDeals.length,
    });

    // #region debug-point E:server-action-db-computed
    fetch("http://127.0.0.1:7778/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"kanban-reorder",runId:"pre-fix",hypothesisId:"E",location:"actions/deals.ts:moveDealAction:db",msg:"[DEBUG] move action db computed",data:{isStageChange,sourceDeals:sourceDeals.map((entry)=>entry.id),targetDeals:targetDeals.map((entry)=>entry.id),normalizedTargetIndex},ts:Date.now()})}).catch(()=>{});
    // #endregion

    if (!isStageChange && parsed.sourceIndex === normalizedTargetIndex) {
      return {
        status: "success",
        message: "Posição do negócio mantida.",
      };
    }

    const nextTarget = [...targetDeals];
    nextTarget.splice(normalizedTargetIndex, 0, { id: parsed.dealId });

    await prisma.$transaction(async (tx) => {
      if (isStageChange) {
        await Promise.all(
          sourceDeals.map((entry, index) =>
            tx.deal.update({
              where: {
                id: entry.id,
              },
              data: {
                position: index,
              },
            }),
          ),
        );
      }

      await Promise.all(
        nextTarget.map((entry, index) =>
          tx.deal.update({
            where: {
              id: entry.id,
            },
            data:
              entry.id === parsed.dealId
                ? isStageChange
                  ? {
                      position: index,
                      stageId: parsed.targetStageId,
                      stage: stageMeta.stageEnum,
                      enteredStageAt: new Date(),
                    }
                  : {
                      position: index,
                    }
                : {
                    position: index,
                  },
          }),
        ),
      );

      if (isStageChange) {
        const durationInPreviousStageSeconds = Math.max(
          0,
          Math.floor((Date.now() - deal.enteredStageAt.getTime()) / 1000),
        );

        await tx.dealStageTransition.create({
          data: {
            workspaceId: context.workspaceId,
            dealId: deal.id,
            actorMembershipId: deal.ownerMembershipId,
            fromStageId: deal.stageId,
            toStageId: parsed.targetStageId,
            durationInPreviousStageSeconds,
          },
        });

        await emitDealEvent({
          prisma: tx,
          workspaceId: context.workspaceId,
          pipelineId: context.pipelineId,
          stageId: parsed.targetStageId,
          dealId: deal.id,
          actor: deal.ownerMembership
            ? {
                id: deal.ownerMembership.id,
                name: deal.ownerMembership.fullName,
                email: deal.ownerMembership.email,
              }
            : context.actor,
          type: "DEAL_MOVED",
          payload: buildDealMovedPayload({
            actor: {
              id: deal.ownerMembership?.id ?? context.actor.id,
              name: deal.ownerMembership?.fullName ?? context.actor.name,
            },
            dealId: deal.id,
            title: deal.name,
            value: Number(deal.valueCents) / 100,
            fromStage: normalizeStageSlug(deal.stageRecord?.slug),
            toStage: stageMeta.slug,
            durationInPreviousStageSeconds,
          }).data,
        });
      }
    });

    revalidatePath("/deals");

    return {
      status: "success",
      message: "Negócio movido com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to move deal.", error);

    return {
      status: "error",
      message: "Não foi possível persistir a movimentação do negócio.",
    };
  }
}

export async function saveDealAction(input: SaveDealInput): Promise<DealActionResult> {
  const parsed = saveDealSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await saveDemoDeal(parsed);

    if (!result?.deal) {
      return {
        status: "error",
        message: "Não foi possível salvar o negócio.",
      };
    }

    const eventType = result.isNew ? "DEAL_CREATED" : "DEAL_UPDATED";

    await emitDealEvent({
      workspaceId: "demo-workspace",
      pipelineId: result.deal.pipelineId,
      stageId: result.deal.stageId,
      dealId: result.deal.id,
      actor: {
        id: result.deal.ownerId,
        name: result.deal.ownerName,
      },
      type: eventType,
      payload: {
        dealId: result.deal.id,
        title: result.deal.title,
        value: result.deal.value,
        stage: result.deal.stageSlug,
        companyName: result.deal.companyName,
        contactPhone: result.deal.contactPhone ?? null,
      },
    });

    if (!result.isNew && result.previousStageSlug && result.previousStageSlug !== result.deal.stageSlug) {
      await emitDealEvent({
        workspaceId: "demo-workspace",
        pipelineId: result.deal.pipelineId,
        stageId: result.deal.stageId,
        dealId: result.deal.id,
        actor: {
          id: result.deal.ownerId,
          name: result.deal.ownerName,
        },
        type: "DEAL_MOVED",
        payload: buildDealMovedPayload({
          actor: {
            id: result.deal.ownerId,
            name: result.deal.ownerName,
          },
          dealId: result.deal.id,
          title: result.deal.title,
          value: result.deal.value,
          fromStage: result.previousStageSlug,
          toStage: result.deal.stageSlug,
          durationInPreviousStageSeconds: result.previousEnteredStageAt
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - new Date(result.previousEnteredStageAt).getTime()) / 1000,
                ),
              )
            : 0,
        }).data,
      });
    }

    revalidatePath("/deals");

    return {
      status: "success",
      message: result.isNew
        ? "Negócio criado com sucesso."
        : "Negócio atualizado com sucesso.",
    };
  }

  try {
    const prisma = getPrismaClient();
    const context = await getOrCreatePipelineContext(prisma);

    if (!context) {
      throw new Error("Pipeline context unavailable.");
    }

    const stageMeta = getStageMetaById(parsed.stageId);

    if (!stageMeta) {
      throw new Error("Target stage not found.");
    }

    const relations = await resolveAuxiliaryRelations({
      prisma,
      workspaceId: context.workspaceId,
      ownerId: parsed.ownerId,
      companyName: parsed.companyName,
      contactName: parsed.contactName,
      contactPhone: parsed.contactPhone,
    });

    const existing = parsed.id
      ? await prisma.deal.findUnique({
          where: {
            id: parsed.id,
          },
          include: {
            stageRecord: true,
            ownerMembership: true,
          },
        })
      : null;

    const nextPosition = existing
      ? existing.position
      : await prisma.deal.count({
          where: {
            stageId: parsed.stageId,
          },
        });

    const savedDeal = existing
      ? await prisma.deal.update({
          where: {
            id: existing.id,
          },
          data: {
            name: parsed.title,
            description: parsed.description,
            valueCents: BigInt(Math.round(parsed.value * 100)),
            expectedCloseAt: parsed.expectedCloseAt ? new Date(parsed.expectedCloseAt) : null,
            stageId: parsed.stageId,
            stage: stageMeta.stageEnum,
            companyId: relations.company.id,
            contactId: relations.contact?.id ?? null,
            ownerMembershipId: relations.owner?.id ?? null,
            enteredStageAt:
              existing.stageId === parsed.stageId ? existing.enteredStageAt : new Date(),
          },
          include: {
            stageRecord: true,
            ownerMembership: true,
          },
        })
      : await prisma.deal.create({
          data: {
            workspaceId: context.workspaceId,
            pipelineId: context.pipelineId,
            stageId: parsed.stageId,
            stage: stageMeta.stageEnum,
            name: parsed.title,
            description: parsed.description,
            valueCents: BigInt(Math.round(parsed.value * 100)),
            expectedCloseAt: parsed.expectedCloseAt ? new Date(parsed.expectedCloseAt) : null,
            position: nextPosition,
            companyId: relations.company.id,
            contactId: relations.contact?.id ?? null,
            ownerMembershipId: relations.owner?.id ?? null,
          },
          include: {
            stageRecord: true,
            ownerMembership: true,
          },
        });

    if (existing && existing.stageId !== parsed.stageId) {
      await resequenceStagePositions({
        prisma,
        stageId: existing.stageId ?? parsed.stageId,
        excludeDealId: savedDeal.id,
      });

      const durationInPreviousStageSeconds = Math.max(
        0,
        Math.floor((Date.now() - existing.enteredStageAt.getTime()) / 1000),
      );

      await prisma.dealStageTransition.create({
        data: {
          workspaceId: context.workspaceId,
          dealId: savedDeal.id,
          actorMembershipId: savedDeal.ownerMembershipId,
          fromStageId: existing.stageId,
          toStageId: parsed.stageId,
          durationInPreviousStageSeconds,
        },
      });

      await emitDealEvent({
        prisma,
        workspaceId: context.workspaceId,
        pipelineId: context.pipelineId,
        stageId: parsed.stageId,
        dealId: savedDeal.id,
        actor: savedDeal.ownerMembership
          ? {
              id: savedDeal.ownerMembership.id,
              name: savedDeal.ownerMembership.fullName,
              email: savedDeal.ownerMembership.email,
            }
          : context.actor,
        type: "DEAL_MOVED",
        payload: buildDealMovedPayload({
          actor: {
            id: savedDeal.ownerMembership?.id ?? context.actor.id,
            name: savedDeal.ownerMembership?.fullName ?? context.actor.name,
          },
          dealId: savedDeal.id,
          title: savedDeal.name,
          value: Number(savedDeal.valueCents) / 100,
          fromStage: normalizeStageSlug(existing.stageRecord?.slug),
          toStage: stageMeta.slug,
          durationInPreviousStageSeconds,
        }).data,
      });
    }

    await emitDealEvent({
      prisma,
      workspaceId: context.workspaceId,
      pipelineId: context.pipelineId,
      stageId: parsed.stageId,
      dealId: savedDeal.id,
      actor: savedDeal.ownerMembership
        ? {
            id: savedDeal.ownerMembership.id,
            name: savedDeal.ownerMembership.fullName,
            email: savedDeal.ownerMembership.email,
          }
        : context.actor,
      type: existing ? "DEAL_UPDATED" : "DEAL_CREATED",
      payload: {
        dealId: savedDeal.id,
        title: savedDeal.name,
        value: Number(savedDeal.valueCents) / 100,
        stage: stageMeta.slug,
        companyName: relations.company.name,
        contactPhone: relations.contact?.phone ?? null,
      },
    });

    revalidatePath("/deals");

    return {
      status: "success",
      message: existing
        ? "Negócio atualizado com sucesso."
        : "Negócio criado com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to save deal.", error);

    return {
      status: "error",
      message: "Não foi possível salvar o negócio.",
    };
  }
}

export async function deleteDealAction(
  input: DeleteDealInput,
): Promise<DealActionResult> {
  const parsed = deleteDealSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const deleted = await deleteDemoDeal(parsed.dealId);

    if (!deleted) {
      return {
        status: "error",
        message: "Negócio não encontrado.",
      };
    }

    await emitDealEvent({
      workspaceId: "demo-workspace",
      pipelineId: deleted.pipelineId,
      stageId: deleted.stageId,
      dealId: deleted.id,
      actor: {
        id: deleted.ownerId,
        name: deleted.ownerName,
      },
      type: "DEAL_DELETED",
      payload: {
        dealId: deleted.id,
        title: deleted.title,
        value: deleted.value,
        stage: deleted.stageSlug,
      },
    });

    revalidatePath("/deals");

    return {
      status: "success",
      message: "Negócio removido com sucesso.",
    };
  }

  try {
    const prisma = getPrismaClient();
    const context = await getOrCreatePipelineContext(prisma);

    if (!context) {
      throw new Error("Pipeline context unavailable.");
    }

    const deal = await prisma.deal.findUnique({
      where: {
        id: parsed.dealId,
      },
      include: {
        ownerMembership: true,
        stageRecord: true,
      },
    });

    if (!deal) {
      throw new Error("Deal not found.");
    }

    await prisma.deal.delete({
      where: {
        id: deal.id,
      },
    });

    if (deal.stageId) {
      await resequenceStagePositions({
        prisma,
        stageId: deal.stageId,
      });
    }

    await emitDealEvent({
      prisma,
      workspaceId: context.workspaceId,
      pipelineId: context.pipelineId,
      stageId: deal.stageId,
      dealId: deal.id,
      actor: deal.ownerMembership
        ? {
            id: deal.ownerMembership.id,
            name: deal.ownerMembership.fullName,
            email: deal.ownerMembership.email,
          }
        : context.actor,
      type: "DEAL_DELETED",
      payload: {
        dealId: deal.id,
        title: deal.name,
        value: Number(deal.valueCents) / 100,
        stage: deal.stageRecord?.slug ?? null,
      },
    });

    revalidatePath("/deals");

    return {
      status: "success",
      message: "Negócio removido com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to delete deal.", error);

    return {
      status: "error",
      message: "Não foi possível excluir o negócio.",
    };
  }
}
