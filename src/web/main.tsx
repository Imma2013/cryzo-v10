import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  clearAuthUser,
  readAuthUser,
  signIn,
  signUp,
} from "./auth";
import {
  createApp,
  createChat,
  getSettings,
  listApps,
  listChats,
  listMessages,
  streamChat,
} from "./api";
import type { AppSettings, AuthUser, Chat, ChatMessage, CryzoApp } from "./types";
import "./styles.css";

function AuthScreen({ onAuth }: { onAuth: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password);
      onAuth(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">Cryzo v10</p>
          <h1>Build web apps with an AI workspace backed by your cloud stack.</h1>
          <p className="muted">
            Firebase handles identity. Supabase stores projects, chats, and
            generated app state. Vercel runs the app and API layer.
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="segmented" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              className={mode === "signin" ? "active" : ""}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              Create account
            </button>
          </div>
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Sidebar({
  apps,
  activeAppId,
  onSelectApp,
  onCreateApp,
}: {
  apps: CryzoApp[];
  activeAppId: string | null;
  onSelectApp: (app: CryzoApp) => void;
  onCreateApp: (name: string) => void;
}) {
  const [name, setName] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    onCreateApp(nextName);
    setName("");
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark">C</span>
        <div>
          <strong>Cryzo v10</strong>
          <span>Web workspace</span>
        </div>
      </div>

      <form className="create-form" onSubmit={submit}>
        <input
          placeholder="New app name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="submit">Create</button>
      </form>

      <nav className="app-list" aria-label="Apps">
        {apps.map((app) => (
          <button
            key={app.id}
            className={activeAppId === app.id ? "selected" : ""}
            onClick={() => onSelectApp(app)}
          >
            <span>{app.name}</span>
            <small>{new Date(app.updated_at).toLocaleDateString()}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function ChatRail({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  disabled,
}: {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onCreateChat: () => void;
  disabled: boolean;
}) {
  return (
    <section className="chat-rail">
      <div className="rail-header">
        <h2>Chats</h2>
        <button disabled={disabled} onClick={onCreateChat}>
          New
        </button>
      </div>
      <div className="chat-list">
        {chats.map((chat) => (
          <button
            key={chat.id}
            className={activeChatId === chat.id ? "selected" : ""}
            onClick={() => onSelectChat(chat)}
          >
            {chat.title || "Untitled chat"}
          </button>
        ))}
      </div>
    </section>
  );
}

function MessageList({
  messages,
  draftAssistant,
}: {
  messages: ChatMessage[];
  draftAssistant: string;
}) {
  return (
    <div className="messages">
      {messages.length === 0 && !draftAssistant ? (
        <div className="empty-state">
          <h2>Start with a direct request.</h2>
          <p>
            Ask Cryzo to plan, generate, or revise an app. The server will use
            configured AI provider keys and save the conversation to Supabase.
          </p>
        </div>
      ) : null}
      {messages.map((message) => (
        <article key={message.id} className={`message ${message.role}`}>
          <header>{message.role}</header>
          <p>{message.content}</p>
        </article>
      ))}
      {draftAssistant ? (
        <article className="message assistant streaming">
          <header>assistant</header>
          <p>{draftAssistant}</p>
        </article>
      ) : null}
    </div>
  );
}

function Workspace({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [apps, setApps] = useState<CryzoApp[]>([]);
  const [activeApp, setActiveApp] = useState<CryzoApp | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [draftAssistant, setDraftAssistant] = useState("");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTitle = useMemo(() => {
    if (!activeApp) return "Select or create an app";
    if (!activeChat) return activeApp.name;
    return `${activeApp.name} / ${activeChat.title || "Untitled chat"}`;
  }, [activeApp, activeChat]);

  useEffect(() => {
    void refreshApps();
    void getSettings(user.idToken).then((result) => setSettings(result.settings));
  }, [user.idToken]);

  async function refreshApps() {
    setError(null);
    const result = await listApps(user.idToken);
    setApps(result.apps);
    if (!activeApp && result.apps[0]) {
      await selectApp(result.apps[0]);
    }
  }

  async function selectApp(app: CryzoApp) {
    setActiveApp(app);
    setActiveChat(null);
    setMessages([]);
    const result = await listChats(user.idToken, app.id);
    setChats(result.chats);
    if (result.chats[0]) {
      await selectChat(result.chats[0]);
    }
  }

  async function selectChat(chat: Chat) {
    setActiveChat(chat);
    const result = await listMessages(user.idToken, chat.id);
    setMessages(result.messages);
  }

  async function handleCreateApp(name: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await createApp(user.idToken, name);
      const nextApps = [result.app, ...apps];
      setApps(nextApps);
      await selectApp(result.app);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create app.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateChat() {
    if (!activeApp) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createChat(user.idToken, activeApp.id, "New chat");
      setChats([result.chat, ...chats]);
      await selectChat(result.chat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create chat.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePromptSubmit(event: FormEvent) {
    event.preventDefault();
    const nextPrompt = prompt.trim();
    if (!activeChat || !nextPrompt || busy) return;

    setBusy(true);
    setError(null);
    setPrompt("");
    setDraftAssistant("");

    const optimisticUserMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      chat_id: activeChat.id,
      firebase_uid: user.uid,
      role: "user",
      content: nextPrompt,
      model: null,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticUserMessage]);

    try {
      const assistantMessage = await streamChat({
        token: user.idToken,
        chatId: activeChat.id,
        prompt: nextPrompt,
        onChunk: (content) =>
          setDraftAssistant((current) => `${current}${content}`),
      });
      const refreshed = await listMessages(user.idToken, activeChat.id);
      setMessages(refreshed.messages.length ? refreshed.messages : [assistantMessage]);
      setDraftAssistant("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
      setDraftAssistant("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace">
      <Sidebar
        apps={apps}
        activeAppId={activeApp?.id ?? null}
        onCreateApp={handleCreateApp}
        onSelectApp={(app) => void selectApp(app)}
      />

      <ChatRail
        chats={chats}
        activeChatId={activeChat?.id ?? null}
        disabled={!activeApp || busy}
        onCreateChat={() => void handleCreateChat()}
        onSelectChat={(chat) => void selectChat(chat)}
      />

      <section className="conversation">
        <header className="topbar">
          <div>
            <p className="eyebrow">Firebase user {user.email}</p>
            <h1>{activeTitle}</h1>
          </div>
          <div className="topbar-actions">
            <span>{settings?.default_model || "server model"}</span>
            <button onClick={onSignOut}>Sign out</button>
          </div>
        </header>

        {error ? <div className="notice">{error}</div> : null}

        <MessageList messages={messages} draftAssistant={draftAssistant} />

        <form className="composer" onSubmit={handlePromptSubmit}>
          <textarea
            placeholder={
              activeChat
                ? "Ask Cryzo to build or revise something..."
                : "Create an app and chat first..."
            }
            value={prompt}
            disabled={!activeChat || busy}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <button className="primary" disabled={!activeChat || !prompt.trim() || busy}>
            {busy ? "Streaming..." : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Root() {
  const [user, setUser] = useState<AuthUser | null>(() => readAuthUser());

  function signOut() {
    clearAuthUser();
    setUser(null);
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} />;
  }

  return <Workspace user={user} onSignOut={signOut} />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
