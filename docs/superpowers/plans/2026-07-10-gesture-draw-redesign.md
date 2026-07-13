# Gesture Draw Fullscreen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the shared three-card and five-card gesture-draw experience as a fullscreen ritual, reveal every card together, and generate a server-side DeepSeek interpretation for the original question.

**Architecture:** Keep `GestureDrawPage` as the business orchestrator, keep gesture adapters input-only, and keep `TarotUniverse` visual-only. A new Next.js Route Handler validates client card IDs against the local tarot dataset before calling DeepSeek; the result UI owns only rendering and retry controls.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5, Tailwind CSS 3, CSS animations, MediaPipe Tasks Vision, DeepSeek OpenAI-compatible Chat Completions API.

## Global Constraints

- Preserve the reducer-driven phase flow and the boundary between business state, input control, and visual rendering.
- Support both `three` and `five` spreads in every changed shared component.
- Do not introduce Three.js, R3F, Vitest, Playwright, or another project dependency.
- Keep `DEEPSEEK_API_KEY` server-only; never expose it through a `NEXT_PUBLIC_*` variable.
- Keep the result page inside `100dvh`; only the interpretation panel may scroll internally.
- This workspace has no `.git` directory, so commit steps are replaced by verification checkpoints.

---

### Task 1: Add a minimal regression-test harness and repair daily-draw record validation

**Files:**
- Create: `lib/daily-draw-record.ts`
- Create: `tests/daily-draw-record.test.mjs`
- Modify: `components/hub/DailyDraw.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `isValidDailyDrawRecord(value, date, cardExists): value is DailyDrawRecordData`
- Consumes: `cardExists(id)` supplied by `DailyDraw.tsx` through `getTarotCardById`

- [ ] **Step 1: Extract the existing validator without changing behavior**

Create `lib/daily-draw-record.ts` with the current independent selection/orientation checks:

```ts
import type { TarotOrientation } from "@/lib/tarot-cards";

export type DailyDrawRecordData = {
  date: string;
  shownCardIds: number[];
  selectedCardId: number | null;
  orientation: TarotOrientation | null;
};

export function isValidDailyDrawRecord(
  value: unknown,
  date: string,
  cardExists: (id: number) => boolean
): value is DailyDrawRecordData {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DailyDrawRecordData>;
  const hasThreeCards =
    Array.isArray(record.shownCardIds) &&
    record.shownCardIds.length === 3 &&
    new Set(record.shownCardIds).size === 3 &&
    record.shownCardIds.every((id) => typeof id === "number" && cardExists(id));
  const selectedIsValid =
    record.selectedCardId === null ||
    (typeof record.selectedCardId === "number" &&
      Array.isArray(record.shownCardIds) &&
      record.shownCardIds.includes(record.selectedCardId) &&
      cardExists(record.selectedCardId));
  const orientationIsValid =
    record.orientation === null ||
    record.orientation === "upright" ||
    record.orientation === "reversed";
  return record.date === date && hasThreeCards && selectedIsValid && orientationIsValid;
}
```

- [ ] **Step 2: Move `DailyDraw.tsx` to the extracted validator and verify no behavior change**

Import `DailyDrawRecordData` and `isValidDailyDrawRecord`, replace the local record type, delete the local `isValidRecord`, and call:

```ts
if (isValidDailyDrawRecord(parsed, date, (id) => Boolean(getTarotCardById(id)))) {
  return parsed;
}
```

Run: `npm run lint`
Expected: `✔ No ESLint warnings or errors`

- [ ] **Step 3: Write the failing mismatched-pair tests**

Add `tests/daily-draw-record.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { isValidDailyDrawRecord } from "../lib/daily-draw-record.ts";

const date = "2026-07-10";
const cardExists = (id) => id >= 1 && id <= 78;
const base = { date, shownCardIds: [1, 2, 3] };

test("rejects a selected card without an orientation", () => {
  assert.equal(
    isValidDailyDrawRecord(
      { ...base, selectedCardId: 1, orientation: null },
      date,
      cardExists
    ),
    false
  );
});

test("rejects an orientation without a selected card", () => {
  assert.equal(
    isValidDailyDrawRecord(
      { ...base, selectedCardId: null, orientation: "upright" },
      date,
      cardExists
    ),
    false
  );
});

