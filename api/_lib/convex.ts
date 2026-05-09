import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { HttpError } from "./http";
import type { VerifiedUser } from "./firebase";
import type { Id } from "../../convex/_generated/dataModel";

let client: ConvexHttpClient | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.CONVEX_URL;
  if (!url) {
    throw new HttpError(500, "Convex is not configured. Set CONVEX_URL.");
  }
  client = new ConvexHttpClient(url);
  return client;
}

export async function ensureUser(user: VerifiedUser) {
  const c = getClient();
  await c.mutation(api.users.ensureUser, {
    firebaseUid: user.uid,
    email: user.email ?? undefined,
    displayName: user.name ?? undefined,
    photoUrl: user.picture ?? undefined,
  });
}

export async function getSettings(user: VerifiedUser) {
  const c = getClient();
  return await c.query(api.userSettings.get, { firebaseUid: user.uid });
}

export async function upsertSettings(user: VerifiedUser, defaultModel: string) {
  const c = getClient();
  await c.mutation(api.userSettings.upsert, {
    firebaseUid: user.uid,
    defaultModel,
  });
}

export async function listApps(user: VerifiedUser) {
  const c = getClient();
  return await c.query(api.apps.list, { firebaseUid: user.uid });
}

export async function createApp(
  user: VerifiedUser,
  name: string,
  description?: string,
) {
  const c = getClient();
  return await c.mutation(api.apps.create, {
    firebaseUid: user.uid,
    name,
    description,
  });
}

export async function getApp(user: VerifiedUser, appId: Id<"apps">) {
  const c = getClient();
  return await c.query(api.apps.getById, { firebaseUid: user.uid, appId });
}

export async function listChats(user: VerifiedUser, appId?: Id<"apps">) {
  const c = getClient();
  return await c.query(api.chats.list, { firebaseUid: user.uid, appId });
}

export async function createChat(
  user: VerifiedUser,
  appId: Id<"apps">,
  title?: string,
) {
  const c = getClient();
  return await c.mutation(api.chats.create, {
    firebaseUid: user.uid,
    appId,
    title,
  });
}

export async function getChat(user: VerifiedUser, chatId: Id<"chats">) {
  const c = getClient();
  return await c.query(api.chats.getById, { firebaseUid: user.uid, chatId });
}

export async function touchChat(user: VerifiedUser, chatId: Id<"chats">) {
  const c = getClient();
  await c.mutation(api.chats.touchUpdatedAt, {
    firebaseUid: user.uid,
    chatId,
  });
}

export async function listMessages(user: VerifiedUser, chatId: Id<"chats">) {
  const c = getClient();
  return await c.query(api.messages.list, { firebaseUid: user.uid, chatId });
}

export async function createMessage(
  user: VerifiedUser,
  chatId: Id<"chats">,
  role: "user" | "assistant" | "system",
  content: string,
  model?: string,
) {
  const c = getClient();
  return await c.mutation(api.messages.create, {
    firebaseUid: user.uid,
    chatId,
    role,
    content,
    model,
  });
}
