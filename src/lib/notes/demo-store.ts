import "server-only";

import type { AppLocale } from "@/lib/i18n/config";
import type {
  CreateNoteInput,
  DeleteNoteInput,
  MoveNoteInput,
  NoteActionResult,
  NoteCardRecord,
  NotesSnapshot,
  NoteViewType,
  RenameWorkspaceInput,
  SaveDocumentInput,
  SaveWhiteboardInput,
  UpdateNoteInput,
  UpdateWorkspaceColumnsInput,
  NoteWorkspaceRecord,
} from "@/types/notes";

type DemoNotesState = {
  sequence: number;
  workspaces: Record<NoteViewType, NoteWorkspaceRecord>;
};

declare global {
  var __oslernotesDemoNotesState__: DemoNotesState | undefined;
}

const GRID_COLORS = ["#fff7d6", "#dff7f2", "#e9e7ff", "#ffe4e6", "#dbeafe"] as const;

function formatNoteId(value: number) {
  return `NOTE-${`${value}`.padStart(6, "0")}`;
}

function createCard(
  id: string,
  title: string,
  content: string,
  color: string,
  order: number,
  columnName?: string,
): NoteCardRecord {
  const now = new Date().toISOString();

  return {
    id,
    title,
    content,
    color,
    columnName: columnName ?? null,
    order,
    createdAt: now,
    updatedAt: now,
  };
}

