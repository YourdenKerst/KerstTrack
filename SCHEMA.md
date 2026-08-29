# Databaseschema

Dit document legt het Postgres/Supabase-datamodel uit. De uitvoerbare DDL staat in [`supabase/schema.sql`](supabase/schema.sql) — dit bestand is de leesbare toelichting daarbij.

## Overzicht

13 tabellen (plus een Storage-bucket voor foto's), allemaal met Row Level Security aan: elke rij is alleen leesbaar/schrijfbaar door de gebruiker die er `user_id` (of bij `profiles` gewoon `id`) op heeft staan, via de policy `auth.uid() = user_id`. Omdat dit een single-user app is, is dat meer een verdedigingslaag dan een noodzaak — maar het is gratis, en het betekent dat de Supabase anon-key veilig in de browser kan staan: zonder geldige sessie levert elke tabel niets op.

| Tabel | Waarvoor |
|---|---|
| `profiles` | Lengte, gewicht, activiteitsniveau, doel + tempo — 1 rij per gebruiker |
| `daily_targets` | De instelbare dagdoelen (calorieën/macro's/water) — 1 actieve rij per gebruiker |
| `food_items` | Herbruikbare "eigen producten", per 100g |
| `food_logs` | Wat je daadwerkelijk per dag hebt gegeten |
| `supplements` | Het (aanpasbare) supplementenschema: naam + tijdstip van inname + herhaling |
| `supplement_reminders` | Tot 3 herinneringen per supplement, elk een aantal minuten vóór inname |
| `supplement_logs` | Afvink-momenten per supplement per dag |
| `correction_checkoffs` | Afvinken van de 3 weekendcorrectie-taken |
| `water_logs` | Elke waterinname-toevoeging |
| `weight_logs` | Gewicht per dag |
| `alcohol_logs` | Welke dagen je alcohol hebt gedronken |
| `recipes` | Zelfsamengestelde maaltijden (bv. "cake") van meerdere ingrediënten |
| `recipe_ingredients` | De ingrediënten van een recept, per 100g gedenormaliseerd |

De opdracht noemde 9 categorieën; `correction_checkoffs`, `supplement_reminders`, `recipes` en `recipe_ingredients` zijn latere toevoegingen (zie onder).

**Tijdstip van inname + herhaling horen bij het supplement, niet bij de herinnering.** `supplements` heeft één `intake_time`, één `recurrence_type` (`daily` / `every_n_days` met `recurrence_n` / `weekly` met `recurrence_weekday`, 0 = maandag) en een optionele `color` (vrij te kiezen hex, puur visueel — bv. om supplementen per innamemoment te groeperen) — dosis en een vrije tijdstip-tekst zijn eruit gehaald. `supplement_reminders` houdt tot 3 herinneringen per supplement bij (slot 1 verplicht in de UI, 2 en 3 optioneel), elk alleen een `offset_minutes` (minuten t.o.v. `intake_time`; negatief = ervoor, positief = erna, 0 = op het moment zelf). Dit is ook de tabel die de `/api/push/send-due`-route + pg_cron-job raadplegen voor echte Web Push-meldingen (zie onder).

**Recepten rekenen per 100 gram.** Elk `recipe_ingredients`-item slaat zijn voedingswaarden per 100g op (net als Open Food Facts dat doet), plus hoeveel gram daadwerkelijk in het recept gaat. Zo kun je een ingrediënt (bv. bloem) aan meerdere recepten toevoegen met een andere hoeveelheid, en blijft opschalen naar het totale recept — of een deel daarvan — een simpele vermenigvuldiging. `food_items.reference_grams` (standaard 100) maakt het mogelijk om een bestaand, eerder handmatig ingevoerd product ook als ingrediënt te herschalen.

## Bewuste ontwerpkeuzes

**`daily_targets` heeft geen historiek.** Er is precies 1 rij per gebruiker; die update je in Settings. Trends/adherence-berekeningen vergelijken altijd tegen de *huidige* targets, ook voor logs uit het verleden. Simpeler te bouwen en te begrijpen dan een versiegeschiedenis, en voor een doel dat maandenlang hetzelfde blijft (2.100 kcal etc.) is dat geen praktisch probleem. Wil je dit later toch, dan voeg je een `effective_from`-datum toe en pak je bij elke berekening de laatst-geldige rij vóór die datum.

**`food_logs` kopieert macro's, i.p.v. alleen naar `food_items` te verwijzen.** Als je een favoriet product later aanpast of verwijdert, blijft je geschiedenis van eerder gelogde dagen kloppen — die verandert niet met terugwerkende kracht mee.

**`supplements` gebruikt soft delete (`is_active`), geen echte delete.** `supplement_logs` verwijst naar `supplement_id`; als je een supplement uit je schema haalt, blijft de streak-geschiedenis intact en kloppen oude checkoffs nog.

**`correction_checkoffs` is een losse tabel, niet hergebruik van `supplement_logs`.** De 3 weekendcorrectietaken (extra water, extra magnesiumrijke voeding, extra B-complex) zijn geen structureel dagelijks schema-item zoals de 4 vaste supplementen — ze verschijnen alleen op dagen na een gelogde alcoholdag. Een aparte tabel met `task_key` (`extra_water` / `extra_magnesium_food` / `extra_b_complex`) houdt dat onderscheid schoon en voorkomt dat de supplement-streak-logica vervuild raakt met incidentele taken.

**De weekendcorrectie zelf staat niet in een tabel — die wordt afgeleid.** Er is geen "correctie-actief"-vlag ergens opgeslagen. De app checkt of er een `alcohol_logs`-rij bestaat met `log_date` = vandaag of gisteren; zo ja, telt `alcohol_extra_water_ml` (standaard 500) meteen op bij het waterdoel — het waterdoel gaat dus al omhoog op de dag dat je drinkt, niet pas de dag erna. De correctie-**checklist** (extra magnesiumvoeding, extra B-complex) verschijnt wel specifiek pas de dag ná een gelogde alcoholdag, zoals bedoeld. Dit betekent simpele queries in plaats van een cronjob of database-trigger die dagelijks iets moet klaarzetten.

**Automatisch seeden via een trigger, niet via een los `seed.sql`-script.** Zodra je (eenmalig, handmatig) het ene account aanmaakt in Supabase Studio, vult de trigger `on_auth_user_created` in `schema.sql` meteen je profiel en je startdoelen (2.100 kcal / 165 / 235 / 70 / 35 / 3.000 ml) in. Zo hoef je nooit een user-id te kopiëren en handmatig in een SQL-bestand te plakken. **Supplementen worden bewust niet voorgevuld** — dat schema stel je zelf samen via het Supplementen-tabblad, ook als het je eerste keer is.

**`log_date` staat los van `logged_at`/`created_at`.** `log_date` is de "kalenderdag" waarop iets telt (voor dagtotalen); `logged_at` is het exacte moment. Zo blijft het model simpel als je bijvoorbeeld om 23:50 nog een maaltijd van "vandaag" logt.

## Barcode scannen + zoeken

`food_items` heeft een `barcode`-kolom. **Barcode scannen gaat via [Open Food Facts](https://nl.openfoodfacts.org)** (`lib/openFoodFacts.ts`) — een gratis, open (ODbL-licentie) product-database, geen API-key nodig.
- Een gescand product wordt bij het opslaan met zijn `barcode` in `food_items` gecached — een tweede scan van hetzelfde product zoekt eerst lokaal en raakt Open Food Facts niet opnieuw.
- Zoeken op naam (in `/log/search` en bij het toevoegen van een receptingrediënt) combineert je eigen `food_items` met een tekst-zoekopdracht naar [search-a-licious](https://search.openfoodfacts.org) — Open Food Facts' v2/v3-API heeft geen full-text zoeken, en de oudere `/cgi/search.pl`-endpoint is niet meer bereikbaar.

**Geen micronutriënten.** Die zaten er eerder in (10 losse kolommen per tabel + een koppeling vanuit supplementen), maar zijn volledig verwijderd: te veel ruis, en nooit overal even accuraat. Alleen de macro's (calorieën/eiwit/koolhydraten/vet/vezels) blijven — daar is Open Food Facts wél betrouwbaar in.

**`food_items` heeft `brand`, `unit` (`g`/`ml`) en `serving_size`.** Merk komt uit Open Food Facts' `brands`-veld en is doorzoekbaar samen met de naam. `unit`/`serving_size` komen uit `serving_size`/`serving_quantity` (bv. "1 portie = 30g") en laten je bij het loggen kiezen tussen een handmatig aantal g/ml of een aantal porties — favorieten onthouden hun eigen eenheid en portiegrootte voor de volgende keer.

**Favorieten-only: loggen slaat niet meer automatisch iets op.** Zie de eerdere migratie-toelichting in `schema.sql` — een gescand/gezocht product wordt alleen in `food_items` opgeslagen (en dus zichtbaar in "Favorieten") als je op het hartje tikt. Zonder favorieten wordt direct in `food_logs` gelogd, zonder `food_item_id`.

**`food_logs` wordt na 3 dagen automatisch opgeruimd.** Een pg_cron-job (`purge-old-food-logs`, dagelijks) verwijdert `food_logs`-rijen met `log_date` ouder dan 3 dagen — alleen de streaks (`supplement_logs`) en de andere logs (water/gewicht/alcohol, nog in gebruik in Trends) blijven lang bewaard. Vooruitplannen kan tot `MAX_FUTURE_PLANNING_DAYS` (7 dagen, `lib/date.ts`).

**Web Push draait op Supabase's eigen pg_cron, niet op Vercel of GitHub Actions.** Vercel Hobby staat cron niet vaker dan 1x/dag toe; GitHub Actions bleek in de praktijk te onbetrouwbaar op een 5-minuten-schema (soms 45+ minuten stil). Een pg_cron-job (`send-due-supplement-reminders`, elke minuut) roept via `pg_net` de route `/api/push/send-due` aan, die met de service-role key (bypast RLS) uitzoekt welke herinnering nu verstreken is en een echte Web Push stuurt (`push_subscriptions`) — werkt ook als de app dicht is. `sent_reminder_notifications` voorkomt dubbel versturen.

## Afbeeldingen

`food_items`, `food_logs`, `recipes` en `recipe_ingredients` hebben elk een `image_url`. Bij een barcode-scan komt die van Open Food Facts; bij handmatig toevoegen upload je zelf een foto naar de Supabase Storage-bucket `food-images` (publiek leesbaar, alleen de ingelogde gebruiker mag uploaden/verwijderen — zie `lib/storage.ts` en het einde van `schema.sql`).

## Indexen

Elke tabel met veel rijen per gebruiker heeft een index op `(user_id, log_date)`, omdat bijna elke query in de app filtert op "van deze gebruiker, op/rond deze datum" (dagtotalen, trends-periodes).
