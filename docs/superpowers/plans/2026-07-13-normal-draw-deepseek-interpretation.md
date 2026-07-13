# 普通解牌 DeepSeek 综合解读 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留普通解牌牌面、牌位与基础牌意的前提下，让用户在结果页主动点击后获得一篇按牌阵规模调整长度的 DeepSeek 综合解读，同时保持现有三张/五张手势解牌请求兼容。

**Architecture:** `lib/interpretation-request.ts` 作为唯一请求信任边界，把旧手势请求和新普通请求校验、补全并归一化为同一种服务端输入；`lib/deepseek.ts` 只负责长度档位、提示词和供应商 JSON 响应解析；API 路由只负责 HTTP、超时和供应商错误映射。普通解牌的请求状态、去重、取消和过期响应防护全部由 `NormalDrawExperience` 持有，`ReadingReveal` 保持无网络请求的展示组件。

**Tech Stack:** Next.js 14 App Router、React 18、TypeScript 5、CSS Modules、Node `node:test`、DeepSeek Chat Completions API。

## Global Constraints

- 只扩展 `POST /api/readings/interpret`，不新增第二个解读路由。
- 旧手势请求不带 `readingType` 时仍按手势解牌处理；现有三张/五张客户端无需修改。
- 普通解牌只有点击“生成综合解读”后才发请求；失败不自动重试，成功后不提供再次生成。
- 普通问题必须复用 `validateNormalQuestion`，保持去除首尾空白后 8–240 个字符及现有文字质量校验一致。
- 浏览器提交的牌阵名称、用途、牌位说明、牌名、关键词和基础牌意都不可信；服务端只从 `lib/normal-draw/spreads.ts` 与 `lib/tarot-cards.ts` 重新解析。
- 目标长度和 `max_tokens` 固定为：1–3 张 300–450 / 900，4–6 张 450–650 / 1200，7–9 张 650–900 / 1600，10–12 张 900–1200 / 2200。
- 最终 `interpretation` 去除首尾空白后必须非空且不超过 4000 个字符；超长内容作为供应商异常处理，不在客户端截断。
- DeepSeek 模型继续读取 `DEEPSEEK_MODEL`，默认 `deepseek-v4-flash`；`thinking` 关闭、JSON object 输出、不流式、28 秒超时。
- 面向客户端的错误不得包含 DeepSeek、API Key、环境变量、额度或供应商原始响应；服务器日志只记录状态码和错误类别，不记录 Key、请求正文或供应商响应正文。
- 不读取、复制、改写、测试、索引或发送 `$HOME/Desktop/牌` 下任何 PDF/Word 购课资料；冒烟测试只使用虚构问题与项目现有牌数据。
- 不修改每日一牌、`lib/gesture/state-machine.ts`、摄像头、MediaPipe、`lib/normal-draw/spreads.ts` 的牌阵定义或手势端视觉流程。
- 不新增第三方依赖。
- 当前 Git 仓库只有规格提交 `c0c26c6`，其余项目文件仍未跟踪。实施期间只编辑本计划列出的文件，不执行 `git add .`、批量暂存、删除未跟踪文件或创建不完整的功能提交；待用户单独确认项目基线策略后再提交。

---

## File Structure

### Create

- `lib/interpretation-request.ts`：外部请求类型、旧手势/普通请求校验、权威数据补全与统一内部输入。
- `tests/interpretation-request.test.mjs`：12 种普通牌阵、非法组合及旧手势兼容测试。
- `tests/interpret-route-contract.test.mjs`：路由编排、动态 token、超时与公开错误边界的源代码契约测试。

### Modify

- `lib/deepseek.ts`：统一提示词输入、四档长度策略、普通牌阵上下文与 4000 字符响应上限。
- `app/api/readings/interpret/route.ts`：接入统一归一化，保留旧手势兼容并使用动态 `max_tokens`。
- `components/draw/NormalDrawExperience.tsx`：持有普通解牌 AI 请求生命周期、取消、去重和过期响应防护。
- `components/draw/ReadingReveal.tsx`：展示 idle/loading/success/error，并仅通过回调触发请求。
- `components/draw/NormalDraw.module.css`：综合解读区域、按钮、错误和移动端长文样式。
- `tests/deepseek.test.mjs`：长度档位、连续文章提示词及异常响应测试。
- `tests/normal-draw-visual-contract.test.mjs`：普通结果页交互与状态所有权契约。

### Explicitly Unchanged

- `components/gesture-draw/GestureDrawPage.tsx`
- `components/gesture-draw/ResultSpace.tsx`
- `lib/gesture/*`
- `lib/normal-draw/spreads.ts`
- `lib/normal-draw/state-machine.ts`
- `lib/mediapipe.ts`
- 每日一牌相关文件

---

### Task 1: 统一请求校验与权威数据归一化

**Files:**
- Create: `lib/interpretation-request.ts`
- Create: `tests/interpretation-request.test.mjs`

**Interfaces:**
- Consumes: `getSpreadSlots(spread)`, `getSpreadTitle(spread)`, `getNormalSpread(id)`, `validateNormalQuestion(question)`, `getTarotCardById(id)`。
- Produces: `NormalInterpretationRequest`, `NormalizedInterpretationCard`, `NormalizedInterpretationRequest`, `normalizeInterpretationRequest(value)`。
- Contract: 成功返回权威数据补全后的对象；任意非法输入返回 `null`，不把浏览器提供的派生文案带入提示词。

- [ ] **Step 1: Write failing request-normalization tests**

