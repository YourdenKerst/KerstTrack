import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => null);
  const subscription = body?.subscription;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const authKey = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    return new Response("Invalid subscription", { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint, p256dh, auth_key: authKey }, { onConflict: "endpoint" });
  if (error) return new Response(error.message, { status: 500 });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;

  const query = supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  const { error } = await (endpoint ? query.eq("endpoint", endpoint) : query);
  if (error) return new Response(error.message, { status: 500 });

  return Response.json({ ok: true });
}
