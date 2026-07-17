import assert from "node:assert/strict";
import test from "node:test";
import { createChatRateLimiter } from "../lib/tarot-chat-rate-limit.ts";
test("single-instance limiter opens again after its window", () => { let now = 0; const limiter = createChatRateLimiter({ limit: 2, windowMs: 1000, now: () => now }); assert.equal(limiter.consume("127.0.0.1").allowed, true); assert.equal(limiter.consume("127.0.0.1").allowed, true); assert.equal(limiter.consume("127.0.0.1").allowed, false); now = 1001; assert.equal(limiter.consume("127.0.0.1").allowed, true); });