Create `tests/interpretation-request.test.mjs` with the following complete cases:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { normalizeInterpretationRequest } from "../lib/interpretation-request.ts";
import { NORMAL_SPREADS } from "../lib/normal-draw/spreads.ts";

const question = "未来三个月，我应该把注意力放在哪个方向？";

function makeNormalRequest(spread) {
  return {
    readingType: "normal",
    question,
    spreadId: spread.id,
    results: spread.slots.map((slot, index) => ({
      cardId: index + 1,
      orientation: index % 2 === 0 ? "upright" : "reversed",
      slotId: slot.id,
      slotLabel: slot.label
    }))
  };
}

function clone(value) {
  return structuredClone(value);
}

test("normalizes all twelve normal spreads from local authoritative data", () => {
  assert.equal(NORMAL_SPREADS.length, 12);

  for (const spread of NORMAL_SPREADS) {
    const normalized = normalizeInterpretationRequest(makeNormalRequest(spread));
    assert.ok(normalized, spread.id);
    assert.equal(normalized.readingType, "normal");
    assert.equal(normalized.question, question);
    assert.equal(normalized.spreadTitle, spread.name);
    assert.equal(normalized.spreadPurpose, spread.useFor);
    assert.equal(normalized.cards.length, spread.cardCount);
    assert.deepEqual(
      normalized.cards.map((card) => card.slotDescription),
      spread.slots.map((slot) => slot.description)
    );
    assert.ok(normalized.cards.every((card) => card.cardName.length > 0));
    assert.ok(normalized.cards.every((card) => card.meaning.length > 0));
  }
});

test("rejects unknown spreads and wrong result counts", () => {
  const base = makeNormalRequest(NORMAL_SPREADS[1]);
  assert.equal(
    normalizeInterpretationRequest({ ...base, spreadId: "not-a-spread" }),
    null
  );
  assert.equal(
    normalizeInterpretationRequest({ ...base, results: base.results.slice(1) }),
    null
  );
  assert.equal(
    normalizeInterpretationRequest({
      ...base,
      results: [...base.results, base.results[0]]
    }),
    null
  );
});

test("rejects forged, reordered, duplicate, unknown and malformed normal results", () => {
  const base = makeNormalRequest(NORMAL_SPREADS[3]);
  const invalidRequests = [];

  const reordered = clone(base);
  [reordered.results[0], reordered.results[1]] = [
    reordered.results[1],
    reordered.results[0]
  ];
  invalidRequests.push(reordered);

  const wrongSlotId = clone(base);
  wrongSlotId.results[0].slotId = "forged-slot";
  invalidRequests.push(wrongSlotId);

  const wrongSlotLabel = clone(base);
  wrongSlotLabel.results[0].slotLabel = "伪造牌位";
  invalidRequests.push(wrongSlotLabel);

  const duplicateCard = clone(base);
  duplicateCard.results[1].cardId = duplicateCard.results[0].cardId;
  invalidRequests.push(duplicateCard);

  const duplicateSlot = clone(base);
  duplicateSlot.results[1].slotId = duplicateSlot.results[0].slotId;
  duplicateSlot.results[1].slotLabel = duplicateSlot.results[0].slotLabel;
  invalidRequests.push(duplicateSlot);

  const unknownCard = clone(base);
  unknownCard.results[0].cardId = 999;
  invalidRequests.push(unknownCard);

  const wrongCardType = clone(base);
  wrongCardType.results[0].cardId = "1";
  invalidRequests.push(wrongCardType);

  const wrongOrientation = clone(base);
  wrongOrientation.results[0].orientation = "sideways";
  invalidRequests.push(wrongOrientation);

  for (const request of invalidRequests) {
    assert.equal(normalizeInterpretationRequest(request), null);
  }
});

test("uses the same normal-question validation as the existing form", () => {
  const base = makeNormalRequest(NORMAL_SPREADS[0]);
  for (const invalidQuestion of [
    "太短",
    "12345678",
    "啊啊啊啊啊啊啊啊",
    "问".repeat(241)
  ]) {
    assert.equal(
      normalizeInterpretationRequest({ ...base, question: invalidQuestion }),
      null
    );
  }
});