test("accepts empty and complete selection pairs", () => {
  assert.equal(
    isValidDailyDrawRecord(
      { ...base, selectedCardId: null, orientation: null },
      date,
      cardExists
    ),
    true
  );
  assert.equal(
    isValidDailyDrawRecord(
      { ...base, selectedCardId: 2, orientation: "reversed" },
      date,
      cardExists
    ),
    true
  );
});
```

Add the package script:

```json
"test": "node --experimental-strip-types --test tests/*.test.mjs"
```

- [ ] **Step 4: Run the test and verify RED**

Run: `npm test`
Expected: the first two tests fail because the extracted validator accepts mismatched pairs.

- [ ] **Step 5: Add the paired-state constraint and verify GREEN**

Before the return in `isValidDailyDrawRecord`, add:

```ts
const selectionPairIsValid =
  (record.selectedCardId === null && record.orientation === null) ||
  (typeof record.selectedCardId === "number" &&
    (record.orientation === "upright" || record.orientation === "reversed"));
```

Include `selectionPairIsValid` in the return expression.

Run: `npm test`
Expected: 3 tests pass, 0 fail.

---

### Task 2: Stabilize click animation and remove no-op tracking renders

**Files:**
- Modify: `components/gesture-draw/GestureDrawPage.tsx`
- Modify: `components/gesture-draw/GestureEngine.tsx`
- Modify: `lib/gesture/state-machine.ts`
- Modify: `components/gesture-draw/QuestionInput.module.css`

**Interfaces:**
- Produces: stable `drawnCardIds` identity while `state.results` is unchanged
- Produces: `CLEAR_ERROR` and `CLEAR_CAMERA_ERROR` reducer no-ops when already clear

- [ ] **Step 1: Preserve the existing browser failure evidence**

At 1280×720 in click mode, move the pointer to the right edge for 900ms and record that the 15 selectable card labels do not change. At 390×844, record that the camera retry button has zero client rects.

- [ ] **Step 2: Stabilize derived card IDs and tracking restoration**

Import `useMemo`, then replace the per-render array with:

```ts
const drawnCardIds = useMemo(
  () => state.results.map((result) => result.cardId),
  [state.results]
);
```

Add:

```ts
const handleTrackingRestored = useCallback(() => {
  if (state.error !== null) dispatch({ type: "CLEAR_ERROR" });
}, [state.error]);
```

Pass `handleTrackingRestored` to `GestureController`.

- [ ] **Step 3: Make reducer clears return the original object**

Use:

```ts
case "CLEAR_ERROR":
  return state.error === null ? state : { ...state, error: null };
case "CLEAR_CAMERA_ERROR":
  return state.cameraError === null ? state : { ...state, cameraError: null };
```

- [ ] **Step 4: Deduplicate MediaPipe debug state**

Replace the per-frame `setDebug({...})` with a functional update that returns `current` when `status`, `handCount`, `phase`, `gesture`, and `error` are unchanged:

```ts
setDebug((current) => {
  const next = {
    status: "running" as const,
    handCount: landmarks.length,
    phase: phaseRef.current,
    gesture: metrics.debugLabel,
    error: null
  };
  return current.status === next.status &&
    current.handCount === next.handCount &&
    current.phase === next.phase &&
    current.gesture === next.gesture &&
    current.error === next.error
    ? current
    : next;
});
```

- [ ] **Step 5: Keep the mobile camera control visible**

Replace the mobile `.modePill { display: none; }` rule with:

```css
.modePill {
  display: inline-flex;
  height: 38px;
  padding-inline: 9px;
  font-size: 11px;
  white-space: nowrap;
}
```

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: tests pass; lint and typecheck exit 0.

---

### Task 3: Rebuild shuffle and selection as a fullscreen fan

**Files:**
- Modify: `lib/gesture/card-orbit.ts`
- Modify: `components/gesture-draw/three/CardOrbit.tsx`
- Modify: `components/gesture-draw/ClickGestureAdapter.tsx`
- Modify: `components/gesture-draw/TarotUniverse.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Preserves: `advanceOrbitFrame`, `getVisibleOrbitCards`, and click/gesture selection contracts
- Changes: visual x range from 31 stage units to 44 stage units

- [ ] **Step 1: Expand the orbit geometry**

In `card-orbit.ts`, use `x: Math.sin(angle) * 44`, update `getPointerForOrbitCard` to divide by `44`, and update `getOrbitCardAtPointer` to map pointer x to `44`. Keep card index wrapping unchanged.

- [ ] **Step 2: Keep the grabbed candidate inside the fan**

In `CardOrbit.tsx`:

```ts
const isActive =
  (selectedCardId === slot.cardId || grabbedCardId === slot.cardId) && !isDrawn;
const selectedScale = isActive ? Math.min(slot.scale * 1.08, 1.18) : slot.scale;
```

