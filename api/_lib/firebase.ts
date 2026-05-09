import { createVerify } from "node:crypto";
import { HttpError, type ApiRequest } from "./http";

type FirebaseCerts = Record<string, string>;
type FirebaseClaims = {
  aud: string;
  email?: string;
  exp: number;
  iat: number;
  iss: string;
  name?: string;
  picture?: string;
  sub: string;
  user_id?: string;
};

export type VerifiedUser = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

let cachedCerts: { expiresAt: number; certs: FirebaseCerts } | null = null;

function base64UrlDecode(input: string) {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded.replaceAll("-", "+").replaceAll("_", "/"), "base64");
}

function getProjectId() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new HttpError(500, "Firebase server project id is not configured.");
  }
  return projectId;
}

async function getFirebaseCerts(): Promise<FirebaseCerts> {
  const now = Date.now();
  if (cachedCerts && cachedCerts.expiresAt > now + 60_000) {
    return cachedCerts.certs;
  }

  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
  );
  if (!response.ok) {
    throw new HttpError(503, "Could not fetch Firebase public certificates.");
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const certs = (await response.json()) as FirebaseCerts;
  cachedCerts = {
    certs,
    expiresAt: now + maxAgeSeconds * 1000,
  };
  return certs;
}

export async function verifyFirebaseToken(idToken: string): Promise<VerifiedUser> {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new HttpError(401, "Invalid Firebase token.");
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader).toString("utf8")) as {
    alg?: string;
    kid?: string;
  };
  if (header.alg !== "RS256" || !header.kid) {
    throw new HttpError(401, "Unsupported Firebase token.");
  }

  const certs = await getFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new HttpError(401, "Unknown Firebase token key.");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const valid = verifier.verify(cert, base64UrlDecode(encodedSignature));
  if (!valid) {
    throw new HttpError(401, "Invalid Firebase token signature.");
  }

  const claims = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as FirebaseClaims;
  const projectId = getProjectId();
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    claims.aud !== projectId ||
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    !claims.sub ||
    claims.exp <= nowSeconds ||
    claims.iat > nowSeconds + 300
  ) {
    throw new HttpError(401, "Firebase token claims are invalid.");
  }

  return {
    uid: claims.user_id || claims.sub,
    email: claims.email ?? null,
    name: claims.name ?? null,
    picture: claims.picture ?? null,
  };
}

export async function requireUser(req: ApiRequest) {
  const header = req.headers.authorization ?? req.headers.Authorization;
  const authorization = Array.isArray(header) ? header[0] : header;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  if (!token) {
    throw new HttpError(401, "Missing Firebase bearer token.");
  }
  return verifyFirebaseToken(token);
}
