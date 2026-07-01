"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import { supabaseAdmin } from "@/lib/db/supabase";
import { getCalendarContext } from "@/lib/calendar/context";
import { hasDatabaseConfig } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";
import {
  createDemoNote,
  deleteDemoNote,
  moveDemoNote,
  renameDemoWorkspace,
  saveDemoDocument,
  saveDemoWhiteboard,
  updateDemoNote,
  updateDemoWorkspaceColumns,
} from "@/lib/notes/demo-store";
import type {
  CreateNoteInput,
  DeleteNoteInput,
  MoveNoteInput,
  NoteActionResult,
  RenameWorkspaceInput,
  SaveDocumentInput,
  SaveWhiteboardInput,
  UpdateNoteInput,
  UpdateWorkspaceColumnsInput,
} from "@/types/notes";

const logger = createLogger("notes-actions");

const createNoteSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  content: z.string().max(12000).optional(),
  color: z.string().trim().max(32).optional(),
  columnName: z.string().trim().max(120).optional(),
});

const updateNoteSchema = z.object({
  workspaceId: z.string().min(1),
  noteId: z.string().min(1),
  title: z.string().trim().min(2).max(120).optional(),
  content: z.string().max(12000).optional(),
  color: z.string().trim().max(32).optional(),
  columnName: z.string().trim().max(120).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

const deleteNoteSchema = z.object({
  workspaceId: z.string().min(1),
  noteId: z.string().min(1),
});

const moveNoteSchema = z.object({
  workspaceId: z.string().min(1),
  noteId: z.string().min(1),
  sourceColumnName: z.string().trim().max(120).nullable().optional(),
  targetColumnName: z.string().trim().max(120).nullable().optional(),
  sourceIndex: z.number().int().min(0),
  targetIndex: z.number().int().min(0),
});

const saveDocumentSchema = z.object({
  workspaceId: z.string().min(1),
  content: z.string().max(50000),
});

const whiteboardNodeSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  title: z.string().max(120),
  content: z.string().max(4000),
  color: z.string().max(32),
});

const saveWhiteboardSchema = z.object({
  workspaceId: z.string().min(1),
  data: z.object({
    viewport: z
      .object({
        x: z.number(),
        y: z.number(),
        zoom: z.number(),
      })
      .optional(),
    nodes: z.array(whiteboardNodeSchema).max(100),
  }),
});

const updateWorkspaceColumnsSchema = z.object({
  workspaceId: z.string().min(1),
  columns: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
});

const renameWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
});

function formatNoteId(value: number) {
  return `NOTE-${`${value}`.padStart(6, "0")}`;
}

async function getScopedWorkspace(workspaceId: string) {
  const supabase = supabaseAdmin;
  const context = await getCalendarContext(supabase);
  const { data: workspace } = await supabase
    .from("NoteWorkspace")
    .select("*")
    .eq("id", workspaceId)
    .eq("crmWorkspaceId", context.workspaceId)
    .eq("userId", context.actor.userId)
    .maybeSingle();

  if (!workspace) {
    throw new Error("Notes workspace not found.");
  }

  return {
    supabase,
    context,
    workspace,
  };
}

async function resequenceColumn(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  columnName?: string | null,
  excludeNoteId?: string,
) {
  let query = supabase
    .from("NoteCard")
    .select("id")
    .eq("workspaceId", workspaceId)
    .order("order", { ascending: true })
    .order("createdAt", { ascending: true });

  if (columnName === null || columnName === undefined) {
    query = query.is("columnName", null);
  } else {
    query = query.eq("columnName", columnName);
  }

  if (excludeNoteId) {
    query = query.neq("id", excludeNoteId);
  }

  const { data: cards } = await query;
  if (!cards) return;

  await Promise.all(
    cards.map((card, index) =>
      supabase
        .from("NoteCard")
        .update({ order: index })
        .eq("id", card.id)
    )
  );
}

export async function createNoteAction(input: CreateNoteInput): Promise<NoteActionResult> {
  const parsed = createNoteSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await createDemoNote(parsed);
    revalidatePath("/notes");
    return result;
  }

  try {
    const { supabase, workspace } = await getScopedWorkspace(parsed.workspaceId);
    
    let nextIdValue = 1;
    const { data: seq } = await supabase.from("NoteSequence").select("currentValue").eq("id", "note-card").maybeSingle();
    if (seq) {
      nextIdValue = seq.currentValue + 1;
      await supabase.from("NoteSequence").update({ currentValue: nextIdValue, updatedAt: new Date().toISOString() }).eq("id", "note-card");
    } else {
      await supabase.from("NoteSequence").insert({ id: "note-card", currentValue: 1, updatedAt: new Date().toISOString() });
    }

    const nextId = formatNoteId(nextIdValue);
    const nextColumn =
      workspace.viewType === "KANBAN"
        ? parsed.columnName ??
          ((((workspace.columnDefinitions as string[] | null) ?? [])[0] as string | undefined) ??
            "Inbox")
        : null;

    let countQuery = supabase.from("NoteCard").select("id", { count: "exact", head: true }).eq("workspaceId", workspace.id);
    if (workspace.viewType === "KANBAN") {
      if (nextColumn) {
        countQuery = countQuery.eq("columnName", nextColumn);
      } else {
        countQuery = countQuery.is("columnName", null);
      }
    } else {
      countQuery = countQuery.is("columnName", null);
    }
    const { count } = await countQuery;
    const nextOrder = count ?? 0;

    await supabase.from("NoteCard").insert({
      id: nextId,
      workspaceId: workspace.id,
      title: parsed.title,
      content: parsed.content ?? "",
      color: parsed.color ?? "#fff7d6",
      columnName: nextColumn,
      order: nextOrder,
      updatedAt: new Date().toISOString()
    });

    const noteId = nextId;

    revalidatePath("/notes");

    return {
      status: "success",
      message: `Nota ${noteId} criada com sucesso.`,
    };
  } catch (error) {
    logger.error("Failed to create note.", error);

    return {
      status: "error",
      message: "Não foi possível criar a nota.",
    };
  }
}

