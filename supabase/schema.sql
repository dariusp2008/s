-- =====================================================================
-- NicheChems catalogue schema
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query → paste → Run). Safe to re-run: tables use `if not exists` and
-- seed rows use `on conflict do nothing`.
--
-- This is the single source of truth for products/categories on the
-- storefront (home, catalogue, product-page) and is managed through the
-- admin dashboard at /admin/dashboard/. Public (anon) callers can only
-- ever SELECT from `categories`/`products` — every write requires an
-- authenticated user listed in `admin_users`, enforced by Postgres Row-
-- Level Security below (not by anything in the client-side JS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          text primary key,             -- slug, e.g. 'reference-standards'
  label       text not null,
  description text,
  icon        text,                          -- key into js/icons.js, e.g. 'molecule'
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id                  text primary key,       -- slug, e.g. 'nc-1042'
  sku                 text not null unique,
  category_id         text references public.categories(id) on delete set null,
  name                text not null,
  description         text,
  purity              text,
  format              text,
  price               numeric(10,2) not null default 0,
  price_unit          text not null default 'unit',
  stock_status        text not null default 'in-stock'
                        check (stock_status in ('in-stock', 'low-stock', 'out-of-stock')),
  active              boolean not null default true,
  cas_number          text,                   -- placeholder text, e.g. "Available on COA"
  molecular_formula   text,                   -- placeholder text, e.g. "See COA"
  storage_conditions  text,
  hazard_info         text,
  coa_url             text,                   -- null until a real COA file/link exists
  sds_url             text,                   -- null until a real SDS file/link exists
  image_url           text,                   -- public URL into the product-images storage bucket, null falls back to the category icon
  discount_tiers      jsonb not null default '[]'::jsonb,
                        -- quantity-break pricing, e.g. [{"min_qty":2,"discount_pct":3},{"min_qty":5,"discount_pct":10}]
                        -- applied client-side in js/cart.js resolveCart() against the highest min_qty the cart quantity meets
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Covers instances where this script already ran before these columns existed.
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists discount_tiers jsonb not null default '[]'::jsonb;

create index if not exists idx_products_category on public.products(category_id);

-- Keep updated_at current on every edit made from the admin dashboard.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- ADMIN ALLOWLIST
-- Rows here are the only Supabase Auth users allowed to write to
-- categories/products. Being able to log in (auth.users) is NOT enough
-- by itself — see admin/index.html, which also checks this table.
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

-- security definer: lets RLS policies below check admin_users without
-- granting anyone direct SELECT access to that table, and without RLS
-- recursion (the function itself runs with the owner's privileges).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_users where id = uid);
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- AUDIT LOG — one row per admin write, satisfies "audit logging for
-- admin actions" without needing a server. Written by the dashboard
-- right after each successful insert/update/delete.
-- ---------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  admin_email text,
  action      text not null check (action in ('insert', 'update', 'delete')),
  table_name  text not null,
  record_id   text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.admin_users     enable row level security;
alter table public.admin_audit_log enable row level security;

-- categories: public read, admin-only write
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select using (true);

drop policy if exists categories_write_admin on public.categories;
create policy categories_write_admin on public.categories
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- products: public read, admin-only write
drop policy if exists products_select_all on public.products;
create policy products_select_all on public.products
  for select using (true);

drop policy if exists products_write_admin on public.products;
create policy products_write_admin on public.products
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- admin_users: no direct client access at all (checked only through
-- is_admin(), which bypasses RLS as security definer).

-- admin_audit_log: admins can write and read their own audit trail
drop policy if exists audit_write_admin on public.admin_audit_log;
create policy audit_write_admin on public.admin_audit_log
  for insert with check (is_admin(auth.uid()));

drop policy if exists audit_read_admin on public.admin_audit_log;
create policy audit_read_admin on public.admin_audit_log
  for select using (is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- PRODUCT IMAGES (storage) — public read, admin-only write. Used by the
-- admin dashboard's image upload field (products.image_url stores the
-- public URL this bucket returns). Bucket is public so storefront pages
-- can hotlink images directly without a signed URL.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_select_all on storage.objects;
create policy product_images_select_all on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists product_images_write_admin on storage.objects;
create policy product_images_write_admin on storage.objects
  for insert with check (bucket_id = 'product-images' and is_admin(auth.uid()));

drop policy if exists product_images_update_admin on storage.objects;
create policy product_images_update_admin on storage.objects
  for update using (bucket_id = 'product-images' and is_admin(auth.uid()));

drop policy if exists product_images_delete_admin on storage.objects;
create policy product_images_delete_admin on storage.objects
  for delete using (bucket_id = 'product-images' and is_admin(auth.uid()));

-- =====================================================================
-- SEED DATA — matches the existing js/products-data.js so the live
-- storefront looks identical to today the moment this script is run.
-- =====================================================================
insert into public.categories (id, label, description, icon, sort_order) values
  ('reference-standards', 'Reference Standards', 'Certified single-analyte standards for calibration and QC.', 'molecule', 1),
  ('isotope-labeled', 'Isotope-Labeled Standards', 'Stable-isotope internal standards for LC-MS/MS and GC-MS workflows.', 'orbit', 2),
  ('chromatography', 'Chromatography Standards', 'Multi-component mixes for HPLC and GC method validation.', 'funnel', 3),
  ('buffers', 'Buffers & Calibration', 'Traceable pH and conductivity calibration solutions.', 'flask', 4),
  ('solvents', 'Solvents & Chemicals', 'High-purity anhydrous solvents for sample prep and extraction.', 'droplet', 5),
  ('forensic', 'Forensic Reference Panels', 'Multi-analyte panels for forensic toxicology screening.', 'grid', 6)
on conflict (id) do nothing;

insert into public.products
  (id, sku, category_id, name, description, purity, format, price, price_unit, stock_status, active, cas_number, molecular_formula, storage_conditions, hazard_info)
values
  ('nc-1042', 'NC-1042', 'reference-standards', 'Certified Reference Standard — Series A',
   'A certified single-analyte reference standard for calibration and quality-control workflows, supplied with full lot documentation.',
   '≥99.5%', '1 mL ampoule', 184, 'unit', 'in-stock', true,
   'Available on Certificate of Analysis', 'See Certificate of Analysis',
   'Store at 2–8°C in original sealed packaging, away from light.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.'),

  ('nc-1043', 'NC-1043', 'reference-standards', 'Certified Reference Standard — Series B',
   'A second certified single-analyte reference standard, lot-tested for use alongside Series A in comparative calibration studies.',
   '≥99.3%', '1 mL ampoule', 179, 'unit', 'in-stock', true,
   'Available on Certificate of Analysis', 'See Certificate of Analysis',
   'Store at 2–8°C in original sealed packaging, away from light.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.'),

  ('nc-2078', 'NC-2078', 'isotope-labeled', 'Isotope-Labeled Internal Standard, D6',
   'A deuterium-labeled internal standard for quantitative LC-MS/MS and GC-MS methods requiring isotope-dilution accuracy.',
   '≥99% (isotopic)', '5 mg vial', 310, 'unit', 'in-stock', true,
   'Available on Certificate of Analysis', 'See Certificate of Analysis',
   'Store at -20°C, tightly sealed, protect from moisture.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.'),

  ('nc-2091', 'NC-2091', 'isotope-labeled', 'Isotope-Labeled Internal Standard, C13',
   'A carbon-13-labeled internal standard for mass-spectrometry workflows requiring an alternate isotopic label to D6 analogs.',
   '≥99% (isotopic)', '5 mg vial', 328, 'unit', 'low-stock', true,
   'Available on Certificate of Analysis', 'See Certificate of Analysis',
   'Store at -20°C, tightly sealed, protect from moisture.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.'),

  ('nc-3311', 'NC-3311', 'chromatography', 'HPLC-Grade Chromatography Standard Mix',
   'A ten-component mixed standard for HPLC method development and validation, each analyte independently verified.',
   '≥99% per component', '10 × 1 mL set', 465, 'set', 'in-stock', true,
   'Mixture — see Certificate of Analysis', 'Mixture — see Certificate of Analysis',
   'Store at 2–8°C in original sealed packaging, away from light.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.'),

  ('nc-3325', 'NC-3325', 'chromatography', 'GC-Grade Chromatography Standard Mix',
   'An eight-component mixed standard formulated for gas-chromatography method validation and instrument qualification.',
   '≥99% per component', '8 × 1 mL set', 410, 'set', 'in-stock', true,
   'Mixture — see Certificate of Analysis', 'Mixture — see Certificate of Analysis',
   'Store at 2–8°C in original sealed packaging, away from light.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.'),

  ('nc-4460', 'NC-4460', 'buffers', 'Buffered Calibration Solution, pH 7.00',
   'A traceable pH 7.00 buffer solution for routine calibration and verification of laboratory pH meters.',
   '±0.01 pH', '500 mL bottle', 58, 'unit', 'in-stock', true,
   'Not applicable — buffered aqueous solution', 'Not applicable — buffered aqueous solution',
   'Store at room temperature, tightly sealed.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.'),

  ('nc-4461', 'NC-4461', 'buffers', 'Buffered Calibration Solution, pH 4.01',
   'A traceable pH 4.01 buffer solution, commonly paired with the pH 7.00 solution for two-point meter calibration.',
   '±0.01 pH', '500 mL bottle', 58, 'unit', 'in-stock', true,
   'Not applicable — buffered aqueous solution', 'Not applicable — buffered aqueous solution',
   'Store at room temperature, tightly sealed.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.'),

  ('nc-5127', 'NC-5127', 'solvents', 'High-Purity Anhydrous Solvent',
   'An anhydrous, high-purity solvent suited to moisture-sensitive sample preparation and extraction workflows.',
   '≥99.9%', '1 L amber bottle', 97, 'unit', 'low-stock', true,
   'Available on Certificate of Analysis', 'Available on Certificate of Analysis',
   'Store at room temperature in a flammables cabinet, away from ignition sources.',
   'Flammable liquid. For laboratory research use only. Handle with standard PPE (gloves, eye protection) in a fume hood. See Safety Data Sheet for full hazard classification.'),

  ('nc-6084', 'NC-6084', 'forensic', 'Forensic Toxicology Reference Panel',
   'A twelve-analyte reference panel formulated for forensic toxicology screening method validation.',
   '≥98% per analyte', '12-analyte panel', 720, 'panel', 'in-stock', true,
   'Mixture — see Certificate of Analysis', 'Mixture — see Certificate of Analysis',
   'Store at -20°C, tightly sealed, protect from light and moisture.',
   'For laboratory research use only. Handle with standard PPE (gloves, eye protection) per institutional safety protocols. See Safety Data Sheet for full hazard classification.')
on conflict (id) do nothing;

-- =====================================================================
-- ORDERS / CHECKOUT
--
-- There is no customer-login system yet (account/index.html is still an
-- honest "not connected yet" placeholder), so checkout writes orders as
-- an anonymous (anon) insert. That means orders/order_items must NOT be
-- publicly readable — they contain customer name/email/address — so
-- unlike categories/products there is no `select using (true)` policy
-- here. Only admins can read/update/delete orders (this is what the
-- admin dashboard's future "view customer orders" panel will query).
--
-- The checkout page never needs to read orders back from Supabase: it
-- already has the full order in memory right after building it, and
-- hands that off to payment/index.html via sessionStorage — so the
-- browser is never left needing an anon SELECT policy to display an
-- order it just created.
-- =====================================================================
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  status            text not null default 'pending_payment'
                      check (status in ('pending_payment', 'awaiting_confirmation', 'paid', 'fulfilled', 'cancelled')),
  payment_method    text not null default 'ethereum',
  subtotal          numeric(10,2) not null,
  customer_name     text not null,
  customer_email    text not null,
  institution       text,
  phone             text,
  shipping_address  text not null,
  notes             text,
  eth_amount        numeric(18,8),   -- filled in at the payment step
  eth_tx_hash       text,            -- filled in manually by an admin once a payment is confirmed on-chain
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

create table if not exists public.order_items (
  id            bigint generated always as identity primary key,
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    text references public.products(id) on delete set null,
  product_name  text not null,  -- snapshot at order time, survives the product being renamed/deleted later
  sku           text not null,
  unit_price    numeric(10,2) not null,
  quantity      int not null check (quantity > 0),
  line_total    numeric(10,2) not null
);

create index if not exists idx_order_items_order on public.order_items(order_id);

alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists orders_insert_anyone on public.orders;
create policy orders_insert_anyone on public.orders
  for insert with check (true);

drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders
  for select using (is_admin(auth.uid()));

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_delete on public.orders
  for delete using (is_admin(auth.uid()));

drop policy if exists order_items_insert_anyone on public.order_items;
create policy order_items_insert_anyone on public.order_items
  for insert with check (true);

drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items
  for select using (is_admin(auth.uid()));

drop policy if exists order_items_admin_update on public.order_items;
create policy order_items_admin_update on public.order_items
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

drop policy if exists order_items_admin_delete on public.order_items;
create policy order_items_admin_delete on public.order_items
  for delete using (is_admin(auth.uid()));

-- =====================================================================
-- ADMIN BOOTSTRAP (manual step — run AFTER your first admin signs up)
-- =====================================================================
-- 1. Go to /admin/ on the live site and use "Create account" (or the
--    Supabase Auth dashboard → Authentication → Users → Add user) to
--    create the first login.
-- 2. Find that user's id in Authentication → Users, then run:
--
--      insert into public.admin_users (id, email)
--      values ('<paste-user-uuid-here>', '<their-email>');
--
--    Until a row exists here, that user can log in but /admin/ will
--    immediately sign them back out as "not authorized."
