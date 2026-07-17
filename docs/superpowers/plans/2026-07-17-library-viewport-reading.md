# 牌库固定视口阅读与原创解读 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不影响普通抽牌、手势、聊天或 DeepSeek 的前提下，完成紧凑牌库首页、1440 × 900 单视口详情、以及 78 张原创的完整正逆位牌库解读。

**Architecture:** 共享的 `lib/tarot-cards.ts` 保持不动；新建 `lib/tarot-library-readings.ts` 承载只被牌库详情读取的完整解读。`TarotDetailContent` 是唯一的客户端局部状态所有者，以一个 ARIA tablist 在“牌义 / 场景”间替换右栏内容；详情 route 保持服务端数据组装，首页筛选仍由 `LibraryBrowser` 独占。

**Tech Stack:** Next.js 14 App Router、React 18、TypeScript、CSS Modules、Node 内置 test runner、Next lint、TypeScript。

## Global Constraints

- 只触碰 `/library`、`/library/[cardId]`、直接牌库组件/样式/测试、`lib/tarot-library-readings.ts` 与牌库来源记录文档。
- 绝不改 `lib/tarot-cards.ts`、`lib/interpretation-request.ts`、`lib/deepseek.ts`、`app/draw/*`、`app/gesture-draw/*`、`app/chat/*` 或其组件。
- 不覆盖工作区任何既有改动，不执行 reset/checkout，不 stage、commit、push 或创建 PR。
- 桌面无纵向滚动的验收基准是 1440 × 900；低于约 780px 高时必须保留内容完整并允许自然页面滚动，不能裁切或缩小正文。
- 运行时牌义只来源于原创本地数据；禁止网络请求、外部文本复制、通用模板回退或静默使用共享短牌义。
- 所有正文最小 16px、行高至少 1.7；触控控件最小高度 44px；支持键盘与 `prefers-reduced-motion`。

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `lib/tarot-library-readings.ts` | 78 条只供牌库读取的完整正逆位解读与 O(1) getter。 |
| `docs/tarot-library-reading-source-map.md` | 每张牌的关键词、既有场景线索与原创扩写审读记录。 |
| `tests/tarot-library-readings.test.mjs` | 数据覆盖、唯一性、篇幅、getter 与共享数据隔离的验证。 |
| `components/library/TarotDetailContent.tsx` | 详情右栏的本地“牌义 / 场景”状态、可访问 tabs 和完整面板。 |
| `components/library/TarotStoryPanel.tsx` | 场景状态中的故事和三列元数据展示。 |
| `app/library/[cardId]/page.tsx` | 服务端组装基础卡、牌库场景、牌库专用解读与稳定导航。 |
| `components/library/LibraryBrowser.tsx` | 保持现有 URL 筛选，仅输出紧凑档案身份区。 |
| `components/library/Library.module.css` | 首页密度、详情固定视口、状态面板和响应式降级。 |
| `tests/tarot-library-visual-contract.test.mjs` | route、可访问性、结构与 CSS 合同。 |

## Task 1: 建立 78 张牌库专用原创解读与来源审读闸门

**Files:**
- Create: `lib/tarot-library-readings.ts`
- Create: `docs/tarot-library-reading-source-map.md`
- Create: `tests/tarot-library-readings.test.mjs`
- Modify: `tests/tarot-library-data.test.mjs:1-76`（只增加共享数据不被替代的回归断言）

**Interfaces:**
- Consumes: `tarotCards` 的卡号、名称、关键词、基础正逆位含义；`tarotLibraryEntries` 的 `story`、`sceneSummary`、`characters`、`location`、`symbols`。
- Produces: `TarotLibraryReading`、`tarotLibraryReadings`、`getTarotLibraryReading(cardId)`；合法卡号总能得到完整牌库解读，非法卡号返回 `null`。
- Does not consume or modify: 普通抽牌、DeepSeek 或共享 `TarotCard.meaning_*` 字段。

