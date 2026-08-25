# Databaseschema

Dit document legt het Postgres/Supabase-datamodel uit. De uitvoerbare DDL staat in [`supabase/schema.sql`](supabase/schema.sql) — dit bestand is de leesbare toelichting daarbij.

## Overzicht

12 tabellen, allemaal met Row Level Security aan: elke rij is alleen leesbaar/schrijfbaar door de gebruiker die er `user_id` (of bij `profiles` gewoon `id`) op heeft staan, via de policy `auth.uid() = user_id`. Omdat dit een single-user app is, is dat meer een verdedigingslaag dan een noodzaak — maar het is gratis, en het betekent dat de Supabase anon-key veilig in de browser kan staan: zonder geldige sessie levert elke tabel niets op.

| Tabel | Waarvoor |
|---|---|
| `profiles` | Lengte, gewicht, activiteitsniveau, doel + tempo — 1 rij per gebruiker |
| `daily_targets` | De instelbare dagdoelen (calorieën/macro's/water) — 1 actieve rij per gebruiker |
| `food_items` | Herbruikbare "eigen producten" / favorieten |
| `food_logs` | Wat je daadwerkelijk per dag hebt gegeten |
| `supplements` | Het (aanpasbare) supplementenschema |
| `supplement_logs` | Afvink-momenten per supplement per dag |
| `correction_checkoffs` | Afvinken van de 3 weekendcorrectie-taken |
| `water_logs` | Elke waterinname-toevoeging |
| `weight_logs` | Gewicht per dag |
| `alcohol_logs` | Welke dagen je alcohol hebt gedronken |
| `recipes` | Zelfsamengestelde maaltijden (bv. "cake") van meerdere ingrediënten |
| `recipe_ingredients` | De ingrediënten van een recept, per 100g gedenormaliseerd |

De opdracht noemde 9 categorieën; `correction_checkoffs`, `recipes` en `recipe_ingredients` zijn latere toevoegingen (zie onder).

**Recepten rekenen per 100 gram.** Elk `recipe_ingredients`-item slaat zijn voedingswaarden per 100g op (net als Open Food Facts dat doet), plus hoeveel gram daadwerkelijk in het recept gaat. Zo kun je een ingrediënt (bv. bloem) aan meerdere recepten toevoegen met een andere hoeveelheid, en blijft opschalen naar het totale recept — of een deel daarvan — een simpele vermenigvuldiging. `food_items.reference_grams` (standaard 100) maakt het mogelijk om een bestaand, eerder handmatig ingevoerd product ook als ingrediënt te herschalen.

## Bewuste ontwerpkeuzes

**`daily_targets` heeft geen historiek.** Er is precies 1 rij per gebruiker; die update je in Settings. Trends/adherence-berekeningen vergelijken altijd tegen de *huidige* targets, ook voor logs uit het verleden. Simpeler te bouwen en te begrijpen dan een versiegeschiedenis, en voor een doel dat maandenlang hetzelfde blijft (2.100 kcal etc.) is dat geen praktisch probleem. Wil je dit later toch, dan voeg je een `effective_from`-datum toe en pak je bij elke berekening de laatst-geldige rij vóór die datum.

**`food_logs` kopieert macro's, i.p.v. alleen naar `food_items` te verwijzen.** Als je een favoriet product later aanpast of verwijdert, blijft je geschiedenis van eerder gelogde dagen kloppen — die verandert niet met terugwerkende kracht mee.

**`supplements` gebruikt soft delete (`is_active`), geen echte delete.** `supplement_logs` verwijst naar `supplement_id`; als je een supplement uit je schema haalt, blijft de streak-geschiedenis intact en kloppen oude checkoffs nog.

**`correction_checkoffs` is een losse tabel, niet hergebruik van `supplement_logs`.** De 3 weekendcorrectietaken (extra water, extra magnesiumrijke voeding, extra B-complex) zijn geen structureel dagelijks schema-item zoals de 4 vaste supplementen — ze verschijnen alleen op dagen na een gelogde alcoholdag. Een aparte tabel met `task_key` (`extra_water` / `extra_magnesium_food` / `extra_b_complex`) houdt dat onderscheid schoon en voorkomt dat de supplement-streak-logica vervuild raakt met incidentele taken.

**De weekendcorrectie zelf staat niet in een tabel — die wordt afgeleid.** Er is geen "correctie-actief"-vlag ergens opgeslagen. De app checkt of er een `alcohol_logs`-rij bestaat met `log_date` = vandaag of gisteren; zo ja, telt `alcohol_extra_water_ml` (standaard 500) meteen op bij het waterdoel — het waterdoel gaat dus al omhoog op de dag dat je drinkt, niet pas de dag erna. De correctie-**checklist** (extra magnesiumvoeding, extra B-complex) verschijnt wel specifiek pas de dag ná een gelogde alcoholdag, zoals bedoeld. Dit betekent simpele queries in plaats van een cronjob of database-trigger die dagelijks iets moet klaarzetten.

**Automatisch seeden via een trigger, niet via een los `seed.sql`-script.** Zodra je (eenmalig, handmatig) het ene account aanmaakt in Supabase Studio, vult de trigger `on_auth_user_created` in `schema.sql` meteen je profiel en je startdoelen (2.100 kcal / 165 / 235 / 70 / 35 / 3.000 ml) in. Zo hoef je nooit een user-id te kopiëren en handmatig in een SQL-bestand te plakken. **Supplementen worden bewust niet voorgevuld** — dat schema stel je zelf samen via Instellingen > Supplementenschema beheren, ook als het je eerste keer is.

**`log_date` staat los van `logged_at`/`created_at`.** `log_date` is de "kalenderdag" waarop iets telt (voor dagtotalen); `logged_at` is het exacte moment. Zo blijft het model simpel als je bijvoorbeeld om 23:50 nog een maaltijd van "vandaag" logt.

## Barcode scannen + micronutriënten

`food_items` en `food_logs` hebben elk 10 losse, **nullable** micronutriënt-kolommen (`vitamin_d_mcg`, `magnesium_mg`, `vitamin_b1_mg`, `vitamin_b6_mg`, `vitamin_b12_mcg`, `omega3_mg`, `zinc_mg`, `potassium_mg`, `calcium_mg`, `iron_mg`). `daily_targets` heeft dezelfde 10 als **niet-nullable doelen** met een default (zie `constants.ts` voor de herkomst van die richtwaarden). `food_items` heeft daarnaast een `barcode`-kolom.

**Null betekent "onbekend", niet "0".** Dit is bewust: als een gescand product geen vitamine-D-waarde heeft, mag dat de dagtotaal niet omlaag trekken alsof je 0 mcg binnenkreeg. `lib/calculations/micronutrients.ts` telt daarom alleen niet-null waarden mee én houdt bij over hoeveel van de gelogde items per stof daadwerkelijk data was, zodat de balkjes een "op basis van X/Y items"-transparantienotitie kunnen tonen.

**Barcode scannen gaat via [Open Food Facts](https://world.openfoodfacts.org)** (`lib/openFoodFacts.ts`) — een gratis, open (ODbL-licentie) product-database, geen API-key nodig. Twee kanttekeningen die bewust zo blijven:
- OFF's data is crowdsourced: macro's/calorieën zijn meestal betrouwbaar, maar micronutriënten ontbreken vaak op het etiket. Als de echte waarde ontbreekt valt de app terug op OFF's eigen ingrediënten-gebaseerde *schatting* (`nutriments_estimated`) — de app markeert dat dan expliciet als schatting in de UI, nooit stilzwiggend als harde data.
- Een gescand product wordt bij het opslaan als favoriet met zijn `barcode` in `food_items` gecached — een tweede scan van hetzelfde product zoekt eerst lokaal en raakt Open Food Facts niet opnieuw.

**Waarom géén apart NEVO-import (RIVM/Voedingscentrum) in v1.** NEVO heeft uitstekende Nederlandse micronutriëntdata, maar alleen als downloadbare dataset zonder barcode-koppeling — geschikt voor generieke/zelfgemaakte producten, niet voor scannen. Dat is een zinvolle vervolgstap, maar een apart stuk werk (dataset importeren, opschonen, een zoek-UI ervoor bouwen) dat losstaat van de barcode-flow.

## Indexen

Elke tabel met veel rijen per gebruiker heeft een index op `(user_id, log_date)`, omdat bijna elke query in de app filtert op "van deze gebruiker, op/rond deze datum" (dagtotalen, trends-periodes).
