import assert from "node:assert/strict";
import test from "node:test";

import { getPublicInterpretationError } from "../lib/interpretation-error.ts";

test("hides provider configuration details from readers", () => {
  const message = getPublicInterpretationError("尚未配置 DeepSeek 密钥，完整牌阵仍可正常查看。");

  assert.doesNotMatch(message, /DeepSeek|密钥|配置/);
  assert.match(message, /完整牌阵/);
});

test("turns transient failures into a calm retry message", () => {
  const message = getPublicInterpretationError("综合解读等待超时，请重新尝试。");

  assert.match(message, /稍后重新尝试/);
  assert.match(message, /单张牌意/);
});
