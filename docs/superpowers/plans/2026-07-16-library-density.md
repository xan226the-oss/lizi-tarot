# 牌库紧凑布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the oversized library hero and present the desktop card-detail experience as a compact left-artwork/right-information archive view without changing library behavior.

**Architecture:** Keep `LibraryBrowser` as the sole URL-driven filtering owner and keep the detail route/server data composition intact. Make the main change in `Library.module.css`, with narrowly scoped JSX changes only to remove the decorative world copy and adjust the detail artwork responsive `sizes` contract. CSS media queries retain a stacked mobile layout while introducing a sticky desktop artwork rail and compact three-column metadata.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, CSS Modules, Node test runner, Next lint/type/build checks.

## Global Constraints

- Touch only `app/library/[cardId]/page.tsx`, `components/library/LibraryBrowser.tsx`, `components/library/Library.module.css`, and the library visual-contract test.
- Preserve filtering state, browser history behavior, accessibility roles, focus styles, card data, routes, navigation, draw flows, chat, and DeepSeek code.
- Keep body copy at readable desktop size; “fit in one screen” is a density goal, not permission to clip or shrink long content.
- Do not stage or commit: this checkout contains unrelated user changes and the active scope explicitly excludes Git publication.

---

### Task 1: Lock the compact layout contract with source-level tests

**Files:**
- Modify: `tests/tarot-library-visual-contract.test.mjs:64-149`

**Interfaces:**
- Consumes: source text from `components/library/LibraryBrowser.tsx`, `app/library/[cardId]/page.tsx`, and `components/library/Library.module.css`.
- Produces: regression checks for a compact library intro, a sticky desktop artwork column, and a three-column desktop chronicle.

- [ ] **Step 1: Add a failing visual-contract test for the approved layout**

Append this test before the existing detail-route test:

```js
test("library uses a compact archive header and a dense desktop detail layout", async () => {
  const [browser, detail, css] = await Promise.all([
    readProjectFile("components/library/LibraryBrowser.tsx"),
    readProjectFile("app/library/[cardId]/page.tsx"),
    readProjectFile("components/library/Library.module.css")
  ]);

  assert.match(browser, /<h1[^>]*>\s*牌库\s*<\/h1>/);
  assert.doesNotMatch(browser, /同一文明的 78 个历史切面/);
  assert.match(detail, /max-width: 1023px\) 92vw, 22rem/);
  assert.match(css, /\.artworkColumn[\s\S]*?position:\s*sticky/);
  assert.match(css, /\.chronicle[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.intro[\s\S]*?padding-block:\s*1\.25rem/);
});
```

Replace the old desktop-detail CSS assertions in the final test with:

```js
assert.match(css, /\.detailLayout/);
assert.match(css, /grid-template-columns:\s*22rem minmax\(0, 1fr\)/);
assert.match(css, /max-width:\s*22rem/);
assert.match(css, /overflow-wrap:\s*anywhere/);
```

- [ ] **Step 2: Run the focused test and verify it fails before implementation**

Run:

```bash
node --experimental-strip-types --test tests/tarot-library-visual-contract.test.mjs
```

Expected: FAIL because `LibraryBrowser` still renders `原创塔罗牌库` and the stylesheet has neither the sticky rail nor compact chronicle grid.

- [ ] **Step 3: Do not commit**

Keep the test uncommitted with the implementation changes; staging would risk folding unrelated worktree changes into this UI task.

### Task 2: Compact the library landing surface without changing filtering behavior

**Files:**
- Modify: `components/library/LibraryBrowser.tsx:82-126`
- Modify: `components/library/Library.module.css:68-159, 776-806`

**Interfaces:**
- Consumes: existing `cards`, `readyImageCount`, `filters`, and filter callbacks.
- Produces: the same `LibraryFilters` and `TarotCardGrid` calls with a lower-height intro and control region.

- [ ] **Step 1: Replace the decorative hero content with a compact archive identity**

Change only the returned intro JSX to retain a real page heading and completion count, while deleting the world-copy paragraph:

```tsx
<section className={styles.intro} aria-labelledby="library-title">
  <div className={styles.introIdentity}>
    <p className={styles.introEyebrow}>档案目录</p>
    <h1 id="library-title" className={styles.title}>
      牌库
    </h1>
    <p className={styles.completion}>{completionCopy}</p>
  </div>
</section>
```

Leave the `filters`, `resultBar`, URL controller, `router.push`, and `router.replace` code exactly as-is.

- [ ] **Step 2: Replace the introductory and desktop filter layout rules with compact equivalents**

Use these rules in `Library.module.css`; they deliberately reduce vertical space but preserve the existing input/button minimum touch height:

```css
.browser {
  padding-top: clamp(1.25rem, 3vw, 2.5rem);
}

.intro {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-block: 1.25rem;
  border-bottom: 1px solid rgba(201, 169, 97, 0.28);
}

.introIdentity {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.introEyebrow,
.completion {
  margin: 0;
  font-family: var(--font-noto-sans-sc), sans-serif;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  color: #c9a961;
}

.title {
  margin: 0;
  font-family: var(--font-noto-serif-sc), serif;
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.04em;
}

.filters {
  gap: 0.75rem;
  padding-block: 1rem;
}

.resultBar {
  min-height: 48px;
  padding-block: 0.5rem;
}
```

