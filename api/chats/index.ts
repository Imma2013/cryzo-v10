import { requireUser } from "../_lib/firebase";
import {
  firstQueryValue,
  handleApi,
  methodGuard,
  readJson,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import { ensureUser, listChats, createChat, getApp } from "../_lib/convex";
import type { Id } from "../../convex/_generated/dataModel";

type ChatPayload = {
  appId?: string;
  title?: string;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await handleApi(res, async () => {
    methodGuard(req, ["GET", "POST"]);
    const user = await requireUser(req);
    await ensureUser(user);

    if (req.method === "POST") {
      const body = await readJson<ChatPayload>(req);
      if (!body.appId) {
        sendJson(res, 400, { error: "appId is required." });
        return;
      }

      const app = await getApp(user, body.appId as Id<"apps">);
      if (!app) {
        sendJson(res, 404, { error: "App not found." });
        return;
      }

      const chat = await createChat(
        user,
        body.appId as Id<"apps">,
        body.title?.trim(),
      );
      sendJson(res, 201, { chat });
      return;
    }

    const appId = firstQueryValue(req.query?.appId) as Id<"apps"> | undefined;
    const chats = await listChats(user, appId);
    sendJson(res, 200, { chats });
  });
}
