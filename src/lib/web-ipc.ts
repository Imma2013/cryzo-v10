import type { z } from "zod";
import type { IpcContract } from "../ipc/contracts/core";

const API_BASE = "";

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("cryzo.auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.idToken ?? null;
    }
  } catch {}
  return null;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

type ChannelHandler = (input: unknown) => Promise<unknown>;

const channelHandlers: Record<string, ChannelHandler> = {
  "get-user-settings": async () => {
    const result = await apiRequest<{ settings: unknown }>("/api/settings");
    return result.settings;
  },
  "set-user-settings": async (input) => {
    const result = await apiRequest<{ settings: unknown }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return result.settings;
  },
  "list-apps": async () => {
    const result = await apiRequest<{ apps: unknown[] }>("/api/apps");
    return result.apps;
  },
  "create-app": async (input) => {
    return await apiRequest<unknown>("/api/apps", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  "get-app": async (input: any) => {
    const result = await apiRequest<{ apps: unknown[] }>(
      `/api/apps?id=${input.appId || input}`,
    );
    return result.apps?.[0] ?? null;
  },
  "list-chats": async (input: any) => {
    const appId = input?.appId || "";
    const result = await apiRequest<{ chats: unknown[] }>(
      `/api/chats${appId ? `?appId=${appId}` : ""}`,
    );
    return result.chats;
  },
  "create-chat": async (input) => {
    const result = await apiRequest<{ chat: unknown }>("/api/chats", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return result.chat;
  },
  "list-messages": async (input: any) => {
    const chatId = input?.chatId || input;
    const result = await apiRequest<{ messages: unknown[] }>(
      `/api/messages?chatId=${chatId}`,
    );
    return result.messages;
  },
  "get-me": async () => {
    const result = await apiRequest<{ user: unknown }>("/api/me");
    return result.user;
  },
};

function createStubHandler(channel: string): ChannelHandler {
  return async (_input) => {
    console.warn(`[web-ipc] Unimplemented channel: ${channel}`);
    return undefined;
  };
}

export function createWebClient<
  T extends Record<string, IpcContract<string, z.ZodType, z.ZodType>>,
>(contracts: T) {
  const client = {} as any;
  for (const [methodName, contract] of Object.entries(contracts)) {
    const handler =
      channelHandlers[contract.channel] ??
      createStubHandler(contract.channel);
    client[methodName] = async (input: unknown) => handler(input);
  }
  return client;
}

type EventCallback = (...args: any[]) => void;

export function createWebEventClient<T extends Record<string, any>>(
  _contracts: T,
) {
  const client = {} as any;
  for (const key of Object.keys(_contracts)) {
    const methodName = `on${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    client[methodName] = (_callback: EventCallback) => {
      return () => {};
    };
  }
  return client;
}

export function createWebStreamClient(_contract: any) {
  return {
    start: (
      _params: any,
      callbacks: { onChunk?: Function; onEnd?: Function; onError?: Function },
    ) => {
      console.warn("[web-ipc] Stream not yet implemented for web");
      callbacks.onEnd?.({});
      return () => {};
    },
  };
}
