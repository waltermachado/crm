import { z } from "zod";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

let cachedSupabaseEnv: SupabaseEnv | null = null;

export function getSupabaseEnv() {
  if (cachedSupabaseEnv) {
    return cachedSupabaseEnv;
  }

  cachedSupabaseEnv = supabaseEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  return cachedSupabaseEnv;
}

export function hasSupabaseConfig(env = getSupabaseEnv()) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
