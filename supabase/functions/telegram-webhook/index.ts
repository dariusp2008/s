import { serviceClient } from "../_shared/db.ts";

const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();
    const message = update.message;

    // Ignore anything that isn't a reply inside a forum topic, and ignore our own bot's messages to avoid echo loops.
    if (!message?.message_thread_id || message.from?.is_bot) {
      return new Response("ok", { status: 200 });
    }

    const text: string | undefined = message.text ?? message.caption;
    if (!text) {
      return new Response("ok", { status: 200 });
    }

    const db = serviceClient();
    const { data: session } = await db
      .from("chat_sessions")
      .select("id")
      .eq("telegram_thread_id", message.message_thread_id)
      .eq("status", "open")
      .maybeSingle();

    if (session) {
      await db.from("chat_messages").insert({
        session_id: session.id,
        sender: "agent",
        body: text.slice(0, 4000),
      });
    }

    return new Response("ok", { status: 200 });
  } catch {
    // Telegram retries on non-2xx, but a malformed update isn't worth retrying.
    return new Response("ok", { status: 200 });
  }
});
