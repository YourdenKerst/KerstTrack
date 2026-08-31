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
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 3. food_items — herbruikbare "eigen producten"/favorieten-bibliotheek
-- =========================================================
create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text,
  barcode text,
  image_url text,
  calories_kcal numeric(6,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  fiber_g numeric(6,1) not null default 0,
  -- Hoeveel gram/ml de bovenstaande waarden vertegenwoordigen — nodig om dit
  -- item correct te kunnen herschalen als receptingrediënt (zie
  -- recipe_ingredients) en om de standaardhoeveelheid bij het loggen te tonen.
  reference_grams numeric(7,1) not null default 100,
  -- Eenheid waarin hoeveelheden voor dit product getoond worden (g of ml).
  unit text not null default 'g' check (unit in ('g', 'ml')),
  -- Portiegrootte uit Open Food Facts (bv. 6 voor "1 portie = 6g"), zodat je
  -- bij het loggen in porties kunt invoeren i.p.v. een absoluut aantal.
  serving_size numeric(7,2),
  -- Alleen favorieten worden getoond bij het zoeken/loggen — een product
  -- rechtstreeks loggen (zonder op het hartje te tikken) slaat niets hier op.
  is_favorite boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists food_items_user_idx on public.food_items(user_id);
create index if not exists food_items_barcode_idx on public.food_items(user_id, barcode) where barcode is not null;

-- =========================================================
-- 4. recipes — eigen samengestelde maaltijden (bv. "cake") van meerdere ingrediënten
-- =========================================================
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists recipes_user_idx on public.recipes(user_id);

-- =========================================================
-- 5. recipe_ingredients — ingrediënten van een recept, per 100g gedenormaliseerd
-- (net als food_logs t.o.v. food_items) zodat een latere wijziging aan het
-- oorspronkelijke item de receptgeschiedenis niet stilletjes verandert.
-- =========================================================
create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  image_url text,
  grams numeric(7,1) not null,
  calories_kcal_per_100g numeric(7,2) not null,
  protein_g_per_100g numeric(7,2) not null default 0,
  carbs_g_per_100g numeric(7,2) not null default 0,
  fat_g_per_100g numeric(7,2) not null default 0,
  fiber_g_per_100g numeric(7,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients(recipe_id);

-- =========================================================
-- 6. food_logs — daadwerkelijke logs per dag (macro's gedenormaliseerd gekopieerd)
-- =========================================================
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_item_id uuid references public.food_items(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null,
  image_url text,
  ingredient_count integer,
  -- Hoeveel gram/ml dit precies was — nodig om de hoeveelheid achteraf aan te
  -- kunnen passen (herschaalt calories_kcal/protein_g/... proportioneel).
  amount numeric(7,1),
  unit text not null default 'g' check (unit in ('g', 'ml')),
  calories_kcal numeric(6,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  fiber_g numeric(6,1) not null default 0,
  log_date date not null,
  logged_at timestamptz not null default now()
);
create index if not exists food_logs_user_date_idx on public.food_logs(user_id, log_date);

-- =========================================================
-- 7. supplements — schema-definitie (soft-delete via is_active)
-- =========================================================
create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- Vrije tekst, optioneel (bv. "2 capsules" / "500mg") — puur informatief.
  dose text,
  -- Vrij te kiezen kleur (hex) om supplementen visueel te groeperen, bv. per
  -- innamemoment (ontbijt/lunch/diner) — puur cosmetisch, geen vaste opties.
  color text,
  -- Tijdstip van inname + herhaling gelden voor het hele supplement (niet per
  -- herinnering — zie supplement_reminders hieronder voor die offsets).
  intake_time time not null default '09:00',
  recurrence_type text not null default 'daily' check (recurrence_type in ('daily', 'every_n_days', 'weekly')),
  -- Alleen relevant bij recurrence_type = 'every_n_days' (2/3/4).
  recurrence_n smallint,
  -- Alleen relevant bij recurrence_type = 'weekly' (0 = maandag ... 6 = zondag).
  recurrence_weekday smallint,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists supplements_user_idx on public.supplements(user_id, is_active);

-- =========================================================
-- 7b. supplement_reminders — tot 3 herinneringsmomenten per supplement, elk
-- een aantal minuten vóór (negatief) of na (positief) intake_time (0 = op het
-- moment zelf). Slot 1 is in de app verplicht, 2 en 3 optioneel.
-- =========================================================
create table if not exists public.supplement_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  slot smallint not null check (slot in (1, 2, 3)),
  offset_minutes integer not null default 0,
  unique (supplement_id, slot)
);
create index if not exists supplement_reminders_supplement_idx on public.supplement_reminders(supplement_id);

-- =========================================================
-- 8. supplement_logs — dagelijkse afvink-checkoffs
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
-- 9. water_logs — elke toevoeging is een eigen rij, dagtotaal = som
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
-- 10. weight_logs — 1 log per dag (upsert bij dubbel loggen)
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
-- Row Level Security — elke tabel alleen leesbaar/schrijfbaar door de eigenaar
-- =========================================================
alter table public.profiles enable row level security;
alter table public.daily_targets enable row level security;
alter table public.food_items enable row level security;
alter table public.food_logs enable row level security;
alter table public.supplements enable row level security;
alter table public.supplement_reminders enable row level security;
alter table public.supplement_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.weight_logs enable row level security;
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

drop policy if exists "supplement_reminders_self" on public.supplement_reminders;
create policy "supplement_reminders_self" on public.supplement_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "supplement_logs_self" on public.supplement_logs;
create policy "supplement_logs_self" on public.supplement_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "water_logs_self" on public.water_logs;
create policy "water_logs_self" on public.water_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weight_logs_self" on public.weight_logs;
create policy "weight_logs_self" on public.weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
-- versie zijn toegevoegd (barcode scannen). Veilig om opnieuw te draaien.
-- =========================================================
alter table public.food_items add column if not exists barcode text;
create index if not exists food_items_barcode_idx on public.food_items(user_id, barcode) where barcode is not null;

-- =========================================================
-- Migratie: profielvelden (naam/geslacht/geboortedatum voor de doelen-
-- rekenmachine).
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
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists recipes_user_idx on public.recipes(user_id);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  image_url text,
  grams numeric(7,1) not null,
  calories_kcal_per_100g numeric(7,2) not null,
  protein_g_per_100g numeric(7,2) not null default 0,
  carbs_g_per_100g numeric(7,2) not null default 0,
  fat_g_per_100g numeric(7,2) not null default 0,
  fiber_g_per_100g numeric(7,2) not null default 0,
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

-- =========================================================
-- Migratie: micronutriënten volledig verwijderd (was te veel ruis, nooit
-- overal even accuraat — barcode-macro's blijven volledig, dat is waar
-- Open Food Facts betrouwbaar in is). Ook het koppelen van een supplement
-- aan een micronutriënt verdwijnt hiermee.
-- =========================================================
alter table public.food_items drop column if exists vitamin_d_mcg;
alter table public.food_items drop column if exists magnesium_mg;
alter table public.food_items drop column if exists vitamin_b1_mg;
alter table public.food_items drop column if exists vitamin_b6_mg;
alter table public.food_items drop column if exists vitamin_b12_mcg;
alter table public.food_items drop column if exists omega3_mg;
alter table public.food_items drop column if exists zinc_mg;
alter table public.food_items drop column if exists potassium_mg;
alter table public.food_items drop column if exists calcium_mg;
alter table public.food_items drop column if exists iron_mg;

alter table public.food_logs drop column if exists vitamin_d_mcg;
alter table public.food_logs drop column if exists magnesium_mg;
alter table public.food_logs drop column if exists vitamin_b1_mg;
alter table public.food_logs drop column if exists vitamin_b6_mg;
alter table public.food_logs drop column if exists vitamin_b12_mcg;
alter table public.food_logs drop column if exists omega3_mg;
alter table public.food_logs drop column if exists zinc_mg;
alter table public.food_logs drop column if exists potassium_mg;
alter table public.food_logs drop column if exists calcium_mg;
alter table public.food_logs drop column if exists iron_mg;

alter table public.daily_targets drop column if exists vitamin_d_mcg;
alter table public.daily_targets drop column if exists magnesium_mg;
alter table public.daily_targets drop column if exists vitamin_b1_mg;
alter table public.daily_targets drop column if exists vitamin_b6_mg;
alter table public.daily_targets drop column if exists vitamin_b12_mcg;
alter table public.daily_targets drop column if exists omega3_mg;
alter table public.daily_targets drop column if exists zinc_mg;
alter table public.daily_targets drop column if exists potassium_mg;
alter table public.daily_targets drop column if exists calcium_mg;
alter table public.daily_targets drop column if exists iron_mg;

alter table public.recipe_ingredients drop column if exists vitamin_d_mcg_per_100g;
alter table public.recipe_ingredients drop column if exists magnesium_mg_per_100g;
alter table public.recipe_ingredients drop column if exists vitamin_b1_mg_per_100g;
alter table public.recipe_ingredients drop column if exists vitamin_b6_mg_per_100g;
alter table public.recipe_ingredients drop column if exists vitamin_b12_mcg_per_100g;
alter table public.recipe_ingredients drop column if exists omega3_mg_per_100g;
alter table public.recipe_ingredients drop column if exists zinc_mg_per_100g;
alter table public.recipe_ingredients drop column if exists potassium_mg_per_100g;
alter table public.recipe_ingredients drop column if exists calcium_mg_per_100g;
alter table public.recipe_ingredients drop column if exists iron_mg_per_100g;

alter table public.supplements drop column if exists linked_nutrient_key;
alter table public.supplements drop column if exists linked_nutrient_amount;

-- =========================================================
-- Migratie: supplementen — tijdstip van inname + herhaling horen bij het
-- supplement zelf (niet meer per herinnering); supplement_reminders is nu
-- alleen nog "x minuten vóór intake_time" (zie basistabellen hierboven).
-- =========================================================
alter table public.supplements add column if not exists intake_time time not null default '09:00';
alter table public.supplements add column if not exists recurrence_type text not null default 'daily';
alter table public.supplements add column if not exists recurrence_n smallint;
alter table public.supplements add column if not exists recurrence_weekday smallint;
alter table public.supplements drop constraint if exists supplements_recurrence_type_check;
alter table public.supplements add constraint supplements_recurrence_type_check check (recurrence_type in ('daily', 'every_n_days', 'weekly'));

alter table public.supplement_reminders drop column if exists reminder_time;
alter table public.supplement_reminders drop column if exists recurrence_type;
alter table public.supplement_reminders drop column if exists recurrence_n;
alter table public.supplement_reminders drop column if exists recurrence_weekday;
alter table public.supplement_reminders add column if not exists minutes_before integer not null default 0;
alter table public.supplement_reminders drop constraint if exists supplement_reminders_minutes_before_check;
alter table public.supplement_reminders add constraint supplement_reminders_minutes_before_check check (minutes_before >= 0);

alter table public.supplements drop column if exists dose_label;
alter table public.supplements drop column if exists timing_label;
alter table public.supplements drop column if exists reminder_time;

-- =========================================================
-- Migratie: afbeeldingen bij producten, recepten en logs; recept-koppeling
-- en ingrediëntenaantal op food_logs voor de kaartjes op het dashboard.
-- =========================================================
alter table public.food_items add column if not exists image_url text;
alter table public.recipes add column if not exists image_url text;
alter table public.recipe_ingredients add column if not exists image_url text;
alter table public.food_logs add column if not exists image_url text;
alter table public.food_logs add column if not exists ingredient_count integer;
alter table public.food_logs add column if not exists recipe_id uuid references public.recipes(id) on delete set null;

-- Opslag-bucket voor zelf toegevoegde productfoto's. Publiek leesbaar (het zijn
-- alleen foto's van eten, geen gevoelige data) zodat een <img src> zonder
-- signed URL werkt; alleen de ingelogde gebruiker mag uploaden/verwijderen.
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do nothing;

drop policy if exists "food_images_read" on storage.objects;
create policy "food_images_read" on storage.objects for select
  using (bucket_id = 'food-images');

drop policy if exists "food_images_write" on storage.objects;
create policy "food_images_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'food-images');

drop policy if exists "food_images_delete" on storage.objects;
create policy "food_images_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'food-images');

-- =========================================================
-- Migratie: favorieten. Loggen sloeg altijd een food_items-rij op, ook voor
-- een eenmalig gescand/gezocht Open Food Facts-product — daardoor raakte
-- "jouw producten" vervuild met dingen die je maar één keer had gegeten.
-- Vanaf nu wordt een food_items-rij alleen nog aangemaakt als je op het
-- hartje tikt; bestaande rijen (die je al zag als "jouw producten") worden
-- hieronder als favoriet aangemerkt zodat ze niet plotseling verdwijnen.
-- =========================================================
alter table public.food_items add column if not exists is_favorite boolean not null default true;

-- =========================================================
-- Migratie: echte Web Push-meldingen. De lokale setTimeout-planning (zie
-- SupplementReminders.tsx) werkt alleen zolang de app open is; deze twee
-- tabellen maken meldingen mogelijk ook als de app dicht is, via een
-- server-route die een cron elke paar minuten aanroept (zie
-- src/app/api/push/send-due/route.ts).
-- =========================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_self" on public.push_subscriptions;
create policy "push_subscriptions_self" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bijhouden welke herinnering al verstuurd is (per dag) zodat een cron die
-- elke paar minuten draait dezelfde melding niet meermaals verstuurt. Alleen
-- de server (via de service-role key) leest/schrijft hier — geen client-
-- policy nodig, dus RLS staat aan zonder policy (op slot dus voor iedereen
-- behalve service-role).
create table if not exists public.sent_reminder_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  slot smallint not null,
  log_date date not null,
  sent_at timestamptz not null default now(),
  unique (supplement_id, slot, log_date)
);
alter table public.sent_reminder_notifications enable row level security;

-- =========================================================
-- Migratie: supplement-kleur, en herinneringen ook ná inname (i.p.v. alleen
-- ervoor). offset_minutes vervangt minutes_before: negatief = ervoor,
-- positief = erna, 0 = op het moment zelf. Bestaande minutes_before (altijd
-- "ervoor") wordt 1-op-1 overgenomen als het negatief.
-- =========================================================
alter table public.supplements add column if not exists color text;

alter table public.supplement_reminders add column if not exists offset_minutes integer not null default 0;
-- Kan niet als kale UPDATE: die refereert minutes_before, wat na een eerdere
-- run van dit script (die de kolom hieronder droppt) niet meer bestaat, en een
-- kale SQL-statement wordt altijd volledig geparsed — ook een niet-bereikte
-- WHERE-tak. Een DO-block plant zijn SQL pas bij het bereiken ervan, dus dit
-- blijft veilig herhaalbaar.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'supplement_reminders' and column_name = 'minutes_before'
  ) then
    update public.supplement_reminders set offset_minutes = -minutes_before where minutes_before <> 0;
  end if;
end $$;
alter table public.supplement_reminders drop column if exists minutes_before;

-- =========================================================
-- Migratie: merk, eenheid (g/ml) en portiegrootte bij producten — voor
-- merk-zoeken en het loggen in "aantal porties" i.p.v. alleen een absoluut
-- aantal gram/ml.
-- =========================================================
alter table public.food_items add column if not exists brand text;
alter table public.food_items add column if not exists unit text not null default 'g';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'food_items_unit_check'
  ) then
    alter table public.food_items add constraint food_items_unit_check check (unit in ('g', 'ml'));
  end if;