test("keeps legacy three/five requests and explicit gesture requests compatible", () => {
  const legacyThree = {
    question: "这段关系里，我最需要看清什么？",
    spread: "three",
    results: [
      { cardId: "1", orientation: "upright", slotId: "past", slotLabel: "过去" },
      { cardId: "2", orientation: "reversed", slotId: "present", slotLabel: "现在" },
      { cardId: "3", orientation: "upright", slotId: "future", slotLabel: "未来" }
    ]
  };
  const legacyFive = {
    question: "我现在最需要平衡哪些生活方向？",
    spread: "five",
    results: [
      { cardId: "4", orientation: "upright", slotId: "body", slotLabel: "身" },
      { cardId: "5", orientation: "reversed", slotId: "mind", slotLabel: "心" },
      { cardId: "6", orientation: "upright", slotId: "spirit", slotLabel: "灵" },
      { cardId: "7", orientation: "reversed", slotId: "emotion", slotLabel: "情感" },
      { cardId: "8", orientation: "upright", slotId: "environment", slotLabel: "环境" }
    ]
  };

  for (const payload of [
    legacyThree,
    { ...legacyThree, readingType: "gesture" },
    legacyFive
  ]) {
    const normalized = normalizeInterpretationRequest(payload);
    assert.ok(normalized);
    assert.equal(normalized.readingType, "gesture");
    assert.equal(
      normalized.spreadTitle,
      payload.spread === "three" ? "抽三张" : "抽五张"
    );
    assert.equal(normalized.cards.length, payload.results.length);
  }
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/interpretation-request.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/interpretation-request.ts`.

- [ ] **Step 3: Implement the request types and normalization boundary**

Create `lib/interpretation-request.ts` with these exact public shapes and validation rules:

```ts
import { getSpreadSlots, getSpreadTitle } from "./gesture/spreads.ts";
import { getNormalSpread } from "./normal-draw/spreads.ts";
import type { NormalSpreadId } from "./normal-draw/types.ts";
import { validateNormalQuestion } from "./normal-draw/validation.ts";
import { getTarotCardById } from "./tarot-cards.ts";

type Orientation = "upright" | "reversed";
type GestureSpread = "three" | "five";

type InterpretationResultInput<TCardId> = {
  cardId: TCardId;
  orientation: Orientation;
  slotId: string;
  slotLabel: string;
};

export type NormalInterpretationRequest = {
  readingType: "normal";
  question: string;
  spreadId: NormalSpreadId;
  results: Array<InterpretationResultInput<number>>;
};

export type NormalizedInterpretationCard = {
  cardId: number;
  slotId: string;
  slotLabel: string;
  slotDescription: string;
  cardName: string;
  orientation: Orientation;
  meaning: string;
  keywords: string[];
};

export type NormalizedInterpretationRequest = {
  readingType: "gesture" | "normal";
  question: string;
  spreadTitle: string;
  spreadPurpose: string | null;
  cards: NormalizedInterpretationCard[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOrientation(value: unknown): value is Orientation {
  return value === "upright" || value === "reversed";
}

function resolveCard(
  cardId: number,
  orientation: Orientation,
  slotId: string,
  slotLabel: string,
  slotDescription: string
): NormalizedInterpretationCard | null {
  const card = getTarotCardById(cardId);
  if (!card) return null;

  return {
    cardId,
    slotId,
    slotLabel,
    slotDescription,
    cardName: card.name_cn,
    orientation,
    meaning:
      orientation === "upright"
        ? card.meaning_upright
        : card.meaning_reversed,
    keywords: [...card.keywords]
  };
}

function normalizeNormal(
  request: Record<string, unknown>
): NormalizedInterpretationRequest | null {
  if (
    request.readingType !== "normal" ||
    typeof request.question !== "string" ||
    validateNormalQuestion(request.question) !== null ||
    typeof request.spreadId !== "string" ||
    !Array.isArray(request.results)
  ) {
    return null;
  }

  const spread = getNormalSpread(request.spreadId);
  if (!spread || request.results.length !== spread.cardCount) return null;

  const seenCardIds = new Set<number>();
  const seenSlotIds = new Set<string>();
  const cards: NormalizedInterpretationCard[] = [];

  for (const [index, rawResult] of request.results.entries()) {
    const slot = spread.slots[index];
    if (!slot || !isRecord(rawResult)) return null;

    const { cardId, orientation, slotId, slotLabel } = rawResult;
    if (
      typeof cardId !== "number" ||
      !Number.isInteger(cardId) ||
      !isOrientation(orientation) ||
      slotId !== slot.id ||
      slotLabel !== slot.label ||
      seenCardIds.has(cardId) ||
      seenSlotIds.has(slot.id)
    ) {
      return null;
    }

    const card = resolveCard(
      cardId,
      orientation,
      slot.id,
      slot.label,
      slot.description
    );
    if (!card) return null;

    seenCardIds.add(cardId);
    seenSlotIds.add(slot.id);
    cards.push(card);
  }

  return {
    readingType: "normal",
    question: request.question.trim(),
    spreadTitle: spread.name,
    spreadPurpose: spread.useFor,
    cards
  };
}

function normalizeGesture(
  request: Record<string, unknown>
): NormalizedInterpretationRequest | null {
  if (
    request.readingType !== undefined &&
    request.readingType !== "gesture"
  ) {
    return null;
  }
  if (
    typeof request.question !== "string" ||
    request.question.trim().length < 2 ||
    request.question.trim().length > 500 ||
    (request.spread !== "three" && request.spread !== "five") ||
    !Array.isArray(request.results)
  ) {
    return null;
  }

  const spread = request.spread as GestureSpread;
  const slots = getSpreadSlots(spread);
  if (request.results.length !== slots.length) return null;

  const expectedSlots = new Map(slots.map((slot) => [slot.id, slot.label]));
  const seenCardIds = new Set<number>();
  const seenSlotIds = new Set<string>();
  const cards: NormalizedInterpretationCard[] = [];

  for (const rawResult of request.results) {
    if (!isRecord(rawResult)) return null;
    const { cardId, orientation, slotId, slotLabel } = rawResult;
    if (
      typeof cardId !== "string" ||
      !/^\d+$/.test(cardId) ||
      !isOrientation(orientation) ||
      typeof slotId !== "string" ||
      typeof slotLabel !== "string" ||
      expectedSlots.get(slotId) !== slotLabel
    ) {
      return null;
    }

    const numericCardId = Number(cardId);
    if (seenCardIds.has(numericCardId) || seenSlotIds.has(slotId)) return null;
    const card = resolveCard(numericCardId, orientation, slotId, slotLabel, "");
    if (!card) return null;

    seenCardIds.add(numericCardId);
    seenSlotIds.add(slotId);
    cards.push(card);
  }

  return {
    readingType: "gesture",
    question: request.question.trim(),
    spreadTitle: getSpreadTitle(spread),
    spreadPurpose: null,
    cards
  };
}

export function normalizeInterpretationRequest(
  value: unknown
): NormalizedInterpretationRequest | null {
  if (!isRecord(value)) return null;
  return value.readingType === "normal"
    ? normalizeNormal(value)
    : normalizeGesture(value);
}
```

Implementation notes enforced by the code above:

- Normal requests compare `results[index]` with `spread.slots[index]`; a correct set in the wrong order is invalid.
- Gesture requests keep the existing set-based slot compatibility rather than tightening an unrelated legacy behavior.
- Gesture duplicate detection uses normalized numeric IDs, so `"1"` and `"01"` cannot represent the same card twice.
- The normalized result contains only values reconstructed from local project data.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/interpretation-request.test.mjs
```

Expected: 5 tests PASS, 0 FAIL.

---

### Task 2: Dynamic prompt length and defensive DeepSeek response parsing

**Files:**
- Modify: `lib/deepseek.ts`
- Modify: `tests/deepseek.test.mjs`

**Interfaces:**
- Consumes: `NormalizedInterpretationRequest` from Task 1.
- Produces: `InterpretationLengthProfile`, `getInterpretationLengthProfile(cardCount)`, `buildDeepSeekMessages(input)`, `parseDeepSeekContent(content)`.
- Contract: prompt builders never read external course material and response parsing rejects empty, invalid, missing or over-4000-character interpretations.

- [ ] **Step 1: Replace the DeepSeek unit tests with complete length, prompt and parser coverage**

Replace `tests/deepseek.test.mjs` with:

```js
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
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/deepseek.test.mjs
```

Expected: FAIL because `getInterpretationLengthProfile` is not exported and the current prompt lacks normal-spread purpose/slot descriptions.

- [ ] **Step 3: Implement the four fixed profiles and unified prompt**

Modify `lib/deepseek.ts` so its complete public model is:

```ts
import type { NormalizedInterpretationRequest } from "./interpretation-request.ts";

export type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

export type DeepSeekReadingResponse = {
  interpretation: string;
};

export type InterpretationLengthProfile = {
  minCharacters: number;
  maxCharacters: number;
  maxTokens: 900 | 1200 | 1600 | 2200;
};

export type DeepSeekPromptInput = NormalizedInterpretationRequest;

function orientationLabel(orientation: "upright" | "reversed") {
  return orientation === "upright" ? "正位" : "逆位";
}

export function getInterpretationLengthProfile(
  cardCount: number
): InterpretationLengthProfile {
  if (!Number.isInteger(cardCount) || cardCount < 1 || cardCount > 12) {
    throw new Error("Unsupported interpretation card count");
  }
  if (cardCount <= 3) {
    return { minCharacters: 300, maxCharacters: 450, maxTokens: 900 };
  }
  if (cardCount <= 6) {
    return { minCharacters: 450, maxCharacters: 650, maxTokens: 1200 };
  }
  if (cardCount <= 9) {
    return { minCharacters: 650, maxCharacters: 900, maxTokens: 1600 };
  }
  return { minCharacters: 900, maxCharacters: 1200, maxTokens: 2200 };
}

export function buildDeepSeekMessages(
  input: DeepSeekPromptInput
): DeepSeekMessage[] {
  const length = getInterpretationLengthProfile(input.cards.length);
  const spreadPurpose = input.spreadPurpose
    ? `适用方向：${input.spreadPurpose}\n`
    : "";
  const cardContext = input.cards
    .map((card, index) => {
      const slotDescription = card.slotDescription
        ? `\n   牌位说明：${card.slotDescription}`
        : "";
      return (
        `${index + 1}. 牌位「${card.slotLabel}」${slotDescription}\n` +
        `   牌面：${card.cardName}（${orientationLabel(card.orientation)}）\n` +
        `   基础牌意：${card.meaning}\n` +
        `   关键词：${card.keywords.join("、")}`
      );
    })
    .join("\n\n");

  return [
    {
      role: "system",
      content:
        "你是一位克制、清晰、富有同理心的塔罗解读者。你必须把整个牌阵视为一个相互关联的答案，不得使用宿命论、恐吓、医疗诊断、法律结论或财务保证。把建议写成可执行的观察与行动。输出必须是合法 JSON，且只包含 interpretation 字段。"
    },
    {
      role: "user",
      content:
        `请为下面的「${input.spreadTitle}」生成一次综合解读。\n` +
        spreadPurpose +
        `用户问题：${input.question}\n\n` +
        `完整牌阵（按权威牌位顺序）：\n${cardContext}\n\n` +
        `输出一篇 ${length.minCharacters} 至 ${length.maxCharacters} 个中文字符的连续文章，不使用小标题、列表或 Markdown。` +
        "不要按“第一张、第二张”逐张复述，而要串联牌位之间的变化、张力、资源与方向。" +
        "在末段自然融入 2 至 3 个可执行建议，但不要把建议格式化为列表。\n\n" +
        '只返回以下 JSON 对象：{"interpretation":"综合解读正文"}'
    }
  ];
}

export function parseDeepSeekContent(content: string): DeepSeekReadingResponse {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("DeepSeek returned empty content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("DeepSeek returned invalid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("DeepSeek JSON did not contain an interpretation");
  }

  const interpretation = (parsed as { interpretation?: unknown }).interpretation;
  if (typeof interpretation !== "string" || interpretation.trim().length === 0) {
    throw new Error("DeepSeek JSON did not contain an interpretation");
  }

  const normalized = interpretation.trim();
  if (normalized.length > 4000) {
    throw new Error("DeepSeek interpretation exceeded maximum length");
  }

  return { interpretation: normalized };
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/deepseek.test.mjs
```

Expected: 4 tests PASS, 0 FAIL.

---

### Task 3: Route orchestration, dynamic token budget and public error boundary

**Files:**
- Modify: `app/api/readings/interpret/route.ts`
- Create: `tests/interpret-route-contract.test.mjs`

**Interfaces:**
- Consumes: `normalizeInterpretationRequest`, `buildDeepSeekMessages`, `getInterpretationLengthProfile`, `parseDeepSeekContent`.
- Produces: unchanged `POST /api/readings/interpret` response shapes `{ interpretation }` and `{ error }`.
- Contract: malformed JSON/invalid readings return 400; missing server configuration returns generic 503; 429 is retryable; all other supplier failures remain generic and never expose secrets.

- [ ] **Step 1: Write the failing route contract test**

Create `tests/interpret-route-contract.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the route contract and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/interpret-route-contract.test.mjs
```

Expected: 3 tests FAIL because the route still owns `isReadingRequest`, uses fixed `max_tokens: 900`, and contains provider configuration copy.

- [ ] **Step 3: Replace route-local validation with normalized input**

Replace the route implementation with this exact orchestration:

```ts
import { NextResponse } from "next/server";
import {
  buildDeepSeekMessages,
  getInterpretationLengthProfile,
  parseDeepSeekContent
} from "@/lib/deepseek";
import { normalizeInterpretationRequest } from "@/lib/interpretation-request";

export const runtime = "nodejs";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const GENERIC_ERROR =
  "综合解读服务暂时不可用，完整牌阵与单张牌意仍可正常查看。";

function upstreamErrorMessage(status: number) {
  if (status === 429) return "解读请求较多，请稍等片刻再试。";
  return GENERIC_ERROR;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "请求内容不是有效 JSON。" }, { status: 400 });
  }

  const normalized = normalizeInterpretationRequest(payload);
  if (!normalized) {
    return NextResponse.json(
      { error: "牌阵数据不完整或不匹配。" },
      { status: 400 }
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  const lengthProfile = getInterpretationLengthProfile(normalized.cards.length);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 28000);

  try {
    const upstream = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash",
        messages: buildDeepSeekMessages(normalized),
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.72,
        max_tokens: lengthProfile.maxTokens,
        stream: false
      }),
      cache: "no-store",
      signal: controller.signal
    });

    if (!upstream.ok) {
      console.error("Interpretation upstream request failed", {
        category: "upstream-http",
        status: upstream.status
      });
      return NextResponse.json(
        { error: upstreamErrorMessage(upstream.status) },
        { status: upstream.status === 429 ? 429 : 502 }
      );
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json(parseDeepSeekContent(content));
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    console.error("Interpretation upstream request failed", {
      category: timedOut ? "timeout" : "invalid-upstream-response"
    });
    return NextResponse.json(
      {
        error: timedOut
          ? "综合解读等待超时，请重新尝试。"
          : GENERIC_ERROR
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
```

The logging object intentionally excludes `apiKey`, `normalized`, request bodies, response bodies and caught error details.

- [ ] **Step 4: Run route, request and DeepSeek tests together**

Run:

```bash
node --experimental-strip-types --test tests/interpretation-request.test.mjs tests/deepseek.test.mjs tests/interpret-route-contract.test.mjs tests/interpretation-error.test.mjs
```

Expected: 14 tests PASS, 0 FAIL.

---

### Task 4: User-triggered normal-draw lifecycle and result-page presentation

**Files:**
- Modify: `components/draw/NormalDrawExperience.tsx`
- Modify: `components/draw/ReadingReveal.tsx`
- Modify: `components/draw/NormalDraw.module.css`
- Modify: `tests/normal-draw-visual-contract.test.mjs`

**Interfaces:**
- `NormalDrawExperience` produces `interpretationStatus`, `interpretation`, `interpretationError`, `onGenerateInterpretation` and owns all fetch/cancel/dedupe behavior.
- `ReadingReveal` consumes those props, renders local card meanings first, never calls `fetch`, and invokes the callback only from the visible button.
- `InterpretationStatus = "idle" | "loading" | "success" | "error"`.

- [ ] **Step 1: Extend the visual contract with the four UI states and ownership checks**

Append these tests to `tests/normal-draw-visual-contract.test.mjs`, retaining the existing tests:

```js
test("normal interpretation stays user-triggered and owned by the experience", async () => {
  const [experience, reveal] = await Promise.all([
    readProjectFile("components/draw/NormalDrawExperience.tsx"),
    readProjectFile("components/draw/ReadingReveal.tsx")
  ]);

  assert.match(experience, /fetch\("\/api\/readings\/interpret"/);
  assert.match(experience, /readingType:\s*"normal"/);
  assert.match(experience, /AbortController/);
  assert.match(experience, /interpretationRequestIdRef/);
  assert.match(experience, /interpretationFingerprintRef/);
  assert.match(experience, /getPublicInterpretationError/);
  assert.doesNotMatch(reveal, /fetch\(|\/api\/readings\/interpret/);
});

test("normal reveal exposes idle loading success and retry contracts", async () => {
  const reveal = await readProjectFile("components/draw/ReadingReveal.tsx");

  assert.match(reveal, /生成综合解读/);
  assert.match(reveal, /正在生成综合解读/);
  assert.match(reveal, /重新生成/);
  assert.match(reveal, /aria-live="polite"/);
  assert.match(reveal, /本次问题与牌面信息将发送至 AI 服务生成解读/);
  assert.match(reveal, /interpretationStatus === "success"/);
  assert.match(reveal, /基础牌意/);
});

test("normal interpretation reset paths cancel and clear request state", async () => {
  const experience = await readProjectFile(
    "components/draw/NormalDrawExperience.tsx"
  );

  assert.match(experience, /clearInterpretation/);
  assert.match(experience, /interpretationControllerRef\.current\?\.abort\(\)/);
  assert.match(experience, /handleResetReading/);
  assert.match(experience, /handleBackToQuestion/);
  assert.match(experience, /handleChangeSpread/);
});
```

Also update the existing `draw stage keeps cards as the primary interactive element` assertion: retain `assert.doesNotMatch(reveal, /fetch\(|\/api\/readings\/interpret/)`, and replace any assertion that says DeepSeek is not connected with assertions for the new button and disclosure.

- [ ] **Step 2: Run the visual contract and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/normal-draw-visual-contract.test.mjs
```

Expected: the 3 new tests FAIL because the result page still contains the “尚未接入” notice and `NormalDrawExperience` has no interpretation lifecycle.

- [ ] **Step 3: Add the request lifecycle to `NormalDrawExperience`**

Change the relevant imports exactly as follows, then add the state/ref definitions inside `NormalDrawExperience`:

```ts
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  ReadingReveal,
  type InterpretationStatus
} from "@/components/draw/ReadingReveal";
import { getPublicInterpretationError } from "@/lib/interpretation-error";
```

```ts
const [interpretationStatus, setInterpretationStatus] =
  useState<InterpretationStatus>("idle");
const [interpretation, setInterpretation] = useState<string | null>(null);
const [interpretationError, setInterpretationError] = useState<string | null>(null);
const interpretationControllerRef = useRef<AbortController | null>(null);
const interpretationRequestIdRef = useRef(0);
const interpretationFingerprintRef = useRef("");

const clearInterpretation = useCallback(() => {
  interpretationControllerRef.current?.abort();
  interpretationControllerRef.current = null;
  interpretationRequestIdRef.current += 1;
  interpretationFingerprintRef.current = "";
  setInterpretationStatus("idle");
  setInterpretation(null);
  setInterpretationError(null);
}, []);
```

Add unmount cancellation without setting state after unmount:

```ts
useEffect(
  () => () => {
    interpretationControllerRef.current?.abort();
    interpretationRequestIdRef.current += 1;
  },
  []
);
```

Add the user-triggered request callback. The fingerprint ref is assigned synchronously before `fetch`, so two rapid clicks cannot create two billable requests; it is cleared only after a current request fails or the reading changes:

```ts
const requestInterpretation = useCallback(async () => {
  if (state.phase !== "REVEAL" || !state.spread || state.results.length === 0) {
    return;
  }

  const fingerprint = JSON.stringify({
    question: state.question,
    spreadId: state.spread.id,
    results: state.results.map(({ cardId, orientation, slotId, slotLabel }) => ({
      cardId,
      orientation,
      slotId,
      slotLabel
    }))
  });
  if (interpretationFingerprintRef.current === fingerprint) return;
  interpretationFingerprintRef.current = fingerprint;

  interpretationControllerRef.current?.abort();
  const controller = new AbortController();
  interpretationControllerRef.current = controller;
  const requestId = interpretationRequestIdRef.current + 1;
  interpretationRequestIdRef.current = requestId;
  setInterpretationStatus("loading");
  setInterpretation(null);
  setInterpretationError(null);

  try {
    const response = await fetch("/api/readings/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readingType: "normal",
        question: state.question,
        spreadId: state.spread.id,
        results: state.results.map(
          ({ cardId, orientation, slotId, slotLabel }) => ({
            cardId,
            orientation,
            slotId,
            slotLabel
          })
        )
      }),
      signal: controller.signal
    });
    const responseText = await response.text();
    let payload: { interpretation?: string; error?: string } = {};
    try {
      payload = JSON.parse(responseText) as {
        interpretation?: string;
        error?: string;
      };
    } catch {
      payload = {};
    }

    if (!response.ok || !payload.interpretation) {
      throw new Error(payload.error ?? "综合解读暂时不可用。");
    }
    if (
      controller.signal.aborted ||
      interpretationRequestIdRef.current !== requestId
    ) {
      return;
    }

    setInterpretation(payload.interpretation);
    setInterpretationStatus("success");
  } catch (error) {
    if (
      controller.signal.aborted ||
      interpretationRequestIdRef.current !== requestId
    ) {
      return;
    }
    interpretationFingerprintRef.current = "";
    setInterpretationStatus("error");
    setInterpretationError(
      getPublicInterpretationError(
        error instanceof Error ? error.message : undefined
      )
    );
  } finally {
    if (interpretationControllerRef.current === controller) {
      interpretationControllerRef.current = null;
    }
  }
}, [state.phase, state.question, state.results, state.spread]);
```

Use wrappers for every reading-changing path:

```ts
const handleBackToQuestion = () => {
  clearInterpretation();
  dispatch({ type: "BACK_TO_QUESTION" });
};

