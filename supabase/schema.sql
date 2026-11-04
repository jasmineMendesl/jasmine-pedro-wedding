-- Tabela do planejador. O estado completo fica em JSONB para preservar o
-- formato já existente (tarefas, contatos, cronograma e campos legados).
create table if not exists public.wedding_planner_state (
  id text primary key check (id = 'jasmine-pedro'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Sem políticas públicas: sem políticas RLS, o acesso fica bloqueado por padrão.
alter table public.wedding_planner_state enable row level security;

-- Para proteger a linha e configurar os papéis, aplique a migração:
-- supabase/migrations/20261103_add_roles_and_lock_planner.sql
