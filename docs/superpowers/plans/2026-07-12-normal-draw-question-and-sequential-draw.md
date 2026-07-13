# 普通解牌提问与逐张抽牌 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `/draw` 从占位页实现为可用的 12 牌阵图鉴、牌阵确认提问、逐张点击抽牌和统一揭示流程。

**Architecture:** 普通解牌使用独立的 `lib/normal-draw/*` 领域模型与 reducer，页面只编排阶段，视觉组件按图鉴、提问、抽牌、揭示拆分。共享范围只包括 78 张牌数据和品牌基础组件，不依赖或修改 `lib/gesture/*`、每日一牌逻辑及现有 DeepSeek API。

**Tech Stack:** Next.js 14 App Router、React 18、TypeScript、CSS Modules、Node `node:test`、现有 Tailwind/CSS tokens。

## Global Constraints

- 路由固定为 `/draw`，牌阵通过 `?spread=<id>` 恢复。
- 12 牌阵选择页不混入问题输入框。
- 桌面牌背候选 18 张，680px 及以下 12 张；点击区域不小于 44×44px。
- 问题去除首尾空白后 8–240 个字符，拒绝纯数字、纯符号和明显重复字符。
- 进入抽牌时独立洗牌一次；结果牌不重复；每张牌独立 50/50 正逆位。
- 不修改每日一牌或手势抽牌随机逻辑、手势阈值、摄像头组件、`/api/readings/interpret` 或 `lib/deepseek.ts`。
- 不新增第三方依赖。
- 必须支持键盘焦点、390×844 无页面横向滚动和 `prefers-reduced-motion`。
- 当前目录无 Git 元数据，所有任务跳过 commit/branch/worktree/push/PR。

---

### Task 1: 12 牌阵领域模型与问题校验

**Files:**
- Create: `lib/normal-draw/types.ts`
- Create: `lib/normal-draw/spreads.ts`
- Create: `lib/normal-draw/validation.ts`
- Create: `tests/normal-draw-spreads.test.mjs`
- Create: `tests/normal-draw-validation.test.mjs`

**Interfaces:**
- Produces: `NormalSpreadId`, `NormalSpread`, `NormalSpreadSlot`, `NORMAL_SPREADS`, `getNormalSpread(id)`, `validateNormalQuestion(question)`。
- Consumes: none。

- [ ] **Step 1: Write failing spread and validation tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { NORMAL_SPREADS, getNormalSpread } from "../lib/normal-draw/spreads.ts";

test("normal draw exposes twelve internally consistent spreads", () => {
  assert.equal(NORMAL_SPREADS.length, 12);
  assert.equal(new Set(NORMAL_SPREADS.map((spread) => spread.id)).size, 12);
  for (const spread of NORMAL_SPREADS) {
    assert.equal(spread.cardCount, spread.slots.length);
    assert.equal(new Set(spread.slots.map((slot) => slot.id)).size, spread.slots.length);
    assert.ok(spread.slots.every((slot) => slot.x >= 0 && slot.x <= 100));
    assert.ok(spread.slots.every((slot) => slot.y >= 0 && slot.y <= 100));
  }
  assert.equal(getNormalSpread("relationship")?.name, "关系牌阵");
});

test("annual zodiac spread models life areas instead of months", () => {
  const labels = getNormalSpread("annual-zodiac")?.slots.map((slot) => slot.label);
  assert.deepEqual(labels, ["自我", "资源", "沟通", "家庭", "创造", "日常与健康", "关系", "共享与转化", "信念与远行", "事业", "社群", "潜意识"]);
});
```

```js
import assert from "node:assert/strict";
import test from "node:test";
import { validateNormalQuestion } from "../lib/normal-draw/validation.ts";

test("question validation accepts a specific readable question", () => {
  assert.equal(validateNormalQuestion(" 这段关系里，我最需要看清什么？ "), null);
});