At the 768px media query, replace the two-column filter grid with:

```css
.filters {
  grid-template-columns: minmax(17rem, 1.2fr) minmax(15rem, 0.8fr) minmax(15rem, 0.8fr);
  align-items: center;
}

.searchRow {
  grid-row: auto;
  padding-right: 1.25rem;
}
```

At the mobile media query, add `.intro` and `.introIdentity` wrap rules so the count cannot overflow.

- [ ] **Step 3: Run the focused test and verify it now reaches the detail-layout expectations**

Run:

```bash
node --experimental-strip-types --test tests/tarot-library-visual-contract.test.mjs
```

Expected: the new compact-header assertions pass; the test may still fail on Task 3’s desktop-detail assertions.

- [ ] **Step 4: Do not commit**

Leave the focused JSX/CSS changes uncommitted with the rest of this UI task.

### Task 3: Implement the sticky left-card and compact right-detail layout

**Files:**
- Modify: `app/library/[cardId]/page.tsx:67-76`
- Modify: `components/library/Library.module.css:460-721, 807-835`

**Interfaces:**
- Consumes: `TarotCardArtwork`, `TarotMeaningTabs`, `TarotStoryPanel`, and `TarotDetailNavigation` unchanged.
- Produces: an unchanged detail component tree displayed as a desktop `22rem + content` grid, with a one-column mobile fallback.

- [ ] **Step 1: Bind detail image delivery to the fixed desktop artwork rail**

Replace the `sizes` prop in the detail route with:

```tsx
sizes="(max-width: 1023px) 92vw, 22rem"
```

Do not change image paths, loading priority, alt text, `tone`, or data lookups.

- [ ] **Step 2: Add the compact desktop detail rules**

Use these base rules and the following 1024px override:

```css
.detailLayout {
  display: grid;
  gap: clamp(1.25rem, 3vw, 2.5rem);
  padding: 1rem 0 3rem;
}

.detailIdentity {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 1rem;
  align-items: end;
  padding-bottom: 1.25rem;
}

.detailIdentity h1 {
  font-size: clamp(2.25rem, 4vw, 3.5rem);
}

.meaningSection,
.storySection {
  padding-block: 1.25rem;
}

.sectionHeadingRow {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.sectionHeading {
  font-size: clamp(1.25rem, 2vw, 1.6rem);
}

.meaningPanel {
  min-height: 0;
  padding: 0.9rem 0 0 1rem;
}

.meaningPanel p,
.storyCopy {
  font-size: 1rem;
  line-height: 1.75;
}

@media (min-width: 1024px) {
  .detailLayout {
    grid-template-columns: 22rem minmax(0, 1fr);
    align-items: start;
  }

  .artworkColumn {
    position: sticky;
    top: 1.25rem;
    width: 100%;
    max-width: 22rem;
    margin: 0;
  }

  .chronicle {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 1.25rem;
  }

  .chronicleItem {
    grid-template-columns: 1fr;
    gap: 0.4rem;
    min-height: 5.5rem;
    padding: 0 0 0 1rem;
  }
}
```

Keep the existing 768px two-column detail fallback only for tablet widths and override it at 1024px with the fixed 22rem rail. Do not apply `position: sticky` below 1024px.

- [ ] **Step 3: Run the focused test and verify the complete visual contract passes**

Run:

```bash
node --experimental-strip-types --test tests/tarot-library-visual-contract.test.mjs
```

Expected: all visual-contract subtests PASS, including URL filtering, accessible tabs, deck-boundary navigation, and responsive layout assertions.

- [ ] **Step 4: Do not commit**

Keep all edits unstaged. Confirm `git status --short` does not show changes outside the four planned files plus the approved docs.

### Task 4: Verify behavior, compilation, and rendered layouts

**Files:**
- Modify: none expected

**Interfaces:**
- Consumes: completed UI changes and existing test/build scripts.
- Produces: fresh evidence that the library still builds and presents correctly at desktop and mobile widths.

- [ ] **Step 1: Run the full automated verification set**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: zero failing tests, zero TypeScript diagnostics, zero lint errors, and a successful production build.

- [ ] **Step 2: Run the local preview and inspect both surfaces**

Run:

```bash
npm run dev
```

Inspect `/library` at 1440px and 390px wide. At desktop, confirm the compact header, controls, result count, and first card row appear with no oversized blank hero. Inspect `/library/1` at 1440px and 390px wide. At desktop, confirm the 22rem left artwork rail remains visible while reading the right column; at mobile, confirm one-column order and no clipped controls or text.

- [ ] **Step 3: Record the final worktree boundary**

Run:

```bash
git status --short
```

Expected: no Git staging, committing, remote push, or changes to draw/gesture/chat/DeepSeek files caused by this UI task.
