"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bold,
  BrushCleaning,
  Columns3,
  Copy,
  GripVertical,
  Heading2,
  Italic,
  KanbanSquare,
  LayoutGrid,
  NotebookText,
  Palette,
  PenSquare,
  Plus,
  Rows3,
  StickyNote,
  Trash2,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createNoteAction,
  deleteNoteAction,
  moveNoteAction,
  renameWorkspaceAction,
  saveDocumentAction,
  saveWhiteboardAction,
  updateNoteAction,
  updateWorkspaceColumnsAction,
} from "@/app/actions/notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  CreateNoteInput,
  NoteCardRecord,
  NotesSnapshot,
  NoteViewType,
  NoteWhiteboardNode,
  NoteWorkspaceRecord,
  UpdateNoteInput,
} from "@/types/notes";

const inputClassName =
  "flex h-11 w-full rounded-2xl border border-border/70 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
const textareaClassName =
  "flex min-h-[120px] w-full rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";
const colorPalette = ["#fff7d6", "#dff7f2", "#e9e7ff", "#ffe4e6", "#dbeafe", "#fde68a"] as const;
type ToolbarCopy = {
  bold: string;
  italic: string;
  heading: string;
  bullet: string;
};

type ViewButton = {
  id: NoteViewType;
  label: string;
  helper: string;
  icon: typeof LayoutGrid;
};

type ComposerState = {
  mode: "create" | "edit";
  viewType: "GRID" | "KANBAN";
  workspaceId: string;
  note?: NoteCardRecord | null;
  defaultColumnName?: string | null;
} | null;

function toQueryView(viewType: NoteViewType) {
  return viewType.toLowerCase();
}

function sortCards(cards: NoteCardRecord[]) {
  return [...cards].sort((left, right) => left.order - right.order);
}

function groupCardsByColumn(workspace: NoteWorkspaceRecord) {
  return workspace.columns.map((columnName) => ({
    columnName,
    cards: sortCards(
      workspace.cards.filter((card) => (card.columnName ?? workspace.columns[0]) === columnName),
    ),
  }));
}

function moveCardInWorkspace(
  workspace: NoteWorkspaceRecord,
  params: {
    noteId: string;
    sourceColumnName?: string | null;
    targetColumnName?: string | null;
    targetIndex: number;
  },
) {
  const moving = workspace.cards.find((card) => card.id === params.noteId);

  if (!moving) {
    return workspace;
  }

  if (workspace.viewType !== "KANBAN") {
    const cards = sortCards(workspace.cards.filter((card) => card.id !== params.noteId));
    const nextCards = [...cards];
    nextCards.splice(Math.min(params.targetIndex, nextCards.length), 0, {
      ...moving,
      order: 0,
      updatedAt: new Date().toISOString(),
    });

    return {
      ...workspace,
      cards: nextCards.map((card, index) => ({
        ...card,
        order: index,
      })),
    };
  }

  const sourceColumn = params.sourceColumnName ?? moving.columnName ?? workspace.columns[0];
  const targetColumn = params.targetColumnName ?? moving.columnName ?? workspace.columns[0];
  const nextCards = workspace.cards.filter((card) => card.id !== params.noteId);
  const columnsMap = Object.fromEntries(
    workspace.columns.map((columnName) => [
      columnName,
      sortCards(nextCards.filter((card) => (card.columnName ?? workspace.columns[0]) === columnName)),
    ]),
  ) as Record<string, NoteCardRecord[]>;

  const targetCards = [...(columnsMap[targetColumn] ?? [])];
  targetCards.splice(Math.min(params.targetIndex, targetCards.length), 0, {
    ...moving,
    columnName: targetColumn,
    updatedAt: new Date().toISOString(),
  });
  columnsMap[targetColumn] = targetCards;

  if (!columnsMap[sourceColumn]) {
    columnsMap[sourceColumn] = [];
  }

  return {
    ...workspace,
    cards: workspace.columns.flatMap((columnName) =>
      (columnsMap[columnName] ?? []).map((card, index) => ({
        ...card,
        columnName,
        order: index,
      })),
    ),
  };
}

function upsertCardInWorkspace(
  workspace: NoteWorkspaceRecord,
  note: NoteCardRecord,
  mode: "create" | "edit",
) {
  if (mode === "create") {
    const nextOrder =
      workspace.viewType === "KANBAN"
        ? workspace.cards.filter(
            (card) => (card.columnName ?? workspace.columns[0]) === (note.columnName ?? workspace.columns[0]),
          ).length
        : workspace.cards.length;

    return {
      ...workspace,
      cards: [...workspace.cards, { ...note, order: nextOrder }],
    };
  }

  return {
    ...workspace,
    cards: workspace.cards.map((card) => (card.id === note.id ? note : card)),
  };
}

function removeCardFromWorkspace(workspace: NoteWorkspaceRecord, noteId: string) {
  if (workspace.viewType !== "KANBAN") {
    return {
      ...workspace,
      cards: workspace.cards
        .filter((card) => card.id !== noteId)
        .map((card, index) => ({
          ...card,
          order: index,
        })),
    };
  }

  const remaining = workspace.cards.filter((card) => card.id !== noteId);

  return {
    ...workspace,
    cards: workspace.columns.flatMap((columnName) =>
      sortCards(
        remaining.filter((card) => (card.columnName ?? workspace.columns[0]) === columnName),
      ).map((card, index) => ({
        ...card,
        order: index,
      })),
    ),
  };
}

