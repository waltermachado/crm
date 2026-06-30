import "server-only";

import { Prisma, type DealEventType, type PrismaClient } from "@prisma/client";

import { getServerEnv } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";
import type { DealMovedEventPayload, DealOwnerSummary, PipelineStageSlug } from "@/types/deals";

const logger = createLogger("deal-events");

type EventActor = {
  id: string;
  name: string;
};

type EventInput = {
  prisma?: PrismaClient | Prisma.TransactionClient;
  workspaceId: string;
  pipelineId?: string | null;
  stageId?: string | null;
  dealId?: string | null;
  actor?: DealOwnerSummary;
  type: DealEventType;
  payload: Record<string, unknown>;
};

export function buildDealMovedPayload(input: {
  actor: EventActor;
  dealId: string;
  title: string;
  value: number;
  fromStage: PipelineStageSlug;
  toStage: PipelineStageSlug;
  durationInPreviousStageSeconds: number;
}): DealMovedEventPayload {
  return {
    event: "DEAL_MOVED",
    timestamp: new Date().toISOString(),
    actor: input.actor,
    data: {
      dealId: input.dealId,
      title: input.title,
      value: input.value,
      fromStage: input.fromStage,
      toStage: input.toStage,
      durationInPreviousStageSeconds: input.durationInPreviousStageSeconds,
    },
  };
}

async function postWebhook(payload: Record<string, unknown>) {
  const env = getServerEnv();

  if (!env.DEAL_EVENTS_WEBHOOK_URL) {
    logger.info("Skipping webhook dispatch because DEAL_EVENTS_WEBHOOK_URL is not configured.");
    return {
      webhookUrl: null,
      responseStatus: null,
      deliveredAt: null,
    };
  }

  try {
    const response = await fetch(env.DEAL_EVENTS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    return {
      webhookUrl: env.DEAL_EVENTS_WEBHOOK_URL,
      responseStatus: response.status,
      deliveredAt: response.ok ? new Date() : null,
    };
  } catch (error) {
    logger.error("Failed to dispatch deal webhook.", error);

    return {
      webhookUrl: env.DEAL_EVENTS_WEBHOOK_URL,
      responseStatus: 0,
      deliveredAt: null,
    };
  }
}

export async function emitDealEvent(input: EventInput) {
  const actor = input.actor ?? {
    id: "system",
    name: "System",
  };

  const payload = {
    event: input.type,
    timestamp: new Date().toISOString(),
    actor: {
      id: actor.id,
      name: actor.name,
    },
    data: input.payload,
  };

  const delivery = await postWebhook(payload);

  if (input.prisma) {
    await input.prisma.dealEventLog.create({
      data: {
        workspaceId: input.workspaceId,
        pipelineId: input.pipelineId ?? null,
        stageId: input.stageId ?? null,
        dealId: input.dealId ?? null,
        actorMembershipId: input.actor?.id ?? null,
        eventType: input.type,
        payload: payload as Prisma.InputJsonValue,
        webhookUrl: delivery.webhookUrl,
        responseStatus: delivery.responseStatus,
        deliveredAt: delivery.deliveredAt,
      },
    });
  }

  return payload;
}