const handleResetReading = () => {
  clearInterpretation();
  dispatch({
    type: "RESET_READING",
    deck: shuffleNormalDeck(tarotCards.map((card) => card.id))
  });
};
```

At the start of the existing `handleChangeSpread`, call `clearInterpretation()`. In the `spreadParam` synchronization effect, call `clearInterpretation()` before dispatching `SELECT_SPREAD` or `CHANGE_SPREAD`, and include it in that effect's dependency list. Replace the direct `BACK_TO_QUESTION` and `RESET_READING` callbacks with `handleBackToQuestion` and `handleResetReading`.

Pass the complete state contract to `ReadingReveal`:

```tsx
<ReadingReveal
  spread={state.spread}
  question={state.question}
  results={state.results}
  interpretationStatus={interpretationStatus}
  interpretation={interpretation}
  interpretationError={interpretationError}
  onGenerateInterpretation={() => void requestInterpretation()}
  onReset={handleResetReading}
  onChangeSpread={handleChangeSpread}
/>
```

- [ ] **Step 4: Make `ReadingReveal` a four-state presentational component**

Export and use this prop contract in `ReadingReveal.tsx`:

```ts
export type InterpretationStatus = "idle" | "loading" | "success" | "error";

type ReadingRevealProps = {
  spread: NormalSpread;
  question: string;
  results: NormalReadingResult[];
  interpretationStatus: InterpretationStatus;
  interpretation: string | null;
  interpretationError: string | null;
  onGenerateInterpretation: () => void;
  onReset: () => void;
  onChangeSpread: () => void;
};

