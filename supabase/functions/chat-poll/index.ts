import { errorMessage, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/db.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { session_id, browser_token, after } = await req.json();
    if (!session_id || !browser_token) {
      return jsonResponse({ error: "session_id and browser_token are required" }, 400);
    }

    const db = serviceClient();
    const { data: session, error } = await db
      .from("chat_sessions")
      .select("id, browser_token, status")
      .eq("id", session_id)
      .maybeSingle();

    if (error) throw error;
    if (!session || session.browser_token !== browser_token) {
      return jsonResponse({ error: "chat not found" }, 404);
    }

    let query = db
      .from("chat_messages")
      .select("id, sender, body, created_at")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });
    if (typeof after === "string" && after) {
      query = query.gt("created_at", after);
    }

    const { data: messages, error: messagesError } = await query;
    if (messagesError) throw messagesError;

    return jsonResponse({ status: session.status, messages });
  } catch (err) {
    return jsonResponse({ error: errorMessage(err) }, 500);
  }
});
