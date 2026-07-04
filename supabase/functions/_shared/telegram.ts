const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const GROUP_CHAT_ID = Deno.env.get("TELEGRAM_GROUP_CHAT_ID")!;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function call(method: string, params: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? res.status}`);
  }
  return data.result;
}

export async function createForumTopic(name: string): Promise<number> {
  const result = await call("createForumTopic", { chat_id: GROUP_CHAT_ID, name });
  return result.message_thread_id;
}

export async function sendTopicMessage(threadId: number, text: string) {
  await call("sendMessage", {
    chat_id: GROUP_CHAT_ID,
    message_thread_id: threadId,
    text,
  });
}

export async function deleteForumTopic(threadId: number) {
  try {
    await call("deleteForumTopic", { chat_id: GROUP_CHAT_ID, message_thread_id: threadId });
  } catch {
    // Topic may already be gone (manually deleted, etc.) - closing the chat should not fail on this.
  }
}