function createInitialDemoState(): DemoNotesState {
  const now = new Date().toISOString();

  return {
    sequence: 112,
    workspaces: {
      GRID: {
        id: "demo-grid-workspace",
        name: "Painel de insights rápidos",
        viewType: "GRID",
        description: "Capturas rápidas, lembretes e ideias em blocos visuais.",
        columns: [],
        cards: [
          createCard(
            "NOTE-000101",
            "Follow-up com Atlas Freight",
            "Confirmar proposta revisada, validar budget final e enviar resumo da call até 17h.",
            GRID_COLORS[0],
            0,
          ),
          createCard(
            "NOTE-000102",
            "Briefing para demo enterprise",
            "Separar objeções recorrentes, cases do segmento logístico e próximos marcos do quarter.",
            GRID_COLORS[1],
            1,
          ),
          createCard(
            "NOTE-000103",
            "Checklist do board comercial",
            "Atualizar KPIs no dashboard, revisar agenda da semana e distribuir leads críticos.",
            GRID_COLORS[2],
            2,
          ),
        ],
        documentContent: "",
        whiteboard: {
          nodes: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        createdAt: now,
        updatedAt: now,
      },
      KANBAN: {
        id: "demo-kanban-workspace",
        name: "Fluxo de operação e conteúdo",
        viewType: "KANBAN",
        description: "Colunas independentes para transformar ideias em entregas.",
        columns: ["Inbox", "Em andamento", "Aguardando", "Concluído"],
        cards: [
          createCard(
            "NOTE-000104",
            "Estruturar playbook de objection handling",
            "Criar versão enxuta para SDR e versão expandida para closers.",
            GRID_COLORS[3],
            0,
            "Inbox",
          ),
          createCard(
            "NOTE-000105",
            "Desenhar sequência de automação",
            "Mapear gatilhos de atraso, follow-up e handoff para CS.",
            GRID_COLORS[4],
            0,
            "Em andamento",
          ),
          createCard(
            "NOTE-000106",
            "Aprovar naming do novo pipeline",
            "Pendência com time de revenue ops para padronizar labels do funil.",
            GRID_COLORS[0],
            0,
            "Aguardando",
          ),
          createCard(
            "NOTE-000107",
            "Resumo executivo do mês",
            "Consolidado com gargalos, ganhos rápidos e próximos experimentos.",
            GRID_COLORS[1],
            0,
            "Concluído",
          ),
        ],
        documentContent: "",
        whiteboard: {
          nodes: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        createdAt: now,
        updatedAt: now,
      },
      DOC: {
        id: "demo-doc-workspace",
        name: "Documento de estratégia",
        viewType: "DOC",
        description: "Editor limpo para escrita longa com autosave.",
        columns: [],
        cards: [],
        documentContent:
          "<h2>Plano de expansão comercial</h2><p>Centralize aqui decisões, hipóteses, aprendizados e próximos passos do time comercial.</p><ul><li>Segmentos prioritários</li><li>Mensagens-chave por ICP</li><li>Riscos operacionais e mitigação</li></ul>",
        whiteboard: {
          nodes: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
        createdAt: now,
        updatedAt: now,
      },
      WHITEBOARD: {
        id: "demo-whiteboard-workspace",
        name: "Quadro livre da squad",
        viewType: "WHITEBOARD",
        description: "Canvas amplo para post-its e mapeamento visual.",
        columns: [],
        cards: [],
        documentContent: "",
        whiteboard: {
          viewport: { x: 0, y: 0, zoom: 1 },
          nodes: [
            {
              id: "node-1",
              x: 160,
              y: 120,
              title: "Objetivo",
              content: "Elevar previsibilidade do pipeline com menos fricção operacional.",
              color: "#fff7d6",
            },
            {
              id: "node-2",
              x: 520,
              y: 260,
              title: "Risco",
              content: "Falta de padrão entre discovery, proposta e passagem para CS.",
              color: "#ffe4e6",
            },
            {
              id: "node-3",
              x: 860,
              y: 160,
              title: "Experimento",
              content: "Criar workspace com anotações por fluxo e autosave entre áreas.",
              color: "#dff7f2",
            },
          ],
        },
        createdAt: now,
        updatedAt: now,
      },
    },
  };
}

function getState() {
  if (!globalThis.__oslernotesDemoNotesState__) {
    globalThis.__oslernotesDemoNotesState__ = createInitialDemoState();
  }

  return globalThis.__oslernotesDemoNotesState__;
}

function cloneWorkspace(workspace: NoteWorkspaceRecord): NoteWorkspaceRecord {
  return structuredClone(workspace);
}

function getWorkspaceById(state: DemoNotesState, workspaceId: string) {
  return Object.values(state.workspaces).find((workspace) => workspace.id === workspaceId) ?? null;
}

function resequenceCards(cards: NoteCardRecord[], columnName?: string | null) {
  const filtered = cards
    .filter((card) => (columnName == null ? true : (card.columnName ?? null) === columnName))
    .sort((left, right) => left.order - right.order);

  filtered.forEach((card, index) => {
    card.order = index;
    card.updatedAt = new Date().toISOString();
  });
}

function getWorkspaceDescription(viewType: NoteViewType, locale: AppLocale) {
  const copy = locale === "pt-BR"
    ? {
        GRID: "Capturas rápidas, lembretes e ideias em blocos visuais.",
        KANBAN: "Colunas independentes para transformar ideias em entregas.",
        DOC: "Editor limpo para escrita longa com autosave.",
        WHITEBOARD: "Canvas amplo para post-its e mapeamento visual.",
      }
    : {
        GRID: "Quick capture blocks for reminders and ideas.",
        KANBAN: "Independent columns to turn ideas into execution.",
        DOC: "Clean long-form editor with autosave.",
        WHITEBOARD: "Large canvas for sticky notes and visual mapping.",
      };

  return copy[viewType];
}

export async function getDemoNotesSnapshot(locale: AppLocale): Promise<NotesSnapshot> {
  const state = getState();

  return {
    locale,
    canPersistToDatabase: false,
    workspaces: {
      GRID: {
        ...cloneWorkspace(state.workspaces.GRID),
        description: getWorkspaceDescription("GRID", locale),
      },
      KANBAN: {
        ...cloneWorkspace(state.workspaces.KANBAN),
        description: getWorkspaceDescription("KANBAN", locale),
      },
      DOC: {
        ...cloneWorkspace(state.workspaces.DOC),
        description: getWorkspaceDescription("DOC", locale),
      },
      WHITEBOARD: {
        ...cloneWorkspace(state.workspaces.WHITEBOARD),
        description: getWorkspaceDescription("WHITEBOARD", locale),
      },
    },
  };
}

export async function createDemoNote(input: CreateNoteInput): Promise<NoteActionResult> {
  const state = getState();
  const workspace = getWorkspaceById(state, input.workspaceId);

  if (!workspace) {
    return {
      status: "error",
      message: "Workspace de notas não encontrado.",
    };
  }

  state.sequence += 1;
  const noteId = formatNoteId(state.sequence);
  const normalizedColumn =
    workspace.viewType === "KANBAN" ? input.columnName ?? workspace.columns[0] ?? "Inbox" : null;
  const nextOrder =
    workspace.viewType === "KANBAN"
      ? workspace.cards.filter((card) => (card.columnName ?? null) === normalizedColumn).length
      : workspace.cards.length;

  workspace.cards.push(
    createCard(
      noteId,
      input.title,
      input.content ?? "",
      input.color ?? GRID_COLORS[(workspace.cards.length + 1) % GRID_COLORS.length],
      nextOrder,
      normalizedColumn ?? undefined,
    ),
  );
  workspace.updatedAt = new Date().toISOString();

  return {
    status: "success",
    message: "Nota criada com sucesso.",
  };
}

export async function updateDemoNote(input: UpdateNoteInput): Promise<NoteActionResult> {
  const state = getState();
  const workspace = getWorkspaceById(state, input.workspaceId);
  const note = workspace?.cards.find((card) => card.id === input.noteId);

  if (!workspace || !note) {
    return {
      status: "error",
      message: "Nota não encontrada.",
    };
  }

  note.title = input.title ?? note.title;
  note.content = input.content ?? note.content;
  note.color = input.color ?? note.color;

  if (workspace.viewType === "KANBAN" && input.columnName !== undefined) {
    note.columnName = input.columnName;
  }

  if (typeof input.order === "number") {
    note.order = input.order;
  }

  note.updatedAt = new Date().toISOString();
  workspace.updatedAt = note.updatedAt;

  if (workspace.viewType === "KANBAN") {
    resequenceCards(workspace.cards, note.columnName ?? null);
  } else {
    resequenceCards(workspace.cards);
  }

  return {
    status: "success",
    message: "Nota atualizada com sucesso.",
  };
}

export async function deleteDemoNote(input: DeleteNoteInput): Promise<NoteActionResult> {
  const state = getState();
  const workspace = getWorkspaceById(state, input.workspaceId);

  if (!workspace) {
    return {
      status: "error",
      message: "Workspace de notas não encontrado.",
    };
  }

  const note = workspace.cards.find((card) => card.id === input.noteId);

  if (!note) {
    return {
      status: "error",
      message: "Nota não encontrada.",
    };
  }

  workspace.cards = workspace.cards.filter((card) => card.id !== input.noteId);
  workspace.updatedAt = new Date().toISOString();

  if (workspace.viewType === "KANBAN") {
    resequenceCards(workspace.cards, note.columnName ?? null);
  } else {
    resequenceCards(workspace.cards);
  }

  return {
    status: "success",
    message: "Nota removida com sucesso.",
  };
}

export async function moveDemoNote(input: MoveNoteInput): Promise<NoteActionResult> {
  const state = getState();
  const workspace = getWorkspaceById(state, input.workspaceId);

  if (!workspace) {
    return {
      status: "error",
      message: "Workspace de notas não encontrado.",
    };
  }

  const note = workspace.cards.find((card) => card.id === input.noteId);

  if (!note) {
    return {
      status: "error",
      message: "Nota não encontrada.",
    };
  }

  const targetColumn = workspace.viewType === "KANBAN" ? input.targetColumnName ?? workspace.columns[0] : null;
  const sourceColumn = workspace.viewType === "KANBAN" ? input.sourceColumnName ?? note.columnName : null;

  workspace.cards = workspace.cards.filter((card) => card.id !== input.noteId);

  const targetCards = workspace.cards
    .filter((card) => (workspace.viewType === "KANBAN" ? (card.columnName ?? null) === targetColumn : true))
    .sort((left, right) => left.order - right.order);

  targetCards.splice(Math.max(0, Math.min(input.targetIndex, targetCards.length)), 0, {
    ...note,
    columnName: targetColumn,
    updatedAt: new Date().toISOString(),
  });

  const remainingCards =
    workspace.viewType === "KANBAN"
      ? workspace.cards.filter((card) => (card.columnName ?? null) !== targetColumn)
      : [];

  workspace.cards =
    workspace.viewType === "KANBAN" ? [...remainingCards, ...targetCards] : targetCards;
  workspace.updatedAt = new Date().toISOString();

  if (workspace.viewType === "KANBAN") {
    resequenceCards(workspace.cards, sourceColumn ?? null);
    resequenceCards(workspace.cards, targetColumn ?? null);
  } else {
    resequenceCards(workspace.cards);
  }

  return {
    status: "success",
    message: "Nota movida com sucesso.",
  };
}

export async function saveDemoDocument(input: SaveDocumentInput): Promise<NoteActionResult> {
  const state = getState();
  const workspace = getWorkspaceById(state, input.workspaceId);

  if (!workspace) {
    return {
      status: "error",
      message: "Documento não encontrado.",
    };
  }

  workspace.documentContent = input.content;
  workspace.updatedAt = new Date().toISOString();

  return {
    status: "success",
    message: "Documento salvo automaticamente.",
  };
}

export async function saveDemoWhiteboard(input: SaveWhiteboardInput): Promise<NoteActionResult> {
  const state = getState();
  const workspace = getWorkspaceById(state, input.workspaceId);

  if (!workspace) {
    return {
      status: "error",
      message: "Quadro não encontrado.",
    };
  }

  workspace.whiteboard = structuredClone(input.data);
  workspace.updatedAt = new Date().toISOString();

  return {
    status: "success",
    message: "Quadro salvo automaticamente.",
  };
}

export async function updateDemoWorkspaceColumns(
  input: UpdateWorkspaceColumnsInput,
): Promise<NoteActionResult> {
  const state = getState();
  const workspace = getWorkspaceById(state, input.workspaceId);

  if (!workspace) {
    return {
      status: "error",
      message: "Workspace de notas não encontrado.",
    };
  }

  const nextColumns = input.columns.filter((column, index, array) =>
    column.trim().length > 0 && array.findIndex((entry) => entry === column) === index,
  );

  if (nextColumns.length === 0) {
    return {
      status: "error",
      message: "Informe pelo menos uma coluna.",
    };
  }

  const fallbackColumn = nextColumns[0];
  workspace.columns = nextColumns;
  workspace.cards = workspace.cards.map((card) => ({
    ...card,
    columnName: card.columnName && nextColumns.includes(card.columnName) ? card.columnName : fallbackColumn,
  }));
  workspace.updatedAt = new Date().toISOString();

  nextColumns.forEach((columnName) => resequenceCards(workspace.cards, columnName));

  return {
    status: "success",
    message: "Colunas atualizadas com sucesso.",
  };
}

export async function renameDemoWorkspace(
  input: RenameWorkspaceInput,
): Promise<NoteActionResult> {
  const state = getState();
  const workspace = getWorkspaceById(state, input.workspaceId);

  if (!workspace) {
    return {
      status: "error",
      message: "Workspace de notas não encontrado.",
    };
  }

  workspace.name = input.name;
  workspace.updatedAt = new Date().toISOString();

  return {
    status: "success",
    message: "Nome do workspace atualizado.",
  };
}
