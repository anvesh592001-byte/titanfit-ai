/**
 * Server-side sliding-window rate limiter to protect AI and mutation endpoints.
 */

interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit({
  key,
  limit,
  windowMs
}: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = buckets.get(key) ?? { timestamps: [] };
  const valid = existing.timestamps.filter((ts) => ts > cutoff);

  if (valid.length >= limit) {
    const oldest = valid[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, { timestamps: valid });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    };
  }

  valid.push(now);
  buckets.set(key, { timestamps: valid });

  // Periodic pruning when map grows large
  if (buckets.size > 2000) {
    for (const [k, bucket] of buckets.entries()) {
      const filtered = bucket.timestamps.filter((ts) => ts > cutoff);
      if (filtered.length === 0) {
        buckets.delete(k);
      } else {
        buckets.set(k, { timestamps: filtered });
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - valid.length),
    retryAfterSeconds: 0
  };
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}
