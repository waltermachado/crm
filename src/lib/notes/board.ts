import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import { supabaseAdmin } from "@/lib/db/supabase";
import { hasDatabaseConfig } from "@/lib/env/server";
import type { AppLocale } from "@/lib/i18n/config";
import { createLogger } from "@/lib/logger";
import { getCalendarContext } from "@/lib/calendar/context";
import { getDemoNotesSnapshot } from "@/lib/notes/demo-store";
import type {
  NotesSnapshot,
  NoteWhiteboardData,
  NoteViewType,
  NoteWorkspaceRecord,
} from "@/types/notes";

const logger = createLogger("notes-board");

const VIEW_TYPES: NoteViewType[] = ["GRID", "KANBAN", "DOC", "WHITEBOARD"];
const DEFAULT_KANBAN_COLUMNS = ["Inbox", "Em andamento", "Aguardando", "Concluído"];
const DEFAULT_DOCUMENT_CONTENT =
  "<h2>Documento principal</h2><p>Use este espaço para escrever estratégias, atas, planos e notas longas sem misturar com os outros layouts.</p>";
const DEFAULT_WHITEBOARD: NoteWhiteboardData = {
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [],
};

function getDefaultWorkspaceName(viewType: NoteViewType, locale: AppLocale) {
  const names = locale === "pt-BR"
    ? {
        GRID: "Cards em grade",
        KANBAN: "Pipeline de notas",
        DOC: "Bloco de notas",
        WHITEBOARD: "Quadro branco",
      }
    : {
        GRID: "Grid cards",
        KANBAN: "Notes pipeline",
        DOC: "Notebook",
        WHITEBOARD: "Whiteboard",
      };

  return names[viewType];
}

function getWorkspaceDescription(viewType: NoteViewType, locale: AppLocale) {
  const descriptions = locale === "pt-BR"
    ? {
        GRID: "Notas rápidas em cards soltos com leitura visual imediata.",
        KANBAN: "Fluxo em colunas com escopo isolado para operação e acompanhamento.",
        DOC: "Editor focado em escrita longa com autosave no servidor.",
        WHITEBOARD: "Canvas livre para post-its, estruturação e mapeamento visual.",
      }
    : {
        GRID: "Quick note cards with visual scanning.",
        KANBAN: "Column-based flow with isolated workspace scope.",
        DOC: "Long-form editor with server autosave.",
        WHITEBOARD: "Freeform canvas for stickies and visual mapping.",
      };

  return descriptions[viewType];
}

function parseColumns(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function parseWhiteboardData(value: unknown): NoteWhiteboardData {
  if (!value || typeof value !== "object" || !("nodes" in value)) {
    return DEFAULT_WHITEBOARD;
  }

  const data = value as NoteWhiteboardData;

  return {
    viewport: data.viewport ?? DEFAULT_WHITEBOARD.viewport,
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
  };
}

async function ensureNoteWorkspaces(
  supabase: SupabaseClient<Database>,
  crmWorkspaceId: string,
  userId: string,
  locale: AppLocale,
) {
  const { data: existing } = await supabase
    .from("NoteWorkspace")
    .select("id, viewType")
    .eq("crmWorkspaceId", crmWorkspaceId)
    .eq("userId", userId);

  const existingTypes = new Set((existing || []).map((workspace) => workspace.viewType as NoteViewType));
  const missingTypes = VIEW_TYPES.filter((viewType) => !existingTypes.has(viewType));

  if (missingTypes.length === 0) {
    return;
  }

  const insertData = missingTypes.map((viewType) => ({
    id: crypto.randomUUID(),
    crmWorkspaceId,
    userId,
    viewType,
    name: getDefaultWorkspaceName(viewType, locale),
    documentContent: viewType === "DOC" ? DEFAULT_DOCUMENT_CONTENT : null,
    whiteboardData: viewType === "WHITEBOARD" ? DEFAULT_WHITEBOARD : null,
    columnDefinitions: viewType === "KANBAN" ? DEFAULT_KANBAN_COLUMNS : null,
    updatedAt: new Date().toISOString()
  }));

  const { error } = await supabase.from("NoteWorkspace").insert(insertData as any);
  if (error) throw error;
}

function mapWorkspaceRecord(
  workspace: any,
  locale: AppLocale,
): NoteWorkspaceRecord {
  const viewType = workspace.viewType as NoteViewType;
  const columns = parseColumns(workspace.columnDefinitions);

  return {
    id: workspace.id,
    name: workspace.name,
    viewType,
    description: getWorkspaceDescription(viewType, locale),
    cards: (workspace.noteCards || [])
      .slice()
      .sort((left: any, right: any) => left.order - right.order)
      .map((card: any) => ({
        id: card.id,
        title: card.title,
        content: card.content ?? "",
        color: card.color ?? "#fff7d6",
        columnName: card.columnName,
        order: card.order,
        createdAt: typeof card.createdAt === 'string' ? card.createdAt : card.createdAt.toISOString(),
        updatedAt: typeof card.updatedAt === 'string' ? card.updatedAt : card.updatedAt.toISOString(),
      })),
    columns: viewType === "KANBAN" ? (columns.length > 0 ? columns : DEFAULT_KANBAN_COLUMNS) : [],
    documentContent: workspace.documentContent ?? "",
    whiteboard: parseWhiteboardData(workspace.whiteboardData),
    createdAt: typeof workspace.createdAt === 'string' ? workspace.createdAt : workspace.createdAt.toISOString(),
    updatedAt: typeof workspace.updatedAt === 'string' ? workspace.updatedAt : workspace.updatedAt.toISOString(),
  };
}

export async function getNotesSnapshot(locale: AppLocale): Promise<NotesSnapshot> {
  if (!hasDatabaseConfig()) {
    return getDemoNotesSnapshot(locale);
  }

  try {
    const supabase = supabaseAdmin;
    const context = await getCalendarContext(supabase);

    await ensureNoteWorkspaces(supabase, context.workspaceId, context.actor.userId, locale);

    const { data: workspaces, error } = await supabase
      .from("NoteWorkspace")
      .select("*, noteCards:NoteCard(*)")
      .eq("crmWorkspaceId", context.workspaceId)
      .eq("userId", context.actor.userId);

    if (error) throw error;

    const mapped = Object.fromEntries(
      (workspaces || []).map((workspace) => [
        workspace.viewType,
        mapWorkspaceRecord(workspace, locale),
      ]),
    ) as Record<NoteViewType, NoteWorkspaceRecord>;

    return {
      locale,
      canPersistToDatabase: true,
      workspaces: {
        GRID: mapped.GRID,
        KANBAN: mapped.KANBAN,
        DOC: mapped.DOC,
        WHITEBOARD: mapped.WHITEBOARD,
      },
    };
  } catch (error) {
    logger.error("Failed to load notes workspaces. Falling back to demo state.", error);
    return getDemoNotesSnapshot(locale);
  }
}
