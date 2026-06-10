import Redis from "ioredis";

/**
 * Fixed-window rate limiter. Uses Redis when REDIS_URL is set (so limits are
 * shared across all app instances) and falls back to an in-memory window
 * otherwise. Resilient: if Redis errors at request time it degrades to memory.
 */

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}

let redis: Redis | null = null;
let redisDisabled = false;
function getRedis(): Redis | null {
  if (redisDisabled || !process.env.REDIS_URL) return null;
  if (!redis) {
    try {
      redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false });
      redis.on("error", () => {}); // avoid unhandled error spam; we fall back to memory
    } catch {
      redisDisabled = true;
      return null;
    }
  }
  return redis;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

async function redisLimit(client: Redis, key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const count = await client.incr(redisKey);
  if (count === 1) await client.pexpire(redisKey, windowMs);
  if (count > limit) {
    const ttl = await client.pttl(redisKey);
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000)) };
  }
  return { ok: true, remaining: Math.max(0, limit - count), retryAfterSeconds: 0 };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const client = getRedis();
  if (client) {
    try {
      return await redisLimit(client, key, limit, windowMs);
    } catch {
      // fall through to memory on any Redis hiccup
    }
  }
  return memoryLimit(key, limit, windowMs);
}

/** Best-effort client IP from common proxy headers. */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/** Enforce a limit; returns a 429 Response if exceeded, else null. */
export async function enforceRateLimit(request: Request, name: string, limit: number, windowMs: number): Promise<Response | null> {
  const ip = getClientIp(request);
  const res = await rateLimit(`${name}:${ip}`, limit, windowMs);
  if (res.ok) return null;
  return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(res.retryAfterSeconds) },
  });
}
