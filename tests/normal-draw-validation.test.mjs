import assert from "node:assert/strict";
import test from "node:test";

import { validateNormalQuestion } from "../lib/normal-draw/validation.ts";

test("question validation accepts a specific readable question", () => {
  assert.equal(
    validateNormalQuestion(" 这段关系里，我最需要看清什么？ "),
    null
  );
});

test("question validation explains invalid input", () => {
  assert.equal(
    validateNormalQuestion("太短"),
    "请写下至少 8 个字符的完整问题"
  );
  assert.equal(
    validateNormalQuestion("12345678"),
    "请用文字描述你想询问的事"
  );
  assert.equal(
    validateNormalQuestion("！！！！！！！！"),
    "请用文字描述你想询问的事"
  );
  assert.equal(
    validateNormalQuestion("啊啊啊啊啊啊啊啊"),
    "请让问题更具体一些"
  );
  assert.equal(
    validateNormalQuestion("问".repeat(241)),
    "问题请控制在 240 个字符以内"
  );
});