```

Update the existing `ReadingReveal` parameter destructuring to include all nine properties in this type; the existing authoritative local-card mapping remains the first statement in the function body.

Keep the existing `revealGrid` and every `基础牌意` card unchanged and before the AI section. Replace the old “尚未接入” notice with this exact block, rendered only when `missingCard` is false:

```tsx
{!missingCard ? (
  <section
    className={styles.interpretationPanel}
    aria-labelledby="normal-interpretation-title"
    aria-live="polite"
  >
    <div className={styles.interpretationHeading}>
      <Sparkles aria-hidden="true" />
      <div>
        <p>CONSTELLATION SYNTHESIS</p>
        <h2 id="normal-interpretation-title">综合解读</h2>
      </div>
    </div>

    {interpretationStatus === "idle" ? (
      <div className={styles.interpretationAction}>
        <button
          type="button"
          className={styles.startButton}
          onClick={onGenerateInterpretation}
        >
          生成综合解读
        </button>
        <p>点击后，本次问题与牌面信息将发送至 AI 服务生成解读。</p>
      </div>
    ) : null}

    {interpretationStatus === "loading" ? (
      <div className={styles.interpretationAction}>
        <button type="button" className={styles.startButton} disabled>
          正在生成综合解读…
        </button>
        <p>已有牌面与基础牌意会保持可见，请稍候。</p>
      </div>
    ) : null}

    {interpretationStatus === "success" && interpretation ? (
      <p className={styles.interpretationCopy}>{interpretation}</p>
    ) : null}

    {interpretationStatus === "error" ? (
      <div className={styles.interpretationError} role="alert">
        <p>
          {interpretationError ??
            "综合解读暂时未能生成，完整牌阵与单张牌意仍可正常查看。"}
        </p>
        <button type="button" onClick={onGenerateInterpretation}>
          重新生成
        </button>
      </div>
    ) : null}
  </section>
) : null}
```

There is deliberately no button in the success branch. `ReadingReveal.tsx` must continue to contain no `fetch` call or API route string.

- [ ] **Step 5: Add bounded, responsive interpretation styles**

Add these selectors to `NormalDraw.module.css` before `.revealActions`:

```css
.interpretationPanel {
  width: min(100%, 860px);
  margin: 30px auto 0;
  border: 1px solid rgba(214, 180, 90, 0.22);
  padding: clamp(20px, 3vw, 34px);
  background:
    radial-gradient(circle at 50% 0, rgba(214, 180, 90, 0.09), transparent 42%),
    rgba(3, 5, 11, 0.78);
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.28);
}

