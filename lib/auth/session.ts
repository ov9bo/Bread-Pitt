import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, sessions } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const SESSION_COOKIE = "bread_pitt_session";
const SESSION_TTL_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "SESSION_SECRET env var is missing or too short. Set it to at least 32 random bytes (hex)."
    );
  }
  return new TextEncoder().encode(s);
}

export type Session = { sessionId: string; userId: string };

export async function createSession(userId: string): Promise<void> {
  const sessionId = nanoid(24);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id: sessionId, userId, expiresAt });

  const token = await new SignJWT({ sessionId, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .setIssuedAt()
    .sign(secret());

  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const session = await readSession();
  if (session) await db.delete(sessions).where(eq(sessions.id, session.sessionId));
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<Session | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sessionId !== "string" || typeof payload.userId !== "string") return null;
    const [row] = await db.select().from(sessions).where(eq(sessions.id, payload.sessionId));
    if (!row || row.expiresAt.getTime() < Date.now()) return null;
    return { sessionId: payload.sessionId, userId: payload.userId };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await readSession();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  return user ?? null;
}

export type Viewer = { user: typeof users.$inferSelect; isOwner: boolean };

export async function getViewer(): Promise<Viewer | null> {
  const [owner] = await db.select().from(users).limit(1);
  if (!owner) return null;
  const session = await readSession();
  const isOwner = !!session && session.userId === owner.id;
  return { user: owner, isOwner };
}
