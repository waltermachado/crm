"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCalendarContext } from "@/lib/calendar/context";
import { getPrismaClient } from "@/lib/db/prisma";
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
  const prisma = getPrismaClient();
  const context = await getCalendarContext(prisma);
  const workspace = await prisma.noteWorkspace.findFirst({
    where: {
      id: workspaceId,
      crmWorkspaceId: context.workspaceId,
      userId: context.actor.userId,
    },
  });

  if (!workspace) {
    throw new Error("Notes workspace not found.");
  }

  return {
    prisma,
    context,
    workspace,
  };
}

async function resequenceColumn(
  tx: ReturnType<typeof getPrismaClient>,
  workspaceId: string,
  columnName?: string | null,
  excludeNoteId?: string,
) {
  const cards = await tx.noteCard.findMany({
    where: {
      workspaceId,
      ...(columnName == null ? { columnName: null } : { columnName }),
      ...(excludeNoteId ? { id: { not: excludeNoteId } } : {}),
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
    },
  });

  await Promise.all(
    cards.map((card, index) =>
      tx.noteCard.update({
        where: {
          id: card.id,
        },
        data: {
          order: index,
        },
      }),
    ),
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
    const { prisma, workspace } = await getScopedWorkspace(parsed.workspaceId);
    const noteId = await prisma.$transaction(async (tx) => {
      const sequence = await tx.noteSequence.upsert({
        where: {
          id: "note-card",
        },
        update: {
          currentValue: {
            increment: 1,
          },
        },
        create: {
          id: "note-card",
          currentValue: 1,
        },
      });

      const nextId = formatNoteId(sequence.currentValue);
      const nextColumn =
        workspace.viewType === "KANBAN"
          ? parsed.columnName ??
            ((((workspace.columnDefinitions as string[] | null) ?? [])[0] as string | undefined) ??
              "Inbox")
          : null;
      const nextOrder = await tx.noteCard.count({
        where: {
          workspaceId: workspace.id,
          ...(workspace.viewType === "KANBAN"
            ? { columnName: nextColumn }
            : { columnName: null }),
        },
      });

      await tx.noteCard.create({
        data: {
          id: nextId,
          workspaceId: workspace.id,
          title: parsed.title,
          content: parsed.content ?? "",
          color: parsed.color ?? "#fff7d6",
          columnName: nextColumn,
          order: nextOrder,
        },
      });

      return nextId;
    });

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
    const { prisma, workspace } = await getScopedWorkspace(parsed.workspaceId);
    const existing = await prisma.noteCard.findFirst({
      where: {
        id: parsed.noteId,
        workspaceId: workspace.id,
      },
    });

    if (!existing) {
      throw new Error("Note not found.");
    }

    const nextColumnName =
      parsed.columnName !== undefined ? parsed.columnName : existing.columnName;

    await prisma.noteCard.update({
      where: {
        id: existing.id,
      },
      data: {
        title: parsed.title ?? existing.title,
        content: parsed.content ?? existing.content,
        color: parsed.color ?? existing.color,
        columnName: nextColumnName,
        order: parsed.order ?? existing.order,
      },
    });

    if (workspace.viewType === "KANBAN" && existing.columnName !== nextColumnName) {
      await resequenceColumn(prisma, workspace.id, existing.columnName, existing.id);
      await resequenceColumn(prisma, workspace.id, nextColumnName, existing.id);
    } else {
      await resequenceColumn(prisma, workspace.id, workspace.viewType === "KANBAN" ? nextColumnName : null);
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
    const { prisma, workspace } = await getScopedWorkspace(parsed.workspaceId);
    const existing = await prisma.noteCard.findFirst({
      where: {
        id: parsed.noteId,
        workspaceId: workspace.id,
      },
    });

    if (!existing) {
      throw new Error("Note not found.");
    }

    await prisma.noteCard.delete({
      where: {
        id: existing.id,
      },
    });

    await resequenceColumn(
      prisma,
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
    const { prisma, workspace } = await getScopedWorkspace(parsed.workspaceId);
    const existing = await prisma.noteCard.findFirst({
      where: {
        id: parsed.noteId,
        workspaceId: workspace.id,
      },
    });

    if (!existing) {
      throw new Error("Note not found.");
    }

    const sourceColumn = parsed.sourceColumnName ?? existing.columnName ?? null;
    const targetColumn = parsed.targetColumnName ?? existing.columnName ?? null;

    const siblingCards = await prisma.noteCard.findMany({
      where: {
        workspaceId: workspace.id,
        id: {
          not: existing.id,
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        columnName: true,
      },
    });

    const sourceIds = siblingCards
      .filter((card) => (card.columnName ?? null) === sourceColumn)
      .map((card) => card.id);
    const targetIds = siblingCards
      .filter((card) => (card.columnName ?? null) === targetColumn)
      .map((card) => card.id);

    const nextTargetIds = [...(sourceColumn === targetColumn ? sourceIds : targetIds)];
    nextTargetIds.splice(Math.min(parsed.targetIndex, nextTargetIds.length), 0, existing.id);

    await prisma.$transaction(async (tx) => {
      if (sourceColumn !== targetColumn) {
        await Promise.all(
          sourceIds.map((id, index) =>
            tx.noteCard.update({
              where: { id },
              data: { order: index },
            }),
          ),
        );
      }

      await Promise.all(
        nextTargetIds.map((id, index) =>
          tx.noteCard.update({
            where: {
              id,
            },
            data:
              id === existing.id
                ? {
                    order: index,
                    columnName: targetColumn,
                  }
                : {
                    order: index,
                  },
          }),
        ),
      );
    });

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
    const { prisma, workspace } = await getScopedWorkspace(parsed.workspaceId);

    if (workspace.viewType !== "DOC") {
      throw new Error("Workspace is not a document view.");
    }

    await prisma.noteWorkspace.update({
      where: {
        id: workspace.id,
      },
      data: {
        documentContent: parsed.content,
      },
    });

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
    const { prisma, workspace } = await getScopedWorkspace(parsed.workspaceId);

    if (workspace.viewType !== "WHITEBOARD") {
      throw new Error("Workspace is not a whiteboard view.");
    }

    await prisma.noteWorkspace.update({
      where: {
        id: workspace.id,
      },
      data: {
        whiteboardData: parsed.data,
      },
    });

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
    const { prisma, workspace } = await getScopedWorkspace(parsed.workspaceId);

    if (workspace.viewType !== "KANBAN") {
      throw new Error("Workspace is not a kanban view.");
    }

    const nextColumns = parsed.columns.filter(
      (column, index, array) => array.findIndex((entry) => entry === column) === index,
    );
    const fallbackColumn = nextColumns[0];

    await prisma.$transaction(async (tx) => {
      await tx.noteWorkspace.update({
        where: {
          id: workspace.id,
        },
        data: {
          columnDefinitions: nextColumns,
        },
      });

      await tx.noteCard.updateMany({
        where: {
          workspaceId: workspace.id,
          NOT: {
            columnName: {
              in: nextColumns,
            },
          },
        },
        data: {
          columnName: fallbackColumn,
        },
      });
    });

    for (const columnName of nextColumns) {
      await resequenceColumn(prisma, workspace.id, columnName);
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
    const { prisma, workspace } = await getScopedWorkspace(parsed.workspaceId);

    await prisma.noteWorkspace.update({
      where: {
        id: workspace.id,
      },
      data: {
        name: parsed.name,
      },
    });

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
