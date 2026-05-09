import { requireUser } from "../_lib/firebase";
import {
  firstQueryValue,
  handleApi,
  methodGuard,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import { ensureUser, listMessages } from "../_lib/convex";
import type { Id } from "../../convex/_generated/dataModel";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await handleApi(res, async () => {
    methodGuard(req, ["GET"]);
    const user = await requireUser(req);
    await ensureUser(user);

    const chatId = firstQueryValue(req.query?.chatId);
    if (!chatId) {
      sendJson(res, 400, { error: "chatId is required." });
      return;
    }

    const messages = await listMessages(user, chatId as Id<"chats">);
    sendJson(res, 200, { messages });
  });
}
