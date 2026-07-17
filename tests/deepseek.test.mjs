import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeepSeekMessages,
  getInterpretationLengthProfile,
  parseDeepSeekContent
} from "../lib/deepseek.ts";

const input = {
  readingType: "normal",
  question: "这段关系里，我最需要看清什么？",
  spreadTitle: "三牌时光",
  spreadPurpose: "梳理一件事从过去到未来的发展脉络",
  cards: [
    {
      cardId: 3,
      slotId: "past",
      slotLabel: "过去",
      slotDescription: "形成当前局面的背景",
      cardName: "女祭司",
      orientation: "upright",
      meaning: "答案藏在安静处。",
      keywords: ["直觉", "静观"]
    },
    {
      cardId: 34,
      slotId: "present",
      slotLabel: "现在",
      slotDescription: "此刻正在发生的核心",
      cardName: "宝剑骑士",
      orientation: "reversed",
      meaning: "念头可能过度拉扯。",
      keywords: ["思考", "追寻"]
    },
    {
      cardId: 18,
      slotId: "future",
      slotLabel: "未来",
      slotDescription: "按当前趋势可能抵达的方向",
      cardName: "星星",
      orientation: "upright",
      meaning: "希望正在恢复。",
      keywords: ["希望", "疗愈"]
    }
  ]
};

test("maps all four card-count bands to fixed length and token profiles", () => {
  assert.deepEqual(getInterpretationLengthProfile(1), {
    minCharacters: 300,
    maxCharacters: 450,
    maxTokens: 900
  });
  assert.deepEqual(
    getInterpretationLengthProfile(3),
    getInterpretationLengthProfile(1)
  );
  assert.deepEqual(getInterpretationLengthProfile(4), {
    minCharacters: 450,
    maxCharacters: 650,
    maxTokens: 1200
  });
  assert.deepEqual(
    getInterpretationLengthProfile(6),
    getInterpretationLengthProfile(4)
  );
  assert.deepEqual(getInterpretationLengthProfile(7), {
    minCharacters: 650,
    maxCharacters: 900,
    maxTokens: 1600
  });
  assert.deepEqual(
    getInterpretationLengthProfile(9),
    getInterpretationLengthProfile(7)
  );
  assert.deepEqual(getInterpretationLengthProfile(10), {
    minCharacters: 900,
    maxCharacters: 1200,
    maxTokens: 2200
  });
  assert.deepEqual(
    getInterpretationLengthProfile(12),
    getInterpretationLengthProfile(10)
  );
  assert.throws(() => getInterpretationLengthProfile(0), /card count/i);
  assert.throws(() => getInterpretationLengthProfile(13), /card count/i);
});

test("builds a continuous-article prompt with authoritative spread context", () => {
  const messages = buildDeepSeekMessages(input);
  const prompt = messages.map((message) => message.content).join("\n");

  assert.match(prompt, /JSON/i);
  assert.match(prompt, /三牌时光/);
  assert.match(prompt, /梳理一件事从过去到未来的发展脉络/);
  assert.match(prompt, /过去.*形成当前局面的背景.*女祭司/s);
  assert.match(prompt, /现在.*此刻正在发生的核心.*宝剑骑士/s);
  assert.match(prompt, /未来.*按当前趋势可能抵达的方向.*星星/s);
  assert.match(prompt, /逆位/);
  assert.match(prompt, /300.*450/s);
  assert.match(prompt, /连续文章/);
  assert.match(prompt, /不使用小标题、列表或 Markdown/);
  assert.match(prompt, /不要按.*第一张.*第二张.*逐张复述/s);
  assert.match(prompt, /2.*3.*可执行建议/s);
});

test("parses a valid combined interpretation", () => {
  assert.deepEqual(
    parseDeepSeekContent(
      '{"interpretation":"三张牌共同指出：先停止追赶，再听见自己的判断。"}'
    ),
    { interpretation: "三张牌共同指出：先停止追赶，再听见自己的判断。" }
  );
});

test("parses an interpretation wrapped in a JSON code fence", () => {
  assert.deepEqual(
    parseDeepSeekContent(
      '```json\n{"interpretation":"牌阵提示你先整理边界，再把注意力放回可控的选择。"}\n```'
    ),
    { interpretation: "牌阵提示你先整理边界，再把注意力放回可控的选择。" }
  );
});

test("classifies malformed model JSON without retaining its content", () => {
  assert.throws(
    () => parseDeepSeekContent("not-json"),
    (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.code, "invalid-json");
      return true;
    }
  );
});

test("rejects empty, malformed, missing and overlong model content", () => {
  assert.throws(() => parseDeepSeekContent(""), /empty/i);
  assert.throws(() => parseDeepSeekContent("not-json"), /JSON/i);
  assert.throws(() => parseDeepSeekContent('{"interpretation":""}'), /interpretation/i);
  assert.throws(() => parseDeepSeekContent('{"other":"value"}'), /interpretation/i);
  assert.throws(
    () => parseDeepSeekContent(JSON.stringify({ interpretation: "解".repeat(4001) })),
    /maximum length/i
  );
  assert.equal(
    parseDeepSeekContent(JSON.stringify({ interpretation: "解".repeat(4000) }))
      .interpretation.length,
    4000
  );
});
