-- Voedings- & Supplementtracker — volledig databaseschema
-- Uitvoeren: Supabase Dashboard > SQL Editor > New query > plak dit bestand > Run.
-- Idempotent waar mogelijk (if not exists / or replace) zodat opnieuw draaien geen kwaad kan.

create extension if not exists pgcrypto;

-- =========================================================
-- 1. profiles — 1 rij per gebruiker, gekoppeld aan auth.users
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  weight_kg numeric(5,2),
  height_cm numeric(5,1),
  sex text check (sex in ('male', 'female')),
  birth_date date,
  activity_level text,
  goal text check (goal in ('afvallen', 'onderhoud', 'spieropbouw')),
  goal_pace_kg_per_week numeric(4,2),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 2. daily_targets — 1 actieve rij per gebruiker (geen historiek, zie SCHEMA.md)
-- =========================================================
create table if not exists public.daily_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calories_kcal integer not null,
  protein_g numeric(6,1) not null,
  carbs_g numeric(6,1) not null,
  fat_g numeric(6,1) not null,
  fiber_g numeric(6,1) not null,
  water_ml integer not null,
  alcohol_extra_water_ml integer not null default 500,
  -- Micronutriënt-doelen (algemene richtwaarden, zie SCHEMA.md/constants.ts) — aanpasbaar in Settings.
  vitamin_d_mcg numeric(6,2) not null default 15,
  magnesium_mg numeric(6,1) not null default 375,
  vitamin_b1_mg numeric(6,2) not null default 1.15,
  vitamin_b6_mg numeric(6,2) not null default 1.5,
  vitamin_b12_mcg numeric(6,2) not null default 3.2,
  omega3_mg numeric(6,1) not null default 375,
  zinc_mg numeric(6,1) not null default 11,
  potassium_mg numeric(7,1) not null default 4100,
  calcium_mg numeric(7,1) not null default 1000,
  iron_mg numeric(6,2) not null default 9.5,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 3. food_items — herbruikbare "eigen producten"/favorieten-bibliotheek
-- =========================================================
create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  barcode text,
  calories_kcal numeric(6,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  fiber_g numeric(6,1) not null default 0,
  -- Micronutriënten: null = onbekend (telt niet als 0 mee in dagtotalen, zie lib/calculations).
  vitamin_d_mcg numeric(6,2),
  magnesium_mg numeric(6,1),
  vitamin_b1_mg numeric(6,2),
  vitamin_b6_mg numeric(6,2),
  vitamin_b12_mcg numeric(6,2),
  omega3_mg numeric(6,1),
  zinc_mg numeric(6,1),
  potassium_mg numeric(7,1),
  calcium_mg numeric(7,1),
  iron_mg numeric(6,2),
  -- Hoeveel gram de bovenstaande waarden vertegenwoordigen — nodig om dit item
  -- correct te kunnen herschalen als receptingrediënt (zie recipe_ingredients).
  reference_grams numeric(7,1) not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists food_items_user_idx on public.food_items(user_id);
create index if not exists food_items_barcode_idx on public.food_items(user_id, barcode) where barcode is not null;

-- =========================================================
-- 4. food_logs — daadwerkelijke logs per dag (macro's gedenormaliseerd gekopieerd)
-- =========================================================
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  name text not null,
  calories_kcal numeric(6,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  fiber_g numeric(6,1) not null default 0,
  vitamin_d_mcg numeric(6,2),
  magnesium_mg numeric(6,1),
  vitamin_b1_mg numeric(6,2),
  vitamin_b6_mg numeric(6,2),
  vitamin_b12_mcg numeric(6,2),
  omega3_mg numeric(6,1),
  zinc_mg numeric(6,1),
  potassium_mg numeric(7,1),
  calcium_mg numeric(7,1),
  iron_mg numeric(6,2),
  log_date date not null,
  logged_at timestamptz not null default now()
);
create index if not exists food_logs_user_date_idx on public.food_logs(user_id, log_date);

-- =========================================================
-- 5. supplements — schema-definitie (soft-delete via is_active)
-- =========================================================
create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dose_label text not null,
  -- Vrije, beschrijvende tekst ("Bij ontbijt") — optioneel, los van reminder_time.
  timing_label text,
  -- Optioneel exact tijdstip (HH:MM) voor de pushmelding. Null = val terug op
  -- 3 generieke momenten (ochtend/middag/avond), zie SupplementReminders.tsx.
  reminder_time time,
  -- Optionele koppeling aan een micronutriënt: afvinken telt dan de dosis mee
  -- bij de dagtotalen op het dashboard/voeding (zie lib/calculations/micronutrients.ts).
  linked_nutrient_key text check (
    linked_nutrient_key in (
      'vitamin_d_mcg', 'magnesium_mg', 'vitamin_b1_mg', 'vitamin_b6_mg', 'vitamin_b12_mcg',
      'omega3_mg', 'zinc_mg', 'potassium_mg', 'calcium_mg', 'iron_mg'
    )
  ),
  linked_nutrient_amount numeric(7,2),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists supplements_user_idx on public.supplements(user_id, is_active);

-- =========================================================
-- 6. supplement_logs — dagelijkse afvink-checkoffs
-- =========================================================
create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  log_date date not null,
  checked_at timestamptz not null default now(),
  unique (supplement_id, log_date)
);
create index if not exists supplement_logs_user_date_idx on public.supplement_logs(user_id, log_date);

-- =========================================================
-- 7. correction_checkoffs — de 3 weekendcorrectie-taken, los van het vaste schema
-- =========================================================
create table if not exists public.correction_checkoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  task_key text not null check (task_key in ('extra_water', 'extra_magnesium_food', 'extra_b_complex')),
  checked_at timestamptz not null default now(),
  unique (user_id, log_date, task_key)
);
create index if not exists correction_checkoffs_user_date_idx on public.correction_checkoffs(user_id, log_date);

