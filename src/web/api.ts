import type { AppSettings, Chat, ChatMessage, CryzoApp } from "./types";

type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "done"; message: ChatMessage }
  | { type: "error"; error: string };

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "Request failed.",
    );
  }
  return payload as T;
}

export async function apiRequest<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return parseJsonResponse<T>(response);
}

export function listApps(token: string) {
  return apiRequest<{ apps: CryzoApp[] }>(token, "/api/apps");
}

export function createApp(token: string, name: string) {
  return apiRequest<{ app: CryzoApp }>(token, "/api/apps", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function listChats(token: string, appId: string) {
  return apiRequest<{ chats: Chat[] }>(token, `/api/chats?appId=${appId}`);
}

export function createChat(token: string, appId: string, title: string) {
  return apiRequest<{ chat: Chat }>(token, "/api/chats", {
    method: "POST",
    body: JSON.stringify({ appId, title }),
  });
}

export function listMessages(token: string, chatId: string) {
  return apiRequest<{ messages: ChatMessage[] }>(
    token,
    `/api/messages?chatId=${chatId}`,
  );
}

export function getSettings(token: string) {
  return apiRequest<{ settings: AppSettings }>(token, "/api/settings");
}

export async function streamChat(input: {
  token: string;
  chatId: string;
  prompt: string;
  onChunk: (content: string) => void;
}): Promise<ChatMessage> {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({ chatId: input.chatId, prompt: input.prompt }),
  });

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Chat stream failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6)) as StreamEvent;
      if (event.type === "chunk") {
        input.onChunk(event.content);
      }
      if (event.type === "error") {
        throw new Error(event.error);
      }
      if (event.type === "done") {
        return event.message;
      }
    }
  }

  throw new Error("The chat stream ended before returning a final message.");
}
