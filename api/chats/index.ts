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
import { ensureUser, supabaseRequest, userFilter } from "../_lib/supabase";

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

      const appRows = await supabaseRequest<unknown[]>(
        `apps?${userFilter(user)}&id=eq.${body.appId}&select=id&limit=1`,
      );
      if (!appRows.length) {
        sendJson(res, 404, { error: "App not found." });
        return;
      }

      const rows = await supabaseRequest("chats", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          firebase_uid: user.uid,
          app_id: body.appId,
          title: body.title?.trim() || "New chat",
        }),
      });
      sendJson(res, 201, { chat: Array.isArray(rows) ? rows[0] : rows });
      return;
    }

    const appId = firstQueryValue(req.query?.appId);
    const appFilter = appId ? `&app_id=eq.${appId}` : "";
    const chats = await supabaseRequest(
      `chats?${userFilter(user)}${appFilter}&select=*&order=updated_at.desc`,
    );
    sendJson(res, 200, { chats });
  });
}