test("question validation explains invalid input", () => {
  assert.equal(validateNormalQuestion("太短"), "请写下至少 8 个字符的完整问题");
  assert.equal(validateNormalQuestion("12345678"), "请用文字描述你想询问的事");
  assert.equal(validateNormalQuestion("！！！！！！！！"), "请用文字描述你想询问的事");
  assert.equal(validateNormalQuestion("啊啊啊啊啊啊啊啊"), "请让问题更具体一些");
  assert.equal(validateNormalQuestion("问".repeat(241)), "问题请控制在 240 个字符以内");
});
```

- [ ] **Step 2: Run RED tests**

Run: `node --experimental-strip-types --test tests/normal-draw-spreads.test.mjs tests/normal-draw-validation.test.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/normal-draw/spreads.ts` and `validation.ts`.

- [ ] **Step 3: Implement types, exact spread definitions and validation**

```ts
export type NormalSpreadSlot = { id: string; label: string; description: string; x: number; y: number };
export type NormalSpread = {
  id: string;
  name: string;
  cardCount: number;
  useFor: string;
  sigil: "single" | "arc" | "circle" | "fork" | "cross" | "rise";
  slots: NormalSpreadSlot[];
};
export type NormalReadingResult = {
  cardId: number;
  orientation: "upright" | "reversed";
  slotId: string;
  slotLabel: string;
};
```

`spreads.ts` must export all 12 IDs exactly: `single-guidance`, `three-time`, `four-seasons`, `relationship`, `decision`, `cross`, `horseshoe`, `moon-phase`, `soul-exploration`, `celtic-cross`, `annual-zodiac`, `career-growth`. Each definition copies the names, use cases and slot labels from the approved design spec; circular layouts compute coordinates with `x = 50 + cos(angle) * 34`, `y = 50 + sin(angle) * 38`, while cross/arc/rise layouts use explicit coordinates that remain in 0–100.

```ts
export function validateNormalQuestion(question: string) {
  const trimmed = question.trim();
  const compact = trimmed.replace(/\s/g, "");
  if (trimmed.length > 240) return "问题请控制在 240 个字符以内";
  if (compact.length < 8) return "请写下至少 8 个字符的完整问题";
  if (!/[A-Za-z\u4e00-\u9fff]/.test(compact) || /^\d+$/.test(compact)) return "请用文字描述你想询问的事";
  const unique = new Set(Array.from(compact)).size;
  if (unique === 1 || unique / compact.length < 0.28) return "请让问题更具体一些";
  return null;
}
```

- [ ] **Step 4: Run GREEN tests**

Run: `node --experimental-strip-types --test tests/normal-draw-spreads.test.mjs tests/normal-draw-validation.test.mjs`  
Expected: 4 tests PASS, 0 FAIL.

### Task 2: 独立牌堆与普通流程状态机

**Files:**
- Create: `lib/normal-draw/deck.ts`
- Create: `lib/normal-draw/state-machine.ts`
- Create: `tests/normal-draw-deck.test.mjs`
- Create: `tests/normal-draw-state-machine.test.mjs`

**Interfaces:**
- Consumes: `NormalSpread`, `NormalReadingResult` from Task 1。
- Produces: `shuffleNormalDeck(ids, random?)`, `randomNormalOrientation(random?)`, `initialNormalDrawState`, `normalDrawReducer(state, action)`。

- [ ] **Step 1: Write failing deck and reducer tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { randomNormalOrientation, shuffleNormalDeck } from "../lib/normal-draw/deck.ts";

test("normal deck shuffle keeps every unique card", () => {
  const ids = Array.from({ length: 78 }, (_, index) => index + 1);
  const shuffled = shuffleNormalDeck(ids, () => 0.25);
  assert.equal(shuffled.length, 78);
  assert.equal(new Set(shuffled).size, 78);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), ids);
  assert.notDeepEqual(shuffled, ids);
});

test("orientation uses an even threshold", () => {
  assert.equal(randomNormalOrientation(() => 0.49), "upright");
  assert.equal(randomNormalOrientation(() => 0.5), "reversed");
});
```

