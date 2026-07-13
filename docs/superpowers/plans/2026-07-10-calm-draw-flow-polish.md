# Calm Draw Flow Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make card placement and reveal feel deliberate, prevent foreground glow from washing through card backs, and rebalance the result page around readable interpretation content.

**Architecture:** Add one explicit `PLACING` business phase between confirmed pulls and the next selection, with timings centralized in gesture config. Keep visual changes in existing gesture components and CSS, while moving user-facing interpretation error normalization into a small pure helper that can be tested independently.

**Tech Stack:** Next.js 14, React 18, TypeScript, CSS, Node test runner

## Global Constraints

- Preserve the current deep-blue, gold, and starfield visual language.
- Do not change card randomness, orientation logic, gesture thresholds, or the interpretation API contract.
- Keep the page within `100dvh` and preserve mobile behavior.
- Add no dependencies.
- This workspace has no `.git` metadata, so verification replaces commit steps.

---

### Task 1: Deliberate Placement State

**Files:**
- Create: `tests/gesture-state-machine.test.mjs`
- Modify: `lib/gesture/types.ts`
- Modify: `lib/gesture/config.ts`
- Modify: `lib/gesture/state-machine.ts`
- Modify: `components/gesture-draw/GestureDrawPage.tsx`
- Modify: `components/gesture-draw/TarotUniverse.tsx`
- Modify: `components/gesture-draw/three/CardOrbit.tsx`

**Interfaces:**
- Consumes: `gestureDrawReducer(state, action)` and `GESTURE_TIMING`
- Produces: `GesturePhase = ... | "PLACING"`, action `{ type: "PLACEMENT_SETTLED" }`, and timing constants `PLACEMENT_SETTLE_MS` and `FINAL_CONFIRM_HOLD_MS`

- [ ] **Step 1: Write the failing reducer test**

```js
test("a non-final pull settles before returning to selection", () => {
  const placed = gestureDrawReducer(grabbingState, { type: "PULL_CONFIRMED" });
  assert.equal(placed.phase, "PLACING");
  assert.equal(gestureDrawReducer(placed, { type: "PLACEMENT_SETTLED" }).phase, "SELECTING");
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `node --experimental-strip-types --test tests/gesture-state-machine.test.mjs`

Expected: FAIL because the reducer returns `SELECTING` immediately and does not handle `PLACEMENT_SETTLED`.

- [ ] **Step 3: Implement the phase and timers**

```ts
export const GESTURE_TIMING = {
  // existing values
  PLACEMENT_SETTLE_MS: 800,
  FINAL_CONFIRM_HOLD_MS: 1100
} as const;
```

`PULL_CONFIRMED` returns `PLACING` for non-final cards. `PLACEMENT_SETTLED` clears transient grab state and returns to `SELECTING`. `GestureDrawPage` dispatches the settle action after 800ms and starts reveal after 1100ms. `TarotUniverse` waits for `REVEALING_MS + RESULT_SETTLE_MS` before completing the reveal.

- [ ] **Step 4: Run the targeted test and verify it passes**

Run: `node --experimental-strip-types --test tests/gesture-state-machine.test.mjs`

Expected: PASS.

### Task 2: Layering and Light Restraint

**Files:**
- Modify: `components/gesture-draw/TarotUniverse.tsx`
- Modify: `components/gesture-draw/three/EnergyPointer.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: the current `GesturePhase`
- Produces: phase-specific classes for placing, selecting pointer intensity, and reveal-only foreground spread board

- [ ] **Step 1: Add phase-specific semantic classes**

`TarotUniverse` emits `gesture-universe--placing`; `EnergyPointer` emits `gesture-energy-pointer--selecting` and `gesture-energy-pointer--grabbing`.

- [ ] **Step 2: Move the spread board behind the card orbit**

```css
.gesture-spread-board { z-index: 12; }
.gesture-spread-board--revealing { z-index: 28; }
```

- [ ] **Step 3: Reduce foreground glare**

Reduce selected-card pseudo-glow opacity, drop-shadow radius, pointer-core size, and sheen frequency while retaining a clear selected state.

- [ ] **Step 4: Run TypeScript and Lint checks**

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npm run lint`

Expected: exit 0.

### Task 3: Compact Reading Layout and Safe Error Copy

**Files:**
- Create: `lib/interpretation-error.ts`
- Create: `tests/interpretation-error.test.mjs`
- Modify: `components/gesture-draw/GestureDrawPage.tsx`
- Modify: `components/gesture-draw/ResultSpace.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `getPublicInterpretationError(message?: string): string`
- Consumes: `InterpretationStatus` and the existing result card markup

- [ ] **Step 1: Write the failing error-copy test**

```js
test("hides provider configuration details from readers", () => {
  assert.doesNotMatch(getPublicInterpretationError("尚未配置 DeepSeek 密钥"), /DeepSeek|密钥/);
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `node --experimental-strip-types --test tests/interpretation-error.test.mjs`

Expected: FAIL because `getPublicInterpretationError` does not exist.

- [ ] **Step 3: Implement copy normalization and layout changes**

Map provider/configuration errors to `综合解读暂时未能生成，完整牌阵与单张牌意仍可正常查看。`; retain a short retry suggestion for transient public errors. Rename the result heading to `综合牌意` and use CSS widths of `clamp(160px, 15vw, 210px)` for three-card readings and `clamp(104px, 10vw, 166px)` for five-card readings. Give the synthesis section `clamp(132px, 19vh, 190px)` of height.

- [ ] **Step 4: Run the targeted and full test suites**

Run: `node --experimental-strip-types --test tests/interpretation-error.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

### Task 4: Production Verification

**Files:**
- Verify only

**Interfaces:**
- Consumes: all prior task outputs
- Produces: evidence that tests, static checks, production build, and main desktop viewport are healthy

- [ ] **Step 1: Run static and production checks**

Run: `npx tsc --noEmit && npm run lint && npm run build`

Expected: all commands exit 0.

- [ ] **Step 2: Verify the result and draw views at desktop size**

Run the local app, inspect the draw and result routes at approximately 1536×821, and confirm no page-level scrolling, no spread glow in front of card backs, and visibly smaller result cards.
