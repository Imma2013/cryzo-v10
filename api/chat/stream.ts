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
import {
  ensureUser,
  getChat,
  createMessage,
  listMessages,
  touchChat,
} from "../_lib/convex";
import type { Id } from "../../convex/_generated/dataModel";

type StreamPayload = {
  chatId?: string;
  prompt?: string;
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
    const chatId = body.chatId as Id<"chats"> | undefined;
    const prompt = body.prompt?.trim();

    if (!chatId || !prompt) {
      sendJson(res, 400, { error: "chatId and prompt are required." });
      return;
    }

    const chat = await getChat(user, chatId);
    if (!chat) {
      sendJson(res, 404, { error: "Chat not found." });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    await createMessage(user, chatId, "user", prompt);

    const history = await listMessages(user, chatId);

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
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-20)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
      ])) {
        assistantContent += chunk;
        writeSse(res, { type: "chunk", content: chunk });
      }

      const inserted = await createMessage(
        user,
        chatId,
        "assistant",
        assistantContent,
        model,
      );

      await touchChat(user, chatId);

      writeSse(res, { type: "done", message: inserted });
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