```js
import assert from "node:assert/strict";
import test from "node:test";
import { NORMAL_SPREADS } from "../lib/normal-draw/spreads.ts";
import { initialNormalDrawState, normalDrawReducer } from "../lib/normal-draw/state-machine.ts";

test("question submission creates one shuffled deck and enters drawing", () => {
  const spread = NORMAL_SPREADS[1];
  const state = normalDrawReducer(initialNormalDrawState, { type: "SELECT_SPREAD", spread });
  const drawing = normalDrawReducer(state, { type: "SUBMIT_QUESTION", question: "未来三个月我应该把事业重心放在哪里？", deck: Array.from({ length: 78 }, (_, index) => index + 1) });
  assert.equal(drawing.phase, "DRAWING");
  assert.equal(drawing.deck.length, 78);
  assert.equal(drawing.results.length, 0);
});

test("placing locks duplicate clicks and final settlement reveals", () => {
  const spread = NORMAL_SPREADS[1];
  const drawing = { ...initialNormalDrawState, phase: "DRAWING", spread, question: "未来三个月我应该把事业重心放在哪里？", deck: [1, 2, 3, 4], results: [] };
  const placing = normalDrawReducer(drawing, { type: "CHOOSE_CARD", cardId: 2, orientation: "upright" });
  assert.equal(placing.phase, "PLACING");
  assert.equal(normalDrawReducer(placing, { type: "CHOOSE_CARD", cardId: 3, orientation: "reversed" }), placing);
  const second = normalDrawReducer(normalDrawReducer(placing, { type: "PLACEMENT_SETTLED" }), { type: "CHOOSE_CARD", cardId: 3, orientation: "reversed" });
  const third = normalDrawReducer(normalDrawReducer(second, { type: "PLACEMENT_SETTLED" }), { type: "CHOOSE_CARD", cardId: 4, orientation: "upright" });
  assert.equal(normalDrawReducer(third, { type: "PLACEMENT_SETTLED" }).phase, "REVEAL");
});
```

- [ ] **Step 2: Run RED tests**

Run: `node --experimental-strip-types --test tests/normal-draw-deck.test.mjs tests/normal-draw-state-machine.test.mjs`  
Expected: FAIL with missing `deck.ts` and `state-machine.ts`.

- [ ] **Step 3: Implement pure deck and reducer**

`shuffleNormalDeck` clones input and applies Fisher–Yates with an injected random function. `CHOOSE_CARD` accepts only `DRAWING`, an existing card in `deck`, and the current spread slot; it removes that card, appends `{ cardId, orientation, slotId, slotLabel }`, then enters `PLACING`. `PLACEMENT_SETTLED` enters `REVEAL` after `spread.cardCount` results, otherwise returns to `DRAWING`. `BACK_TO_QUESTION` retains spread and question but clears deck/results; `RESET_READING` accepts a fresh 78-card `deck`, retains spread/question and returns to `DRAWING`; `CHANGE_SPREAD` returns to `ATLAS` and clears all reading data.

```ts
export type NormalDrawPhase = "ATLAS" | "QUESTION" | "DRAWING" | "PLACING" | "REVEAL";
export type NormalDrawState = {
  phase: NormalDrawPhase;
  spread: NormalSpread | null;
  question: string;
  deck: number[];
  results: NormalReadingResult[];
};
```

- [ ] **Step 4: Run GREEN tests**

Run: `node --experimental-strip-types --test tests/normal-draw-deck.test.mjs tests/normal-draw-state-machine.test.mjs`  
Expected: 4 tests PASS, 0 FAIL.

### Task 3: 生产牌阵图鉴与通用星盘符印

**Files:**
- Modify: `app/draw/page.tsx`
- Create: `components/draw/NormalDrawExperience.tsx`
- Create: `components/draw/SpreadAtlas.tsx`
- Create: `components/draw/SpreadSigil.tsx`
- Create: `components/draw/NormalDraw.module.css`
- Modify: `app/(hub)/page.tsx`
- Create: `tests/normal-draw-visual-contract.test.mjs`

**Interfaces:**
- Consumes: `NORMAL_SPREADS`, `NormalSpread` from Task 1。
- Produces: accessible `/draw` atlas and `onSelect(spread)` callback boundary for Task 4。

- [ ] **Step 1: Write the failing visual contract**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("normal draw production route renders the dedicated experience", async () => {
  const page = await read("app/draw/page.tsx");
  assert.match(page, /NormalDrawExperience/);
  assert.doesNotMatch(page, /ComingSoon/);
});