.interpretationHeading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: left;
}

.interpretationHeading svg {
  width: 20px;
  color: var(--gold);
}

.interpretationHeading p {
  margin: 0;
  color: rgba(214, 180, 90, 0.64);
  font-family: var(--font-cinzel), serif;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
}

.interpretationHeading h2 {
  margin: 4px 0 0;
  color: var(--ivory);
  font-family: var(--font-noto-serif-sc), serif;
  font-size: 1.3rem;
  font-weight: 500;
}

.interpretationAction {
  display: grid;
  justify-items: center;
  margin-top: 22px;
}

.interpretationAction .startButton {
  width: min(100%, 320px);
}

.interpretationAction .startButton:disabled {
  opacity: 0.68;
  cursor: wait;
}

.interpretationAction p,
.interpretationError p {
  margin: 10px 0 0;
  color: rgba(190, 187, 192, 0.68);
  font-size: 0.72rem;
  line-height: 1.7;
  text-align: center;
}

.interpretationCopy {
  margin: 22px 0 0;
  color: rgba(244, 235, 221, 0.82);
  font-family: var(--font-noto-serif-sc), serif;
  font-size: clamp(0.9rem, 1.5vw, 1.02rem);
  line-height: 2;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.interpretationError {
  display: grid;
  justify-items: center;
  margin-top: 18px;
}

.interpretationError button {
  min-height: 46px;
  margin-top: 14px;
  border: 1px solid rgba(214, 180, 90, 0.42);
  padding: 0 24px;
  color: var(--ivory);
  background: rgba(2, 3, 9, 0.7);
  cursor: pointer;
}

.interpretationError button:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 4px;
}
```

Inside the existing `@media (max-width: 680px)` block add:

```css
.interpretationPanel { padding-inline: 16px; }
.interpretationCopy { line-height: 1.86; }
```

- [ ] **Step 6: Run visual and type checks**

Run:

```bash
node --experimental-strip-types --test tests/normal-draw-visual-contract.test.mjs
npx tsc --noEmit
```

Expected: all normal-draw visual tests PASS and TypeScript exits 0 with no diagnostics.

---

### Task 5: Full regression, real DeepSeek smoke test and browser acceptance

**Files:**
- No additional source files.
- Verify only; if a command exposes a genuine defect, return to the task that owns that defect and repeat its RED/GREEN cycle.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: evidence that local tests, build, old hand-gesture request shape, real normal request and responsive UI all work without course material.

- [ ] **Step 1: Run the complete automated suite**

Run in order:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected:

- `npm test`: all test files PASS, 0 FAIL.
- `npx tsc --noEmit`: exit 0 with no diagnostics.
- `npm run lint`: no ESLint errors.
- `npm run build`: production build succeeds and includes `/api/readings/interpret` plus `/draw`.

- [ ] **Step 2: Start the local production-like development target without printing secrets**

Run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3013
```

