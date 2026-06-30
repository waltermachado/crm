# Supabase Notes

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for `@supabase/ssr` authentication and server-side reads.
- Apply `supabase/migrations/20260629_auth_dashboard.sql` in the Supabase SQL editor or through the Supabase CLI before testing the dashboard.
- Shared CRM tables (`contacts`, `companies`, `deals`, `tickets`, `activities`) are readable by any authenticated user through RLS.
- Private notes live in `public.notes` and are protected by `auth.uid() = user_id` policies for `select`, `insert`, `update`, and `delete`.
- The dashboard reads shared data directly from Supabase with `supabase.from("<table>").select(...)` and never uses an ORM.
