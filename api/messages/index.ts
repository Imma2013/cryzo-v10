import { requireUser } from "../_lib/firebase";
import {
  firstQueryValue,
  handleApi,
  methodGuard,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import { ensureUser, supabaseRequest, userFilter } from "../_lib/supabase";

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

    const messages = await supabaseRequest(
      `messages?${userFilter(user)}&chat_id=eq.${chatId}&select=*&order=created_at.asc`,
    );
    sendJson(res, 200, { messages });
  });
}
