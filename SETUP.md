# Setup

Stappen die jij zelf moet doen om de app aan de praat te krijgen. Duurt in totaal een kwartiertje.

## 1. Supabase-project aanmaken

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account (kan met GitHub-login).
2. Klik **New project**. Kies een naam (bijv. "tracker"), een sterk database-wachtwoord (bewaar dit even, niet nodig voor de app zelf maar goed om te hebben) en een regio dicht bij jou (bijv. Frankfurt/West-Europa).
3. Wacht tot het project klaar is met provisionen (±1-2 minuten).

## 2. Databaseschema uitrollen

1. Open in je Supabase-project links het **SQL Editor**-icoon.
2. Klik **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) uit deze repo, kopieer de volledige inhoud, plak het in de SQL Editor.
4. Klik **Run**. Dit maakt alle tabellen, indexen, Row Level Security-policies én een trigger aan die automatisch je profiel/doelen/supplementen klaarzet zodra je hierna je account aanmaakt.

Zie [`SCHEMA.md`](SCHEMA.md) voor een uitleg van het datamodel.

## 3. Je account aanmaken

Er is bewust geen registratiepagina in de app (single-user tool op een publieke URL — een open signup-flow heeft geen functie en is onnodig aanvalsoppervlak). Je maakt het ene account zelf aan:

1. Ga in Supabase naar **Authentication > Users**.
2. Klik **Add user > Create new user**.
3. Vul je e-mailadres en een wachtwoord in. Vink **Auto Confirm User** aan (anders moet je een bevestigingsmail regelen, wat voor een single-user tool niet nodig is).
4. Klik **Create user**.

De trigger uit stap 2 vult nu automatisch je profiel en je startdoelen (2.100 kcal / 165 g eiwit / 235 g koolhydraten / 70 g vet / 35 g vezels / 3.000 ml water) in — aanpasbaar in Settings. Je supplementenschema begint bewust leeg; die voeg je zelf toe via Instellingen > Supplementenschema beheren.

## 4. API-keys ophalen en invullen

1. Ga naar **Project Settings > API** (of **Data API** in nieuwere Supabase-versies).
2. Kopieer de **Project URL** en de **anon public**-key (niet de `service_role`-key — die heeft de app niet nodig en mag nooit in de browser terechtkomen).
3. Kopieer `.env.local.example` naar `.env.local`:

   ```bash
   cp .env.local.example .env.local
   ```

4. Vul in `.env.local` de twee waarden in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

## 5. Lokaal draaien

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) en log in met het account uit stap 3.

## 6. Deployen naar Vercel

1. Zet de repo op GitHub (`git init`, commit, en push naar een nieuwe GitHub-repo — vraag het mij gerust als je dat door mij wilt laten doen).
2. Ga naar [vercel.com](https://vercel.com), log in (kan met je GitHub-account) en klik **Add New… > Project**.
3. Importeer de GitHub-repo. Vercel herkent Next.js automatisch — je hoeft niets aan de build-instellingen te wijzigen.
4. Voeg onder **Environment Variables** dezelfde twee variabelen toe als in je `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Klik **Deploy**. Na een minuutje krijg je een `https://…vercel.app`-URL.
6. (Optioneel maar aan te raden) Ga in Supabase naar **Authentication > URL Configuration** en zet je Vercel-URL als **Site URL**, zodat auth-gerelateerde links altijd naar de juiste plek verwijzen.

Elke volgende `git push` naar je hoofdbranch deployt vanaf nu automatisch een nieuwe versie.

## 7. Toevoegen aan beginscherm

- **Android/Chrome/desktop**: de browser toont vanzelf een install-prompt, of gebruik het menu > "App installeren".
- **iPhone (Safari)**: er is geen automatische install-prompt — tik op het deelicoon (vierkant met pijl omhoog) onderin Safari en kies **"Zet op beginscherm"**.

## 8. PWA-installability zelf checken

Open de gedeployde URL in Chrome, open DevTools (F12) → tab **Application** → sectie **Manifest**: daar zie je een installability-check met eventuele fouten. Dit is inmiddels de vervanger van de losse "PWA"-categorie die Lighthouse zelf niet meer heeft (dat is bevestigd tijdens het bouwen: recente Lighthouse-versies hebben geen PWA-audits meer) — deze app is al gecontroleerd tegen alle onderliggende eisen (geldig manifest met 192/512/maskable-icons, geregistreerde service worker, viewport- en theme-color-meta, apple-touch-icon), maar een echte klik-door-check in DevTools op de live URL is de laatste zekerheid.