- [ ] **Step 1: 写数据合同的失败测试**

  创建 `tests/tarot-library-readings.test.mjs`，先让缺少模块的 import 失败。测试只校验可观察的资料合同：

  ```js
  import assert from "node:assert/strict";
  import test from "node:test";

  import { tarotCards } from "../lib/tarot-cards.ts";
  import { tarotLibraryEntries } from "../lib/tarot-library.ts";
  import {
    getTarotLibraryReading,
    tarotLibraryReadings
  } from "../lib/tarot-library-readings.ts";

  const ids = Array.from({ length: 78 }, (_, index) => index + 1);

  test("library readings cover every canonical card without sharing draw data", () => {
    assert.deepEqual(tarotLibraryReadings.map((reading) => reading.cardId), ids);
    assert.equal(tarotLibraryReadings.length, tarotCards.length);
    assert.equal(tarotLibraryEntries.length, tarotCards.length);
    assert.ok(tarotLibraryReadings.every((reading) => reading.upright.trim()));
    assert.ok(tarotLibraryReadings.every((reading) => reading.reversed.trim()));
  });

  test("library readings are complete, bounded and individually written", () => {
    const upright = tarotLibraryReadings.map((reading) => reading.upright);
    const reversed = tarotLibraryReadings.map((reading) => reading.reversed);
    for (const reading of tarotLibraryReadings) {
      assert.ok(reading.upright.length >= 90 && reading.upright.length <= 160, reading.cardId);
      assert.ok(reading.reversed.length >= 90 && reading.reversed.length <= 160, reading.cardId);
    }
    assert.equal(new Set(upright).size, 78);
    assert.equal(new Set(reversed).size, 78);
  });

  test("library reading lookup is complete and unknown cards have no fallback", () => {
    for (const cardId of ids) {
      assert.equal(getTarotLibraryReading(cardId), tarotLibraryReadings[cardId - 1]);
    }
    assert.equal(getTarotLibraryReading(0), null);
    assert.equal(getTarotLibraryReading(79), null);
  });
  ```

- [ ] **Step 2: 运行新测试，确认它因缺少专用模块而失败**

  Run:

  ```bash
  node --experimental-strip-types --test tests/tarot-library-readings.test.mjs
  ```

  Expected: FAIL，错误只说明 `../lib/tarot-library-readings.ts` 尚不存在。

- [ ] **Step 3: 写入专用数据模块和 78 条完整原创解读**

  新建下列模块，并以卡号升序写入 78 个显式对象。每张的两段文字均在 90–160 汉字内，分别依据同卡的关键词、共享短牌义与已有场景线索独立写成；不得以花色通用句批量替换牌名。卡号分组固定为：1–22 大阿尔卡纳、23–36 权杖、37–50 圣杯、51–64 宝剑、65–78 星币。对象 2 到 78 与对象 1 使用完全相同的字段名，但每段正文必须是该牌独有的原创文本。

  ```ts
  export type TarotLibraryReading = {
    cardId: number;
    upright: string;
    reversed: string;
  };

  export const tarotLibraryReadings: readonly TarotLibraryReading[] = [
    {
      cardId: 1,
      upright: "失重渡桥尚未凝结完全，星行者仍迈向新生星门。正位提醒你：开始不等于莽撞，而是承认风险后主动选择前行。先把最重要的准备落在脚下，再给未知留出试错与修正的空间。当你愿意带着好奇确认下一步，新的路径会逐渐显形。",
      reversed: "未完成的桥面也会放大冲动。逆位提醒你，别把逃离旧门误当成自由；先核对承重、资源和同行者的信号，再决定是否越过边界。暂缓不是退缩，它能让真正的起程更稳。看清代价后再行动，才不会把一时兴起交给失重的路径。"
    }
  ];

  const readingsByCardId = new Map(
    tarotLibraryReadings.map((reading) => [reading.cardId, reading] as const)
  );

  export function getTarotLibraryReading(cardId: number) {
    return readingsByCardId.get(cardId) ?? null;
  }
  ```

  同时建立 `docs/tarot-library-reading-source-map.md`，固定表头为：`卡号 | 牌名 | 关键词 | 既有正位 / 逆位线索 | 场景线索 | 审读结论`。其中列出 78 行，每行仅复述本项目已有的依据，并将审读结论写为“仅据本表线索扩写”。

