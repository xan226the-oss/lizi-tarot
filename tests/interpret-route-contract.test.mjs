import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readRoute = () =>
  readFile(
    new URL("../app/api/readings/interpret/route.ts", import.meta.url),
    "utf8"
  );

test("route delegates validation and prompt construction to pure modules", async () => {
  const route = await readRoute();
  assert.match(route, /normalizeInterpretationRequest/);
  assert.match(route, /getInterpretationLengthProfile/);
  assert.match(route, /buildDeepSeekMessages\(normalized\)/);
  assert.doesNotMatch(route, /function isReadingRequest/);
});

test("route keeps DeepSeek transport settings fixed and tokens dynamic", async () => {
  const route = await readRoute();
  assert.match(route, /deepseek-v4-flash/);
  assert.match(route, /response_format:\s*\{\s*type:\s*"json_object"\s*\}/s);
  assert.match(route, /thinking:\s*\{\s*type:\s*"disabled"\s*\}/s);
  assert.match(route, /max_tokens:\s*lengthProfile\.maxTokens/);
  assert.match(route, /stream:\s*false/);
  assert.match(route, /28000/);
});

test("route source contains no secret-revealing client error copy", async () => {
  const route = await readRoute();
  assert.doesNotMatch(route, /密钥无效|账户额度不足|尚未配置 DeepSeek 密钥/);
  assert.match(route, /解读服务暂时不可用/);
  assert.match(route, /解读请求较多/);
  assert.match(route, /解读等待超时/);
});
