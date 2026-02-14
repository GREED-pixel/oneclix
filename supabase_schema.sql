-- ============================================================
--  OrderAhead — Supabase Schema
--  Run this in your Supabase SQL Editor (supabase.com → SQL)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- BUSINESSES
-- One row per business. The owner links their auth user here.
-- ────────────────────────────────────────────────────────────
create table businesses (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  logo_url      text,
  slug          text unique not null,   -- used in the public URL  e.g. /order/my-cafe
  accent_color  text default '#f97316', -- owner can brand their page
  created_at    timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- PRODUCTS
-- Items the business sells. Images stored in Supabase Storage.
-- ────────────────────────────────────────────────────────────
create table products (
  id            uuid primary key default uuid_generate_v4(),
  business_id   uuid references businesses(id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric(10,2) not null,
  image_url     text,
  category      text default 'General',
  available     boolean default true,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ORDERS
-- One row per customer order.
-- ────────────────────────────────────────────────────────────
create table orders (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid references businesses(id) on delete cascade,
  customer_name   text not null,
  customer_note   text,
  status          text default 'pending' check (status in ('pending','preparing','ready','fulfilled','cancelled')),
  total           numeric(10,2) not null,
  created_at      timestamptz default now(),
  fulfilled_at    timestamptz
);

-- ────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- Line items belonging to an order.
-- ────────────────────────────────────────────────────────────
create table order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  name        text not null,   -- snapshot of product name at time of order
  price       numeric(10,2) not null,
  quantity    int not null default 1
);

-- ────────────────────────────────────────────────────────────
-- PUSH SUBSCRIPTIONS
-- Web Push endpoint stored per owner device.
-- ────────────────────────────────────────────────────────────
create table push_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid references businesses(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

alter table businesses         enable row level security;
alter table products           enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table push_subscriptions enable row level security;

-- Businesses: owner can do everything; public can read by slug
create policy "owner full access" on businesses
  for all using (auth.uid() = owner_id);

create policy "public read by slug" on businesses
  for select using (true);

-- Products: owner manages; customers can read available items
create policy "owner manages products" on products
  for all using (
    auth.uid() = (select owner_id from businesses where id = business_id)
  );

create policy "public reads available products" on products
  for select using (available = true);

-- Orders: anyone can insert (customers ordering); owner reads all for their biz
create policy "customers can place orders" on orders
  for insert with check (true);

create policy "owner reads own orders" on orders
  for select using (
    auth.uid() = (select owner_id from businesses where id = business_id)
  );

create policy "owner updates own orders" on orders
  for update using (
    auth.uid() = (select owner_id from businesses where id = business_id)
  );

-- Order items: insert open; owner reads
create policy "customers insert items" on order_items
  for insert with check (true);

create policy "owner reads items" on order_items
  for select using (
    auth.uid() = (
      select b.owner_id from orders o
      join businesses b on b.id = o.business_id
      where o.id = order_id
    )
  );

-- Push subscriptions: owner only
create policy "owner manages push" on push_subscriptions
  for all using (
    auth.uid() = (select owner_id from businesses where id = business_id)
  );

-- ────────────────────────────────────────────────────────────
-- REALTIME
-- Enable realtime for orders so the dashboard updates live.
-- ────────────────────────────────────────────────────────────
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;

-- ────────────────────────────────────────────────────────────
-- STORAGE
-- Create a bucket for product images (set to public in dashboard)
-- ────────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage → New Bucket:
--   Name: product-images
--   Public: YES
-- Or via SQL:
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict do nothing;

-- Allow anyone to read product images
create policy "public image read" on storage.objects
  for select using (bucket_id = 'product-images');

-- Only authenticated owners can upload
create policy "owner image upload" on storage.objects
  for insert with check (
    bucket_id = 'product-images' and auth.role() = 'authenticated'
  );

create policy "owner image delete" on storage.objects
  for delete using (
    bucket_id = 'product-images' and auth.role() = 'authenticated'
  );

-- ────────────────────────────────────────────────────────────
-- SAMPLE DATA (optional — remove before production)
-- ────────────────────────────────────────────────────────────
-- After signing up, grab your user UUID from auth.users and paste below:
-- insert into businesses (owner_id, name, description, slug, accent_color)
-- values (
--   'YOUR-USER-UUID-HERE',
--   'My Coffee Shop',
--   'Fresh coffee and pastries made with love.',
--   'my-coffee-shop',
--   '#f97316'
-- );
