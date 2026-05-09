import { requireUser } from "../_lib/firebase";
import {
  handleApi,
  methodGuard,
  readJson,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import {
  ensureUser,
  listApps,
  createApp,
  getApp,
  listChats,
  createChat,
  getChat,
  listMessages,
  createMessage,
  getSettings,
  upsertSettings,
  touchChat,
} from "../_lib/convex";
import type { Id } from "../../convex/_generated/dataModel";

type IpcPayload = {
  channel: string;
  input: unknown;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await handleApi(res, async () => {
    methodGuard(req, ["POST"]);
    const user = await requireUser(req);
    await ensureUser(user);

    const { channel, input } = await readJson<IpcPayload>(req);
    const result = await dispatch(channel, input, user);
    sendJson(res, 200, { result });
  });
}

async function dispatch(
  channel: string,
  input: any,
  user: any,
): Promise<unknown> {
  switch (channel) {
    case "get-user-settings": {
      const settings = await getSettings(user);
      return settings ?? { defaultModel: "gpt-4o-mini" };
    }
    case "set-user-settings": {
      if (input?.defaultModel || input?.default_model) {
        await upsertSettings(user, input.defaultModel || input.default_model);
      }
      const settings = await getSettings(user);
      return settings ?? { defaultModel: "gpt-4o-mini" };
    }
    case "list-apps": {
      return await listApps(user);
    }
    case "create-app": {
      return await createApp(user, input.name, input.description);
    }
    case "get-app": {
      const appId = input?.appId ?? input;
      return await getApp(user, appId as Id<"apps">);
    }
    case "list-chats": {
      const appId = input?.appId as Id<"apps"> | undefined;
      return await listChats(user, appId);
    }
    case "create-chat": {
      return await createChat(
        user,
        input.appId as Id<"apps">,
        input.title,
      );
    }
    case "get-chat": {
      const chatId = input?.chatId ?? input;
      return await getChat(user, chatId as Id<"chats">);
    }
    case "list-messages": {
      const chatId = input?.chatId ?? input;
      return await listMessages(user, chatId as Id<"chats">);
    }
    case "get-system-platform": {
      return { platform: "web", arch: "web" };
    }
    case "get-user-budget": {
      return { remainingCredits: 999, totalCredits: 999, used: 0 };
    }
    default:
      console.warn(`[api/ipc] Unhandled channel: ${channel}`);
      return null;
  }
}