export async function updateNoteAction(input: UpdateNoteInput): Promise<NoteActionResult> {
  const parsed = updateNoteSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await updateDemoNote(parsed);
    revalidatePath("/notes");
    return result;
  }

  try {
    const { supabase, workspace } = await getScopedWorkspace(parsed.workspaceId);
    const { data: existing } = await supabase.from("NoteCard").select("*").eq("id", parsed.noteId).eq("workspaceId", workspace.id).maybeSingle();

    if (!existing) {
      throw new Error("Note not found.");
    }

    const nextColumnName =
      parsed.columnName !== undefined ? parsed.columnName : existing.columnName;

    await supabase.from("NoteCard").update({
      title: parsed.title ?? existing.title,
      content: parsed.content ?? existing.content,
      color: parsed.color ?? existing.color,
      columnName: nextColumnName,
      order: parsed.order ?? existing.order,
      updatedAt: new Date().toISOString()
    }).eq("id", existing.id);

    if (workspace.viewType === "KANBAN" && existing.columnName !== nextColumnName) {
      await resequenceColumn(supabase, workspace.id, existing.columnName, existing.id);
      await resequenceColumn(supabase, workspace.id, nextColumnName, existing.id);
    } else {
      await resequenceColumn(supabase, workspace.id, workspace.viewType === "KANBAN" ? nextColumnName : null);
    }

    revalidatePath("/notes");

    return {
      status: "success",
      message: "Nota atualizada com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to update note.", error);

    return {
      status: "error",
      message: "Não foi possível atualizar a nota.",
    };
  }
}

export async function deleteNoteAction(input: DeleteNoteInput): Promise<NoteActionResult> {
  const parsed = deleteNoteSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await deleteDemoNote(parsed);
    revalidatePath("/notes");
    return result;
  }

  try {
    const { supabase, workspace } = await getScopedWorkspace(parsed.workspaceId);
    const { data: existing } = await supabase.from("NoteCard").select("*").eq("id", parsed.noteId).eq("workspaceId", workspace.id).maybeSingle();

    if (!existing) {
      throw new Error("Note not found.");
    }

    await supabase.from("NoteCard").delete().eq("id", existing.id);

    await resequenceColumn(
      supabase,
      workspace.id,
      workspace.viewType === "KANBAN" ? existing.columnName : null,
    );

    revalidatePath("/notes");

    return {
      status: "success",
      message: "Nota removida com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to delete note.", error);

    return {
      status: "error",
      message: "Não foi possível remover a nota.",
    };
  }
}

export async function moveNoteAction(input: MoveNoteInput): Promise<NoteActionResult> {
  const parsed = moveNoteSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await moveDemoNote(parsed);
    revalidatePath("/notes");
    return result;
  }

  try {
    const { supabase, workspace } = await getScopedWorkspace(parsed.workspaceId);
    const { data: existing } = await supabase.from("NoteCard").select("*").eq("id", parsed.noteId).eq("workspaceId", workspace.id).maybeSingle();

    if (!existing) {
      throw new Error("Note not found.");
    }

    const sourceColumn = parsed.sourceColumnName ?? existing.columnName ?? null;
    const targetColumn = parsed.targetColumnName ?? existing.columnName ?? null;

    const { data: siblingCardsData } = await supabase
      .from("NoteCard")
      .select("id, columnName")
      .eq("workspaceId", workspace.id)
      .neq("id", existing.id)
      .order("order", { ascending: true })
      .order("createdAt", { ascending: true });

    const siblingCards = siblingCardsData || [];

    const sourceIds = siblingCards
      .filter((card) => (card.columnName ?? null) === sourceColumn)
      .map((card) => card.id);
    const targetIds = siblingCards
      .filter((card) => (card.columnName ?? null) === targetColumn)
      .map((card) => card.id);

    const nextTargetIds = [...(sourceColumn === targetColumn ? sourceIds : targetIds)];
    nextTargetIds.splice(Math.min(parsed.targetIndex, nextTargetIds.length), 0, existing.id);

    if (sourceColumn !== targetColumn) {
      await Promise.all(
        sourceIds.map((id, index) =>
          supabase.from("NoteCard").update({ order: index }).eq("id", id)
        )
      );
    }

    await Promise.all(
      nextTargetIds.map((id, index) =>
        supabase.from("NoteCard").update(
          id === existing.id
            ? { order: index, columnName: targetColumn }
            : { order: index }
        ).eq("id", id)
      )
    );

    revalidatePath("/notes");

    return {
      status: "success",
      message: "Nota movida com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to move note.", error);

    return {
      status: "error",
      message: "Não foi possível mover a nota.",
    };
  }
}

