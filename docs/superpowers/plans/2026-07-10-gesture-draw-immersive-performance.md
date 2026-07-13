# Gesture Draw Immersive Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove layered ritual chrome and visible camera imagery, visually blend the cards into the starfield, eliminate duplicate result questions, and isolate high-frequency orbit motion so card rotation stays smooth.

**Architecture:** Add a `GestureRitualRuntime` component that locally owns pointer and orbit animation state while the existing page reducer keeps only business state. Simplify `GestureEngine` into a headless sensor, then remove geometric decoration and replace it with one shared atmosphere layer. Preserve the existing separation between input, visual scene, and page business state.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5, CSS/Tailwind, MediaPipe Tasks Vision, Node 22 test runner.

## Global Constraints

- Keep three-card and five-card spread semantics, card sizes, upright/reversed results, DeepSeek integration, and click mode.
- Keep MediaPipe recognition enabled while hiding the person, skeleton canvas, and debug panel.
- Do not introduce Three.js, R3F, new animation libraries, or new dependencies.
- Do not add visible rings, ellipses, frames, compasses, altars, slot rectangles, or five-point-star lines.
- The result page must display the user question exactly once.
- The workspace has no `.git`; replace commit steps with test checkpoints and do not attempt Git mutations.

---

### Task 1: Add a tested local visual-state reducer

**Files:**
- Create: `lib/gesture/runtime-state.ts`
- Create: `tests/gesture-runtime-state.test.mjs`

**Interfaces:**
- Produces: `RitualVisualState`, `INITIAL_RITUAL_VISUAL_STATE`, and `ritualVisualReducer(state, action)`.
- Consumes: `OrbitFrame` and `PointerPosition` from `lib/gesture/types.ts` via type-only relative imports.

- [ ] **Step 1: Write failing reducer tests**

Test pointer-only updates, complete orbit-frame updates, reference preservation for identical values, and reset behavior:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_RITUAL_VISUAL_STATE,
  ritualVisualReducer
} from "../lib/gesture/runtime-state.ts";

test("pointer frames stay inside the visual runtime", () => {
  const next = ritualVisualReducer(INITIAL_RITUAL_VISUAL_STATE, {
    type: "POINTER_FRAME",
    pointer: { x: 0.4, y: -0.2 }
  });
  assert.deepEqual(next.pointer, { x: 0.4, y: -0.2 });
  assert.equal(next.orbitOffset, 0);
});

test("orbit frames update local motion and candidate together", () => {
  const next = ritualVisualReducer(INITIAL_RITUAL_VISUAL_STATE, {
    type: "ORBIT_FRAME",
    frame: {
      offset: 2.5,
      speed: 1.2,
      selectedCardId: "14",
      selectedVirtualIndex: 13,
      selectedAngle: 0.2,
      pointerAngle: 0.1
    }
  });
  assert.equal(next.orbitOffset, 2.5);
  assert.equal(next.orbitSpeed, 1.2);
  assert.equal(next.selectedCardId, "14");
});

test("identical pointer frames preserve the state reference", () => {
  const state = { ...INITIAL_RITUAL_VISUAL_STATE, pointer: { x: 0.2, y: 0.1 } };
  assert.equal(
    ritualVisualReducer(state, { type: "POINTER_FRAME", pointer: { x: 0.2, y: 0.1 } }),
    state
  );
});

