import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { firebaseUid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", args.firebaseUid))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    firebaseUid: v.string(),
    defaultModel: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_firebase_uid", (q) => q.eq("firebaseUid", args.firebaseUid))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        defaultModel: args.defaultModel,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userSettings", {
      firebaseUid: args.firebaseUid,
      defaultModel: args.defaultModel,
      createdAt: now,
      updatedAt: now,
    });
  },
});
