import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { firebaseUid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apps")
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
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("apps", {
      firebaseUid: args.firebaseUid,
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const getById = query({
  args: { firebaseUid: v.string(), appId: v.id("apps") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app || app.firebaseUid !== args.firebaseUid) return null;
    return app;
  },
});
