# Open Astral Ritual Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the modal-like spread selector with an open astral stage, restore unmistakable candidate-card feedback, make infinite card browsing visually continuous, and add one shared astral projection plinth beneath the completed spread.

**Architecture:** Keep the existing gesture business reducer unchanged. Add pure geometry and plinth-state helpers for testable visual decisions, split the spread sigil and ritual plinth into focused components, and use CSS transform/opacity animations around the existing requestAnimationFrame orbit rather than introducing a motion dependency.

**Tech Stack:** Next.js 14, React 18, TypeScript, CSS, Node test runner

## Global Constraints

- Preserve the existing obsidian `#050916`, midnight blue `#0A1730`, ritual gold `#D6B45A`, ivory `#F4EBDD`, and mist blue `#6D86B5` palette.
- Do not modify card randomness, orientation logic, spread data, gesture thresholds, or the DeepSeek API contract.
- Do not add Three.js, R3F, Framer Motion, or any new package.
- Keep native button semantics, keyboard focus, reduced-motion support, and responsive behavior.
- Use [the approved design spec](../specs/2026-07-10-open-astral-ritual-stage-design.md) and [the approved visual concept](../../design-audits/2026-07-10-open-astral-ritual-concept.png) as the source of truth.
- This workspace has no `.git` metadata, so do not attempt commit, branch, worktree, push, or PR commands.

---

### Task 1: Continuous Orbit Edge Flow

**Files:**
- Create: `tests/gesture-card-orbit.test.mjs`
- Modify: `lib/gesture/card-orbit.ts`
- Modify: `components/gesture-draw/three/CardOrbit.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `ORBIT_CONFIG.visibleCards` and the existing `getVisibleOrbitCards(offset)` call sites.
- Produces: `getOrbitEdgeVisibility(localPosition: number, half: number): number` and edge-faded `OrbitCardSlot.opacity` values.

- [ ] **Step 1: Make `card-orbit.ts` directly testable and write the failing edge-fade test**

Change its internal imports to the existing Node-test-compatible form:

```ts
import { tarotCards } from "../tarot-cards.ts";
import { ORBIT_CONFIG } from "./config.ts";
import type { OrbitCardSlot, OrbitFrame, PointerPosition } from "./types.ts";
```

Create `tests/gesture-card-orbit.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  getOrbitEdgeVisibility,
  getVisibleOrbitCards
} from "../lib/gesture/card-orbit.ts";

test("orbit cards fade continuously through the outer one-and-a-half slots", () => {
  assert.equal(getOrbitEdgeVisibility(5.5, 7), 1);
  assert.ok(getOrbitEdgeVisibility(6.5, 7) < 1);
  assert.ok(getOrbitEdgeVisibility(6.5, 7) > 0);
  assert.equal(getOrbitEdgeVisibility(7.5, 7), 0);
});

