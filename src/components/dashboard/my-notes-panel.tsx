"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, PencilLine, Plus, StickyNote, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createPrivateNoteAction,
  deletePrivateNoteAction,
  updatePrivateNoteAction,
} from "@/app/actions/private-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppLocale } from "@/lib/i18n/config";
import { formatRelativeDate } from "@/lib/utils/format";
import type { PrivateDashboardNote } from "@/types/contracts";

type DraftState = {
  title: string;
  content: string;
};

function getCopy(locale: AppLocale) {
  if (locale === "pt-BR") {
    return {
      title: "Minhas anotações",
      description: "Área privada protegida por RLS. Apenas o usuário autenticado acessa esses registros.",
      badge: "Privado",
      addTitle: "Título da nota",
      addContent: "Resumo, follow-up ou lembrete privado",
      addButton: "Salvar nota",
      saving: "Salvando...",
      empty: "Nenhuma anotação privada ainda. Crie a primeira para testar o isolamento por usuário.",
      edit: "Editar",
      delete: "Excluir",
      cancel: "Cancelar",
      update: "Atualizar",
      updated: "Atualizando...",
      deleting: "Excluindo...",
      createdSuccess: "Nota criada com sucesso.",
      updatedSuccess: "Nota atualizada com sucesso.",
      deletedSuccess: "Nota removida com sucesso.",
    };
  }

  return {
    title: "My Notes",
    description: "Private area protected by RLS. Only the authenticated user can access these records.",
    badge: "Private",
    addTitle: "Note title",
    addContent: "Summary, follow-up, or private reminder",
    addButton: "Save note",
    saving: "Saving...",
    empty: "No private notes yet. Create the first one to validate per-user isolation.",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    update: "Update",
    updated: "Updating...",
    deleting: "Deleting...",
    createdSuccess: "Note created successfully.",
    updatedSuccess: "Note updated successfully.",
    deletedSuccess: "Note deleted successfully.",
  };
}

export function MyNotesPanel({
  notes,
  locale,
}: {
  notes: PrivateDashboardNote[];
  locale: AppLocale;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftState>({ title: "", content: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<DraftState>({ title: "", content: "" });
  const copy = useMemo(() => getCopy(locale), [locale]);

  function resetCreateDraft() {
    setDraft({ title: "", content: "" });
  }

  function submitCreateNote() {
    if (draft.title.trim().length < 2) {
      toast.error(copy.addTitle);
      return;
    }

    startTransition(async () => {
      const result = await createPrivateNoteAction({
        title: draft.title,
        content: draft.content,
      });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(copy.createdSuccess);
      resetCreateDraft();
      router.refresh();
    });
  }

  function openEditor(note: PrivateDashboardNote) {
    setEditingId(note.id);
    setEditingDraft({
      title: note.title,
      content: note.content,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDraft({ title: "", content: "" });
  }

  function submitUpdateNote(noteId: string) {
    if (editingDraft.title.trim().length < 2) {
      toast.error(copy.addTitle);
      return;
    }

    startTransition(async () => {
      const result = await updatePrivateNoteAction({
        noteId,
        title: editingDraft.title,
        content: editingDraft.content,
      });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(copy.updatedSuccess);
      cancelEdit();
      router.refresh();
    });
  }

  function submitDeleteNote(noteId: string) {
    startTransition(async () => {
      const result = await deletePrivateNoteAction({ noteId });

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }

      toast.success(copy.deletedSuccess);
      if (editingId === noteId) {
        cancelEdit();
      }
      router.refresh();
    });
  }

  return (
    <Card className="border border-border/70 bg-card/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription className="mt-1">{copy.description}</CardDescription>
          </div>
          <Badge className="rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
            {copy.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3 rounded-3xl border border-border/70 bg-background/70 p-4">
          <Input
            placeholder={copy.addTitle}
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
          <Textarea
            placeholder={copy.addContent}
            value={draft.content}
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
          />
          <Button onClick={submitCreateNote} disabled={isPending}>
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {isPending ? copy.saving : copy.addButton}
          </Button>
        </div>

        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/70 bg-background/60 px-4 py-10 text-sm text-muted-foreground">
              {copy.empty}
            </div>
          ) : null}

          {notes.map((note) => {
            const isEditing = editingId === note.id;

            return (
              <article
                key={note.id}
                className="rounded-3xl border border-border/70 bg-background/70 p-4"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={editingDraft.title}
                      onChange={(event) =>
                        setEditingDraft((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                    <Textarea
                      value={editingDraft.content}
                      onChange={(event) =>
                        setEditingDraft((current) => ({ ...current, content: event.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => submitUpdateNote(note.id)} disabled={isPending}>
                        {isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <PencilLine className="size-4" />
                        )}
                        {isPending ? copy.updated : copy.update}
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} disabled={isPending}>
                        {copy.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StickyNote className="size-4 text-primary" />
                          <h3 className="font-semibold tracking-tight">{note.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDate(note.updatedAt, locale)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditor(note)}>
                          <PencilLine className="size-4" />
                          {copy.edit}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => submitDeleteNote(note.id)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          {isPending ? copy.deleting : copy.delete}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {note.content || " "}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
