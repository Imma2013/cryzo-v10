import { requireUser } from "./_lib/firebase";
import {
  handleApi,
  methodGuard,
  readJson,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "./_lib/http";
import { ensureUser, getSettings, upsertSettings } from "./_lib/convex";

type SettingsPayload = {
  default_model?: string;
};

const defaultSettings = {
  default_model: process.env.OPENAI_MODEL || "gpt-4o-mini",
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  await handleApi(res, async () => {
    methodGuard(req, ["GET", "PUT"]);
    const user = await requireUser(req);
    await ensureUser(user);

    if (req.method === "PUT") {
      const body = await readJson<SettingsPayload>(req);
      const model = body.default_model || defaultSettings.default_model;
      await upsertSettings(user, model);
      sendJson(res, 200, { settings: { default_model: model } });
      return;
    }

    const settings = await getSettings(user);
    sendJson(res, 200, {
      settings: settings
        ? { default_model: settings.defaultModel }
        : defaultSettings,
    });
  });
}
