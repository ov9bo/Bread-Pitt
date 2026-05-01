import "server-only";

const WINDOW_MS = 15 * 60_000; // 15 minutes
const MAX_ATTEMPTS = 5;

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

function evict() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
  }
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export function checkLoginRateLimit(ip: string): RateLimitResult {
  evict();
  const now = Date.now();
  const bucket = store.get(ip) ?? { count: 0, resetAt: now + WINDOW_MS };
  bucket.count += 1;
  store.set(ip, bucket);

  if (bucket.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

export function resetLoginRateLimit(ip: string) {
  store.delete(ip);
}