function normalizeColumns(columns: string[]) {
  return columns
    .map((column) => column.trim())
    .filter((column, index, array) => column.length > 0 && array.indexOf(column) === index);
}

function getPlainTextFromHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function NotesBoard({
  snapshot,
  initialView,
}: {
  snapshot: NotesSnapshot;
  initialView: NoteViewType;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [workspaces, setWorkspaces] = useState(snapshot.workspaces);
  const [activeView, setActiveView] = useState<NoteViewType>(initialView);
  const [composerState, setComposerState] = useState<ComposerState>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [workspaceNameDrafts, setWorkspaceNameDrafts] = useState<Record<NoteViewType, string>>({
    GRID: snapshot.workspaces.GRID.name,
    KANBAN: snapshot.workspaces.KANBAN.name,
    DOC: snapshot.workspaces.DOC.name,
    WHITEBOARD: snapshot.workspaces.WHITEBOARD.name,
  });
  const [kanbanColumnDraft, setKanbanColumnDraft] = useState("");
  const [activeDragCardId, setActiveDragCardId] = useState<string | null>(null);
  const lastSavedDocRef = useRef(snapshot.workspaces.DOC.documentContent);
  const lastSavedWhiteboardRef = useRef(JSON.stringify(snapshot.workspaces.WHITEBOARD.whiteboard));
  const activeWorkspace = workspaces[activeView];
  const locale = snapshot.locale;

  const copy = locale === "pt-BR"
    ? {
        badge: "Knowledge workspace",
        title: "Anotações e bloco de notas com visualizações isoladas.",
        description:
          "Troque entre grade, pipeline, documento e quadro branco sem misturar dados entre layouts. Cada visualização persiste em seu próprio workspace via React Server Components e Server Actions.",
        addNote: "Nova nota",
        addColumn: "Nova coluna",
        saveColumns: "Salvar colunas",
        quickView: "Alternar visualização",
        renameWorkspace: "Nome do workspace",
        isolatedData: "Escopo isolado",
        autosaveReady: "Autosave via Server Actions",
        copyId: "Copiar ID",
        copied: "ID copiado.",
        cards: "Cards",
        columns: "Colunas",
        richText: "Rich text",
        canvas: "Canvas livre",
        createNote: "Criar nota",
        editNote: "Editar nota",
        titleLabel: "Título",
        contentLabel: "Conteúdo",
        colorLabel: "Cor",
        columnLabel: "Coluna",
        cancel: "Cancelar",
        save: "Salvar",
        delete: "Excluir",
        deleting: "Excluindo...",
        creating: "Criando...",
        updating: "Atualizando...",
        noGridNotes: "Adicione notas visuais para ideias rápidas, lembretes e capturas soltas.",
        noKanbanNotes: "Crie a primeira nota desta coluna para iniciar o fluxo.",
        noDocument:
          "Comece a escrever. O conteúdo é salvo automaticamente poucos instantes após cada alteração.",
        noWhiteboard:
          "Adicione post-its e organize o raciocínio visualmente. O quadro também salva sozinho.",
        documentHint: "Seleção rápida com negrito, itálico, listas e títulos curtos.",
        whiteboardHint: "Arraste os post-its pelo canvas e edite título e conteúdo inline.",
        words: "palavras",
        sticky: "Post-it",
        copiedLabel: "Copiado",
        viewButtonHelper: {
          GRID: "Cards livres",
          KANBAN: "Fluxo em colunas",
          DOC: "Texto longo",
          WHITEBOARD: "Mapa visual",
        },
        lastSave: "Última ação",
        pendingSync: "Sincronizando alterações...",
        moveHint: "Arraste entre colunas",
        addSticky: "Novo post-it",
        resetCanvas: "Centralizar quadro",
        toolbar: {
          bold: "Negrito",
          italic: "Itálico",
          heading: "Título",
          bullet: "Lista",
        },
      }
    : {
        badge: "Knowledge workspace",
        title: "Notes and notebook with isolated views.",
        description:
          "Switch between grid, pipeline, document, and whiteboard without mixing data across layouts. Each view persists in its own workspace via React Server Components and Server Actions.",
        addNote: "New note",
        addColumn: "New column",
        saveColumns: "Save columns",
        quickView: "Switch view",
        renameWorkspace: "Workspace name",
        isolatedData: "Isolated scope",
        autosaveReady: "Server Action autosave",
        copyId: "Copy ID",
        copied: "ID copied.",
        cards: "Cards",
        columns: "Columns",
        richText: "Rich text",
        canvas: "Free canvas",
        createNote: "Create note",
        editNote: "Edit note",
        titleLabel: "Title",
        contentLabel: "Content",
        colorLabel: "Color",
        columnLabel: "Column",
        cancel: "Cancel",
        save: "Save",
        delete: "Delete",
        deleting: "Deleting...",
        creating: "Creating...",
        updating: "Updating...",
        noGridNotes: "Add visual notes for quick ideas, reminders, and loose captures.",
        noKanbanNotes: "Create the first note in this column to start the flow.",
        noDocument:
          "Start writing. Content is saved automatically shortly after each change.",
        noWhiteboard:
          "Add sticky notes and organize your thinking visually. The board autosaves too.",
        documentHint: "Quick formatting with bold, italic, bullets, and short headings.",
        whiteboardHint: "Drag sticky notes across the canvas and edit inline.",
        words: "words",
        sticky: "Sticky",
        copiedLabel: "Copied",
        viewButtonHelper: {
          GRID: "Loose cards",
          KANBAN: "Column flow",
          DOC: "Long-form text",
          WHITEBOARD: "Visual map",
        },
        lastSave: "Latest action",
        pendingSync: "Syncing changes...",
        moveHint: "Drag between columns",
        addSticky: "New sticky",
        resetCanvas: "Center board",
        toolbar: {
          bold: "Bold",
          italic: "Italic",
          heading: "Heading",
          bullet: "Bullet list",
        },
      };

  const viewButtons = useMemo<ViewButton[]>(
    () => [
      {
        id: "GRID",
        label: "Grid View",
        helper: copy.viewButtonHelper.GRID,
        icon: LayoutGrid,
      },
      {
        id: "KANBAN",
        label: "Kanban View",
        helper: copy.viewButtonHelper.KANBAN,
        icon: KanbanSquare,
      },
      {
        id: "DOC",
        label: "Document View",
        helper: copy.viewButtonHelper.DOC,
        icon: NotebookText,
      },
      {
        id: "WHITEBOARD",
        label: "Whiteboard View",
        helper: copy.viewButtonHelper.WHITEBOARD,
        icon: Workflow,
      },
    ],
    [copy.viewButtonHelper.DOC, copy.viewButtonHelper.GRID, copy.viewButtonHelper.KANBAN, copy.viewButtonHelper.WHITEBOARD],
  );

  const metrics = useMemo(
    () => [
      {
        label: copy.cards,
        value: `${workspaces.GRID.cards.length + workspaces.KANBAN.cards.length}`,
        helper: "GRID + KANBAN",
        icon: Rows3,
      },
      {
        label: copy.columns,
        value: String(workspaces.KANBAN.columns.length),
        helper: copy.moveHint,
        icon: Columns3,
      },
      {
        label: copy.richText,
        value: `${getPlainTextFromHtml(workspaces.DOC.documentContent).split(" ").filter(Boolean).length}`,
        helper: copy.words,
        icon: PenSquare,
      },
      {
        label: copy.canvas,
        value: String(workspaces.WHITEBOARD.whiteboard.nodes.length),
        helper: copy.sticky,
        icon: StickyNote,
      },
    ],
    [
      copy.canvas,
      copy.cards,
      copy.columns,
      copy.moveHint,
      copy.richText,
      copy.sticky,
      copy.words,
      workspaces.DOC.documentContent,
      workspaces.GRID.cards.length,
      workspaces.KANBAN.cards.length,
      workspaces.KANBAN.columns.length,
      workspaces.WHITEBOARD.whiteboard.nodes.length,
    ],
  );

  useEffect(() => {
    setWorkspaces(snapshot.workspaces);
    setWorkspaceNameDrafts({
      GRID: snapshot.workspaces.GRID.name,
      KANBAN: snapshot.workspaces.KANBAN.name,
      DOC: snapshot.workspaces.DOC.name,
      WHITEBOARD: snapshot.workspaces.WHITEBOARD.name,
    });
    lastSavedDocRef.current = snapshot.workspaces.DOC.documentContent;
    lastSavedWhiteboardRef.current = JSON.stringify(snapshot.workspaces.WHITEBOARD.whiteboard);
  }, [snapshot.workspaces]);

  useEffect(() => {
    if (copiedNoteId === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopiedNoteId(null), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [copiedNoteId]);

  useEffect(() => {
    if (activeView !== "DOC") {
      return;
    }

    const nextContent = workspaces.DOC.documentContent;

    if (nextContent === lastSavedDocRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(async () => {
        const result = await saveDocumentAction({
          workspaceId: workspaces.DOC.id,
          content: nextContent,
        });

        setStatusMessage(result.message);

        if (result.status === "success") {
          lastSavedDocRef.current = nextContent;
        }
      });
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [activeView, startTransition, workspaces.DOC.documentContent, workspaces.DOC.id]);

  const whiteboardSerialized = useMemo(
    () => JSON.stringify(workspaces.WHITEBOARD.whiteboard),
    [workspaces.WHITEBOARD.whiteboard],
  );

  useEffect(() => {
    if (activeView !== "WHITEBOARD") {
      return;
    }

    if (whiteboardSerialized === lastSavedWhiteboardRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(async () => {
        const result = await saveWhiteboardAction({
          workspaceId: workspaces.WHITEBOARD.id,
          data: workspaces.WHITEBOARD.whiteboard,
        });

        setStatusMessage(result.message);

        if (result.status === "success") {
          lastSavedWhiteboardRef.current = whiteboardSerialized;
        }
      });
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [activeView, startTransition, whiteboardSerialized, workspaces.WHITEBOARD.id, workspaces.WHITEBOARD.whiteboard]);

  function handleViewChange(viewType: NoteViewType) {
    setActiveView(viewType);
    router.replace(`/notes?view=${toQueryView(viewType)}`, { scroll: false });
  }

  function updateWorkspace(viewType: NoteViewType, updater: (workspace: NoteWorkspaceRecord) => NoteWorkspaceRecord) {
    setWorkspaces((current) => ({
      ...current,
      [viewType]: updater(current[viewType]),
    }));
  }

  function handleWorkspaceRename(viewType: NoteViewType, name: string) {
    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed === workspaces[viewType].name) {
      setWorkspaceNameDrafts((current) => ({
        ...current,
        [viewType]: workspaces[viewType].name,
      }));
      return;
    }

    const previous = workspaces;
    setWorkspaces((current) => ({
      ...current,
      [viewType]: {
        ...current[viewType],
        name: trimmed,
      },
    }));

    startTransition(async () => {
      const result = await renameWorkspaceAction({
        workspaceId: workspaces[viewType].id,
        name: trimmed,
      });

      setStatusMessage(result.message);

      if (result.status === "error") {
        setWorkspaces(previous);
      } else {
        router.refresh();
      }
    });
  }

  async function handleCopyNoteId(noteId: string) {
    await navigator.clipboard.writeText(noteId);
    setCopiedNoteId(noteId);
    setStatusMessage(copy.copied);
  }

  function handleCreateOrUpdateNote(values: {
    mode: "create" | "edit";
    viewType: "GRID" | "KANBAN";
    workspaceId: string;
    noteId?: string;
    title: string;
    content: string;
    color: string;
    columnName?: string | null;
  }) {
    const previous = workspaces;
    const now = new Date().toISOString();
    const optimisticNote: NoteCardRecord = {
      id: values.noteId ?? `TEMP-${Date.now()}`,
      title: values.title,
      content: values.content,
      color: values.color,
      columnName: values.viewType === "KANBAN" ? values.columnName ?? activeWorkspace.columns[0] : null,
      order: 0,
      createdAt: now,
      updatedAt: now,
    };

    updateWorkspace(values.viewType, (workspace) =>
      upsertCardInWorkspace(workspace, optimisticNote, values.mode),
    );
    setComposerState(null);

    startTransition(async () => {
      const result =
        values.mode === "create"
          ? await createNoteAction({
              workspaceId: values.workspaceId,
              title: values.title,
              content: values.content,
              color: values.color,
              columnName: values.columnName ?? undefined,
            } satisfies CreateNoteInput)
          : await updateNoteAction({
              workspaceId: values.workspaceId,
              noteId: values.noteId ?? "",
              title: values.title,
              content: values.content,
              color: values.color,
              columnName: values.columnName,
            } satisfies UpdateNoteInput);

      setStatusMessage(result.message);

      if (result.status === "error") {
        setWorkspaces(previous);
        return;
      }

      router.refresh();
    });
  }

  function handleDeleteNote(viewType: "GRID" | "KANBAN", workspaceId: string, noteId: string) {
    const previous = workspaces;
    updateWorkspace(viewType, (workspace) => removeCardFromWorkspace(workspace, noteId));
    setComposerState(null);

    startTransition(async () => {
      const result = await deleteNoteAction({
        workspaceId,
        noteId,
      });

      setStatusMessage(result.message);

      if (result.status === "error") {
        setWorkspaces(previous);
        return;
      }

      router.refresh();
    });
  }

  function handleKanbanMove(args: {
    noteId: string;
    sourceColumnName: string;
    targetColumnName: string;
    sourceIndex: number;
    targetIndex: number;
  }) {
    const previous = workspaces;
    updateWorkspace("KANBAN", (workspace) =>
      moveCardInWorkspace(workspace, {
        noteId: args.noteId,
        sourceColumnName: args.sourceColumnName,
        targetColumnName: args.targetColumnName,
        targetIndex: args.targetIndex,
      }),
    );

    startTransition(async () => {
      const result = await moveNoteAction({
        workspaceId: workspaces.KANBAN.id,
        noteId: args.noteId,
        sourceColumnName: args.sourceColumnName,
        targetColumnName: args.targetColumnName,
        sourceIndex: args.sourceIndex,
        targetIndex: args.targetIndex,
      });

      setStatusMessage(result.message);

      if (result.status === "error") {
        setWorkspaces(previous);
        return;
      }

      router.refresh();
    });
  }

  function handleSaveColumns() {
    const nextColumns = normalizeColumns([
      ...workspaces.KANBAN.columns,
      ...(kanbanColumnDraft ? [kanbanColumnDraft] : []),
    ]);

    if (nextColumns.length === 0) {
      return;
    }

    const previous = workspaces;
    setKanbanColumnDraft("");
    updateWorkspace("KANBAN", (workspace) => ({
      ...workspace,
      columns: nextColumns,
      cards: workspace.cards.map((card) => ({
        ...card,
        columnName: nextColumns.includes(card.columnName ?? "") ? card.columnName : nextColumns[0],
      })),
    }));

    startTransition(async () => {
      const result = await updateWorkspaceColumnsAction({
        workspaceId: workspaces.KANBAN.id,
        columns: nextColumns,
      });

      setStatusMessage(result.message);

      if (result.status === "error") {
        setWorkspaces(previous);
        return;
      }

      router.refresh();
    });
  }

  function handleInlineColumnRename(columnIndex: number, value: string) {
    updateWorkspace("KANBAN", (workspace) => {
      const nextColumns = [...workspace.columns];
      const previousName = nextColumns[columnIndex];
      nextColumns[columnIndex] = value;

      return {
        ...workspace,
        columns: nextColumns,
        cards: workspace.cards.map((card) =>
          card.columnName === previousName ? { ...card, columnName: value } : card,
        ),
      };
    });
  }

  function handlePersistInlineColumns() {
    const nextColumns = normalizeColumns(workspaces.KANBAN.columns);

    if (nextColumns.length === 0) {
      return;
    }

    const previous = workspaces;
    updateWorkspace("KANBAN", (workspace) => ({
      ...workspace,
      columns: nextColumns,
      cards: workspace.cards.map((card) => ({
        ...card,
        columnName: nextColumns.includes(card.columnName ?? "") ? card.columnName : nextColumns[0],
      })),
    }));

    startTransition(async () => {
      const result = await updateWorkspaceColumnsAction({
        workspaceId: workspaces.KANBAN.id,
        columns: nextColumns,
      });

      setStatusMessage(result.message);

      if (result.status === "error") {
        setWorkspaces(previous);
        return;
      }

      router.refresh();
    });
  }

  function openComposer(state: ComposerState) {
    setComposerState(state);
  }

  function updateDocumentContent(content: string) {
    updateWorkspace("DOC", (workspace) => ({
      ...workspace,
      documentContent: content,
    }));
  }

  function updateWhiteboardNodes(nodes: NoteWhiteboardNode[]) {
    updateWorkspace("WHITEBOARD", (workspace) => ({
      ...workspace,
      whiteboard: {
        ...workspace.whiteboard,
        nodes,
      },
    }));
  }

  function centerWhiteboard() {
    updateWorkspace("WHITEBOARD", (workspace) => ({
      ...workspace,
      whiteboard: {
        ...workspace.whiteboard,
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    }));
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.7))] shadow-[0_30px_90px_-60px_rgba(15,23,42,0.8)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_30%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.84))]">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-primary/12 px-3 py-1 text-primary hover:bg-primary/12">
                {copy.badge}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-background/70 px-3 py-1 text-[11px]"
              >
                {copy.isolatedData}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/80 bg-background/70 px-3 py-1 text-[11px]"
              >
                {copy.autosaveReady}
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight">{copy.title}</CardTitle>
              <CardDescription className="max-w-4xl text-sm leading-6 text-foreground/75">
                {copy.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => {
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
                  <p className="mt-2 text-xs text-muted-foreground">{item.helper}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/80 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.85)]">
          <CardHeader>
            <CardTitle className="text-lg">{copy.quickView}</CardTitle>
            <CardDescription>{activeWorkspace.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground"
            >
              {statusMessage || `${copy.lastSave}: ${activeWorkspace.name}`}
            </div>
            {isPending ? (
              <p className="text-xs text-muted-foreground">{copy.pendingSync}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card className="border border-border/70 bg-card/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {viewButtons.map((button) => {
                  const Icon = button.icon;
                  const isActive = activeView === button.id;

                  return (
                    <button
                      key={button.id}
                      type="button"
                      onClick={() => handleViewChange(button.id)}
                      className={cn(
                        "rounded-[24px] border px-4 py-4 text-left transition",
                        isActive
                          ? "border-primary/30 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.14)]"
                          : "border-border/70 bg-background/70 hover:border-primary/20 hover:bg-primary/5",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Icon className="size-5 text-primary" />
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {button.helper}
                        </span>
                      </div>
                      <p className="mt-3 text-base font-semibold">{button.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full max-w-md space-y-2">
              <label className="text-sm font-medium" htmlFor="workspace-name">
                {copy.renameWorkspace}
              </label>
              <input
                id="workspace-name"
                className={inputClassName}
                value={workspaceNameDrafts[activeView]}
                onChange={(event) =>
                  setWorkspaceNameDrafts((current) => ({
                    ...current,
                    [activeView]: event.target.value,
                  }))
                }
                onBlur={() => handleWorkspaceRename(activeView, workspaceNameDrafts[activeView])}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {activeView === "GRID" ? (
        <GridNotesView
          workspace={workspaces.GRID}
          copy={copy}
          copiedNoteId={copiedNoteId}
          onCopyNoteId={handleCopyNoteId}
          onCreate={() =>
            openComposer({
              mode: "create",
              viewType: "GRID",
              workspaceId: workspaces.GRID.id,
            })
          }
          onEdit={(note) =>
            openComposer({
              mode: "edit",
              viewType: "GRID",
              workspaceId: workspaces.GRID.id,
              note,
            })
          }
        />
      ) : null}

      {activeView === "KANBAN" ? (
        <KanbanNotesView
          workspace={workspaces.KANBAN}
          copy={copy}
          copiedNoteId={copiedNoteId}
          kanbanColumnDraft={kanbanColumnDraft}
          setKanbanColumnDraft={setKanbanColumnDraft}
          onCopyNoteId={handleCopyNoteId}
          onCreateNote={(columnName) =>
            openComposer({
              mode: "create",
              viewType: "KANBAN",
              workspaceId: workspaces.KANBAN.id,
              defaultColumnName: columnName,
            })
          }
          onEdit={(note) =>
            openComposer({
              mode: "edit",
              viewType: "KANBAN",
              workspaceId: workspaces.KANBAN.id,
              note,
            })
          }
          onMoveNote={handleKanbanMove}
          onSaveColumns={handleSaveColumns}
          onInlineColumnRename={handleInlineColumnRename}
          onPersistInlineColumns={handlePersistInlineColumns}
          activeDragCardId={activeDragCardId}
          setActiveDragCardId={setActiveDragCardId}
        />
      ) : null}

      {activeView === "DOC" ? (
        <DocumentWorkspaceView
          workspace={workspaces.DOC}
          copy={copy}
          onChange={updateDocumentContent}
        />
      ) : null}

      {activeView === "WHITEBOARD" ? (
        <WhiteboardWorkspaceView
          workspace={workspaces.WHITEBOARD}
          copy={copy}
          onChangeNodes={updateWhiteboardNodes}
          onCenter={centerWhiteboard}
        />
      ) : null}

      <NoteComposer
        open={Boolean(composerState)}
        workspace={composerState ? workspaces[composerState.viewType] : null}
        state={composerState}
        copy={copy}
        onClose={() => setComposerState(null)}
        onSubmit={handleCreateOrUpdateNote}
        onDelete={handleDeleteNote}
      />
    </div>
  );
}

function GridNotesView({
  workspace,
  copy,
  copiedNoteId,
  onCopyNoteId,
  onCreate,
  onEdit,
}: {
  workspace: NoteWorkspaceRecord;
  copy: Record<string, unknown>;
  copiedNoteId: string | null;
  onCopyNoteId: (noteId: string) => Promise<void>;
  onCreate: () => void;
  onEdit: (note: NoteCardRecord) => void;
}) {
  return (
    <Card className="border border-border/70 bg-card/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Grid View</CardTitle>
            <CardDescription>{workspace.description}</CardDescription>
          </div>
          <Button onClick={onCreate}>
            <Plus className="size-4" />
            {String(copy.addNote)}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {workspace.cards.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-border/70 bg-background/60 px-6 py-16 text-center text-sm text-muted-foreground">
            {String(copy.noGridNotes)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortCards(workspace.cards).map((note) => (
              <article
                key={note.id}
                className="rounded-[28px] border border-border/70 p-5 shadow-[0_20px_60px_-55px_rgba(15,23,42,0.7)]"
                style={{ backgroundColor: note.color }}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => void onCopyNoteId(note.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80 transition hover:bg-black/10"
                  >
                    <Copy className="size-3.5" />
                    #{note.id}
                  </button>
                  <Badge className="rounded-full bg-black/5 text-foreground hover:bg-black/5">
                    {copiedNoteId === note.id ? String(copy.copiedLabel) : String(copy.copyId)}
                  </Badge>
                </div>
                <div className="mt-5 space-y-3">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">{note.title}</h3>
                  <p className="text-sm leading-6 text-slate-700">{note.content}</p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-600">{new Date(note.updatedAt).toLocaleString()}</span>
                  <Button variant="outline" onClick={() => onEdit(note)}>
                    <PenSquare className="size-4" />
                    {String(copy.editNote)}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KanbanNotesView({
  workspace,
  copy,
  copiedNoteId,
  kanbanColumnDraft,
  setKanbanColumnDraft,
  onCopyNoteId,
  onCreateNote,
  onEdit,
  onMoveNote,
  onSaveColumns,
  onInlineColumnRename,
  onPersistInlineColumns,
  activeDragCardId,
  setActiveDragCardId,
}: {
  workspace: NoteWorkspaceRecord;
  copy: Record<string, unknown>;
  copiedNoteId: string | null;
  kanbanColumnDraft: string;
  setKanbanColumnDraft: (value: string) => void;
  onCopyNoteId: (noteId: string) => Promise<void>;
  onCreateNote: (columnName: string) => void;
  onEdit: (note: NoteCardRecord) => void;
  onMoveNote: (args: {
    noteId: string;
    sourceColumnName: string;
    targetColumnName: string;
    sourceIndex: number;
    targetIndex: number;
  }) => void;
  onSaveColumns: () => void;
  onInlineColumnRename: (columnIndex: number, value: string) => void;
  onPersistInlineColumns: () => void;
  activeDragCardId: string | null;
  setActiveDragCardId: (value: string | null) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );
  const columns = groupCardsByColumn(workspace);
  const activeCard =
    activeDragCardId == null
      ? null
      : workspace.cards.find((card) => card.id === activeDragCardId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDragCardId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragCardId(null);

    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const sourceColumnName = String(active.data.current?.columnName ?? "");
    const sourceCards = columns.find((column) => column.columnName === sourceColumnName)?.cards ?? [];
    const sourceIndex = sourceCards.findIndex((card) => card.id === activeId);
    let targetColumnName = sourceColumnName;
    let targetIndex = 0;

    if (String(over.id).startsWith("column:")) {
      targetColumnName = String(over.id).replace("column:", "");
      targetIndex = columns.find((column) => column.columnName === targetColumnName)?.cards.length ?? 0;
    } else {
      targetColumnName = String(over.data.current?.columnName ?? sourceColumnName);
      targetIndex =
        columns
          .find((column) => column.columnName === targetColumnName)
          ?.cards.findIndex((card) => card.id === String(over.id)) ?? 0;
    }

    if (sourceIndex < 0) {
      return;
    }

    if (sourceColumnName === targetColumnName && sourceIndex === targetIndex) {
      return;
    }

    onMoveNote({
      noteId: activeId,
      sourceColumnName,
      targetColumnName,
      sourceIndex,
      targetIndex,
    });
  }

  return (
    <Card className="border border-border/70 bg-card/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Kanban View</CardTitle>
            <CardDescription>{workspace.description}</CardDescription>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={inputClassName}
              value={kanbanColumnDraft}
              onChange={(event) => setKanbanColumnDraft(event.target.value)}
              placeholder={String(copy.addColumn)}
            />
            <Button variant="outline" onClick={onSaveColumns}>
              <Columns3 className="size-4" />
              {String(copy.saveColumns)}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          {workspace.columns.map((columnName, index) => (
            <input
              key={`${columnName}-${index}`}
              className={cn(inputClassName, "h-10 w-auto min-w-[180px]")}
              value={columnName}
              onChange={(event) => onInlineColumnRename(index, event.target.value)}
              onBlur={onPersistInlineColumns}
            />
          ))}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.columnName}
                  columnName={column.columnName}
                  cards={column.cards}
                  copy={copy}
                  copiedNoteId={copiedNoteId}
                  onCopyNoteId={onCopyNoteId}
                  onCreate={() => onCreateNote(column.columnName)}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeCard ? (
              <KanbanCardBody
                note={activeCard}
                copy={copy}
                copiedNoteId={copiedNoteId}
                onCopyNoteId={onCopyNoteId}
                onEdit={onEdit}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  columnName,
  cards,
  copy,
  copiedNoteId,
  onCopyNoteId,
  onCreate,
  onEdit,
}: {
  columnName: string;
  cards: NoteCardRecord[];
  copy: Record<string, unknown>;
  copiedNoteId: string | null;
  onCopyNoteId: (noteId: string) => Promise<void>;
  onCreate: () => void;
  onEdit: (note: NoteCardRecord) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${columnName}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[320px] shrink-0 rounded-[28px] border border-border/70 bg-background/70 p-4 transition",
        isOver && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{columnName}</p>
          <p className="text-xs text-muted-foreground">{cards.length} cards</p>
        </div>
        <Button variant="outline" onClick={onCreate}>
          <Plus className="size-4" />
          {String(copy.addNote)}
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableKanbanCard
              key={card.id}
              note={card}
              copy={copy}
              copiedNoteId={copiedNoteId}
              onCopyNoteId={onCopyNoteId}
              onEdit={onEdit}
            />
          ))}
        </SortableContext>
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
            {String(copy.noKanbanNotes)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SortableKanbanCard({
  note,
  copy,
  copiedNoteId,
  onCopyNoteId,
  onEdit,
}: {
  note: NoteCardRecord;
  copy: Record<string, unknown>;
  copiedNoteId: string | null;
  onCopyNoteId: (noteId: string) => Promise<void>;
  onEdit: (note: NoteCardRecord) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    data: {
      columnName: note.columnName,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-60")}
    >
      <KanbanCardBody
        note={note}
        copy={copy}
        copiedNoteId={copiedNoteId}
        onCopyNoteId={onCopyNoteId}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function KanbanCardBody({
  note,
  copy,
  copiedNoteId,
  onCopyNoteId,
  onEdit,
  dragHandleProps,
  isOverlay,
}: {
  note: NoteCardRecord;
  copy: Record<string, unknown>;
  copiedNoteId: string | null;
  onCopyNoteId: (noteId: string) => Promise<void>;
  onEdit: (note: NoteCardRecord) => void;
  dragHandleProps?: Record<string, unknown>;
  isOverlay?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-[24px] border border-border/70 bg-card p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.9)]",
        isOverlay && "rotate-1 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.9)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
          onClick={() => void onCopyNoteId(note.id)}
        >
          <Copy className="size-3.5" />
          #{note.id}
        </button>
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground transition hover:text-foreground"
          {...dragHandleProps}
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="text-base font-semibold tracking-tight">{note.title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{note.content}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Badge className="rounded-full bg-muted text-foreground hover:bg-muted">
          {copiedNoteId === note.id ? String(copy.copiedLabel) : String(copy.copyId)}
        </Badge>
        <Button variant="outline" onClick={() => onEdit(note)}>
          <PenSquare className="size-4" />
          {String(copy.editNote)}
        </Button>
      </div>
    </article>
  );
}

function DocumentWorkspaceView({
  workspace,
  copy,
  onChange,
}: {
  workspace: NoteWorkspaceRecord;
  copy: Record<string, unknown>;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const toolbar = copy.toolbar as ToolbarCopy;

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== workspace.documentContent) {
      editorRef.current.innerHTML = workspace.documentContent || "<p></p>";
    }
  }, [workspace.documentContent]);

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML ?? "");
  }

  return (
    <Card className="border border-border/70 bg-card/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Document View</CardTitle>
            <CardDescription>{String(copy.documentHint)}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exec("bold")}>
              <Bold className="size-4" />
              {toolbar.bold}
            </Button>
            <Button variant="outline" onClick={() => exec("italic")}>
              <Italic className="size-4" />
              {toolbar.italic}
            </Button>
            <Button variant="outline" onClick={() => exec("formatBlock", "h2")}>
              <Heading2 className="size-4" />
              {toolbar.heading}
            </Button>
            <Button variant="outline" onClick={() => exec("insertUnorderedList")}>
              <Rows3 className="size-4" />
              {toolbar.bullet}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-[28px] border border-border/70 bg-background/70 p-4">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(event) => onChange(event.currentTarget.innerHTML)}
            className="min-h-[540px] w-full outline-none [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-4 [&_p]:leading-7"
          />
          {getPlainTextFromHtml(workspace.documentContent).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{String(copy.noDocument)}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function WhiteboardWorkspaceView({
  workspace,
  copy,
  onChangeNodes,
  onCenter,
}: {
  workspace: NoteWorkspaceRecord;
  copy: Record<string, unknown>;
  onChangeNodes: (nodes: NoteWhiteboardNode[]) => void;
  onCenter: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    viewportRef.current.scrollLeft = 520;
    viewportRef.current.scrollTop = 260;
  }, [workspace.id]);

  function updateNode(nodeId: string, updater: (node: NoteWhiteboardNode) => NoteWhiteboardNode) {
    onChangeNodes(
      workspace.whiteboard.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
    );
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragStateRef.current || !boardRef.current) {
      return;
    }

    const boardRect = boardRef.current.getBoundingClientRect();
    const nextX = event.clientX - boardRect.left - dragStateRef.current.offsetX;
    const nextY = event.clientY - boardRect.top - dragStateRef.current.offsetY;

    updateNode(dragStateRef.current.nodeId, (node) => ({
      ...node,
      x: Math.max(16, Math.min(nextX, 2200)),
      y: Math.max(16, Math.min(nextY, 1240)),
    }));
  }

  function handlePointerUp() {
    dragStateRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>, node: NoteWhiteboardNode) {
    if (!boardRef.current) {
      return;
    }

    const boardRect = boardRef.current.getBoundingClientRect();
    dragStateRef.current = {
      nodeId: node.id,
      offsetX: event.clientX - boardRect.left - node.x,
      offsetY: event.clientY - boardRect.top - node.y,
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function addSticky() {
    const nextNode: NoteWhiteboardNode = {
      id: `node-${Date.now()}`,
      x: 180 + workspace.whiteboard.nodes.length * 42,
      y: 180 + workspace.whiteboard.nodes.length * 18,
      title: "Nova ideia",
      content: "Descreva o próximo passo, hipótese ou insight.",
      color: colorPalette[workspace.whiteboard.nodes.length % colorPalette.length],
    };

    onChangeNodes([...workspace.whiteboard.nodes, nextNode]);
  }

  return (
    <Card className="border border-border/70 bg-card/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Whiteboard View</CardTitle>
            <CardDescription>{String(copy.whiteboardHint)}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCenter}>
              <BrushCleaning className="size-4" />
              {String(copy.resetCanvas)}
            </Button>
            <Button onClick={addSticky}>
              <Plus className="size-4" />
              {String(copy.addSticky)}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={viewportRef}
          className="overflow-auto rounded-[28px] border border-border/70 bg-background/70"
        >
          <div
            ref={boardRef}
            className="relative h-[1400px] w-[2400px]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.28) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          >
            {workspace.whiteboard.nodes.length === 0 ? (
              <div className="absolute left-12 top-12 rounded-[28px] border border-dashed border-border/70 bg-card/80 px-6 py-4 text-sm text-muted-foreground">
                {String(copy.noWhiteboard)}
              </div>
            ) : null}

            {workspace.whiteboard.nodes.map((node) => (
              <div
                key={node.id}
                className="absolute w-[280px] rounded-[28px] border border-border/70 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.85)]"
                style={{
                  left: node.x,
                  top: node.y,
                  backgroundColor: node.color,
                }}
              >
                <button
                  type="button"
                  onPointerDown={(event) => beginDrag(event, node)}
                  className="flex w-full items-center justify-between gap-3 rounded-t-[28px] border-b border-black/5 px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold">{String(copy.sticky)}</span>
                  <GripVertical className="size-4 text-slate-600" />
                </button>
                <div className="space-y-3 p-4">
                  <input
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white/70 px-3 text-sm outline-none"
                    value={node.title}
                    onChange={(event) =>
                      updateNode(node.id, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                  <textarea
                    className="min-h-[120px] w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-3 text-sm outline-none"
                    value={node.content}
                    onChange={(event) =>
                      updateNode(node.id, (current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NoteComposer({
  open,
  workspace,
  state,
  copy,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  workspace: NoteWorkspaceRecord | null;
  state: ComposerState;
  copy: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (values: {
    mode: "create" | "edit";
    viewType: "GRID" | "KANBAN";
    workspaceId: string;
    noteId?: string;
    title: string;
    content: string;
    color: string;
    columnName?: string | null;
  }) => void;
  onDelete: (viewType: "GRID" | "KANBAN", workspaceId: string, noteId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<string>(colorPalette[0]);
  const [columnName, setColumnName] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !state) {
      return;
    }

    setTitle(state.note?.title ?? "");
    setContent(state.note?.content ?? "");
    setColor(state.note?.color ?? colorPalette[0]);
    setColumnName(
      state.viewType === "KANBAN"
        ? state.note?.columnName ?? state.defaultColumnName ?? workspace?.columns[0] ?? null
        : null,
    );
  }, [open, state, workspace?.columns]);

  if (!open || !state || !workspace) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_40px_120px_-60px_rgba(15,23,42,0.7)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))]">
        <div className="border-b border-border/70 px-6 py-5">
          <p className="text-xl font-semibold">
            {state.mode === "create" ? String(copy.createNote) : String(copy.editNote)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{workspace.name}</p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="note-title">
              {String(copy.titleLabel)}
            </label>
            <input
              id="note-title"
              className={inputClassName}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{String(copy.colorLabel)}</label>
              <div className="flex flex-wrap gap-2">
                {colorPalette.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setColor(tone)}
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-full border border-border/70 transition",
                      color === tone && "ring-2 ring-primary/40",
                    )}
                    style={{ backgroundColor: tone }}
                  >
                    <Palette className="size-4 text-slate-700" />
                  </button>
                ))}
              </div>
            </div>

            {state.viewType === "KANBAN" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="note-column">
                  {String(copy.columnLabel)}
                </label>
                <select
                  id="note-column"
                  className={inputClassName}
                  value={columnName ?? workspace.columns[0]}
                  onChange={(event) => setColumnName(event.target.value)}
                >
                  {workspace.columns.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="note-content">
              {String(copy.contentLabel)}
            </label>
            <textarea
              id="note-content"
              className={textareaClassName}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          {state.mode === "edit" && state.note ? (
            <Button
              variant="destructive"
              onClick={() => onDelete(state.viewType, state.workspaceId, state.note?.id ?? "")}
            >
              <Trash2 className="size-4" />
              {String(copy.delete)}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              {String(copy.cancel)}
            </Button>
            <Button
              onClick={() =>
                onSubmit({
                  mode: state.mode,
                  viewType: state.viewType,
                  workspaceId: state.workspaceId,
                  noteId: state.note?.id,
                  title,
                  content,
                  color,
                  columnName,
                })
              }
              disabled={title.trim().length < 2}
            >
              {String(copy.save)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
