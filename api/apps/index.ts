import { requireUser } from "../_lib/firebase";
import {
  handleApi,
  methodGuard,
  readJson,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http";
import { ensureUser, listApps, createApp } from "../_lib/convex";

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
      const app = await createApp(user, name, body.description?.trim());
      sendJson(res, 201, { app });
      return;
    }

    const apps = await listApps(user);
    sendJson(res, 200, { apps });
  });
}