-- =========================================================
-- 8. water_logs — elke toevoeging is een eigen rij, dagtotaal = som
-- =========================================================
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0),
  log_date date not null,
  logged_at timestamptz not null default now()
);
create index if not exists water_logs_user_date_idx on public.water_logs(user_id, log_date);

-- =========================================================
-- 9. weight_logs — 1 log per dag (upsert bij dubbel loggen)
-- =========================================================
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5,2) not null,
  log_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);
create index if not exists weight_logs_user_date_idx on public.weight_logs(user_id, log_date);

-- =========================================================
-- 10. alcohol_logs — bestaan van de rij = alcohol die dag
-- =========================================================
create table if not exists public.alcohol_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);
create index if not exists alcohol_logs_user_date_idx on public.alcohol_logs(user_id, log_date);

-- =========================================================
-- 11. recipes — eigen samengestelde maaltijden (bv. "cake") van meerdere ingrediënten
-- =========================================================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists recipes_user_idx on public.recipes(user_id);

-- =========================================================
-- 12. recipe_ingredients — ingrediënten van een recept, per 100g gedenormaliseerd
-- (net als food_logs t.o.v. food_items) zodat een latere wijziging aan het
-- oorspronkelijke item de receptgeschiedenis niet stilletjes verandert.
-- =========================================================
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  grams numeric(7,1) not null,
  calories_kcal_per_100g numeric(7,2) not null,
  protein_g_per_100g numeric(7,2) not null default 0,
  carbs_g_per_100g numeric(7,2) not null default 0,
  fat_g_per_100g numeric(7,2) not null default 0,
  fiber_g_per_100g numeric(7,2) not null default 0,
  vitamin_d_mcg_per_100g numeric(7,2),
  magnesium_mg_per_100g numeric(7,2),
  vitamin_b1_mg_per_100g numeric(7,2),
  vitamin_b6_mg_per_100g numeric(7,2),
  vitamin_b12_mcg_per_100g numeric(7,2),
  omega3_mg_per_100g numeric(7,2),
  zinc_mg_per_100g numeric(7,2),
  potassium_mg_per_100g numeric(7,2),
  calcium_mg_per_100g numeric(7,2),
  iron_mg_per_100g numeric(7,2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients(recipe_id);

-- =========================================================
-- Row Level Security — elke tabel alleen leesbaar/schrijfbaar door de eigenaar
-- =========================================================
alter table public.profiles enable row level security;
alter table public.daily_targets enable row level security;
alter table public.food_items enable row level security;
alter table public.food_logs enable row level security;
alter table public.supplements enable row level security;
alter table public.supplement_logs enable row level security;
alter table public.correction_checkoffs enable row level security;
alter table public.water_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.alcohol_logs enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "daily_targets_self" on public.daily_targets;
create policy "daily_targets_self" on public.daily_targets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "food_items_self" on public.food_items;
create policy "food_items_self" on public.food_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "food_logs_self" on public.food_logs;
create policy "food_logs_self" on public.food_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "supplements_self" on public.supplements;
create policy "supplements_self" on public.supplements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "supplement_logs_self" on public.supplement_logs;
create policy "supplement_logs_self" on public.supplement_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "correction_checkoffs_self" on public.correction_checkoffs;
create policy "correction_checkoffs_self" on public.correction_checkoffs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "water_logs_self" on public.water_logs;
create policy "water_logs_self" on public.water_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weight_logs_self" on public.weight_logs;
create policy "weight_logs_self" on public.weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "alcohol_logs_self" on public.alcohol_logs;
create policy "alcohol_logs_self" on public.alcohol_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recipes_self" on public.recipes;
create policy "recipes_self" on public.recipes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recipe_ingredients_self" on public.recipe_ingredients;
create policy "recipe_ingredients_self" on public.recipe_ingredients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Auto-seed: zodra het ene account wordt aangemaakt (via Supabase Studio),
-- vult deze trigger meteen profiel en startdoelen in. Supplementen worden
-- bewust NIET voorgevuld — dat schema stel je zelf samen via Instellingen
-- > Supplementenschema beheren. Zo is er geen los seed-script nodig met een
-- handmatig te kopiëren user-id (zie SCHEMA.md).
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, weight_kg, height_cm, sex, activity_level, goal)
  values (new.id, 101.5, 186, 'male', 'light', 'afvallen');

  insert into public.daily_targets (user_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, water_ml)
  values (new.id, 2100, 165, 235, 70, 35, 3000);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Migratie: bestaande databases bijwerken met kolommen die na de eerste