Expected: Next.js reports ready at `http://127.0.0.1:3013`. Do not run `env`, `printenv`, `set`, `cat .env.local`, or any command that prints `DEEPSEEK_API_KEY`.

- [ ] **Step 3: Re-run the unchanged legacy gesture compatibility test without a supplier call**

Run the focused local test that covers both untagged and explicit gesture payloads:

```bash
node --experimental-strip-types --test \
  --test-name-pattern "keeps legacy three/five requests" \
  tests/interpretation-request.test.mjs
```

Expected: 1 matching test PASS, 0 FAIL. This validates the old request shape without creating a second paid or external DeepSeek request.

- [ ] **Step 4: Verify the desktop browser flow and perform the only real DeepSeek smoke call**

At `http://127.0.0.1:3013/draw`:

1. Select any 3-card spread.
2. Enter `未来三个月，我应该优先培养哪一种工作习惯？`.
3. Draw all cards and reach the reveal page.
4. Before clicking, verify Network contains no `/api/readings/interpret` request.
5. Verify every card still shows slot, orientation, keywords and `基础牌意`.
6. Confirm the question and cards come only from this fictional browser flow and the repository's local card data, then click `生成综合解读` once.
7. Verify the button becomes disabled with `正在生成综合解读…` and only one request is created.
8. Verify success renders one continuous article and no second generation button.
9. Start a new draw and verify the old interpretation is absent.