test("atlas keeps question input out and provides moving grouped sigils", async () => {
  const [atlas, sigil, css] = await Promise.all([read("components/draw/SpreadAtlas.tsx"), read("components/draw/SpreadSigil.tsx"), read("components/draw/NormalDraw.module.css")]);
  assert.doesNotMatch(atlas, /textarea|input/);
  assert.match(sigil, /sigilMotion/);
  assert.match(sigil, /nodeIndex/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /focus-visible/);
  assert.match(css, /overflow-x:\s*hidden/);
});
```

- [ ] **Step 2: Run RED test**

Run: `node --experimental-strip-types --test tests/normal-draw-visual-contract.test.mjs`  
Expected: FAIL because `app/draw/page.tsx` still imports `ComingSoon` and draw components do not exist.

- [ ] **Step 3: Implement atlas and its signature visual**

`NormalDrawExperience` owns `selectedSpreadId` and a 240ms selection timer, initialized from `useSearchParams().get("spread")`. `SpreadAtlas` renders 12 native buttons with `aria-label="<name>，<cardCount> 张，适用于<useFor>"`. `SpreadSigil` renders one `<g className={styles.sigilMotion}>` containing both orbit paths and point nodes so hover/focus moves the complete symbol.

Use this fixed design plan:

- Palette: `Obsidian #020309`, `Instrument Ink #090c15`, `Ivory #f4ebdd`, `Warm Gold #d6b45a`, `Silver #bebbc0`, auxiliary blue `#7182a2` at no more than 18% opacity.
- Type: existing Noto Serif SC for spread names, Noto Sans SC for explanatory text, Cinzel for numeric/card-count utility labels.
- Layout: desktop 4-column offset atlas, 901–1100px 3 columns, 401–680px 2 columns, 400px and below 1 column.
- Signature: each card is a cut-corner astronomical plate whose full orbit and nodes wake as one instrument; background pointer movement adds bounded warm-gold dust.
- Self-critique: keep all cards equal enough to scan, but use subtle alternating vertical drift instead of a strict table. Remove unrelated glass pills, oversized gradients and decorative copy.

Update the home entry copy to `title: "普通解牌"` and `description: "选择牌阵，回应一个具体问题"` so it no longer overlaps “每日一签”.

- [ ] **Step 4: Run GREEN test**

Run: `node --experimental-strip-types --test tests/normal-draw-visual-contract.test.mjs`  
Expected: 2 tests PASS, 0 FAIL.

### Task 4: 牌阵确认、问题输入与路由恢复

**Files:**
- Modify: `components/draw/NormalDrawExperience.tsx`
- Create: `components/draw/QuestionRitual.tsx`
- Modify: `components/draw/NormalDraw.module.css`
- Modify: `tests/normal-draw-visual-contract.test.mjs`

**Interfaces:**
- Consumes: `validateNormalQuestion`, `NormalSpread`, `normalDrawReducer`。
- Produces: `onStart(question, deck)` transition into drawing and `?spread=<id>` recovery。

- [ ] **Step 1: Extend the visual contract with failing question-stage assertions**

```js
test("question ritual exposes the selected spread, positions and accessible validation", async () => {
  const source = await read("components/draw/QuestionRitual.tsx");
  assert.match(source, /aria-describedby/);
  assert.match(source, /aria-invalid/);
  assert.match(source, /开始抽牌/);
  assert.match(source, /更换牌阵/);
  assert.match(source, /slot\.description/);
});
```

- [ ] **Step 2: Run RED test**

Run: `node --experimental-strip-types --test tests/normal-draw-visual-contract.test.mjs`  
Expected: FAIL with missing `QuestionRitual.tsx`.

- [ ] **Step 3: Implement question ritual and URL behavior**

The component renders the selected sigil, name, `useFor`, numbered slots and descriptions, then a controlled `<textarea maxLength={240}>`. On submit it sets `touched`, reads `validateNormalQuestion`, focuses the textarea on error, or calls `onStart(question.trim())`. `NormalDrawExperience` calls `router.push(`/draw?spread=${spread.id}`)` after the selection lock; invalid IDs show `该牌阵不存在，请重新选择` on the atlas. A valid URL initializes `QUESTION`; browser back to `/draw` restores `ATLAS`.

- [ ] **Step 4: Run GREEN tests**

Run: `node --experimental-strip-types --test tests/normal-draw-validation.test.mjs tests/normal-draw-visual-contract.test.mjs`  
Expected: all tests PASS.

### Task 5: 逐张牌背选择、落位和统一揭示

**Files:**
- Modify: `components/draw/NormalDrawExperience.tsx`
- Create: `components/draw/CardDrawStage.tsx`
- Create: `components/draw/ReadingReveal.tsx`
- Modify: `components/draw/NormalDraw.module.css`
- Modify: `tests/normal-draw-visual-contract.test.mjs`

