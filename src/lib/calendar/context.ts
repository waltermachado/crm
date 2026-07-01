import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Membership = Database["public"]["Tables"]["Membership"]["Row"];
type Workspace = Database["public"]["Tables"]["Workspace"]["Row"];

import { DEFAULT_ACTOR, DEFAULT_WORKSPACE_ID } from "@/lib/deals/stage-definitions";

export async function ensureCalendarWorkspace(supabase: SupabaseClient<Database>): Promise<Workspace> {
  const { data: existing } = await supabase
    .from("Workspace")
    .select("*")
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("Workspace")
    .insert({
      id: DEFAULT_WORKSPACE_ID,
      name: "OslerNotes CRM",
      slug: "oslernotes-crm",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function ensureCalendarActor(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<Membership> {
  const { data: existing } = await supabase
    .from("Membership")
    .select("*")
    .eq("workspaceId", workspaceId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("Membership")
    .insert({
      id: crypto.randomUUID(),
      workspaceId,
      userId: DEFAULT_ACTOR.id,
      email: DEFAULT_ACTOR.email,
      fullName: DEFAULT_ACTOR.name,
      role: "admin",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function getCalendarContext(supabase: SupabaseClient<Database>) {
  const workspace = await ensureCalendarWorkspace(supabase);
  const actor = await ensureCalendarActor(supabase, workspace.id);

  return {
    workspaceId: workspace.id,
    actor,
  };
}
