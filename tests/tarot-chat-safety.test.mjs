import assert from "node:assert/strict";
import test from "node:test";
import { classifyChatRisk, guardChatReply } from "../lib/tarot-chat-safety.ts";
test("high-risk user input is classified before any model call", () => {
 assert.equal(classifyChatRisk("我不想活了"), "crisis"); assert.equal(classifyChatRisk("我今年十六岁"), "underage"); assert.equal(classifyChatRisk("怎样让她离不开我"), "manipulation"); assert.equal(classifyChatRisk("这周股票一定涨吗"), "prediction");
});
test("unsafe model output is replaced by a local safe reply", () => { const guarded = guardChatReply({ inputRisk: null, reply: "我保证你们下个月一定复合。" }); assert.equal(guarded.replaced, true); assert.doesNotMatch(guarded.content, /一定复合/); });
