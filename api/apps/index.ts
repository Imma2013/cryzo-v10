import { requireUser } from "../_lib/firebase";
import {
  handleApi,
  methodGuard,
  readJson,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import { ensureUser, supabaseRequest, userFilter } from "../_lib/supabase";

type AppPayload = {
  name?: string;
  description?: string;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await handleApi(res, async () => {
    methodGuard(req, ["GET", "POST"]);
    const user = await requireUser(req);
    await ensureUser(user);

    if (req.method === "POST") {
      const body = await readJson<AppPayload>(req);
      const name = body.name?.trim();
      if (!name) {
        sendJson(res, 400, { error: "App name is required." });
        return;
      }
      const rows = await supabaseRequest(
        "apps",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            firebase_uid: user.uid,
            name,
            description: body.description?.trim() || null,
          }),
        },
      );
      sendJson(res, 201, { app: Array.isArray(rows) ? rows[0] : rows });
      return;
    }

    const apps = await supabaseRequest(
      `apps?${userFilter(user)}&select=*&order=updated_at.desc`,
    );
    sendJson(res, 200, { apps });
  });
}
