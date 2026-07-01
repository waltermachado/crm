"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAdmin } from "@/lib/db/supabase";
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
  supabase,
  stageId,
  excludeDealId,
}: {
  supabase: SupabaseClient<Database>;
  stageId: string;
  excludeDealId?: string;
}) {
  let query = supabase
    .from("Deal")
    .select("id")
    .eq("stageId", stageId)
    .order("position", { ascending: true });

  if (excludeDealId) {
    query = query.neq("id", excludeDealId);
  }

  const { data: deals } = await query;
  if (!deals) return;

  await Promise.all(
    deals.map((deal, index) =>
      supabase
        .from("Deal")
        .update({ position: index })
        .eq("id", deal.id)
    )
  );
}

async function resolveAuxiliaryRelations({
  supabase,
  workspaceId,
  ownerId,
  companyName,
  contactName,
  contactPhone,
}: {
  supabase: SupabaseClient<Database>;
  workspaceId: string;
  ownerId: string;
  companyName: string;
  contactName?: string;
  contactPhone?: string;
}) {
  const { data: owner } = await supabase
    .from("Membership")
    .select("*")
    .eq("id", ownerId)
    .eq("workspaceId", workspaceId)
    .maybeSingle();

  let fallbackOwner = owner;
  if (!fallbackOwner) {
    const { data: firstOwner } = await supabase
      .from("Membership")
      .select("*")
      .eq("workspaceId", workspaceId)
      .order("createdAt", { ascending: true })
      .limit(1)
      .single();
    fallbackOwner = firstOwner;
  }

  const companyId = `${workspaceId}-${companyName.toLowerCase().replace(/\s+/g, "-")}`;
  const { data: existingCompany } = await supabase
    .from("Company")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  let company;
  if (existingCompany) {
    const { data: updatedCompany } = await supabase
      .from("Company")
      .update({ name: companyName, updatedAt: new Date().toISOString() })
      .eq("id", companyId)
      .select()
      .single();
    company = updatedCompany;
  } else {
    const { data: createdCompany } = await supabase
      .from("Company")
      .insert({
        id: companyId,
        workspaceId,
        name: companyName,
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
    company = createdCompany;
  }

  let contact = null;
  if (contactName && contactName.trim().length > 0) {
    const contactId = `${workspaceId}-${contactName.toLowerCase().replace(/\s+/g, "-")}`;
    const { data: existingContact } = await supabase
      .from("Contact")
      .select("*")
      .eq("id", contactId)
      .maybeSingle();

    if (existingContact) {
      const { data: updatedContact } = await supabase
        .from("Contact")
        .update({
          fullName: contactName,
          phone: contactPhone || null,
          companyId: company!.id,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", contactId)
        .select()
        .single();
      contact = updatedContact;
    } else {
      const { data: createdContact } = await supabase
        .from("Contact")
        .insert({
          id: contactId,
          workspaceId,
          companyId: company!.id,
          fullName: contactName,
          phone: contactPhone || null,
          ownerMembershipId: fallbackOwner?.id ?? null,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();
      contact = createdContact;
    }
  }

  return {
    owner: fallbackOwner,
    company: company!,
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
    const supabase = supabaseAdmin;
    const context = await getOrCreatePipelineContext(supabase);

    if (!context) {
      throw new Error("Pipeline context unavailable.");
    }

    const stageMeta = getStageMetaById(parsed.targetStageId);
    
    const { data: deal } = await supabase
      .from("Deal")
      .select("*, ownerMembership:Membership(*), stageRecord:PipelineStage(*)")
      .eq("id", parsed.dealId)
      .maybeSingle();

    if (!deal || !stageMeta) {
      throw new Error("Deal or target stage not found.");
    }

    const isStageChange = parsed.sourceStageId !== parsed.targetStageId;

    const { data: sourceDealsData } = await supabase
      .from("Deal")
      .select("id")
      .eq("stageId", parsed.sourceStageId)
      .neq("id", parsed.dealId)
      .order("position", { ascending: true });
    
    const sourceDeals = sourceDealsData || [];

    const { data: targetDealsData } = await supabase
      .from("Deal")
      .select("id")
      .eq("stageId", parsed.targetStageId)
      .neq("id", parsed.dealId)
      .order("position", { ascending: true });

    const targetDeals = targetDealsData || [];

    const normalizedTargetIndex = normalizeDealMoveTargetIndex({
      sourceStageId: parsed.sourceStageId,
      targetStageId: parsed.targetStageId,
      sourceIndex: parsed.sourceIndex,
      targetIndex: parsed.targetIndex,
      targetLength: targetDeals.length,
    });

    if (!isStageChange && parsed.sourceIndex === normalizedTargetIndex) {
      return {
        status: "success",
        message: "Posição do negócio mantida.",
      };
    }

    const nextTarget = [...targetDeals];
    nextTarget.splice(normalizedTargetIndex, 0, { id: parsed.dealId });

    const sourceUpdates = sourceDeals.map((entry, index) => ({ id: entry.id, position: index }));
    const targetUpdates = nextTarget.map((entry, index) => ({ id: entry.id, position: index }));
    
    const durationInPreviousStageSeconds = deal.enteredStageAt 
      ? Math.max(0, Math.floor((Date.now() - new Date(deal.enteredStageAt).getTime()) / 1000))
      : 0;

    const { error: rpcError } = await supabase.rpc("rpc_move_deal", {
      p_deal_id: deal.id,
      p_old_stage_id: deal.stageId!,
      p_new_stage_id: parsed.targetStageId,
      p_new_stage_enum: stageMeta.stageEnum,
      p_is_stage_change: isStageChange,
      p_workspace_id: context.workspaceId,
      p_actor_membership_id: (deal.ownerMembershipId ?? null) as unknown as string,
      p_duration_in_previous_stage_seconds: durationInPreviousStageSeconds,
      p_source_updates: sourceUpdates as any,
      p_target_updates: targetUpdates as any
    });

    if (rpcError) throw rpcError;

    if (isStageChange) {
      await emitDealEvent({
        supabase,
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
    const supabase = supabaseAdmin;
    const context = await getOrCreatePipelineContext(supabase);

    if (!context) {
      throw new Error("Pipeline context unavailable.");
    }

    const stageMeta = getStageMetaById(parsed.stageId);

    if (!stageMeta) {
      throw new Error("Target stage not found.");
    }

    const relations = await resolveAuxiliaryRelations({
      supabase,
      workspaceId: context.workspaceId,
      ownerId: parsed.ownerId,
      companyName: parsed.companyName,
      contactName: parsed.contactName,
      contactPhone: parsed.contactPhone,
    });

    const { data: existing } = parsed.id
      ? await supabase
          .from("Deal")
          .select("*, ownerMembership:Membership(*), stageRecord:PipelineStage(*)")
          .eq("id", parsed.id)
          .maybeSingle()
      : { data: null };

    const nextPosition = existing
      ? existing.position
      : ((await supabase.from("Deal").select("id", { count: "exact", head: true }).eq("stageId", parsed.stageId)).count ?? 0);

    const dealId = existing ? existing.id : crypto.randomUUID();
    let savedDeal;

    if (existing) {
      const { data, error } = await supabase.from("Deal").update({
        name: parsed.title,
        description: parsed.description,
        valueCents: Math.round(parsed.value * 100),
        expectedCloseAt: parsed.expectedCloseAt ? new Date(parsed.expectedCloseAt).toISOString() : null,
        stageId: parsed.stageId,
        stage: stageMeta.stageEnum,
        companyId: relations.company.id,
        contactId: relations.contact?.id ?? null,
        ownerMembershipId: relations.owner?.id ?? null,
        enteredStageAt: existing.stageId === parsed.stageId ? existing.enteredStageAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq("id", dealId)
      .select("*, ownerMembership:Membership(*), stageRecord:PipelineStage(*)").single();

      if (error) throw error;
      savedDeal = data;
    } else {
      const { data, error } = await supabase.from("Deal").insert({
        id: dealId,
        workspaceId: context.workspaceId,
        pipelineId: context.pipelineId,
        stageId: parsed.stageId,
        stage: stageMeta.stageEnum,
        name: parsed.title,
        description: parsed.description,
        valueCents: Math.round(parsed.value * 100),
        expectedCloseAt: parsed.expectedCloseAt ? new Date(parsed.expectedCloseAt).toISOString() : null,
        position: nextPosition,
        companyId: relations.company.id,
        contactId: relations.contact?.id ?? null,
        ownerMembershipId: relations.owner?.id ?? null,
        enteredStageAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select("*, ownerMembership:Membership(*), stageRecord:PipelineStage(*)").single();

      if (error) throw error;
      savedDeal = data;
    }

    if (existing && existing.stageId !== parsed.stageId) {
      await resequenceStagePositions({
        supabase,
        stageId: existing.stageId ?? parsed.stageId,
        excludeDealId: savedDeal.id,
      });

      const durationInPreviousStageSeconds = existing.enteredStageAt
        ? Math.max(0, Math.floor((Date.now() - new Date(existing.enteredStageAt).getTime()) / 1000))
        : 0;

      await supabase.from("DealStageTransition").insert({
        id: crypto.randomUUID(),
        workspaceId: context.workspaceId,
        dealId: savedDeal.id,
        actorMembershipId: savedDeal.ownerMembershipId,
        fromStageId: existing.stageId!,
        toStageId: parsed.stageId,
        durationInPreviousStageSeconds,
      });

      await emitDealEvent({
        supabase,
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
      supabase,
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
    const supabase = supabaseAdmin;
    const context = await getOrCreatePipelineContext(supabase);

    if (!context) {
      throw new Error("Pipeline context unavailable.");
    }

    const { data: deal } = await supabase
      .from("Deal")
      .select("*, ownerMembership:Membership(*), stageRecord:PipelineStage(*)")
      .eq("id", parsed.dealId)
      .maybeSingle();

    if (!deal) {
      throw new Error("Deal not found.");
    }

    await supabase.from("Deal").delete().eq("id", deal.id);

    if (deal.stageId) {
      await resequenceStagePositions({
        supabase,
        stageId: deal.stageId,
      });
    }

    await emitDealEvent({
      supabase,
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
