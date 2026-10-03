-- 1° Etapa: Criar as tabelas do banco de dados
-- 2° Etapa: Criar as políticas de acesso às tabelas
-- 3° Etapa: Habilitar o Row Level Security (RLS) nas tabelas
create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  telefone text not null check (length(trim(telefone)) >= 8),
  email text,
  endereco text not null check (length(trim(endereco)) >= 5),
  created_at timestamptz not null default now()
);
create table if not exists public.tecnicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  especialidade text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  tecnico_id uuid references public.tecnicos(id),
  status text not null default 'orcamento' check (status in ('orcamento','aprovado','agendado','em_andamento','concluido','cancelado')),
  data_instalacao timestamptz,
  valor_total numeric(12,2) not null default 0 check (valor_total >= 0),
  forma_pagamento text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_necessaria check (status not in ('agendado','em_andamento','concluido') or (tecnico_id is not null and data_instalacao is not null))
);
create table if not exists public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0),
  subtotal numeric(12,2) generated always as (quantidade * preco_unitario) stored,
  unique(pedido_id, produto_id)
);
create table if not exists public.historico_status (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  status_anterior text,
  status_novo text not null,
  changed_at timestamptz not null default now()
);
create index if not exists pedidos_status_idx on public.pedidos(status);
create index if not exists pedidos_agenda_idx on public.pedidos(data_instalacao) where status in ('agendado','em_andamento');
create index if not exists pedidos_cliente_idx on public.pedidos(cliente_id);
create index if not exists itens_pedido_idx on public.itens_pedido(pedido_id);

-- 3° Etapa: Habilitar o Row Level Security (RLS) nas tabelas
alter table public.clientes enable row level security;
alter table public.tecnicos enable row level security;
alter table public.produtos enable row level security;
alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;
alter table public.historico_status enable row level security;
