import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    firebaseUid: v.string(),
    appId: v.optional(v.id("apps")),
  },
  handler: async (ctx, args) => {
    if (args.appId) {
      return await ctx.db
        .query("chats")
        .withIndex("by_firebase_uid_app", (q) =>
          q.eq("firebaseUid", args.firebaseUid).eq("appId", args.appId!),
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("chats")
      .withIndex("by_firebase_uid_updated", (q) =>
        q.eq("firebaseUid", args.firebaseUid),
      )
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    firebaseUid: v.string(),
    appId: v.id("apps"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("chats", {
      firebaseUid: args.firebaseUid,
      appId: args.appId,
      title: args.title ?? "New chat",
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const getById = query({
  args: { firebaseUid: v.string(), chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.firebaseUid !== args.firebaseUid) return null;
    return chat;
  },
});

export const touchUpdatedAt = mutation({
  args: { chatId: v.id("chats"), firebaseUid: v.string() },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.firebaseUid !== args.firebaseUid) return;
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() });
  },
});
