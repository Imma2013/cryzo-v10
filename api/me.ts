import { requireUser } from "./_lib/firebase";
import { handleApi, methodGuard, sendJson, type ApiRequest, type ApiResponse } from "./_lib/http";
import { ensureUser } from "./_lib/convex";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await handleApi(res, async () => {
    methodGuard(req, ["GET"]);
    const user = await requireUser(req);
    await ensureUser(user);
    sendJson(res, 200, { user });
  });
}