Pass `selected={isActive}`, keep card opacity at `slot.opacity`, remove the selected vertical lift, and only subdue other cards during `CONFIRMED` or `REVEALING`.

- [ ] **Step 3: Keep invisible click targets aligned with the new fan**

Apply the same active scale, zero lift, and `44vw` x-range assumptions in `ClickGestureAdapter.tsx`. Preserve disabled behavior for already drawn cards.

- [ ] **Step 4: Delete the tether and detached grabbed card**

In `TarotUniverse.tsx`, remove:

```tsx
<div className="gesture-energy-tether" aria-hidden="true" />
```

and remove the standalone grabbed `<TarotCard3D ... />`. Delete the now-unused `getTarotCardById`, `result`, tether calculations, and related CSS variables.

- [ ] **Step 5: Scale the visual fan and shuffle motion**

Update the shared card selectors:

```css
.gesture-tarot-card,
.gesture-card-hit-target {
  width: clamp(112px, 9.5vw, 190px);
}

.gesture-card-orbit--summoning .gesture-tarot-card {
  animation-duration: 720ms;
  filter: blur(1px) brightness(1.18);
}
```

Adjust `gesture-card-shuffle-frenzy` keyframes so their x/y translations sweep across at least `70vw × 48vh`. Delete `.gesture-energy-tether` and its reduced-motion reference.

- [ ] **Step 6: Browser checkpoint**

Verify at 1280×720:

- shuffle cards are visibly larger;
- selection spans approximately 90% of the stage;
- moving left/right changes the visible card labels;
- selected/grabbed card stays in the fan;
- no straight tether line appears.

---

### Task 4: Replace slot textures and remove the last-card-only reveal

**Files:**
- Modify: `components/gesture-draw/TarotUniverse.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `phase`, `spread`, `results`, and `currentSlotIndex`
- Produces: CSS-only empty/active/filled/revealing slot states

- [ ] **Step 1: Add phase-aware energy-slot markup**

Pass `phase` to `SpreadBoard`. Replace the single mist span with:

```tsx
<span className="gesture-spread-slot__energy">
  <i className="gesture-spread-slot__orbit" />
  <i className="gesture-spread-slot__core" />
  <i className="gesture-spread-slot__dust" />
</span>
```

Add `gesture-spread-slot--revealing` to filled slots while `phase === "REVEALING"`.

- [ ] **Step 2: Replace raster texture CSS with live effects**

Delete the `.gesture-spread-slot__mist` rule and add exact layers:

```css
.gesture-spread-slot__energy {
  position: absolute;
  inset: -28%;
  display: block;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255,246,213,.38), rgba(212,175,55,.14) 26%, transparent 68%);
  filter: drop-shadow(0 0 18px rgba(212,175,55,.32));
}
.gesture-spread-slot__orbit {
  position: absolute;
  inset: 10%;
  border: 1px solid rgba(255,231,158,.58);
  border-radius: 999px;
  animation: gesture-slot-orbit 5s linear infinite;
}
.gesture-spread-slot__core {
  position: absolute;
  inset: 28%;
  border: 1px solid rgba(212,175,55,.76);
  border-radius: 7px;
  background: linear-gradient(160deg, rgba(255,231,158,.24), rgba(9,16,38,.8));
  box-shadow: 0 0 26px rgba(212,175,55,.34), inset 0 0 18px rgba(255,231,158,.12);
}
.gesture-spread-slot__dust {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255,246,213,.9) 0 1px, transparent 1.5px);
  background-size: 19px 17px;
  animation: gesture-slot-dust 3.6s linear infinite;
}
.gesture-spread-slot--revealing .gesture-spread-slot__energy {
  animation: gesture-slot-reveal 1.8s cubic-bezier(.18,.82,.18,1) both;
}
```

Add corresponding orbit, dust, and reveal keyframes plus reduced-motion overrides.

- [ ] **Step 3: Make reveal copy describe the shared reveal**

Change `REVEALING` copy to:

```ts
REVEALING: {
  title: "所有牌位正在同时揭示",
  hint: "三张或五张牌将共同回应你的问题"
}
```

Because the detached grabbed card was removed in Task 3, the last card can no longer display its individual meaning during `REVEALING`.

- [ ] **Step 4: Browser checkpoint for both spreads**

Complete three and five selections. During `REVEALING`, assert there is no standalone tarot face and all filled energy slots use the revealing class. After the transition, assert all result cards mount together.

---

### Task 5: Build fullscreen three-card and five-card result layouts

**Files:**
- Modify: `components/gesture-draw/ResultSpace.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Adds props: `interpretationStatus`, `interpretation`, `interpretationError`, `onRetryInterpretation`
- Preserves props: `question`, `spread`, `results`, `onReset`