Expected: all nine checks pass. This single browser request is also the one approved real DeepSeek smoke test. If the supplier request fails, verify local cards remain visible and `重新生成` appears; do not click it automatically or send another supplier request without user approval.

- [ ] **Step 5: Verify cancellation and stale-response safety without reaching DeepSeek**

Use browser/CDP request interception at the request stage for the exact URL `http://127.0.0.1:3013/api/readings/interpret`. Pause each request in the browser before it reaches the Next.js server, then perform each action separately:

1. Generate, then click `重新抽牌`.
2. Generate, then click `更换牌阵`.
3. During a later drawing flow, use `返回问题` and confirm no previous interpretation state returns.

Expected: the paused browser requests are canceled/aborted where observable. If the interception tool still exposes a paused request after navigation, fulfill it with a synthetic local response `{"interpretation":"过期测试响应"}` only after the action; that response must not change the new reading, spread selection or question screen. Never continue these intercepted requests to the Next.js server, so they cannot reach DeepSeek.

- [ ] **Step 6: Verify 390×844 mobile behavior**

At a 390×844 viewport, repeat the result-page checks and verify:

- button and disclosure fit without horizontal overflow;
- loading/error controls remain visible and keyboard-focusable;
- 900–1200-character text can scroll vertically without clipping;
- local card meanings remain above the AI section;
- the page has no horizontal scrollbar.

Expected: all checks pass at 390×844.

- [ ] **Step 7: Record completion without unsafe Git staging**

Run:

```bash
git status --short
git diff -- docs/superpowers/specs/2026-07-13-normal-draw-deepseek-interpretation-design.md
```

Expected: the approved spec has no implementation-time modification. Review the exact changed/untracked file list against this plan. Do not stage or commit because the application baseline remains untracked; report this state to the user and request a separate baseline/commit decision.

---

## Final Acceptance Checklist

- [ ] All 12 normal spreads pass authoritative request normalization.
- [ ] Unknown spread, count mismatch, reorder, forged label/ID, duplicate cards/slots, unknown cards and invalid orientation return 400.
- [ ] Existing untagged three/five-card gesture requests still normalize and enter the unchanged route-to-DeepSeek execution path.
- [ ] `max_tokens` follows the four approved card-count bands.
- [ ] Prompt includes spread name, purpose, ordered slots, slot descriptions, card name, orientation, meaning and keywords.
- [ ] Prompt demands one continuous non-Markdown article with 2–3 naturally integrated actions.
- [ ] Empty, invalid JSON, missing, blank and over-4000-character responses are rejected.
- [ ] Normal result page sends no request before the user clicks.
- [ ] Loading prevents duplicate requests; success offers no regeneration; failure retries only after a user click.
- [ ] Reset, spread change, return-to-question and unmount cancel/invalidate pending requests.
- [ ] Local card meanings remain visible in every AI state.
- [ ] Public errors contain no supplier credential/configuration detail.
- [ ] No purchased PDF/Word content enters code, fixtures, prompts, logs or requests.
- [ ] `npm test`, TypeScript, lint and production build all pass.
- [ ] Desktop, 390×844 mobile, legacy API and one normal DeepSeek smoke flow are verified.
