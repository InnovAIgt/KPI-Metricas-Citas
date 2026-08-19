create table if not exists public.leads_no_calificados (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  client_name text not null default '',
  advisor_name text not null default '',
  telefono text not null default '',
  created_at timestamptz not null,
  created_at_sv text null,
  updated_at timestamptz not null default now(),
  constraint leads_no_calificados_client_created_key unique (client_id, created_at)
);

create index if not exists idx_leads_no_calificados_created_at
  on public.leads_no_calificados using btree (created_at desc);

create index if not exists idx_leads_no_calificados_client_id
  on public.leads_no_calificados using btree (client_id);

alter table public.leads_no_calificados
  add column if not exists telefono text not null default '';

create index if not exists idx_leads_no_calificados_telefono
  on public.leads_no_calificados using btree (telefono);

alter table public.leads_no_calificados enable row level security;

grant select on table public.leads_no_calificados to authenticated;

drop policy if exists "Usuarios autenticados pueden leer leads no calificados"
  on public.leads_no_calificados;

create policy "Usuarios autenticados pueden leer leads no calificados"
  on public.leads_no_calificados
  for select
  to authenticated
  using (true);