export async function saveDocumentAction(input: SaveDocumentInput): Promise<NoteActionResult> {
  const parsed = saveDocumentSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await saveDemoDocument(parsed);
    revalidatePath("/notes");
    return result;
  }

  try {
    const { supabase, workspace } = await getScopedWorkspace(parsed.workspaceId);

    if (workspace.viewType !== "DOC") {
      throw new Error("Workspace is not a document view.");
    }

    await supabase.from("NoteWorkspace").update({
      documentContent: parsed.content,
      updatedAt: new Date().toISOString()
    }).eq("id", workspace.id);

    revalidatePath("/notes");

    return {
      status: "success",
      message: "Documento salvo automaticamente.",
    };
  } catch (error) {
    logger.error("Failed to autosave document.", error);

    return {
      status: "error",
      message: "Não foi possível salvar o documento.",
    };
  }
}

export async function saveWhiteboardAction(
  input: SaveWhiteboardInput,
): Promise<NoteActionResult> {
  const parsed = saveWhiteboardSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await saveDemoWhiteboard(parsed);
    revalidatePath("/notes");
    return result;
  }

  try {
    const { supabase, workspace } = await getScopedWorkspace(parsed.workspaceId);

    if (workspace.viewType !== "WHITEBOARD") {
      throw new Error("Workspace is not a whiteboard view.");
    }

    await supabase.from("NoteWorkspace").update({
      whiteboardData: parsed.data as any,
      updatedAt: new Date().toISOString()
    }).eq("id", workspace.id);

    revalidatePath("/notes");

    return {
      status: "success",
      message: "Quadro salvo automaticamente.",
    };
  } catch (error) {
    logger.error("Failed to autosave whiteboard.", error);

    return {
      status: "error",
      message: "Não foi possível salvar o quadro.",
    };
  }
}

export async function updateWorkspaceColumnsAction(
  input: UpdateWorkspaceColumnsInput,
): Promise<NoteActionResult> {
  const parsed = updateWorkspaceColumnsSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await updateDemoWorkspaceColumns(parsed);
    revalidatePath("/notes");
    return result;
  }

  try {
    const { supabase, workspace } = await getScopedWorkspace(parsed.workspaceId);

    if (workspace.viewType !== "KANBAN") {
      throw new Error("Workspace is not a kanban view.");
    }

    const nextColumns = parsed.columns.filter(
      (column, index, array) => array.findIndex((entry) => entry === column) === index,
    );
    const fallbackColumn = nextColumns[0];

    await supabase.from("NoteWorkspace").update({
      columnDefinitions: nextColumns as any,
      updatedAt: new Date().toISOString()
    }).eq("id", workspace.id);

    const { data: cardsToMove } = await supabase
      .from("NoteCard")
      .select("id")
      .eq("workspaceId", workspace.id)
      .not("columnName", "in", `(${nextColumns.join(",")})`);

    if (cardsToMove && cardsToMove.length > 0) {
      await Promise.all(
        cardsToMove.map(card => 
          supabase.from("NoteCard").update({ columnName: fallbackColumn }).eq("id", card.id)
        )
      );
    }

    for (const columnName of nextColumns) {
      await resequenceColumn(supabase, workspace.id, columnName);
    }

    revalidatePath("/notes");

    return {
      status: "success",
      message: "Colunas atualizadas com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to update kanban columns.", error);

    return {
      status: "error",
      message: "Não foi possível atualizar as colunas.",
    };
  }
}

export async function renameWorkspaceAction(
  input: RenameWorkspaceInput,
): Promise<NoteActionResult> {
  const parsed = renameWorkspaceSchema.parse(input);

  if (!hasDatabaseConfig()) {
    const result = await renameDemoWorkspace(parsed);
    revalidatePath("/notes");
    return result;
  }

  try {
    const { supabase, workspace } = await getScopedWorkspace(parsed.workspaceId);

    await supabase.from("NoteWorkspace").update({
      name: parsed.name,
      updatedAt: new Date().toISOString()
    }).eq("id", workspace.id);

    revalidatePath("/notes");

    return {
      status: "success",
      message: "Workspace renomeado com sucesso.",
    };
  } catch (error) {
    logger.error("Failed to rename notes workspace.", error);

    return {
      status: "error",
      message: "Não foi possível renomear o workspace.",
    };
  }
}
