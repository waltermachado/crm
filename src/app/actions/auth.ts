"use server";

import { z } from "zod";

import { hasSupabaseConfig } from "@/lib/env/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export type AuthActionResult = {
  status: "success" | "error";
  message: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      status: "error",
      message: "Review the form fields and try again.",
      fieldErrors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    };
  }

  if (!hasSupabaseConfig()) {
    return {
      status: "error",
      message: "Supabase environment variables are missing.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  return {
    status: "success",
    message: "Welcome back to Axe CRM.",
  };
}

export async function signOutAction(): Promise<AuthActionResult> {
  if (!hasSupabaseConfig()) {
    return {
      status: "error",
      message: "Supabase environment variables are missing.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  return {
    status: "success",
    message: "You have been signed out.",
  };
}
