-- Tabela do planejador. O estado completo fica em JSONB para preservar o
-- formato já existente (tarefas, contatos, cronograma e campos legados).
create table if not exists public.wedding_planner_state (
  id text primary key check (id = 'jasmine-pedro'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Sem políticas públicas: sem políticas RLS, o acesso fica bloqueado por padrão.
alter table public.wedding_planner_state enable row level security;

-- Configure papéis e políticas de acesso pelo processo privado de implantação
-- antes de habilitar autenticação ou usar este planejador com dados reais.
