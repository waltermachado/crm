"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hasSupabaseConfig } from "@/lib/env/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createNoteSchema = z.object({
  title: z.string().trim().min(2).max(120),
  content: z.string().trim().max(4000).optional(),
});

const updateNoteSchema = z.object({
  noteId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  content: z.string().trim().max(4000).optional(),
});

const deleteNoteSchema = z.object({
  noteId: z.string().uuid(),
});

export type NoteMutationResult = {
  status: "success" | "error";
  message: string;
};

async function getAuthenticatedSupabaseClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase environment variables are missing.");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to manage notes.");
  }

  return { supabase, user };
}

export async function createPrivateNoteAction(input: {
  title: string;
  content?: string;
}): Promise<NoteMutationResult> {
  const parsed = createNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Unable to create the note.",
    };
  }

  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient();
    const { error } = await supabase.from("notes").insert({
      title: parsed.data.title,
      content: parsed.data.content ?? "",
      user_id: user.id,
    });

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Note created successfully.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create the note.",
    };
  }
}

export async function updatePrivateNoteAction(input: {
  noteId: string;
  title: string;
  content?: string;
}): Promise<NoteMutationResult> {
  const parsed = updateNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Unable to update the note.",
    };
  }

  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient();
    const { error } = await supabase
      .from("notes")
      .update({
        title: parsed.data.title,
        content: parsed.data.content ?? "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.noteId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Note updated successfully.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to update the note.",
    };
  }
}

export async function deletePrivateNoteAction(input: {
  noteId: string;
}): Promise<NoteMutationResult> {
  const parsed = deleteNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Unable to delete the note.",
    };
  }

  try {
    const { supabase, user } = await getAuthenticatedSupabaseClient();
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", parsed.data.noteId)
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Note deleted successfully.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to delete the note.",
    };
  }
}
