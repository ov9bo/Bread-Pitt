import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { googleAccounts } from "@/lib/db/schema";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "openid",
  "email",
  "profile",
].join(" ");

function env(name: string, required = true): string {
  const v = process.env[name];
  if (!v && required) throw new Error(`Missing env ${name}`);
  return v ?? "";
}

export function googleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REDIRECT_URL
  );
}

function stateSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is required to sign OAuth state");
  return s;
}

export function signState(userId: string): string {
  const nonce = randomBytes(8).toString("hex");
  const ts = Date.now().toString(36);
  const payload = `${userId}.${nonce}.${ts}`;
  const mac = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function verifyState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [userId, nonce, ts, mac] = parts;
  const payload = `${userId}.${nonce}.${ts}`;
  const expected = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  if (expected !== mac) return null;
  // 15-minute window
  const tsMs = parseInt(ts, 36);
  if (!Number.isFinite(tsMs) || Date.now() - tsMs > 15 * 60_000) return null;
  return userId;
}

export function buildAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: env("GOOGLE_OAUTH_REDIRECT_URL"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_SCOPES,
    state: signState(userId),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
};

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: env("GOOGLE_CLIENT_ID"),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    redirect_uri: env("GOOGLE_OAUTH_REDIRECT_URL"),
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

export async function fetchUserInfo(accessToken: string): Promise<{ email: string }> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Userinfo failed: ${res.status}`);
  return (await res.json()) as { email: string };
}

export async function persistTokens(
  userId: string,
  tokens: TokenResponse,
  email: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + (tokens.expires_in - 60) * 1000);
  const [existing] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId));
  if (existing) {
    await db
      .update(googleAccounts)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? existing.refreshToken,
        expiresAt,
        scope: tokens.scope ?? existing.scope,
        email,
      })
      .where(eq(googleAccounts.id, existing.id));
  } else {
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token. Revoke previous access and retry.");
    }
    await db.insert(googleAccounts).values({
      userId,
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope: tokens.scope ?? "",
    });
  }
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env("GOOGLE_CLIENT_ID"),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

/**
 * Returns a fresh access token for the user, refreshing+persisting if needed.
 * Returns null if the user hasn't connected Google.
 */
export async function getAuthorizedAccessToken(userId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId));
  if (!account) return null;

  if (account.expiresAt.getTime() > Date.now() + 30_000) {
    return account.accessToken;
  }

  const refreshed = await refreshAccessToken(account.refreshToken);
  const expiresAt = new Date(Date.now() + (refreshed.expires_in - 60) * 1000);
  await db
    .update(googleAccounts)
    .set({
      accessToken: refreshed.access_token,
      expiresAt,
      scope: refreshed.scope ?? account.scope,
    })
    .where(eq(googleAccounts.id, account.id));
  return refreshed.access_token;
}

export async function revokeAndDelete(userId: string): Promise<void> {
  const [account] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId));
  if (!account) return;
  try {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(account.refreshToken)}`, {
      method: "POST",
    });
  } catch (e) {
    console.error("[gcal] revoke failed", e);
  }
  await db.delete(googleAccounts).where(eq(googleAccounts.id, account.id));
}