- [ ] **Step 1: Replace the split aside/article layout**

Render one fullscreen grid:

```tsx
<section className="gesture-result-space ...">
  <div className="gesture-result-shell">
    <div className="gesture-result-toolbar">...</div>
    <div className={cn("gesture-result-cards", `gesture-result-cards--${spread}`)}>
      {results.map((result, index) => (
        <ResultCard key={result.slotId} result={result} index={index} spread={spread} />
      ))}
    </div>
    <InterpretationPanel ... />
    <div className="gesture-result-actions">...</div>
  </div>
</section>
```

- [ ] **Step 2: Add a reusable full tarot face**

`ResultCard` resolves the card from `cardId`, chooses the correct local meaning, shows `slotLabel`, orientation, Chinese/English names, and a compact meaning. Give every card `animationDelay: ${index * 120}ms` so all cards enter as one reveal sequence rather than emphasizing the last card.

- [ ] **Step 3: Apply spread-specific geometry**

Use:

```css
.gesture-result-shell {
  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) minmax(118px, auto) auto;
  gap: 10px;
}
.gesture-result-cards--three {
  display: grid;
  width: min(94vw, 1080px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: clamp(18px, 4vw, 58px);
}
.gesture-result-cards--five {
  position: relative;
  width: min(92vw, 1100px);
  min-height: 310px;
}
```

For the five-card layout, position cards from their existing `result.position` values so the pentagram fills the container. Desktop three-card faces use `clamp(150px, 16vw, 230px)` width; five-card faces use `clamp(112px, 10vw, 158px)`.

- [ ] **Step 4: Add a bounded interpretation panel**

The panel renders loading, success, and error states. The text container gets `overflow:auto`, while `gesture-result-space` stays page-scroll-free. Error state includes one `重新生成综合解答` button wired to `onRetryInterpretation`.

- [ ] **Step 5: Responsive checkpoint**

Verify 1280×720 and 390×844. Three and five cards must remain readable, the page must not scroll, and only interpretation text may scroll.

---

### Task 6: Implement the server-side DeepSeek contract with tests

**Files:**
- Modify: `lib/deepseek.ts`
- Create: `tests/deepseek.test.mjs`
- Create: `app/api/gesture-reading/route.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `DeepSeekReadingRequest { question, spread, results }`
- Produces: HTTP `200 { interpretation }` or structured `4xx/5xx { error }`
- External API: `POST https://api.deepseek.com/chat/completions`
- Default model: `deepseek-v4-flash`

- [ ] **Step 1: Write failing prompt/parser tests**

Create `tests/deepseek.test.mjs` that expects:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildDeepSeekMessages, parseDeepSeekContent } from "../lib/deepseek.ts";

const input = {
  question: "这段关系未来如何？",
  spreadTitle: "抽三张",
  cards: [
    { slotLabel: "过去", cardName: "愚者", orientation: "upright", meaning: "新的开始", keywords: ["开始"] },
    { slotLabel: "现在", cardName: "魔术师", orientation: "reversed", meaning: "资源分散", keywords: ["行动"] },
    { slotLabel: "未来", cardName: "星星", orientation: "upright", meaning: "希望恢复", keywords: ["希望"] }
  ]
};

test("prompt includes the question and every spread position", () => {
  const messages = buildDeepSeekMessages(input);
  const text = messages.map((message) => message.content).join("\n");
  assert.match(text, /这段关系未来如何/);
  assert.match(text, /过去.*愚者/s);
  assert.match(text, /现在.*魔术师/s);
  assert.match(text, /未来.*星星/s);
  assert.match(text, /json/i);
});

test("parser accepts a non-empty interpretation", () => {
  assert.deepEqual(
    parseDeepSeekContent('{"interpretation":"三张牌共同说明需要重建信任。"}'),
    { interpretation: "三张牌共同说明需要重建信任。" }
  );
});