end $$;
alter table public.food_items add column if not exists serving_size numeric(7,2);

-- =========================================================
-- Migratie: bewaartermijn. Voeding (food_logs) wordt na 3 dagen automatisch
-- opgeruimd — alleen de streaks (supplement_logs) en de andere logs
-- (water/gewicht, nog steeds gebruikt in Trends) blijven lang bewaard.
-- Draait dagelijks via pg_cron (zelfde mechanisme als de reminder-cron).
-- =========================================================
select cron.schedule(
  'purge-old-food-logs',
  '30 2 * * *',
  $$ delete from public.food_logs where log_date < (current_date - interval '3 days'); $$
) where not exists (select 1 from cron.job where jobname = 'purge-old-food-logs');

-- =========================================================
-- Migratie: supplement-streaks bewaren max. 3 maanden (zie ook de eigen
-- periodefilter per tabel in Trends — "Alles" is daar begrensd tot 3 maanden
-- omdat er nooit meer dan dat bestaat).
-- =========================================================
select cron.schedule(
  'purge-old-supplement-logs',
  '45 2 * * *',
  $$ delete from public.supplement_logs where log_date < (current_date - interval '3 months'); $$
) where not exists (select 1 from cron.job where jobname = 'purge-old-supplement-logs');

-- =========================================================
-- Migratie: alcohol-tracking en de weekendcorrectie-checklist zijn volledig
-- verwijderd (nooit gebruikt zoals bedoeld) — inclusief het bijbehorende extra
-- waterdoel. Voeding aanpassen achteraf (amount/unit) en een optioneel
-- dosis-veld bij supplementen komen ervoor in de plaats.
-- =========================================================
drop table if exists public.correction_checkoffs;
drop table if exists public.alcohol_logs;
alter table public.daily_targets drop column if exists alcohol_extra_water_ml;

alter table public.food_logs add column if not exists amount numeric(7,1);
alter table public.food_logs add column if not exists unit text not null default 'g';
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'food_logs_unit_check'
  ) then
    alter table public.food_logs add constraint food_logs_unit_check check (unit in ('g', 'ml'));
  end if;
end $$;

alter table public.supplements add column if not exists dose text;
