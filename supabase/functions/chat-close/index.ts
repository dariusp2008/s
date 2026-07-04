import { errorMessage, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/db.ts";
import { deleteForumTopic } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { session_id, browser_token } = await req.json();
    if (!session_id || !browser_token) {
      return jsonResponse({ error: "session_id and browser_token are required" }, 400);
    }

    const db = serviceClient();
    const { data: session, error } = await db
      .from("chat_sessions")
      .select("id, browser_token, telegram_thread_id")
      .eq("id", session_id)
      .maybeSingle();

    if (error) throw error;
    if (!session || session.browser_token !== browser_token) {
      // Already closed or never existed - closing is idempotent.
      return jsonResponse({ ok: true });
    }

    if (session.telegram_thread_id) {
      await deleteForumTopic(session.telegram_thread_id);
    }

    const { error: deleteError } = await db.from("chat_sessions").delete().eq("id", session.id);
    if (deleteError) throw deleteError;

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: errorMessage(err) }, 500);
  }
});
