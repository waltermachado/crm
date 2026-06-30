export type NoteViewType = "GRID" | "KANBAN" | "DOC" | "WHITEBOARD";

export type NoteActionResult = {
  status: "idle" | "success" | "error";
  message: string;
};

export type NoteCardRecord = {
  id: string;
  title: string;
  content: string;
  color: string;
  columnName?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type NoteWhiteboardNode = {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  color: string;
};

export type NoteWhiteboardData = {
  nodes: NoteWhiteboardNode[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
};

export type NoteWorkspaceRecord = {
  id: string;
  name: string;
  viewType: NoteViewType;
  description: string;
  cards: NoteCardRecord[];
  columns: string[];
  documentContent: string;
  whiteboard: NoteWhiteboardData;
  createdAt: string;
  updatedAt: string;
};

export type NotesSnapshot = {
  locale: "pt-BR" | "en-US";
  canPersistToDatabase: boolean;
  workspaces: Record<NoteViewType, NoteWorkspaceRecord>;
};

export type CreateNoteInput = {
  workspaceId: string;
  title: string;
  content?: string;
  color?: string;
  columnName?: string;
};

export type UpdateNoteInput = {
  workspaceId: string;
  noteId: string;
  title?: string;
  content?: string;
  color?: string;
  columnName?: string | null;
  order?: number;
};

export type DeleteNoteInput = {
  workspaceId: string;
  noteId: string;
};

export type MoveNoteInput = {
  workspaceId: string;
  noteId: string;
  sourceColumnName?: string | null;
  targetColumnName?: string | null;
  sourceIndex: number;
  targetIndex: number;
};

export type SaveDocumentInput = {
  workspaceId: string;
  content: string;
};

export type SaveWhiteboardInput = {
  workspaceId: string;
  data: NoteWhiteboardData;
};

export type UpdateWorkspaceColumnsInput = {
  workspaceId: string;
  columns: string[];
};

export type RenameWorkspaceInput = {
  workspaceId: string;
  name: string;
};
