import { requireUser } from "../_lib/firebase";
import {
  handleApi,
  methodGuard,
  readJson,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import { streamOpenAiResponse } from "../_lib/openai";
import { ensureUser, supabaseRequest, userFilter } from "../_lib/supabase";

type StreamPayload = {
  chatId?: string;
  prompt?: string;
};

type DbMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
};

function writeSse(res: ApiResponse, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: `Method ${req.method} is not allowed.` });
    return;
  }

  await handleApi(res, async () => {
    methodGuard(req, ["POST"]);
    const user = await requireUser(req);
    await ensureUser(user);
    const body = await readJson<StreamPayload>(req);
    const chatId = body.chatId;
    const prompt = body.prompt?.trim();

    if (!chatId || !prompt) {
      sendJson(res, 400, { error: "chatId and prompt are required." });
      return;
    }

    const chatRows = await supabaseRequest<unknown[]>(
      `chats?${userFilter(user)}&id=eq.${chatId}&select=id,app_id&limit=1`,
    );
    if (!chatRows.length) {
      sendJson(res, 404, { error: "Chat not found." });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    await supabaseRequest("messages", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        firebase_uid: user.uid,
        chat_id: chatId,
        role: "user",
        content: prompt,
      }),
    });

    const history = await supabaseRequest<DbMessage[]>(
      `messages?${userFilter(user)}&chat_id=eq.${chatId}&select=role,content,model&order=created_at.asc&limit=20`,
    );

    let assistantContent = "";
    try {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      for await (const chunk of streamOpenAiResponse([
        {
          role: "system",
          content:
            "You are Cryzo, an AI app-building assistant. Be concise, practical, and focus on implementable web app steps.",
        },
        ...history
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            role: message.role as "user" | "assistant",
            content: message.content,
          })),
      ])) {
        assistantContent += chunk;
        writeSse(res, { type: "chunk", content: chunk });
      }

      const inserted = await supabaseRequest<DbMessage[]>("messages", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          firebase_uid: user.uid,
          chat_id: chatId,
          role: "assistant",
          content: assistantContent,
          model,
        }),
      });

      await supabaseRequest(`chats?id=eq.${chatId}&${userFilter(user)}`, {
        method: "PATCH",
        body: JSON.stringify({ updated_at: new Date().toISOString() }),
      });

      writeSse(res, { type: "done", message: inserted[0] });
      res.end();
    } catch (error) {
      writeSse(res, {
        type: "error",
        error: error instanceof Error ? error.message : "Chat failed.",
      });
      res.end();
    }
  });
}