- [ ] **Step 4: 取消共享数据的隐式依赖**

  在 `tests/tarot-library-data.test.mjs` 追加下列断言，锁定 `lib/tarot-cards.ts` 仍是完整但简洁的共享抽牌数据，而新模块是牌库额外层：

  ```js
  import { tarotLibraryReadings } from "../lib/tarot-library-readings.ts";

  test("full library readings are a separate library-only layer", () => {
    assert.equal(tarotCards.length, 78);
    assert.equal(tarotLibraryReadings.length, 78);
    assert.notEqual(tarotLibraryReadings[0].upright, tarotCards[0].meaning_upright);
    assert.notEqual(tarotLibraryReadings[0].reversed, tarotCards[0].meaning_reversed);
  });
  ```

- [ ] **Step 5: 运行数据测试，确认全部通过**

  Run:

  ```bash
  node --experimental-strip-types --test tests/tarot-library-readings.test.mjs tests/tarot-library-data.test.mjs
  ```

  Expected: PASS，且 78 条资料、getter、唯一性与共享数据隔离均通过。

- [ ] **Step 6: 人工逐条审读内容来源**

  对照 `docs/tarot-library-reading-source-map.md` 与 `lib/tarot-library.ts`，逐张检查 78 条正逆位：没有外部句子、没有未给出处的世界观事实、没有同花色替名复用。发现一项不合格就改相应条目并重跑 Step 5。

## Task 2: 用失败的源代码合同锁定详情的双状态结构