-- versie zijn toegevoegd (barcode scannen + micronutriënten). Veilig om
-- opnieuw te draaien — voegt alleen toe wat nog ontbreekt.
-- =========================================================
alter table public.food_items add column if not exists barcode text;
alter table public.food_items add column if not exists vitamin_d_mcg numeric(6,2);
alter table public.food_items add column if not exists magnesium_mg numeric(6,1);
alter table public.food_items add column if not exists vitamin_b1_mg numeric(6,2);
alter table public.food_items add column if not exists vitamin_b6_mg numeric(6,2);
alter table public.food_items add column if not exists vitamin_b12_mcg numeric(6,2);
alter table public.food_items add column if not exists omega3_mg numeric(6,1);
alter table public.food_items add column if not exists zinc_mg numeric(6,1);
alter table public.food_items add column if not exists potassium_mg numeric(7,1);
alter table public.food_items add column if not exists calcium_mg numeric(7,1);
alter table public.food_items add column if not exists iron_mg numeric(6,2);
create index if not exists food_items_barcode_idx on public.food_items(user_id, barcode) where barcode is not null;

alter table public.food_logs add column if not exists vitamin_d_mcg numeric(6,2);
alter table public.food_logs add column if not exists magnesium_mg numeric(6,1);
alter table public.food_logs add column if not exists vitamin_b1_mg numeric(6,2);
alter table public.food_logs add column if not exists vitamin_b6_mg numeric(6,2);
alter table public.food_logs add column if not exists vitamin_b12_mcg numeric(6,2);
alter table public.food_logs add column if not exists omega3_mg numeric(6,1);
alter table public.food_logs add column if not exists zinc_mg numeric(6,1);
alter table public.food_logs add column if not exists potassium_mg numeric(7,1);
alter table public.food_logs add column if not exists calcium_mg numeric(7,1);
alter table public.food_logs add column if not exists iron_mg numeric(6,2);

