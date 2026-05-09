import { requireUser } from "./_lib/firebase";
import {
  handleApi,
  methodGuard,
  readJson,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "./_lib/http";
import { ensureUser, supabaseRequest, userFilter } from "./_lib/supabase";

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
      const payload = {
        firebase_uid: user.uid,
        default_model: body.default_model || defaultSettings.default_model,
        updated_at: new Date().toISOString(),
      };
      const rows = await supabaseRequest<Array<typeof payload>>(
        "user_settings?on_conflict=firebase_uid",
        {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify(payload),
        },
      );
      sendJson(res, 200, { settings: rows[0] });
      return;
    }

    const rows = await supabaseRequest<Array<typeof defaultSettings>>(
      `user_settings?${userFilter(user)}&select=default_model&limit=1`,
    );
    sendJson(res, 200, { settings: rows[0] || defaultSettings });
  });
}