test("reset clears transient visual motion", () => {
  const moving = {
    pointer: { x: 0.5, y: 0.2 },
    orbitOffset: 4,
    orbitSpeed: 3,
    selectedCardId: "19"
  };
  assert.deepEqual(
    ritualVisualReducer(moving, { type: "RESET" }),
    INITIAL_RITUAL_VISUAL_STATE
  );
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test`

Expected: FAIL because `lib/gesture/runtime-state.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure reducer**

```ts
import type { OrbitFrame, PointerPosition } from "./types.ts";

export type RitualVisualState = {
  pointer: PointerPosition;
  orbitOffset: number;
  orbitSpeed: number;
  selectedCardId: string | null;
};

export type RitualVisualAction =
  | { type: "POINTER_FRAME"; pointer: PointerPosition }
  | { type: "ORBIT_FRAME"; frame: OrbitFrame }
  | { type: "RESET" };

export const INITIAL_RITUAL_VISUAL_STATE: RitualVisualState = {
  pointer: { x: 0, y: 0 },
  orbitOffset: 0,
  orbitSpeed: 0,
  selectedCardId: null
};

export function ritualVisualReducer(
  state: RitualVisualState,
  action: RitualVisualAction
): RitualVisualState {
  if (action.type === "RESET") return INITIAL_RITUAL_VISUAL_STATE;
  if (action.type === "POINTER_FRAME") {
    if (state.pointer.x === action.pointer.x && state.pointer.y === action.pointer.y) return state;
    return { ...state, pointer: action.pointer };
  }
  if (
    state.orbitOffset === action.frame.offset &&
    state.orbitSpeed === action.frame.speed &&
    state.selectedCardId === action.frame.selectedCardId
  ) return state;
  return {
    ...state,
    orbitOffset: action.frame.offset,
    orbitSpeed: action.frame.speed,
    selectedCardId: action.frame.selectedCardId
  };
}
```

- [ ] **Step 4: Run tests and type checking**

Run: `npm test`

Expected: all tests pass.

Run: `npx tsc --noEmit`

Expected: exit 0.

---

### Task 2: Isolate orbit motion from the page reducer

**Files:**
- Create: `components/gesture-draw/GestureRitualRuntime.tsx`
- Modify: `components/gesture-draw/GestureDrawPage.tsx:3-345`
- Modify: `lib/gesture/state-machine.ts:1-220`
- Modify: `lib/gesture/types.ts:1-100`

**Interfaces:**
- Produces: `GestureRitualRuntime` with local `useReducer(ritualVisualReducer, INITIAL_RITUAL_VISUAL_STATE)`.
- Consumes: page-level phase, mode, results, spread, business callbacks, and `onTrackingChange(active: boolean)`.
- Emits: confirmed card IDs and phase events only; pointer and orbit frames never reach `GestureDrawPage`.

- [ ] **Step 1: Strengthen state-machine coverage before changing the contract**

Add a test proving `PINCH_CONFIRMED` requires an explicit selected ID and enters `GRABBING` with `grabbedCardId` set. The test should import a new pure helper `confirmSelectedCard(phase, selectedCardId)` from `runtime-state.ts`:

```js
test("confirmed visual candidate becomes the business grab target", () => {
  assert.deepEqual(confirmSelectedCard("SELECTING", "22"), {
    phase: "GRABBING",
    grabbedCardId: "22"
  });
  assert.equal(confirmSelectedCard("SELECTING", undefined), null);
});
```

Run: `npm test`

Expected: FAIL because `confirmSelectedCard` is not exported.

- [ ] **Step 2: Add the pure confirmation helper**

```ts
export function confirmSelectedCard(
  phase: GesturePhase,
  selectedCardId?: string
) {
  if (phase !== "SELECTING" || !selectedCardId) return null;
  return { phase: "GRABBING" as const, grabbedCardId: selectedCardId };
}
```

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Create `GestureRitualRuntime`**

The component must:

```tsx
const [visual, visualDispatch] = useReducer(
  ritualVisualReducer,
  INITIAL_RITUAL_VISUAL_STATE
);

const handlePinchConfirmed = useCallback((cardId?: string) => {
  const confirmedId = cardId ?? visual.selectedCardId ?? undefined;
  if (confirmedId) onPinchConfirmed(confirmedId);
}, [onPinchConfirmed, visual.selectedCardId]);
```

Render `TarotUniverse` only when `showUniverse` is true, and always render `GestureController`. Pass `visual.pointer`, `visual.orbitOffset`, `visual.orbitSpeed`, and `visual.selectedCardId` to both. Dispatch `POINTER_FRAME` and `ORBIT_FRAME` locally.

- [ ] **Step 4: Remove high-frequency visual fields from business state**

Remove `pointer`, `orbitOffset`, `orbitSpeed`, and `selectedCardId` from `GestureDrawState`, `initialGestureDrawState`, reset branches, and `SET_POINTER / SET_ORBIT_FRAME` reducer actions. Make `PINCH_CONFIRMED` require `selectedCardId: string`, then use `confirmSelectedCard` to set `phase` and `grabbedCardId`.

- [ ] **Step 5: Replace page-level controller/universe wiring**

Delete `handlePointerChange` and `handleOrbitFrame` from `GestureDrawPage`. Use `GestureRitualRuntime` in QUESTION, SPREAD, and ritual branches. Keep interpretation state, business dispatch, and `drawnCardIds` in the page.

- [ ] **Step 6: Verify the isolation checkpoint**

Run: `rg -n 'SET_POINTER|SET_ORBIT_FRAME|state\.pointer|state\.orbitOffset|state\.orbitSpeed' components/gesture-draw lib/gesture`

Expected: no business-state occurrences; only local runtime/controller definitions may contain pointer/orbit names.

Run separately: `npm test`, `npm run lint`, `npx tsc --noEmit`

Expected: all commands exit 0.

---

### Task 3: Convert MediaPipe into a headless sensor

**Files:**
- Modify: `components/gesture-draw/GestureEngine.tsx:1-551`
- Modify: `components/gesture-draw/GestureController.tsx:22-230`
- Modify: `components/gesture-draw/GestureRitualRuntime.tsx`
- Modify: `components/gesture-draw/GestureDrawPage.tsx`
- Modify: `app/globals.css:1831-1900`

**Interfaces:**
- Add: `GestureControllerProps.onTrackingChange: (active: boolean) => void`.
- Produce: a visually clipped `<video className="gesture-camera-sensor" />` that remains playable.
- Remove: canvas landmarks, debug React state, visible camera/debug DOM.

- [ ] **Step 1: Add transition-only tracking callbacks**

In `GestureController`, reuse `trackingActiveRef` and call `onTrackingChange(isTracking)` only when the boolean changes. Keep `onTrackingRestored()` for clearing a real error.

- [ ] **Step 2: Remove frame drawing and debug renders**

Delete `canvasRef`, `drawLandmarks`, `DebugState`, `EngineStatus`, `debug`, and every `setDebug` call. The detection loop condition becomes:

```ts
const landmarker = landmarkerRef.current;
if (!video || !landmarker || video.readyState < 2) {
  frameRef.current = window.requestAnimationFrame(detectFrame);
  return;
}
```

- [ ] **Step 3: Render only the hidden video sensor**

```tsx
return enabled ? (
  <video
    ref={videoRef}
    className="gesture-camera-sensor"
    playsInline
    muted
    autoPlay
    aria-hidden="true"
  />
) : null;
```

Add visually clipped CSS using `position: fixed; width: 1px; height: 1px; opacity: 0; clip-path: inset(50%); pointer-events: none;` and remove the camera panel/debug styles.

- [ ] **Step 4: Add minimal sensor status to the ritual header**

`GestureDrawPage` stores `trackingActive` and updates it only through transition callbacks. Show a small dot and one label:

```tsx
<span className="gesture-sensor-status" aria-live="polite">
  <i className={trackingActive ? "is-active" : ""} />
  {state.mode === "click" ? "点击模式" : trackingActive ? "手势识别中" : "请将手放入画面"}
</span>
```

- [ ] **Step 5: Verify no visible person/debug surface remains**

Run: `rg -n 'gesture-camera-panel|gesture-camera-feed|gesture-hand-canvas|gesture-debug-panel|drawLandmarks' components/gesture-draw app/globals.css`

Expected: no matches.

Run separately: `npm run lint`, `npx tsc --noEmit`

Expected: both exit 0.

---

### Task 4: Apply the extreme-minimal atmosphere and card fusion

**Files:**
- Modify: `components/gesture-draw/GestureDrawPage.tsx:228-345`
- Modify: `components/gesture-draw/TarotUniverse.tsx:94-205`
- Modify: `components/gesture-draw/three/StarfieldRings.tsx`
- Modify: `components/gesture-draw/three/CardOrbit.tsx`
- Modify: `components/ui/ParticleField.tsx`
- Modify: `app/globals.css:600-1615, 2009-2154, 2300-2550`

**Interfaces:**
- Keep the `StarfieldRings` component name for topology compatibility, but render only starfield and `gesture-atmosphere-veil`.
- `ParticleField` remains API-compatible while accepting counts below 240.

- [ ] **Step 1: Remove decorative DOM**

Delete frame corners, ritual constellations, left brand/compass, right oracle, stage horizon, altar/discs, and all ring elements. Replace them with one atmosphere veil behind `CardOrbit`.

- [ ] **Step 2: Simplify phase copy and click hints**

Remove `gesture-stage-status` and `gesture-bottom-hint` glass chrome. Keep text, icons, and accessibility labels without borders or backdrop blur.

- [ ] **Step 3: Replace slot geometry with light points**

In `SpreadBoard`, replace energy ring/core/stars markup with:

```tsx
{result ? <span className="gesture-spread-slot__energy" /> : null}
```

Unfilled slots have no rectangular card outline. Active slots show label plus soft point. Filled slots show borderless radial haze and three lightweight particle dots via pseudo-elements.

- [ ] **Step 4: Blend cards into the environment**

Reduce card-back border/shadow contrast, add a low-opacity blue environment wash to the card back, rely on slot depth opacity for outer cards, and replace selected rectangular aura with a borderless radial glow. Remove transform transitions, CSS blur on moving cards, and the inner shuffle animation.

- [ ] **Step 5: Reduce and memoize particles**

Change the clamp to `Math.max(60, Math.min(340, count))`, pass `count={100}` on the gesture page, and export the component through `memo` so parent animation renders do not reconcile the particle list.

- [ ] **Step 6: Remove orphaned decorative CSS and keyframes**

Delete styles and keyframes for removed rings, altar, horizon, compass, oracle, frame corners, energy ring, slot ring, and inner shuffle. Do not leave hidden but animating selectors.

- [ ] **Step 7: Verify visual-source constraints**

Run: `rg -n 'gesture-ring|gesture-stage-altar|gesture-stage-horizon|gesture-mini-compass|gesture-side-oracle|gesture-frame-corner|gesture-reading__orbit|gesture-reading__star-lines' components/gesture-draw`

Expected: no rendered component matches.

Run separately: `npm test`, `npm run lint`, `npx tsc --noEmit`

Expected: all exit 0.

---

### Task 5: Remove duplicate result title and result geometry

**Files:**
- Modify: `components/gesture-draw/GestureDrawPage.tsx:243-261`
- Modify: `components/gesture-draw/ResultSpace.tsx:47-110`
- Modify: `app/globals.css:2560-2880`

**Interfaces:**
- Page header label: `state.phase === "RESULT" ? "命轮已揭示" : state.question`.
- `ResultSpace` remains responsible for the one full-size question heading.

- [ ] **Step 1: Make the page header phase-aware**

Render a compact “命轮已揭示” label in the top bar during RESULT. Keep the full question only in `ResultSpace`.

- [ ] **Step 2: Remove result orbit and star-line markup**

Delete `gesture-reading__orbit` and `gesture-reading__star-lines` elements. Preserve the three-column and five-position layouts.

- [ ] **Step 3: Replace result-card circle sigils**

Replace `gesture-reading-card__sigil` with:

```tsx
<span className="gesture-reading-card__star" aria-hidden="true" />
```

Style it as a small point and short horizontal line with no circular boundary.

- [ ] **Step 4: Soften the synthesis boundary**

Keep one top divider, remove the filled panel/background and side borders, and preserve internal scrolling plus retry/reset actions.

- [ ] **Step 5: Verify source and type constraints**

Run: `rg -n 'gesture-reading__orbit|gesture-reading__star-lines|gesture-reading-card__sigil' components/gesture-draw`

Expected: no matches.

Run separately: `npm run lint`, `npx tsc --noEmit`

Expected: both exit 0.

---

### Task 6: Full verification and live browser acceptance

**Files:**
- Verify only; fix any discovered issue in its owning file.

**Interfaces:**
- No new interfaces.

- [ ] **Step 1: Run automated verification**

Run: `npm test`

Expected: all tests pass.

Run: `npm run lint`

Expected: no warnings or errors.

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npm run build`

Expected: optimized production build succeeds and `/api/readings/interpret` remains dynamic.

- [ ] **Step 2: Verify the three-card flow at 1280×720**

Use click mode to complete QUESTION → SPREAD → SHUFFLING → SELECTING → RESULT. Confirm the question appears once, no person/debug panel exists, no geometric ritual chrome remains, and all three cards are equal.

- [ ] **Step 3: Verify the five-card flow at 1280×720**

Complete all five positions. Confirm all five cards remain visible without star lines or rings and the DeepSeek fallback/success area still works.

- [ ] **Step 4: Verify mobile at 390×844**

Confirm the mode button and sensor status fit, the result stays within one viewport, and `scrollWidth === innerWidth`.

- [ ] **Step 5: Sample continuous rotation and inspect errors**

Rotate continuously for at least five seconds in click mode and gesture mode. Confirm there is no periodic stop caused by page-wide rerenders, no visible camera person, and no browser console errors. Use a short requestAnimationFrame sample to inspect long frame gaps; investigate any repeated interval above 50ms.

- [ ] **Step 6: Keep the final preview running**

Restart `npm run dev` after the production build, verify `http://127.0.0.1:3000/gesture-draw` returns HTTP 200, and provide that link to the user.
