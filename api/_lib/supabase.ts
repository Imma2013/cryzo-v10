import { HttpError } from "./http";
import type { VerifiedUser } from "./firebase";

type QueryValue = string | number | boolean | null;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new HttpError(
      500,
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return {
    url: url.replace(/\/$/, ""),
    serviceKey,
  };
}

function encodeFilter(value: QueryValue) {
  return encodeURIComponent(String(value));
}

export async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new HttpError(response.status, text || "Supabase request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function ensureUser(user: VerifiedUser) {
  const payload = {
    firebase_uid: user.uid,
    email: user.email,
    display_name: user.name,
    photo_url: user.picture,
    updated_at: new Date().toISOString(),
  };
  const rows = await supabaseRequest<Array<typeof payload>>(
    "users?on_conflict=firebase_uid",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    },
  );
  return rows[0];
}

export function userFilter(user: VerifiedUser) {
  return `firebase_uid=eq.${encodeFilter(user.uid)}`;
}
