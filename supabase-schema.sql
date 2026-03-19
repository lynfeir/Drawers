-- Drawer Cut List Calculator — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Jobs table
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Lists table
create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz default now()
);

-- Drawers table
create table if not exists drawers (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  open_width text not null default '',
  open_depth text not null default '',
  height int not null default 4,
  qty int not null default 1,
  position int not null default 0
);

-- Indexes for common lookups
create index if not exists idx_lists_job_id on lists(job_id);
create index if not exists idx_drawers_list_id on drawers(list_id);

-- Enable Row Level Security (optional — enable if you add auth later)
-- alter table jobs enable row level security;
-- alter table lists enable row level security;
-- alter table drawers enable row level security;
