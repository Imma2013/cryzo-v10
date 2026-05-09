import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    firebaseUid: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_firebase_uid", ["firebaseUid"]),

  userSettings: defineTable({
    firebaseUid: v.string(),
    defaultModel: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_firebase_uid", ["firebaseUid"]),

  apps: defineTable({
    firebaseUid: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_firebase_uid_updated", ["firebaseUid", "updatedAt"]),

  chats: defineTable({
    appId: v.id("apps"),
    firebaseUid: v.string(),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_firebase_uid_updated", ["firebaseUid", "updatedAt"])
    .index("by_firebase_uid_app", ["firebaseUid", "appId", "updatedAt"]),

  messages: defineTable({
    chatId: v.id("chats"),
    firebaseUid: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    content: v.string(),
    model: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_firebase_uid_chat", ["firebaseUid", "chatId", "createdAt"]),
});
