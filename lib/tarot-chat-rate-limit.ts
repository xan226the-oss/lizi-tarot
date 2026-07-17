export type ChatRateLimiter = { consume(key: string): { allowed: boolean; retryAfterMs: number } };
export function createChatRateLimiter({ limit, windowMs, now = () => Date.now() }: { limit: number; windowMs: number; now?: () => number }): ChatRateLimiter {
  const buckets = new Map<string, number[]>();
  return { consume(key) { const current = now(); const active = (buckets.get(key) ?? []).filter((time) => current - time < windowMs); if (active.length >= limit) { buckets.set(key, active); return { allowed: false, retryAfterMs: Math.max(0, windowMs - (current - active[0])) }; } active.push(current); buckets.set(key, active); return { allowed: true, retryAfterMs: 0 }; } };
}
