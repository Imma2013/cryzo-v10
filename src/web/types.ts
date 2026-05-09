export type AuthUser = {
  uid: string;
  email: string;
  idToken: string;
};

export type CryzoApp = {
  id: string;
  firebase_uid: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Chat = {
  id: string;
  app_id: string;
  firebase_uid: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  firebase_uid: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  created_at: string;
};

export type AppSettings = {
  default_model: string;
};
