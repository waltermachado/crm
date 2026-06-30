import { NotesBoard } from "@/components/notes/notes-board";
import { getRequestI18n } from "@/lib/i18n/request";
import { getNotesSnapshot } from "@/lib/notes/board";
import type { NoteViewType } from "@/types/notes";

export const dynamic = "force-dynamic";

function normalizeViewParam(value?: string): NoteViewType {
  if (value === "grid" || value === "kanban" || value === "doc" || value === "whiteboard") {
    return value.toUpperCase() as NoteViewType;
  }

  return "GRID";
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const { locale } = await getRequestI18n();
  const snapshot = await getNotesSnapshot(locale);
  const initialView = normalizeViewParam(
    Array.isArray(params.view) ? params.view[0] : params.view,
  );

  return <NotesBoard snapshot={snapshot} initialView={initialView} />;
}
