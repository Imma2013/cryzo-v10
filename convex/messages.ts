import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { firebaseUid: v.string(), chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_firebase_uid_chat", (q) =>
        q.eq("firebaseUid", args.firebaseUid).eq("chatId", args.chatId),
      )
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    firebaseUid: v.string(),
    chatId: v.id("chats"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("messages", {
      firebaseUid: args.firebaseUid,
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      model: args.model,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});
