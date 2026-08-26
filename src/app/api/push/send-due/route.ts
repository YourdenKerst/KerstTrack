import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { computeReminderClockTime, isSupplementDueOnDate } from "@/lib/calculations/supplementReminders";
import type { Database } from "@/lib/types";

// Enkele tijdzone hardcoded — dit is een persoonlijke, single-user app (zie
// SCHEMA.md/AGENTS.md), dus geen per-gebruiker tijdzone-instelling nodig.
const TIMEZONE = "Europe/Amsterdam";

function nowInTimezone() {
  const now = new Date();
  const dateISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const clockTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return { dateISO, clockTime };
}

/**
 * Wordt elke paar minuten aangeroepen door een cron (zie
 * .github/workflows/send-reminders.yml) — Vercel Hobby staat geen cron
 * frequenter dan 1x/dag toe, GitHub Actions wel. Verstuurt een echte Web
 * Push-melding (werkt ook als de app dicht is) voor elke herinnering die nu
 * verstreken is en nog niet is afgevinkt. `sent_reminder_notifications`
 * voorkomt dubbel versturen — of de cron nu elke minuut of elke 10 minuten
 * draait, elke herinnering gaat maar één keer per dag daadwerkelijk uit.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!vapidPublic || !vapidPrivate || !serviceRoleKey) {
    return new Response("Push niet geconfigureerd", { status: 500 });
  }
  webpush.setVapidDetails("mailto:yourden@ewolve.nl", vapidPublic, vapidPrivate);

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
  const { dateISO, clockTime } = nowInTimezone();

  const [supplementsRes, remindersRes, logsRes, subscriptionsRes] = await Promise.all([
    supabase.from("supplements").select("*").eq("is_active", true),
    supabase.from("supplement_reminders").select("*"),
    supabase.from("supplement_logs").select("supplement_id").eq("log_date", dateISO),
    supabase.from("push_subscriptions").select("*"),
  ]);
  if (supplementsRes.error) return new Response(supplementsRes.error.message, { status: 500 });
  if (remindersRes.error) return new Response(remindersRes.error.message, { status: 500 });
  if (logsRes.error) return new Response(logsRes.error.message, { status: 500 });
  if (subscriptionsRes.error) return new Response(subscriptionsRes.error.message, { status: 500 });

  const checkedIds = new Set(logsRes.data.map((l) => l.supplement_id));
  const subscriptionsByUser = new Map<string, typeof subscriptionsRes.data>();
  for (const sub of subscriptionsRes.data) {
    subscriptionsByUser.set(sub.user_id, [...(subscriptionsByUser.get(sub.user_id) ?? []), sub]);
  }

  let sent = 0;
  let skipped = 0;

  for (const supplement of supplementsRes.data) {
    if (checkedIds.has(supplement.id)) continue;
    if (!isSupplementDueOnDate(supplement, dateISO)) continue;

    const userSubs = subscriptionsByUser.get(supplement.user_id) ?? [];
    if (userSubs.length === 0) continue;

    for (const reminder of remindersRes.data.filter((r) => r.supplement_id === supplement.id)) {
      const reminderClockTime = computeReminderClockTime(supplement.intake_time.slice(0, 5), reminder.minutes_before);
      if (reminderClockTime > clockTime) continue; // nog niet zo ver vandaag

      // Atomair: alleen versturen als dit de eerste keer is dat dit lukt vandaag.
      const { error: insertError } = await supabase.from("sent_reminder_notifications").insert({
        user_id: supplement.user_id,
        supplement_id: supplement.id,
        slot: reminder.slot,
        log_date: dateISO,
      });
      if (insertError) {
        skipped += 1;
        continue; // conflict = al verstuurd (unique constraint), of een echte fout — beide: niet opnieuw versturen
      }

      const payload = JSON.stringify({
        title: "Supplement-herinnering",
        body: `Nog niet afgevinkt: ${supplement.name}.`,
        tag: `supplement-${supplement.id}`,
      });

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            payload,
          );
          sent += 1;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }
    }
  }

  return Response.json({ sent, skipped });
}