**Interfaces:**
- Consumes: `tarotCards`, `getTarotCardById`, reducer state/results, deck helpers。
- Produces: full local flow through `REVEAL` without network calls。

- [ ] **Step 1: Add failing draw/reveal source contract**

```js
test("draw stage keeps cards as the primary interactive element", async () => {
  const [draw, reveal] = await Promise.all([read("components/draw/CardDrawStage.tsx"), read("components/draw/ReadingReveal.tsx")]);
  assert.match(draw, /第.*张/);
  assert.match(draw, /牌堆剩余/);
  assert.match(draw, /选择第/);
  assert.match(draw, /disabled=\{isPlacing\}/);
  assert.match(reveal, /基础牌意/);
  assert.match(reveal, /重新抽牌/);
  assert.doesNotMatch(reveal, /fetch\(|\/api\/readings\/interpret/);
});
```

- [ ] **Step 2: Run RED test**

Run: `node --experimental-strip-types --test tests/normal-draw-visual-contract.test.mjs`  
Expected: FAIL with missing `CardDrawStage.tsx` and `ReadingReveal.tsx`.

- [ ] **Step 3: Implement draw stage**

On question submission call `shuffleNormalDeck(tarotCards.map(card => card.id))`. `CardDrawStage` renders `deck.slice(0, mobile ? 12 : 18)` using a resize/matchMedia hook; every button has `aria-label="选择第 ${index + 1} 张牌背，当前牌位 ${slot.label}"`. Clicking dispatches `CHOOSE_CARD` with `randomNormalOrientation()`, disables all candidates during `PLACING`, and a 520ms timer dispatches `PLACEMENT_SETTLED`; reduced motion uses 0ms. Render placed cards as concealed backs in exact slot coordinates, then reveal together only in `REVEAL`.

- [ ] **Step 4: Implement local reveal**

`ReadingReveal` resolves each `cardId`, shows slot label, card Chinese/English name, orientation label, keywords and the matching upright/reversed meaning under `基础牌意`. Missing cards produce `牌面数据不完整，请重新抽牌`. Buttons dispatch `RESET_READING` with a newly shuffled deck and `CHANGE_SPREAD` respectively. No network request is present.

- [ ] **Step 5: Run GREEN tests**

Run: `node --experimental-strip-types --test tests/normal-draw-deck.test.mjs tests/normal-draw-state-machine.test.mjs tests/normal-draw-visual-contract.test.mjs`  
Expected: all tests PASS.

### Task 6: Full verification and real-browser critique

**Files:**
- Modify only if a new failing verification exposes a defect; add a regression test before each fix.

**Interfaces:**
- Consumes: completed Tasks 1–5。
- Produces: fresh evidence for behavior, type safety, lint, build, responsive layout and reduced motion。

- [ ] **Step 1: Run complete automated suite**

Run: `npm test`  
Expected: all tests PASS, 0 FAIL.

- [ ] **Step 2: Run type, lint and production build checks**

Run: `npx tsc --noEmit`  
Expected: exit 0.  
Run: `npm run lint`  
Expected: no errors or warnings.  
Run: `npm run build`  
Expected: exit 0 and `/draw` included in route output.

- [ ] **Step 3: Verify desktop flow at 1280×720**

Start the built app on an unused `127.0.0.1` port. In the browser: open `/draw`; assert 12 spread buttons; select `关系牌阵`; verify URL contains `spread=relationship`; enter `这段关系里，我最需要看清什么？`; draw five unique backs one at a time; verify progress reaches 5/5 and the reveal shows five resolved cards. Record `document.documentElement.scrollWidth === innerWidth` and no console errors.

- [ ] **Step 4: Verify mobile and reduced motion**

Set viewport 390×844; repeat through question and at least one card selection; assert 12 candidate buttons, 44px minimum hit areas, no page horizontal overflow and readable slot labels. Emulate `prefers-reduced-motion: reduce`; verify sigil/particle/flight animation names are `none` and state still reaches `PLACING` then `DRAWING`/`REVEAL`.

- [ ] **Step 5: Final design critique**

Compare the rendered atlas with `obsidian-galaxy-motion-v6.html`: background must be mostly black/ivory/gold, all orbit nodes must move with their paths, selection must not resemble a dashboard table, and the question stage must remain more readable than decorative. Remove at most one non-functional decorative layer if it competes with card names or input text, then rerun Steps 1–4 if code changes.