test("parser rejects empty or malformed responses", () => {
  assert.throws(() => parseDeepSeekContent("{}"));
  assert.throws(() => parseDeepSeekContent("not-json"));
});
```

Run: `npm test`
Expected: fail because the functions are not implemented.

- [ ] **Step 2: Implement the typed prompt and parser**

In `lib/deepseek.ts`, define request/response/enriched-card types, produce two messages, and parse JSON. The system message must explicitly request JSON shaped as `{"interpretation":"..."}`, Chinese output, synthesis across every position, non-fatalistic wording, and high-risk-domain boundaries.

- [ ] **Step 3: Verify unit tests GREEN**

Run: `npm test`
Expected: all daily-draw and DeepSeek tests pass.

- [ ] **Step 4: Implement the Route Handler**

`POST` must:

1. Parse JSON and validate question, spread, result count, unique slot IDs, card IDs, and orientations.
2. Compare slot IDs against `getSpreadSlots(spread)`.
3. Resolve every card through `getTarotCardById` and choose upright/reversed meaning server-side.
4. Return `503` with a user-safe message when `DEEPSEEK_API_KEY` is absent.
5. Fetch `https://api.deepseek.com/chat/completions` with:

```ts
{
  model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
  messages: buildDeepSeekMessages(enrichedInput),
  thinking: { type: "disabled" },
  response_format: { type: "json_object" },
  temperature: 0.72,
  max_tokens: 900,
  stream: false
}
```

6. Extract `choices[0].message.content`, parse it, and return `{ interpretation }`.
7. Normalize 400/401/402/422/429/500/503 upstream failures to a non-secret `{ error }` response and never include the API key or raw prompt.

- [ ] **Step 5: Document environment variables**

Add:

```dotenv
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
```

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all exit 0; `/api/gesture-reading` is included in the route build.

Official contract references:

- `https://api-docs.deepseek.com/`
- `https://api-docs.deepseek.com/api/create-chat-completion`
- `https://api-docs.deepseek.com/guides/json_mode/`
- `https://api-docs.deepseek.com/quick_start/error_codes`

---

### Task 7: Start DeepSeek during shared reveal and wire retryable result states

**Files:**
- Modify: `components/gesture-draw/GestureDrawPage.tsx`
- Modify: `components/gesture-draw/ResultSpace.tsx`
- Modify: `lib/gesture/types.ts`

**Interfaces:**
- Produces: `InterpretationStatus = "idle" | "loading" | "success" | "error"`
- Calls: `POST /api/gesture-reading`

- [ ] **Step 1: Add interpretation state types**

Add:

```ts
export type InterpretationStatus = "idle" | "loading" | "success" | "error";
```

- [ ] **Step 2: Add request state and a retryable callback**

In `GestureDrawPage`, store status, text, and error. `requestInterpretation` posts the current question, spread, and results; it sets loading before fetch, success after a valid interpretation, and error after a non-2xx or malformed response.

- [ ] **Step 3: Start the request during `REVEALING`**

Use an effect keyed by `phase`, `spread`, and a stable result signature. Only start when the expected number of results is present. Abort stale requests on reset/unmount and ignore responses from an older request ID.

- [ ] **Step 4: Pass states and retry into `ResultSpace`**

Pass `interpretationStatus`, `interpretation`, `interpretationError`, and `onRetryInterpretation={requestInterpretation}`. On `RESET_TO_QUESTION`, also restore interpretation state to idle.

- [ ] **Step 5: Verify fallback without a key**

With no `DEEPSEEK_API_KEY`, complete both spreads. Expected: all cards and local meanings render, the interpretation panel shows a recoverable configuration error, and retry does not crash the page.

---

### Task 8: End-to-end verification and cleanup

**Files:**
- Verify all files changed in Tasks 1–7
- Verify asset usage under `public/images/gesture/`

**Interfaces:**
- No new interfaces

- [ ] **Step 1: Run the complete automated gate**

Run each command separately:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all tests pass; lint has no warnings/errors; typecheck and build exit 0.

- [ ] **Step 2: Verify three-card click flow**

At 1280×720: enter a question, choose three cards, complete three selections, confirm no isolated third-card meaning, verify the three-card fullscreen result, and verify DeepSeek loading/fallback UI.

- [ ] **Step 3: Verify five-card click flow**

Repeat for five cards and confirm the large five-point result arrangement, no isolated fifth-card meaning, and a shared interpretation panel.

- [ ] **Step 4: Verify mobile mode controls**

At 390×844: confirm the camera mode button is visible on question and spread pages and that both result layouts remain page-scroll-free.

- [ ] **Step 5: Verify no texture or tether remains**

Run:

```bash
rg -n "gesture-energy-tether|card-slot-mist" app components lib
```

Expected: no source references.

- [ ] **Step 6: Report the live-verification limitation clearly**

If no real `DEEPSEEK_API_KEY` is configured, report that the server contract, parser, build, and fallback were verified but the paid upstream response was not executed. Do not request that the key be pasted into chat; instruct the user to place it in `.env.local`.
