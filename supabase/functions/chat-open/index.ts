import { errorMessage, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/db.ts";
import { createForumTopic, sendTopicMessage } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { name, email, message } = await req.json();
    const db = serviceClient();

    const { data: session, error: insertError } = await db
      .from("chat_sessions")
      .insert({
        customer_name: typeof name === "string" ? name.slice(0, 200) : null,
        customer_email: typeof email === "string" ? email.slice(0, 320) : null,
      })
      .select("id, browser_token")
      .single();

    if (insertError) throw insertError;

    const topicName = name ? `${name}` : `Chat ${session.id.slice(0, 8)}`;
    const threadId = await createForumTopic(topicName);

    const { error: updateError } = await db
      .from("chat_sessions")
      .update({ telegram_thread_id: threadId, status: "open" })
      .eq("id", session.id);
    if (updateError) throw updateError;

    const introLines = ["New live chat opened."];
    if (name) introLines.push(`Name: ${name}`);
    if (email) introLines.push(`Email: ${email}`);
    await sendTopicMessage(threadId, introLines.join("\n"));

    if (typeof message === "string" && message.trim()) {
      const body = message.trim().slice(0, 4000);
      const { error: msgError } = await db
        .from("chat_messages")
        .insert({ session_id: session.id, sender: "customer", body });
      if (msgError) throw msgError;
      await sendTopicMessage(threadId, body);
    }

    return jsonResponse({ session_id: session.id, browser_token: session.browser_token });
  } catch (err) {
    return jsonResponse({ error: errorMessage(err) }, 500);
  }
});
