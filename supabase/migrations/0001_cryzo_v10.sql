create extension if not exists "pgcrypto";

create table if not exists public.users (
  firebase_uid text primary key,
  email text,
  display_name text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  firebase_uid text primary key references public.users(firebase_uid) on delete cascade,
  default_model text not null default 'gpt-4o-mini',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apps (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null references public.users(firebase_uid) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  firebase_uid text not null references public.users(firebase_uid) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  firebase_uid text not null references public.users(firebase_uid) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists apps_firebase_uid_updated_at_idx
  on public.apps(firebase_uid, updated_at desc);

create index if not exists chats_firebase_uid_app_id_updated_at_idx
  on public.chats(firebase_uid, app_id, updated_at desc);

create index if not exists messages_firebase_uid_chat_id_created_at_idx
  on public.messages(firebase_uid, chat_id, created_at asc);

alter table public.users enable row level security;
alter table public.user_settings enable row level security;
alter table public.apps enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

drop policy if exists "service role manages users" on public.users;
drop policy if exists "service role manages user settings" on public.user_settings;
drop policy if exists "service role manages apps" on public.apps;
drop policy if exists "service role manages chats" on public.chats;
drop policy if exists "service role manages messages" on public.messages;

create policy "service role manages users"
  on public.users
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages user settings"
  on public.user_settings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages apps"
  on public.apps
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages chats"
  on public.chats
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role manages messages"
  on public.messages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
