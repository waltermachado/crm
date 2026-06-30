create extension if not exists "pgcrypto";

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  company_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  owner_name text,
  stage text not null check (stage in ('qualification', 'discovery', 'proposal', 'negotiation', 'closed_won')),
  value numeric(12, 2) not null default 0,
  expected_close_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company', 'contact', 'deal', 'ticket')),
  summary text not null,
  actor_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists contacts_created_at_idx on public.contacts (created_at desc);
create index if not exists companies_created_at_idx on public.companies (created_at desc);
create index if not exists deals_stage_idx on public.deals (stage);
create index if not exists deals_expected_close_date_idx on public.deals (expected_close_date);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists activities_created_at_idx on public.activities (created_at desc);
create index if not exists notes_user_updated_at_idx on public.notes (user_id, updated_at desc);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_notes_updated_at on public.notes;

create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.contacts enable row level security;
alter table public.companies enable row level security;
alter table public.deals enable row level security;
alter table public.tickets enable row level security;
alter table public.activities enable row level security;
alter table public.notes enable row level security;

drop policy if exists "authenticated users can read contacts" on public.contacts;
create policy "authenticated users can read contacts"
on public.contacts
for select
to authenticated
using (true);

drop policy if exists "authenticated users can read companies" on public.companies;
create policy "authenticated users can read companies"
on public.companies
for select
to authenticated
using (true);

drop policy if exists "authenticated users can read deals" on public.deals;
create policy "authenticated users can read deals"
on public.deals
for select
to authenticated
using (true);

drop policy if exists "authenticated users can read tickets" on public.tickets;
create policy "authenticated users can read tickets"
on public.tickets
for select
to authenticated
using (true);

drop policy if exists "authenticated users can read activities" on public.activities;
create policy "authenticated users can read activities"
on public.activities
for select
to authenticated
using (true);

drop policy if exists "users can read own notes" on public.notes;
create policy "users can read own notes"
on public.notes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users can insert own notes" on public.notes;
create policy "users can insert own notes"
on public.notes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can update own notes" on public.notes;
create policy "users can update own notes"
on public.notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own notes" on public.notes;
create policy "users can delete own notes"
on public.notes
for delete
to authenticated
using (auth.uid() = user_id);
