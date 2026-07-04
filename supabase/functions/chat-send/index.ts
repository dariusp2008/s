import { errorMessage, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/db.ts";
import { sendTopicMessage } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { session_id, browser_token, body } = await req.json();
    if (!session_id || !browser_token || typeof body !== "string" || !body.trim()) {
      return jsonResponse({ error: "session_id, browser_token and body are required" }, 400);
    }

    const db = serviceClient();
    const { data: session, error } = await db
      .from("chat_sessions")
      .select("id, browser_token, status, telegram_thread_id")
      .eq("id", session_id)
      .maybeSingle();

    if (error) throw error;
    if (!session || session.browser_token !== browser_token || session.status !== "open") {
      return jsonResponse({ error: "chat not found or closed" }, 404);
    }

    const text = body.trim().slice(0, 4000);
    const { error: insertError } = await db
      .from("chat_messages")
      .insert({ session_id: session.id, sender: "customer", body: text });
    if (insertError) throw insertError;

    await sendTopicMessage(session.telegram_thread_id, text);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: errorMessage(err) }, 500);
  }
});
