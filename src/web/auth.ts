import type { AuthUser } from "./types";

const AUTH_STORAGE_KEY = "cryzo.auth";
const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY as
  | string
  | undefined;

type FirebaseAuthResponse = {
  localId: string;
  email: string;
  idToken: string;
  error?: {
    message?: string;
  };
};

function assertFirebaseConfigured() {
  if (!firebaseApiKey) {
    throw new Error("Firebase is not configured. Set VITE_FIREBASE_API_KEY.");
  }
}

function mapFirebaseError(message?: string) {
  switch (message) {
    case "EMAIL_EXISTS":
      return "An account already exists for that email.";
    case "EMAIL_NOT_FOUND":
    case "INVALID_PASSWORD":
    case "INVALID_LOGIN_CREDENTIALS":
      return "Invalid email or password.";
    case "WEAK_PASSWORD : Password should be at least 6 characters":
      return "Password should be at least 6 characters.";
    default:
      return message?.replaceAll("_", " ").toLowerCase() || "Authentication failed.";
  }
}

async function firebasePasswordRequest(
  path: "accounts:signInWithPassword" | "accounts:signUp",
  email: string,
  password: string,
): Promise<AuthUser> {
  assertFirebaseConfigured();

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${path}?key=${firebaseApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const payload = (await response.json()) as FirebaseAuthResponse;

  if (!response.ok || payload.error) {
    throw new Error(mapFirebaseError(payload.error?.message));
  }

  const user = {
    uid: payload.localId,
    email: payload.email,
    idToken: payload.idToken,
  };
  saveAuthUser(user);
  return user;
}

export function readAuthUser(): AuthUser | null {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed.uid || !parsed.email || !parsed.idToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthUser(user: AuthUser) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthUser() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function signIn(email: string, password: string) {
  return firebasePasswordRequest("accounts:signInWithPassword", email, password);
}

export function signUp(email: string, password: string) {
  return firebasePasswordRequest("accounts:signUp", email, password);
}
