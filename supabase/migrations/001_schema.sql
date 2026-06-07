-- Вызов мастера — полная схема БД
-- Запустить в Supabase: SQL Editor → New query → вставить → Run

create extension if not exists "uuid-ossp";

create type user_role as enum ('client','master','admin');
create type request_status as enum ('new','waiting_for_masters','waiting_master_offers','waiting_client_selection','master_assigned','in_progress','completed','closed');
create type equipment_type as enum ('refrigerator','oven','dishwasher','fryer','grill','coffee_machine','ice_maker','ventilation','other');
create type urgency_level as enum ('urgent','normal');
create type event_type as enum ('qr_scanned','request_created','master_notified','master_responded','master_selected','work_started','work_finished','request_closed');
create type billing_mode as enum ('disabled','simulation','active');

create table profiles (
  id               uuid primary key references auth.users on delete cascade,
  email            text not null default '',
  phone            text not null default '',
  name             text,
  role             user_role not null default 'client',
  telegram_chat_id text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index profiles_role_idx on profiles(role);

create table organizations (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references profiles(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table restaurants (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  address         text not null,
  qr_code_url     text,
  created_at      timestamptz not null default now()
);
create index restaurants_org_idx on restaurants(organization_id);

create table master_profiles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null unique references profiles(id) on delete cascade,
  bio             text,
  equipment_types equipment_type[] not null default '{}',
  rating          numeric(3,2) not null default 0.0,
  completed_count integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table requests (
  id                 uuid primary key default uuid_generate_v4(),
  restaurant_id      uuid not null references restaurants(id),
  client_id          uuid not null references profiles(id),
  status             request_status not null default 'new',
  description        text not null,
  equipment_type     equipment_type not null,
  urgency            urgency_level not null default 'normal',
  contact_person     text,
  equipment_brand    text,
  equipment_model    text,
  photos             text[] not null default '{}',
  preferred_time     timestamptz,
  assigned_master_id uuid references profiles(id),
  estimated_cost     numeric(12,2),
  final_cost         numeric(12,2),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index requests_client_idx  on requests(client_id);
create index requests_status_idx  on requests(status);
create index requests_created_idx on requests(created_at desc);

create table master_responses (
  id             uuid primary key default uuid_generate_v4(),
  request_id     uuid not null references requests(id) on delete cascade,
  master_id      uuid not null references profiles(id),
  proposed_price numeric(12,2) not null,
  arrival_time   text not null,
  comment        text,
  is_selected    boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (request_id, master_id)
);
create index master_responses_req_idx on master_responses(request_id);

create table request_events (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid not null references requests(id) on delete cascade,
  event_type  event_type not null,
  actor_id    uuid references profiles(id),
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index request_events_req_idx on request_events(request_id);

create table financial_logs (
  id                    uuid primary key default uuid_generate_v4(),
  request_id            uuid not null references requests(id),
  master_id             uuid references profiles(id),
  estimated_cost        numeric(12,2),
  final_cost            numeric(12,2),
  commission_percent    numeric(5,2) not null default 0,
  commission_calculated numeric(12,2) not null default 0,
  billing_mode          billing_mode not null default 'disabled',
  created_at            timestamptz not null default now()
);

create table reviews (
  id         uuid primary key default uuid_generate_v4(),
  request_id uuid not null unique references requests(id),
  client_id  uuid not null references profiles(id),
  master_id  uuid not null references profiles(id),
  rating     smallint not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);

-- Auto updated_at
create or replace function update_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger requests_updated_at before update on requests for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();

-- Auto rating recalc
create or replace function recalculate_master_rating() returns trigger language plpgsql security definer as $$
begin
  update master_profiles set
    rating = (select round(avg(rating)::numeric,2) from reviews where master_id = new.master_id),
    completed_count = (select count(*) from reviews where master_id = new.master_id)
  where user_id = new.master_id;
  return new;
end; $$;
create trigger after_review_insert after insert on reviews for each row execute function recalculate_master_rating();

-- Auto create profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, role)
  values (new.id, coalesce(new.email,''), coalesce(new.phone,''), 'client')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- RLS
alter table profiles         enable row level security;
alter table organizations    enable row level security;
alter table restaurants      enable row level security;
alter table master_profiles  enable row level security;
alter table requests         enable row level security;
alter table master_responses enable row level security;
alter table request_events   enable row level security;
alter table financial_logs   enable row level security;
alter table reviews          enable row level security;

create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "see masters" on profiles for select using (auth.role() = 'authenticated' and role = 'master');
create policy "update own profile" on profiles for update using (auth.uid() = id);

create policy "own org" on organizations for all using (auth.uid() = owner_id);

create policy "client sees own restaurants" on restaurants for select using (organization_id in (select id from organizations where owner_id = auth.uid()));
create policy "masters see all restaurants" on restaurants for select using (exists (select 1 from profiles where id = auth.uid() and role in ('master','admin')));

create policy "master profiles public" on master_profiles for select using (auth.role() = 'authenticated');
create policy "master own profile" on master_profiles for all using (auth.uid() = user_id);

create policy "client own requests" on requests for select using (auth.uid() = client_id);
create policy "master open requests" on requests for select using (exists (select 1 from profiles where id = auth.uid() and role = 'master') and (status in ('waiting_master_offers','waiting_client_selection') or assigned_master_id = auth.uid()));
create policy "admin all requests" on requests for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "client create request" on requests for insert with check (auth.uid() = client_id);
create policy "update request" on requests for update using (auth.uid() = client_id or auth.uid() = assigned_master_id);

create policy "client see responses" on master_responses for select using (request_id in (select id from requests where client_id = auth.uid()));
create policy "master own responses" on master_responses for select using (auth.uid() = master_id);
create policy "master create response" on master_responses for insert with check (auth.uid() = master_id);

create policy "see own events" on request_events for select using (request_id in (select id from requests where client_id = auth.uid() union select id from requests where assigned_master_id = auth.uid()) or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "admin financial" on financial_logs for select using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "client create review" on reviews for insert with check (auth.uid() = client_id);
create policy "see own reviews" on reviews for select using (auth.uid() = client_id or auth.uid() = master_id);