test("the two outer orbit cards are quieter than the center card", () => {
  const cards = getVisibleOrbitCards(0.49);
  const center = cards.find((card) => card.slotIndex === 0);
  const edge = cards.find((card) => card.slotIndex === -7);

  assert.ok(center);
  assert.ok(edge);
  assert.ok(edge.opacity < center.opacity * 0.5);
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `node --experimental-strip-types --test tests/gesture-card-orbit.test.mjs`

Expected: FAIL because `getOrbitEdgeVisibility` does not exist and the current edge opacity remains above 0.5.

- [ ] **Step 3: Implement deterministic edge fading**

Add this helper below `clamp`:

```ts
export function getOrbitEdgeVisibility(localPosition: number, half: number) {
  const distance = Math.abs(localPosition);
  const fadeStart = half - 1.5;
  const fadeEnd = half + 0.5;
  return clamp((fadeEnd - distance) / (fadeEnd - fadeStart), 0, 1);
}
```

Replace the current opacity calculation inside `getVisibleOrbitCards` with:

```ts
const edgeVisibility = getOrbitEdgeVisibility(localPosition, half);
const opacity = (0.42 + depth * 0.58) * edgeVisibility;
```

- [ ] **Step 4: Remove the per-card re-entry animation and gate the container animation to the first selection entry**

In `CardOrbit.tsx`, remove `summonIndex` and `"--summon-index"`. Add `useEffect`, `useRef`, and `useState`, then record whether the initial fan opening has already played:

```tsx
const [opening, setOpening] = useState(false);
const hasOpenedRef = useRef(false);

useEffect(() => {
  if (phase === "SHUFFLING") {
    hasOpenedRef.current = false;
    setOpening(false);
    return;
  }

  if (phase !== "SELECTING" || hasOpenedRef.current) return;

  hasOpenedRef.current = true;
  setOpening(true);
  const timeoutId = window.setTimeout(() => setOpening(false), 760);

  return () => window.clearTimeout(timeoutId);
}, [phase]);
```

Apply the class only while `opening` is true:

```tsx
opening && "gesture-card-orbit--opened"
```

Replace the per-card CSS rule:

```css
.gesture-card-orbit--expanding .gesture-tarot-card {
  animation: gesture-card-summon 860ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--summon-index, 0) * 105ms);
}
```

with a one-time container entrance:

```css
.gesture-card-orbit--opened {
  animation: gesture-orbit-open 760ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes gesture-orbit-open {
  from {
    opacity: 0;
    transform: translateY(34px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

New edge cards then receive their computed transform and opacity without a mount animation.

- [ ] **Step 5: Run the targeted and existing orbit tests**

Run: `node --experimental-strip-types --test tests/gesture-card-orbit.test.mjs tests/gesture-runtime-state.test.mjs`

Expected: PASS with no failures.

### Task 2: Open Spread Selection Stage

**Files:**
- Create: `lib/gesture/spread-sigil.ts`
- Create: `tests/gesture-spread-sigil.test.mjs`
- Create: `components/gesture-draw/SpreadSigil.tsx`
- Modify: `components/gesture-draw/SpreadSelection.tsx`
- Modify: `components/gesture-draw/QuestionInput.module.css`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `getSpreadSigilGeometry(spread: ReadingSpread): SpreadSigilGeometry`.
- Consumes: `SPREAD_LAYOUTS`, `ReadingSpread`, and existing mode callbacks.

- [ ] **Step 1: Write the failing geometry test**

Create `tests/gesture-spread-sigil.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { getSpreadSigilGeometry } from "../lib/gesture/spread-sigil.ts";

test("three-card sigil exposes a horizontal arc and three anchors", () => {
  const geometry = getSpreadSigilGeometry("three");
  assert.equal(geometry.label, "三张星轨");
  assert.equal(geometry.points.length, 3);
  assert.match(geometry.path, /^M/);
});

test("five-card sigil exposes a closed pentagram and five anchors", () => {
  const geometry = getSpreadSigilGeometry("five");
  assert.equal(geometry.label, "五芒星阵");
  assert.equal(geometry.points.length, 5);
  assert.match(geometry.path, /Z$/);
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `node --experimental-strip-types --test tests/gesture-spread-sigil.test.mjs`

Expected: FAIL because `spread-sigil.ts` does not exist.

- [ ] **Step 3: Implement the sigil geometry helper**

Create `lib/gesture/spread-sigil.ts`:

```ts
import type { ReadingSpread } from "./types.ts";

export type SpreadSigilGeometry = {
  label: string;
  path: string;
  orbit: "wide" | "round";
  points: Array<{ x: number; y: number }>;
};

const GEOMETRY: Record<ReadingSpread, SpreadSigilGeometry> = {
  three: {
    label: "三张星轨",
    path: "M12 63 Q50 23 88 63",
    orbit: "wide",
    points: [
      { x: 24, y: 55 },
      { x: 50, y: 43 },
      { x: 76, y: 55 }
    ]
  },
  five: {
    label: "五芒星阵",
    path: "M50 14 L61 41 L90 41 L67 58 L76 87 L50 69 L24 87 L33 58 L10 41 L39 41 Z",
    orbit: "round",
    points: [
      { x: 50, y: 14 },
      { x: 90, y: 41 },
      { x: 76, y: 87 },
      { x: 24, y: 87 },
      { x: 10, y: 41 }
    ]
  }
};

export function getSpreadSigilGeometry(spread: ReadingSpread) {
  return GEOMETRY[spread];
}
```

- [ ] **Step 4: Build `SpreadSigil` as an accessible visual inside the existing button**

Create `components/gesture-draw/SpreadSigil.tsx`:

```tsx
import type { CSSProperties } from "react";
import { getSpreadSigilGeometry } from "@/lib/gesture/spread-sigil";
import type { ReadingSpread } from "@/lib/gesture/types";
import { cn } from "@/lib/utils";

export function SpreadSigil({ spread }: { spread: ReadingSpread }) {
  const geometry = getSpreadSigilGeometry(spread);

  return (
    <span className={cn("spread-sigil", `spread-sigil--${geometry.orbit}`)} aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <ellipse className="spread-sigil__orbit spread-sigil__orbit--outer" cx="50" cy="55" rx="44" ry={geometry.orbit === "wide" ? "25" : "39"} />
        <ellipse className="spread-sigil__orbit spread-sigil__orbit--inner" cx="50" cy="55" rx="31" ry={geometry.orbit === "wide" ? "15" : "29"} />
        <path className="spread-sigil__path" d={geometry.path} />
        {geometry.points.map((point, index) => (
          <g key={`${point.x}-${point.y}`} className="spread-sigil__point" style={{ "--point-index": index } as CSSProperties}>
            <circle cx={point.x} cy={point.y} r="4.5" />
            <circle cx={point.x} cy={point.y} r="1.5" />
          </g>
        ))}
      </svg>
    </span>
  );
}
```

- [ ] **Step 5: Replace the modal-like selector body**

In `SpreadSelection.tsx`, remove the `styles.recorder`, `titleSigil`, large error box, `gesture-spread-option__map`, and large question box. Keep the existing page background/header. Render this inside `styles.stage`:

```tsx
<div className="spread-stage">
  <div className="spread-stage__heading">
    <Sparkles className="h-4 w-4" aria-hidden="true" />
    <p>选择一种回应方式</p>
    <h1>选择牌阵</h1>
  </div>

  {cameraError ? (
    <p className="spread-stage__camera-status" role="status">
      摄像头暂不可用，当前可直接点击选择；右上角可重试。
    </p>
  ) : null}

  <div className="spread-stage__options">
    {spreadOptions.map((spread) => {
      const layout = SPREAD_LAYOUTS[spread];
      const geometry = getSpreadSigilGeometry(spread);
      return (
        <button key={spread} type="button" className="spread-stage__option" onClick={() => onSelect(spread)}>
          <SpreadSigil spread={spread} />
          <strong>{geometry.label}</strong>
          <span>{layout.subtitle}</span>
        </button>
      );
    })}
  </div>

  <div className="spread-stage__question">
    <span>你的问题</span>
    <p>{question}</p>
  </div>
</div>
```

Add the two imports:

```ts
import { SpreadSigil } from "@/components/gesture-draw/SpreadSigil";
import { getSpreadSigilGeometry } from "@/lib/gesture/spread-sigil";
```

- [ ] **Step 6: Add the open-stage CSS**

Add a new `spread-stage` section to `app/globals.css`. It must use an open grid, no opaque central rectangle, option buttons with transparent backgrounds, 240px minimum target width, and SVG orbit animations that pause under reduced motion. Use the exact palette in Global Constraints. Remove the old `gesture-spread-option*` rules only after no references remain.

Required layout contract:

```css
.spread-stage {
  display: grid;
  width: min(1040px, 92vw);
  min-height: 0;
  place-items: center;
  grid-template-rows: auto auto minmax(260px, 1fr) auto;
}

.spread-stage__options {
  display: grid;
  width: min(820px, 88vw);
  grid-template-columns: repeat(2, minmax(240px, 1fr));
  gap: clamp(36px, 7vw, 104px);
}

.spread-stage__option {
  display: grid;
  min-height: 300px;
  place-items: center;
  border: 0;
  background: transparent;
  color: #f4ebdd;
}

.spread-stage__option:focus-visible {
  outline: 1px solid rgba(214, 180, 90, 0.85);
  outline-offset: 10px;
}
```

- [ ] **Step 7: Run the sigil test, type check, and Lint**

Run: `node --experimental-strip-types --test tests/gesture-spread-sigil.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npm run lint`

Expected: no warnings or errors.

### Task 3: Candidate Card Feedback

**Files:**
- Create: `lib/gesture/card-interaction-state.ts`
- Create: `tests/gesture-card-interaction-state.test.mjs`
- Modify: `components/gesture-draw/three/CardOrbit.tsx`
- Modify: `components/gesture-draw/three/TarotCard3D.tsx`
- Modify: `components/gesture-draw/three/EnergyPointer.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `getCardInteractionState({ selected, grabbed, drawn }): "idle" | "candidate" | "grabbing" | "drawn"`.
- Consumes: existing `selectedCardId`, `grabbedCardId`, and `drawnCardIds`.

- [ ] **Step 1: Write the failing state-priority test**

Create `tests/gesture-card-interaction-state.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { getCardInteractionState } from "../lib/gesture/card-interaction-state.ts";

test("drawn overrides grabbing and grabbing overrides candidate", () => {
  assert.equal(getCardInteractionState({ selected: true, grabbed: false, drawn: false }), "candidate");
  assert.equal(getCardInteractionState({ selected: true, grabbed: true, drawn: false }), "grabbing");
  assert.equal(getCardInteractionState({ selected: true, grabbed: true, drawn: true }), "drawn");
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types --test tests/gesture-card-interaction-state.test.mjs`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement and consume the interaction state**

Create `lib/gesture/card-interaction-state.ts`:

```ts
export type CardInteractionState = "idle" | "candidate" | "grabbing" | "drawn";

export function getCardInteractionState(input: {
  selected: boolean;
  grabbed: boolean;
  drawn: boolean;
}): CardInteractionState {
  if (input.drawn) return "drawn";
  if (input.grabbed) return "grabbing";
  if (input.selected) return "candidate";
  return "idle";
}
```

In `CardOrbit`, calculate the state for every slot and pass separate `selected` and `grabbed` props:

```tsx
const interactionState = getCardInteractionState({
  selected: selectedCardId === slot.cardId,
  grabbed: grabbedCardId === slot.cardId,
  drawn: drawnCards.has(slot.cardId)
});

<TarotCard3D
  selected={interactionState === "candidate"}
  grabbed={interactionState === "grabbing"}
  subdued={interactionState === "drawn" || phase === "PLACING" || phase === "CONFIRMED" || phase === "REVEALING"}
  // keep remaining props
/>
```

- [ ] **Step 4: Add card-edge particles and a visible reticle**

Inside `TarotCard3D`, after `.gesture-tarot-card__inner`, add:

```tsx
<span className="gesture-tarot-card__edge-stars" aria-hidden="true">
  <i /><i /><i />
</span>
```

Candidate CSS requirements:

```css
.gesture-tarot-card--selected {
  filter: brightness(1.12) saturate(1.06) drop-shadow(0 0 20px rgba(214, 180, 90, 0.5));
}

.gesture-tarot-card--selected .gesture-tarot-card__back {
  box-shadow:
    inset 0 0 0 1.5px rgba(244, 220, 148, 0.94),
    0 0 16px rgba(214, 180, 90, 0.48),
    0 0 38px rgba(109, 134, 181, 0.2);
}

.gesture-tarot-card--selected::after {
  inset: -14px;
  opacity: 0.86;
  background: radial-gradient(ellipse, rgba(214, 180, 90, 0.44), rgba(109, 134, 181, 0.12) 48%, transparent 72%);
}

.gesture-tarot-card--grabbed .gesture-tarot-card__back {
  box-shadow:
    inset 0 0 0 2px rgba(255, 232, 166, 0.98),
    0 0 18px rgba(214, 180, 90, 0.62),
    0 0 42px rgba(214, 180, 90, 0.24);
}
```

Move `.gesture-energy-pointer--selecting` back above the orbit with `z-index: 32`, replace its filled white center with a 20px gold ring and short crosshair pseudo-elements, and keep the total glow below 28px.

- [ ] **Step 5: Verify the interaction test and static checks**

Run: `node --experimental-strip-types --test tests/gesture-card-interaction-state.test.mjs tests/gesture-runtime-state.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit 0.

### Task 4: Shared Ritual Plinth

**Files:**
- Create: `lib/gesture/ritual-plinth.ts`
- Create: `tests/gesture-ritual-plinth.test.mjs`
- Create: `components/gesture-draw/RitualPlinth.tsx`
- Modify: `components/gesture-draw/TarotUniverse.tsx`
- Modify: `components/gesture-draw/ResultSpace.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `getRitualPlinthMode(phase: GesturePhase): "hidden" | "emerging" | "active"` and `RitualPlinth({ spread, mode, ambient? })`.
- Consumes: the existing `phase` and `spread` values.

- [ ] **Step 1: Write the failing plinth-mode test**

Create `tests/gesture-ritual-plinth.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { getRitualPlinthMode } from "../lib/gesture/ritual-plinth.ts";

test("the shared plinth appears only after the final confirmation", () => {
  assert.equal(getRitualPlinthMode("SELECTING"), "hidden");
  assert.equal(getRitualPlinthMode("PLACING"), "hidden");
  assert.equal(getRitualPlinthMode("CONFIRMED"), "emerging");
  assert.equal(getRitualPlinthMode("REVEALING"), "active");
  assert.equal(getRitualPlinthMode("RESULT"), "active");
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `node --experimental-strip-types --test tests/gesture-ritual-plinth.test.mjs`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the mode helper**

Create `lib/gesture/ritual-plinth.ts`:

```ts
import type { GesturePhase } from "./types.ts";

export type RitualPlinthMode = "hidden" | "emerging" | "active";

export function getRitualPlinthMode(phase: GesturePhase): RitualPlinthMode {
  if (phase === "CONFIRMED") return "emerging";
  if (phase === "REVEALING" || phase === "RESULT") return "active";
  return "hidden";
}
```

- [ ] **Step 4: Build one reusable plinth component**

Create `components/gesture-draw/RitualPlinth.tsx`:

```tsx
import type { CSSProperties } from "react";
import type { ReadingSpread } from "@/lib/gesture/types";
import type { RitualPlinthMode } from "@/lib/gesture/ritual-plinth";
import { cn } from "@/lib/utils";

export function RitualPlinth({
  spread,
  mode,
  ambient = false
}: {
  spread: ReadingSpread | null;
  mode: RitualPlinthMode;
  ambient?: boolean;
}) {
  if (!spread || mode === "hidden") return null;

  const points = spread === "three" ? 3 : 5;

  return (
    <div className={cn("ritual-plinth", `ritual-plinth--${spread}`, `ritual-plinth--${mode}`, ambient && "ritual-plinth--ambient")} aria-hidden="true">
      <span className="ritual-plinth__beam" />
      <span className="ritual-plinth__mist" />
      <span className="ritual-plinth__ring ritual-plinth__ring--outer" />
      <span className="ritual-plinth__ring ritual-plinth__ring--middle" />
      <span className="ritual-plinth__ring ritual-plinth__ring--inner" />
      <span className="ritual-plinth__track">
        {Array.from({ length: points }, (_, index) => <i key={index} style={{ "--plinth-point": index } as CSSProperties} />)}
      </span>
      <span className="ritual-plinth__dust"><i /><i /><i /><i /><i /></span>
    </div>
  );
}
```

- [ ] **Step 5: Integrate the plinth at both visual stages**

In `TarotUniverse`, import the component and helper, derive the mode, and render it after `StarfieldRings` but before `CardOrbit`:

```tsx
const plinthMode = getRitualPlinthMode(phase);

<StarfieldRings />
<RitualPlinth spread={spread} mode={plinthMode} />
<CardOrbit ... />
```

In `ResultSpace`, render the same component as the first child of `.gesture-reading`:

```tsx
<RitualPlinth spread={spread} mode="active" ambient />
```

- [ ] **Step 6: Implement the CSS plinth layers**

The plinth must use `z-index: 2`, the spread board `z-index: 12`, the orbit `z-index: 18`, and result cards `z-index: 4` or above. Use flattened ellipses with `rotateX(66deg)`, three ring speeds between 12s and 28s, a broad radial beam, and opacity-only mode transitions. The ambient result mode must cap the entire plinth at `opacity: 0.25`.

Required base contract:

```css
.ritual-plinth {
  position: absolute;
  left: 50%;
  top: 64%;
  z-index: 2;
  width: min(76vw, 1040px);
  aspect-ratio: 2.7 / 1;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: opacity 640ms ease, filter 640ms ease;
}

.ritual-plinth--five {
  width: min(62vw, 820px);
  aspect-ratio: 1.65 / 1;
}

.ritual-plinth--emerging { opacity: 0.62; }
.ritual-plinth--active { opacity: 1; }
.ritual-plinth--ambient { opacity: 0.25; }

.ritual-plinth__ring {
  position: absolute;
  inset: 10%;
  border: 1px solid rgba(214, 180, 90, 0.58);
  border-radius: 50%;
  transform: perspective(780px) rotateX(66deg);
  box-shadow: 0 0 24px rgba(214, 180, 90, 0.22);
}
```

- [ ] **Step 7: Run the targeted tests and static checks**

Run: `node --experimental-strip-types --test tests/gesture-ritual-plinth.test.mjs`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npm run lint`

Expected: no warnings or errors.

### Task 5: Completed Spread Cards and Responsive Polish

**Files:**
- Modify: `components/gesture-draw/TarotUniverse.tsx`
- Modify: `app/globals.css`
- Modify: `docs/superpowers/specs/2026-07-10-open-astral-ritual-stage-design.md` only if implementation reveals a necessary clarification

**Interfaces:**
- Consumes: `SpreadBoard` results and `RitualPlinth` layer.
- Produces: visible chosen-card backs over the shared plinth during `CONFIRMED` and `REVEALING`.

- [ ] **Step 1: Render a chosen-card back for every filled spread slot**

Inside `SpreadBoard`, replace the energy-only result branch with:

```tsx
{result ? (
  <>
    <span className="gesture-spread-slot__energy" />
    <span className="gesture-spread-slot__chosen-card">
      <span className="gesture-spread-slot__chosen-art" />
    </span>
  </>
) : null}
```

Add a `gesture-spread-board--complete` class when the phase is `CONFIRMED` or `REVEALING`.

- [ ] **Step 2: Style the completed group over one shared plinth**

The chosen backs must use `/images/gesture/card-back-reference.png`, preserve `323 / 565`, and never create separate pedestal rings. During `CONFIRMED`, cards rise 12px and settle; during `REVEALING`, the group receives one synchronized brightness pulse.

Required CSS contract:

```css
.gesture-spread-slot__chosen-card {
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(74px, 7vw, 112px);
  aspect-ratio: 323 / 565;
  overflow: hidden;
  border: 1px solid rgba(214, 180, 90, 0.72);
  border-radius: 6px;
  background: #050916;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.36), 0 0 20px rgba(214, 180, 90, 0.22);
  opacity: 0;
  transform: translate(-50%, calc(-50% + 12px));
  transition: opacity 520ms ease, transform 720ms cubic-bezier(0.16, 1, 0.3, 1);
}

.gesture-spread-slot__chosen-art {
  position: absolute;
  inset: 0;
  background: url("/images/gesture/card-back-reference.png") center / cover no-repeat;
}

.gesture-spread-board--complete .gesture-spread-slot__chosen-card {
  opacity: 1;
  transform: translate(-50%, -50%);
}
```

- [ ] **Step 3: Add desktop, short-height, mobile, and reduced-motion rules**

Check 1280×720, 1536×821, and a 390px mobile width. Mobile spread selection becomes one row with horizontally adjacent compact sigils when height allows, otherwise a two-row grid inside the fixed viewport. On `prefers-reduced-motion`, remove orbit-open, ring-spin, edge-star, chosen-card-rise, and beam animations while retaining the selected-card outline.

- [ ] **Step 4: Run the full automated verification**

Run: `npm test`

Expected: every test passes.

Run: `npx tsc --noEmit`

Expected: exit 0.

Run: `npm run lint`

Expected: no warnings or errors.

Run: `npm run build`

Expected: production build completes successfully.

- [ ] **Step 5: Perform visual verification and fix the most visible issue found**

Start the local app with `npm run dev -- --hostname 127.0.0.1`. Verify the spread selector, selecting state, sustained left/right browsing, confirmed three-card plinth, confirmed five-card plinth, result page, and reduced-motion mode. Capture at least one desktop and one mobile screenshot if the available browser policy allows localhost. If browser policy rejects localhost, state the limitation explicitly and do not use another browser surface to circumvent it.