**Files:**
- Modify: `tests/tarot-library-visual-contract.test.mjs:108-170`
- Test: `tests/tarot-library-visual-contract.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `getTarotLibraryReading`；未来 `TarotDetailContent` 的 `reading` 与 `entry` props。
- Produces: 对唯一 top-level tablist、牌义双栏、场景三列、固定视口 CSS、1440px 六列首页和共享抽牌隔离的回归合同。

- [ ] **Step 1: 把旧的“正位 / 逆位二选一”测试替换为失败合同**

  删除 `meaning switch is an accessible local tab set` 对 `TarotMeaningTabs.tsx` 的断言，改为读取新的详情组件与 CSS：

  ```js
  test("detail has one accessible meaning-or-scene switch with complete panels", async () => {
    const [page, detailContent, css] = await Promise.all([
      readProjectFile("app/library/[cardId]/page.tsx"),
      readProjectFile("components/library/TarotDetailContent.tsx"),
      readProjectFile("components/library/Library.module.css")
    ]);

    assert.match(page, /getTarotLibraryReading/);
    assert.match(page, /TarotDetailContent/);
    assert.doesNotMatch(page, /TarotMeaningTabs/);
    assert.match(detailContent, /role="tablist"/);
    assert.match(detailContent, /牌义/);
    assert.match(detailContent, /场景/);
    assert.match(detailContent, /role="tabpanel"/);
    assert.match(detailContent, /reading\.upright/);
    assert.match(detailContent, /reading\.reversed/);
    assert.match(detailContent, /ArrowLeft/);
    assert.match(detailContent, /ArrowRight/);
    assert.match(detailContent, /\.focus\(\)/);
    assert.match(css, /\.meaningReadingGrid[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(css, /\.sceneMeta[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    assert.doesNotMatch(css, /\.detailPanel[\s\S]*?overflow:\s*(?:hidden|auto|scroll)/);
  });
  ```

  在首页网格测试补充：

  ```js
  assert.match(css, /@media \(min-width: 1440px\)[\s\S]*?\.grid[\s\S]*?repeat\(6, minmax\(0, 1fr\)\)/);
  ```

- [ ] **Step 2: 运行合同测试，确认因新组件和新 CSS 缺失而失败**

  Run:

  ```bash
  node --experimental-strip-types --test tests/tarot-library-visual-contract.test.mjs
  ```

  Expected: FAIL，缺少 `TarotDetailContent.tsx`、`getTarotLibraryReading` 或新的类名，而不是测试语法错误。

## Task 3: 实现稳定的详情数据流和唯一的“牌义 / 场景”切换

**Files:**
- Create: `components/library/TarotDetailContent.tsx`
- Modify: `app/library/[cardId]/page.tsx:1-108`
- Modify: `components/library/TarotStoryPanel.tsx:1-47`
- Delete: `components/library/TarotMeaningTabs.tsx`
- Modify: `tests/tarot-library-visual-contract.test.mjs`

**Interfaces:**
- Consumes: `TarotLibraryEntry`, `TarotLibraryReading`, `TarotDetailNavigation` 的现有 `previousCard` / `nextCard` contract。
- Produces: `TarotDetailContent({ entry, reading })`，其唯一状态类型为 `"meaning" | "scene"`；页面把导航置于该组件之后并保持不随切换移动。

- [ ] **Step 1: 新建最小客户端详情内容组件**

  使用一个局部状态和一个唯一 tablist；牌义状态直接同时渲染 `upright`、`reversed`，场景状态渲染经过语义调整的 `TarotStoryPanel`。键盘逻辑只处理左右键：

  ```tsx
  "use client";

  import { useId, useRef, useState, type KeyboardEvent } from "react";

  import type { TarotLibraryEntry } from "@/lib/tarot-library";
  import type { TarotLibraryReading } from "@/lib/tarot-library-readings";
  import styles from "./Library.module.css";
  import { TarotStoryPanel } from "./TarotStoryPanel";

  type DetailView = "meaning" | "scene";

  export function TarotDetailContent({ entry, reading }: {
    entry: TarotLibraryEntry;
    reading: TarotLibraryReading;
  }) {
    const idPrefix = useId();
    const [view, setView] = useState<DetailView>("meaning");
    const meaningTab = useRef<HTMLButtonElement>(null);
    const sceneTab = useRef<HTMLButtonElement>(null);
    const selectAndFocus = (next: DetailView) => {
      setView(next);
      (next === "meaning" ? meaningTab : sceneTab).current?.focus();
    };
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      selectAndFocus(view === "meaning" ? "scene" : "meaning");
    };

    return (
      <section className={styles.detailPanelShell} aria-label="牌库详情内容">
        <div className={styles.detailViewTabs} role="tablist" aria-label="切换牌义或场景">
          {(["meaning", "scene"] as const).map((name) => {
            const selected = view === name;
            const label = name === "meaning" ? "牌义" : "场景";
            return <button key={name} ref={name === "meaning" ? meaningTab : sceneTab} type="button" role="tab" aria-selected={selected}
              aria-controls={`${idPrefix}-${name}-panel`} id={`${idPrefix}-${name}-tab`}
              tabIndex={selected ? 0 : -1} onClick={() => setView(name)} onKeyDown={onKeyDown}
              className={styles.detailViewTab}>{label}</button>;
          })}
        </div>
        <div id={`${idPrefix}-meaning-panel`} role="tabpanel" hidden={view !== "meaning"}
          aria-labelledby={`${idPrefix}-meaning-tab`} className={styles.detailPanel} tabIndex={0}>
          <div className={styles.meaningReadingGrid}>
            <section className={styles.meaningReading}><h2>正位</h2><p>{reading.upright}</p></section>
            <section className={styles.meaningReading}><h2>逆位</h2><p>{reading.reversed}</p></section>
          </div>
        </div>
        <div id={`${idPrefix}-scene-panel`} role="tabpanel" hidden={view !== "scene"}
          aria-labelledby={`${idPrefix}-scene-tab`} className={styles.detailPanel} tabIndex={0}>
          <TarotStoryPanel entry={entry} />
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 2: 将服务端 route 接到牌库专用数据，不碰共享牌义**

  在 `app/library/[cardId]/page.tsx` 引入 `getTarotLibraryReading` 与 `TarotDetailContent`，在 `card` 与 `entry` 之后取得资料：

  ```tsx
  const reading = getTarotLibraryReading(cardId);

  if (!card || !entry || !reading) notFound();
  ```

  用下列调用替换 `TarotMeaningTabs` 与直接的 `TarotStoryPanel`：

  ```tsx
  <TarotDetailContent entry={entry} reading={reading} />
  <TarotDetailNavigation previousCard={previousCard} nextCard={nextCard} />
  ```

  保持 `generateStaticParams`、`dynamicParams`、图片 `priority` 与 `sizes="(max-width: 1023px) 92vw, 22rem"` 不变。

- [ ] **Step 3: 使场景组件成为可嵌入的完整场景状态**

  保留故事、人物、地点、符号与现有 `entry` prop，但移除与旧页面并列区块有关的重复“编年”标题；根节点固定为下列可嵌入结构：

  ```tsx
  <section className={styles.scenePanel} aria-label="场景记录">
    <p className={styles.storyCopy}>{entry.story}</p>
    <dl className={styles.sceneMeta}>
      {/* 人物、地点、符号三项保留 dt / dd 语义与已有 entry 字段 */}
    </dl>
  </section>
  ```

  删除 `TarotMeaningTabs.tsx`，并确保没有其它文件导入它。

- [ ] **Step 4: 运行失败合同与 TypeScript 检查，确认组件接线通过**

  Run:

  ```bash
  node --experimental-strip-types --test tests/tarot-library-readings.test.mjs tests/tarot-library-visual-contract.test.mjs
  npx tsc --noEmit
  ```

  Expected: 两项命令均 PASS；详情 route 不包含 `meaning_upright`、`meaning_reversed`、`TarotMeaningTabs` 或 DeepSeek import。

## Task 4: 实现首页紧凑密度和 1440 × 900 详情视口样式

**Files:**
- Modify: `app/library/[cardId]/page.tsx:52-108`
- Modify: `components/library/LibraryBrowser.tsx:82-126`
- Modify: `components/library/Library.module.css:1-840`
- Modify: `tests/tarot-library-visual-contract.test.mjs`

**Interfaces:**
- Consumes: Task 3 的 `.detailPanelShell`、`.detailViewTabs`、`.detailPanel`、`.meaningReadingGrid`、`.scenePanel`、`.sceneMeta` 类名。
- Produces: 1440 × 900 可读无滚动详情、低矮视口自然降级、1440px 首页 6 列；不改变 `LibraryBrowser` URL 行为。

- [ ] **Step 1: 先增加失败的固定视口与首页密度合同**

  在视觉合同测试加入下列精确检查：

  ```js
  assert.match(css, /\.detailPage[\s\S]*?height:\s*100dvh/);
  assert.match(css, /@media \(min-width: 1024px\) and \(min-height: 780px\)[\s\S]*?\.detailLayout[\s\S]*?grid-template-columns:\s*22rem minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-height: 779px\)[\s\S]*?\.detailPage[\s\S]*?overflow:\s*visible/);
  assert.match(css, /@media \(min-width: 1440px\)[\s\S]*?\.grid[\s\S]*?repeat\(6, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(css, /\.detailPanel[\s\S]*?(?:text-overflow:\s*ellipsis|max-height:|overflow:\s*(?:hidden|auto|scroll))/);
  ```

- [ ] **Step 2: 给详情页面添加仅该 route 使用的壳类名**

  将 detail route 的 `<main>` 与 `.frame` 分别扩展为：

  ```tsx
  <main className={`${styles.page} ${styles.detailPage}`}>
    <div className={`${styles.frame} ${styles.detailFrame}`}>
  ```

  首页不使用这两个类，避免把 100dvh 限制带到卡牌网格。

- [ ] **Step 3: 写入桌面基准和低矮视口的 CSS**

  在 `Library.module.css` 使用下列结构，不为 `.detailPanel` 设置任何隐藏、滚动或截断规则：

  ```css
  .detailPage { min-height: 100dvh; }
  .detailFrame { min-height: 100dvh; }
  .detailPanelShell { min-width: 0; }
  .detailViewTabs { display: flex; border-bottom: 1px solid rgba(201, 169, 97, 0.28); }
  .detailViewTab { min-height: 44px; padding: 0.65rem 1rem; }
  .meaningReadingGrid, .sceneMeta { display: grid; gap: 0.75rem; }
  .meaningReading { padding: 1rem; border-left: 1px solid #c9a961; }

  @media (min-width: 1024px) and (min-height: 780px) {
    .detailPage { height: 100dvh; overflow: hidden; }
    .detailFrame { display: grid; grid-template-rows: 64px 44px minmax(0, 1fr); height: 100dvh; padding-bottom: 1rem; }
    .breadcrumb { min-height: 44px; }
    .detailLayout { grid-template-columns: 22rem minmax(0, 1fr); min-height: 0; padding: 0; gap: clamp(1.25rem, 3vw, 2.5rem); }
    .artworkColumn { position: static; align-self: center; width: 22rem; max-width: 100%; }
    .detailContent { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; min-height: 0; }
    .meaningReadingGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .sceneMeta { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  @media (max-height: 779px) {
    .detailPage { height: auto; overflow: visible; }
    .detailFrame { min-height: 0; }
  }

  @media (min-width: 1440px) {
    .grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  }
  ```

  将当前 `@media (min-width: 1536px)` 的六列规则迁移到 1440px，保留 1280px 的五列规则。移动端采用单列详情、牌义上下排列和完整场景信息。

- [ ] **Step 4: 复核首页 JSX 只保留紧凑身份区与已有筛选控制器**

  `LibraryBrowser.tsx` 必须维持下列头部，且 `filters`、`resultBar`、`TarotCardGrid`、`router.push`、`router.replace` 原样保留：

  ```tsx
  <section className={styles.intro} aria-labelledby="library-title">
    <div className={styles.introIdentity}>
      <p className={styles.introEyebrow}>档案目录</p>
      <h1 id="library-title" className={styles.title}>牌库</h1>
      <p className={styles.completion}>{completionCopy}</p>
    </div>
  </section>
  ```

- [ ] **Step 5: 运行视觉合同，确认测试从 RED 转为 GREEN**

  Run:

  ```bash
  node --experimental-strip-types --test tests/tarot-library-visual-contract.test.mjs
  ```

  Expected: PASS；无旧 `TarotMeaningTabs` 合同、无 `.detailPanel` 裁切、1440px 首页 6 列和两状态结构均被锁定。

## Task 5: 全量验证与人工可读性验收

**Files:**
- Modify only when a failure is within the scoped files above.

**Interfaces:**
- Consumes: Tasks 1–4 的数据、组件与 CSS 合同。
- Produces: 可复现的通过证据；不产生 Git 写操作。

- [ ] **Step 1: 跑完整自动验证集**

  Run:

  ```bash
  npm test
  npm run lint
  npm run build
  npx tsc --noEmit
  ```

  Expected: 四项均 PASS。`npx tsc --noEmit` 必须在 `npm run build` 后运行，以避免本项目 `.next/types` 的时序问题。

- [ ] **Step 2: 在浏览器完成固定视口和响应式检查**

  检查 `/library` 与 `/library/1`，并以最长的正逆位资料和最长场景资料复查。1440 × 900 时首页首屏必须显示 6 张牌；详情无页面滚动、无裁切、左栏牌面稳定、导航可见。切换“牌义 / 场景”后，只允许右栏内容区变化。

  再检查 1366 × 768、1024 × 900 与 768px 以下：低矮桌面允许自然页面滚动；移动端没有溢出、隐藏文本或小于 44px 的操作控件。

- [ ] **Step 3: 审计边界与工作区**

  Run:

  ```bash
  git diff --check
  git status --short
  ```

  Expected: 没有空白错误；所有变更都位于本计划的明确范围或是本来就存在的用户改动。不要运行 `git add`、`git commit`、`git push`、`git reset` 或 `git checkout`。