alter table public.daily_targets add column if not exists vitamin_d_mcg numeric(6,2) not null default 15;
alter table public.daily_targets add column if not exists magnesium_mg numeric(6,1) not null default 375;
alter table public.daily_targets add column if not exists vitamin_b1_mg numeric(6,2) not null default 1.15;
alter table public.daily_targets add column if not exists vitamin_b6_mg numeric(6,2) not null default 1.5;
alter table public.daily_targets add column if not exists vitamin_b12_mcg numeric(6,2) not null default 3.2;
alter table public.daily_targets add column if not exists omega3_mg numeric(6,1) not null default 375;
alter table public.daily_targets add column if not exists zinc_mg numeric(6,1) not null default 11;
alter table public.daily_targets add column if not exists potassium_mg numeric(7,1) not null default 4100;
alter table public.daily_targets add column if not exists calcium_mg numeric(7,1) not null default 1000;
alter table public.daily_targets add column if not exists iron_mg numeric(6,2) not null default 9.5;

-- =========================================================
-- Migratie: profielvelden (naam/geslacht/geboortedatum voor de doelen-
-- rekenmachine) en supplement-uitbreidingen (optioneel tijdstip,
-- koppeling aan een micronutriënt).
-- =========================================================
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists sex text;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_sex_check'
  ) then
    alter table public.profiles add constraint profiles_sex_check check (sex in ('male', 'female'));
  end if;
end $$;
alter table public.profiles add column if not exists birth_date date;

alter table public.supplements alter column timing_label drop not null;
alter table public.supplements add column if not exists reminder_time time;
alter table public.supplements add column if not exists linked_nutrient_key text;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'supplements_linked_nutrient_key_check'
  ) then
    alter table public.supplements add constraint supplements_linked_nutrient_key_check check (
      linked_nutrient_key in (
        'vitamin_d_mcg', 'magnesium_mg', 'vitamin_b1_mg', 'vitamin_b6_mg', 'vitamin_b12_mcg',
        'omega3_mg', 'zinc_mg', 'potassium_mg', 'calcium_mg', 'iron_mg'
      )
    );
  end if;
end $$;
alter table public.supplements add column if not exists linked_nutrient_amount numeric(7,2);

-- =========================================================
-- Migratie: doel als vaste keuze (i.p.v. vrije tekst) + tempo-slider, en een
-- databugfix — activity_level werd bij het aanmaken van je account gezet op
-- 'licht_actief' terwijl de app zelf de Engelse sleutel 'light' verwacht,
-- waardoor het activiteitsniveau in Instellingen leeg leek te staan.
-- =========================================================
update public.profiles set activity_level = 'light' where activity_level = 'licht_actief';

alter table public.profiles add column if not exists goal_pace_kg_per_week numeric(4,2);
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_goal_check'
  ) then
    alter table public.profiles add constraint profiles_goal_check check (
      goal in ('afvallen', 'onderhoud', 'spieropbouw')
    );
  end if;
end $$;

-- =========================================================
-- Migratie: recepten (samengestelde maaltijden van meerdere ingrediënten).
-- reference_grams op food_items zodat een bestaand item ook correct kan
-- worden herschaald als receptingrediënt.
-- =========================================================
alter table public.food_items add column if not exists reference_grams numeric(7,1) not null default 100;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists recipes_user_idx on public.recipes(user_id);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  grams numeric(7,1) not null,
  calories_kcal_per_100g numeric(7,2) not null,
  protein_g_per_100g numeric(7,2) not null default 0,
  carbs_g_per_100g numeric(7,2) not null default 0,
  fat_g_per_100g numeric(7,2) not null default 0,
  fiber_g_per_100g numeric(7,2) not null default 0,
  vitamin_d_mcg_per_100g numeric(7,2),
  magnesium_mg_per_100g numeric(7,2),
  vitamin_b1_mg_per_100g numeric(7,2),
  vitamin_b6_mg_per_100g numeric(7,2),
  vitamin_b12_mcg_per_100g numeric(7,2),
  omega3_mg_per_100g numeric(7,2),
  zinc_mg_per_100g numeric(7,2),
  potassium_mg_per_100g numeric(7,2),
  calcium_mg_per_100g numeric(7,2),
  iron_mg_per_100g numeric(7,2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients(recipe_id);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

drop policy if exists "recipes_self" on public.recipes;
create policy "recipes_self" on public.recipes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recipe_ingredients_self" on public.recipe_ingredients;
create policy "recipe_ingredients_self" on public.recipe_ingredients for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
