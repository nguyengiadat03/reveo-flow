create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Personal Workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  graph_json jsonb not null default '{}'::jsonb,
  version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflows(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  model_name text,
  status text not null default 'queued',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  request_json jsonb not null default '{}'::jsonb,
  result_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  status text not null default 'not_configured',
  masked_key text,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, provider_id)
);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workflows enable row level security;
alter table public.render_jobs enable row level security;
alter table public.provider_accounts enable row level security;

drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "workspaces_owner_all" on public.workspaces;
create policy "workspaces_owner_all" on public.workspaces for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "workflows_owner_all" on public.workflows;
create policy "workflows_owner_all" on public.workflows for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "render_jobs_owner_all" on public.render_jobs;
create policy "render_jobs_owner_all" on public.render_jobs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "provider_accounts_owner_all" on public.provider_accounts;
create policy "provider_accounts_owner_all" on public.provider_accounts for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
drop trigger if exists workflows_set_updated_at on public.workflows;
create trigger workflows_set_updated_at before update on public.workflows for each row execute function public.set_updated_at();
drop trigger if exists render_jobs_set_updated_at on public.render_jobs;
create trigger render_jobs_set_updated_at before update on public.render_jobs for each row execute function public.set_updated_at();
drop trigger if exists provider_accounts_set_updated_at on public.provider_accounts;
create trigger provider_accounts_set_updated_at before update on public.provider_accounts for each row execute function public.set_updated_at();
