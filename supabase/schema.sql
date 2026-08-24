-- SBFB initial business schema
-- Apply only to the dedicated SBFB Supabase project after reviewing.
-- All business tables are intended to be protected by RLS.

create extension if not exists pgcrypto;

create type public.app_role as enum ('owner','manager','staff');
create type public.transaction_status as enum ('draft','confirmed','cancelled');
create type public.payment_status as enum ('unpaid','partial','paid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'staff',
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  size text,
  unit text not null,
  description text,
  purchase_cost numeric(14,2),
  selling_price numeric(14,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  gstin text,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  gstin text,
  created_at timestamptz not null default now()
);

create table public.material_inward (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id),
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  transport_cost numeric(14,2) not null default 0,
  loading_cost numeric(14,2) not null default 0,
  unloading_cost numeric(14,2) not null default 0,
  invoice_no text,
  vehicle_no text,
  payment_status public.payment_status not null default 'unpaid',
  status public.transaction_status not null default 'confirmed',
  received_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table public.material_outward (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  product_id uuid not null references public.products(id),
  quantity numeric(14,3) not null check (quantity > 0),
  selling_price numeric(14,2) not null check (selling_price >= 0),
  transport_cost numeric(14,2) not null default 0,
  loading_cost numeric(14,2) not null default 0,
  invoice_no text,
  vehicle_no text,
  payment_status public.payment_status not null default 'unpaid',
  status public.transaction_status not null default 'confirmed',
  delivered_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table public.production_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity_produced numeric(14,3) not null check (quantity_produced > 0),
  rejected_quantity numeric(14,3) not null default 0 check (rejected_quantity >= 0),
  raw_material_cost numeric(14,2) not null default 0,
  labour_cost numeric(14,2) not null default 0,
  electricity_cost numeric(14,2) not null default 0,
  loading_cost numeric(14,2) not null default 0,
  other_cost numeric(14,2) not null default 0,
  produced_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  role text,
  pay_type text not null default 'monthly',
  base_salary numeric(14,2) not null default 0,
  joining_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present','absent','half_day','leave')),
  overtime_hours numeric(8,2) not null default 0,
  unique(employee_id, attendance_date)
);

create table public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  period_start date not null,
  period_end date not null,
  gross_salary numeric(14,2) not null default 0,
  overtime_amount numeric(14,2) not null default 0,
  advances numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  net_salary numeric(14,2) not null default 0,
  paid_at timestamptz,
  created_by uuid references public.profiles(id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  payment_status public.payment_status not null default 'paid',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  product_id uuid references public.products(id),
  quantity numeric(14,3),
  delivery_location text,
  message text,
  source text not null default 'website',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  event_type text not null,
  severity text not null default 'info',
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index material_inward_product_idx on public.material_inward(product_id, received_at);
create index material_outward_product_idx on public.material_outward(product_id, delivered_at);
create index audit_events_created_idx on public.audit_events(created_at desc);
create index audit_events_type_idx on public.audit_events(event_type, created_at desc);

-- RLS is intentionally enabled on every exposed table.
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- Policies will be added after the exact owner/manager/staff authorization model is wired to Supabase Auth.
-- Do not expose these tables to anonymous users. Website leads should be inserted through a protected server/edge endpoint.
