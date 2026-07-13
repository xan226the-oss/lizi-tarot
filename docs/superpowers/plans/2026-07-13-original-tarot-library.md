# 原创塔罗牌库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以现有数字 `cardId` 1–78 为唯一身份，交付一套具有完整原创牌面、世界故事、搜索筛选、正逆位详情、移动端和失败降级能力的第三模块牌库，同时建立可复核的图片生产与 provenance 发布门槛。

**Architecture:** `data/tarot-art-manifest.ts` 是 78 张牌的作者清单，包含生成 brief 和生成运行时故事所需的世界信息；构建脚本从它稳定生成仅含网页字段的 `lib/tarot-library.ts`，避免把 prompt、禁用元素和审核数据打进客户端。`/library` 与 `/library/[cardId]` 只组合 `lib/tarot-cards.ts` 的语义数据和 `lib/tarot-library.ts` 的视觉数据；原始 PNG、WebP 转换、人工 QA、哈希及 provenance 由 `scripts/tarot-art/*` 管理，完整性测试是“完整 78 张已上线”的发布门槛。

**Tech Stack:** Next.js 14 App Router、React 18、TypeScript 5、Tailwind CSS 3、CSS Modules、`next/image`、Node `node:test`、Sharp 0.33、内置图像生成能力。

## Global Constraints

- 范围只包含第三模块“牌库”；不实现或修改 `/chat`、`/chat/[cardId]`、`/chat/group`、聊天 prompt、聊天状态或 DeepSeek 对话。
- 不新增登录、收藏、历史记录、数据库、云端图片服务或其他账号能力。
- `lib/tarot-cards.ts` 的数字 `id` 1–78 是唯一 canonical card identity；不建立字符串 slug，不改 ID，不把图片路径、生成 prompt 或页面状态写入该文件。
- 完整牌组固定为 78 张：22 张大阿尔卡纳；权杖、圣杯、宝剑、星币各 14 张。
- 视觉固定为“漆金暗彩浮雕 + 宇宙漆彩 + 电影式场景叙事”：深靛共同底色、单一主彩、约 10% 金色、环境约 55–65%、完整人物、非正中站桩、非祭坛式对称。
- 所有牌面为竖版 `2:3`、无标题、数字、边框、商标和水印；同一张正面资源支持正逆两种解释，详情页不旋转图片。
- 不使用、临摹、改造或输入现成塔罗牌、艺术家作品、版权不明素材、可识别版权角色或用户购课资料；商业发布前仍需人工相似性检查，页面和文档不得宣称“已证明绝对无版权风险”。
- 数字牌必须清晰呈现与牌面数字一致的原创花色符号；宫廷牌至少出现一个清晰花色符号；大阿尔卡纳不强加统一花色物件。
- 原始 PNG 只归档在 `artwork-source/tarot/<cardId>.png`，不进入 Next.js 运行时和普通 Git；运行时只引用 `public/images/tarot/cards/<cardId>.webp`。
- WebP 固定 `1024 × 1536`、最长边 1536、单张不超过 600 KB；网页缩略图由 `next/image` 和 `sizes` 生成，不维护第二套缩略图。
- 剩余 75 张严格按大阿尔卡纳 21、权杖 14、圣杯 13、宝剑 14、星币 13 五批生产；批次内不逐张询问用户，单张缺陷直接重生成，只有系统性风格漂移、人物结构问题或花色计数错误才暂停该批修正。
- 必须在任何剩余图片生成前完成并验证全部 78 条 manifest；每批只有在源 PNG、WebP、SHA-256、provenance 和人工 QA 同时存在时才完成。
- `/library` 搜索范围固定为 `name_cn`、`name_en`、`keywords`、`meaning_upright`、`meaning_reversed`；首版不做拼音、模糊搜索、复杂排序或 API 请求。
- URL 参数固定为 `q`、`arcana=all|major|minor`、`suit=all|wands|cups|swords|pentacles`；非法筛选值回退为 `all`，结果始终按 `cardId` 升序。
- `/library/[cardId]` 只接受十进制数字字符串并静态生成 1–78；非法、越界、语义缺失或视觉映射缺失时 `notFound()`，图片临时加载失败不返回 404。
- 360 px 及以上默认双列，更窄单列，平板三列，桌面四至六列；筛选横向滚动，点击区至少 44 px，焦点可见，不把信息仅放在 hover，尊重 `prefers-reduced-motion`。
- 首屏仅最前方可见牌面使用 `priority`，其余 lazy；图片失败不自动重试，显示本地统一降级牌、卡名和“牌面暂不可用”，牌意、故事与导航继续工作。
- 不修改 `.env.local`、`.superpowers`、`.next`、`node_modules`、普通抽牌、手势抽牌或现有解读接口。
- 工程验证顺序固定为 `npm run build` → `npx tsc --noEmit` → `npm run lint` → HTTP → 桌面/移动端视觉检查；本仓库 `.next/types` 在 build 后更稳定。

---

## File Structure

### Create: authoring data and production tooling

- `types/tarot-art.ts`：`TarotArtBrief`、`TarotArtManifestEntry`、`TarotArtProvenance`、人工审核状态和生产批次类型。
- `data/tarot-art-manifest.ts`：完整 78 条作者清单、五个生产批次和 `getTarotArtManifestEntry(cardId)`。
- `data/tarot-approved-samples.ts`：Task 3 先建立类型化空映射，Task 4 填入三张已批准样牌的真实原始生成 prompt、创建日期、引用关系和已知源哈希；不以重建 prompt 冒充原文。
- `lib/tarot-art-prompt.ts`：由 brief 构造剩余 75 张的确定性生成 prompt。
- `scripts/tarot-art/generate-library-data.ts`：从作者清单生成运行时 `lib/tarot-library.ts`。
- `scripts/tarot-art/args.ts`：解析 `--ids`、`--batch`、`--root`、审核状态等 CLI 参数。
- `scripts/tarot-art/prompts.ts`：把确定性 prompt 和绝对内部参考路径写入忽略的本地生产文件，并生成 `/tmp` 批次索引。
- `scripts/tarot-art/hash.ts`：流式计算 SHA-256。
- `scripts/tarot-art/process.ts`：校验源图、转 WebP、上限压缩并 upsert provenance。
- `scripts/tarot-art/review.ts`：把视觉人工审核结果写入 provenance，不自动把失败项改为通过。
- `scripts/tarot-art/verify.ts`：按 ID 或整副牌验证源图、WebP、尺寸、体积、哈希和 QA。
- `scripts/tarot-art/contact-sheet.ts`：生成仅供人工 QA 的批次联系表到 `/tmp`，标签位于牌面外部。
- `docs/tarot-art-provenance.json`：78 张最终图片的生成、引用、哈希和人工审核记录。
- `tests/tarot-art-manifest.test.mjs`：manifest、花色计数、批次和 prompt 合同。
- `tests/tarot-art-pipeline.test.mjs`：转换、体积、哈希、provenance upsert 和失败路径。

### Create: runtime data and pure behavior

- `lib/tarot-library.ts`：生成后的 78 条 `TarotLibraryEntry`、`tarotLibraryEntries` 和 `getTarotLibraryEntry(cardId)`；只含网页运行时字段。
- `lib/tarot-library-query.ts`：查询参数归一化、组合搜索筛选和 URL 序列化。
- `lib/tarot-library-routing.ts`：十进制 ID 解析、上一张/下一张边界。
- `lib/tarot-library-assets.ts`：仅在服务端统计当前存在的 WebP，用于未完成阶段的真实完成度文案。
- `tests/tarot-library-data.test.mjs`：78 张语义数据、运行时 metadata 和 canonical ID 一一对应。
- `tests/tarot-library-query.test.mjs`：搜索、组合筛选、非法参数和 URL 状态。
- `tests/tarot-library-routing.test.mjs`：详情 ID 和前后导航边界。

### Create: library UI

- `components/library/LibraryBrowser.tsx`：客户端 URL 状态、搜索筛选和结果计数所有者。
- `components/library/LibraryFilters.tsx`：搜索、arcana/suit 控件、清空动作。
- `components/library/TarotCardGrid.tsx`：结果网格和无结果状态。
- `components/library/TarotLibraryCard.tsx`：缩略牌面、双语名称、类别和关键词。
- `components/library/TarotCardArtwork.tsx`：`next/image`、2:3 漆面加载层和一次性失败降级。
- `components/library/TarotMeaningTabs.tsx`：可访问的正位/逆位 tabs；只管理展示状态。
- `components/library/TarotStoryPanel.tsx`：世界故事、人物、地点和符号。
- `components/library/TarotDetailNavigation.tsx`：不循环的上一张/下一张。
- `components/library/Library.module.css`：牌库网格、详情布局、焦点、横向筛选、加载层和 reduced-motion。
- `public/images/tarot/card-unavailable.svg`：本地统一失败牌，不含 broken-image 图标。
- `app/library/[cardId]/page.tsx`：静态详情路由、数据组合和 `notFound()`。
- `app/library/[cardId]/not-found.tsx`：非法或缺失详情的恢复入口。
- `tests/tarot-library-visual-contract.test.mjs`：组件边界、图片策略、可访问性、聊天隔离和 CSS 响应式合同。

### Modify

- `.gitignore`：忽略 `artwork-source/tarot/*.png` 及本地 prompt/contact-sheet 产物。
- `package.json`、`package-lock.json`：加入 Sharp 和 `tarot:*` 脚本。
- `app/library/page.tsx`：替换 `ComingSoon`，在服务端组合语义与视觉数据并传入浏览器组件。

### Batch-created binary assets

- `artwork-source/tarot/1.png` … `78.png`：本地原始归档，不提交 Git。
- `public/images/tarot/cards/1.webp` … `78.webp`：网页运行时牌面，提交 Git。

### Explicitly Unchanged

- `lib/tarot-cards.ts`
- `app/chat/**`
- `components/draw/**`
- `components/gesture-draw/**`
- `lib/gesture/**`
- `lib/normal-draw/**`
- `app/api/readings/interpret/route.ts`
- `lib/deepseek.ts`
- `.env.local`

---

### Task 1: 建立完整 78 条作者 manifest 和确定性 prompt

**Files:**
- Create: `types/tarot-art.ts`
- Create: `data/tarot-art-manifest.ts`
- Create: `lib/tarot-art-prompt.ts`
- Create: `tests/tarot-art-manifest.test.mjs`

**Interfaces:**
- Consumes: `tarotCards: TarotCard[]` from `lib/tarot-cards.ts` only in tests; production authoring data does not mutate it.
- Produces: `TarotArtBrief`, `TarotArtManifestEntry`, `TarotArtProvenance`, `TarotProductionBatch`, `tarotArtManifest`, `TAROT_PRODUCTION_BATCHES`, `getTarotArtManifestEntry(cardId)`, `buildTarotArtPrompt(entry)`.
- Contract: manifest has exactly one entry for every numeric ID 1–78; future image generation consumes only this manifest plus project-generated internal reference images.

- [ ] **Step 1: Write the failing manifest contract tests**

Create `tests/tarot-art-manifest.test.mjs` with tests that assert the following exact rules:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  TAROT_PRODUCTION_BATCHES,
  getTarotArtManifestEntry,
  tarotArtManifest
} from "../data/tarot-art-manifest.ts";
import { buildTarotArtPrompt } from "../lib/tarot-art-prompt.ts";
import { tarotCards } from "../lib/tarot-cards.ts";

const ids = Array.from({ length: 78 }, (_, index) => index + 1);

test("manifest maps one-to-one to canonical card ids", () => {
  assert.equal(tarotArtManifest.length, 78);
  assert.deepEqual(tarotArtManifest.map((entry) => entry.cardId), ids);
  assert.equal(new Set(tarotArtManifest.map((entry) => entry.cardId)).size, 78);
  assert.deepEqual(tarotCards.map((card) => card.id), ids);
});

test("every brief carries complete authoring and runtime source fields", () => {
  for (const entry of tarotArtManifest) {
    assert.ok(entry.archetype.trim());
    assert.ok(entry.sceneSummary.trim());
    assert.ok(entry.characters.length > 0);
    assert.ok(entry.location.trim());
    assert.ok(entry.dominantColor.trim());
    assert.ok(entry.uprightVisualCue.trim());
    assert.ok(entry.reversedVisualCue.trim());
    assert.ok(entry.requiredElements.length > 0);
    assert.ok(entry.forbiddenElements.length > 0);
    assert.ok(entry.librarySymbols.length > 0);
    assert.ok(entry.internalStyleReferences.every((id) => ids.includes(id)));
    assert.ok(!entry.internalStyleReferences.includes(entry.cardId));
  }
});

test("numeric minor cards use exact original suit-symbol counts", () => {
  for (const card of tarotCards) {
    const entry = getTarotArtManifestEntry(card.id);
    assert.ok(entry);
    if (card.arcana_type === "major") {
      assert.equal(entry.suitSymbol, null);
      assert.equal(entry.requiredSymbolCount, null);
    } else if (card.number >= 1 && card.number <= 10) {
      assert.equal(entry.requiredSymbolCount, card.number);
      assert.match(entry.requiredElements.join(" "), new RegExp(`\\b${card.number}\\b`));
    } else {
      assert.equal(entry.requiredSymbolCount, null);
      assert.match(entry.requiredElements.join(" "), /至少 1 个清晰花色符号/);
    }
  }
});

test("production batches contain exactly the remaining 75 cards", () => {
  assert.deepEqual(
    TAROT_PRODUCTION_BATCHES.map(({ key, ids }) => [key, ids.length]),
    [["major", 21], ["wands", 14], ["cups", 13], ["swords", 14], ["pentacles", 13]]
  );
  const producedIds = TAROT_PRODUCTION_BATCHES.flatMap((batch) => batch.ids);
  assert.equal(producedIds.length, 75);
  assert.equal(new Set(producedIds).size, 75);
  assert.deepEqual(producedIds.filter((id) => [1, 49, 69].includes(id)), []);
  assert.deepEqual([...producedIds, 1, 49, 69].sort((a, b) => a - b), ids);
});

test("prompts enforce the approved visual and originality contract", () => {
  for (const entry of tarotArtManifest) {
    const prompt = buildTarotArtPrompt(entry);
    assert.match(prompt, /portrait 2:3/i);
    assert.match(prompt, /1024 × 1536/);
    assert.match(prompt, /55–65%/);
    assert.match(prompt, /gold limited to about 10%/i);
    assert.match(prompt, /no title, number, border, logo, or watermark/i);
    assert.match(prompt, /do not imitate or reference any named artist/i);
    assert.match(prompt, new RegExp(entry.sceneSummary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/tarot-art-manifest.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `data/tarot-art-manifest.ts`.

- [ ] **Step 3: Define the exact authoring and provenance types**

Create `types/tarot-art.ts` with these public shapes:

```ts
export type TarotArtBrief = {
  cardId: number;
  archetype: string;
  sceneSummary: string;
  characters: string[];
  location: string;
  dominantColor: string;
  suitSymbol: string | null;
  requiredSymbolCount: number | null;
  uprightVisualCue: string;
  reversedVisualCue: string;
  internalStyleReferences: number[];
  requiredElements: string[];
  forbiddenElements: string[];
};

export type TarotArtManifestEntry = TarotArtBrief & {
  librarySymbols: string[];
};

export type TarotArtReview = {
  anatomy: "pass" | "fail";
  symbolCount: "pass" | "fail" | "not-applicable";
  styleConsistency: "pass" | "fail";
  forbiddenElements: "pass" | "fail";
};

export type TarotArtProvenance = {
  cardId: number;
  createdAt: string;
  generator: string;
  prompt: string;
  externalInputs: string[];
  internalReferenceCardIds: number[];
  sourceSha256: string;
  webSha256: string;
  humanReview: TarotArtReview;
};

export type TarotProductionBatchKey =
  | "major"
  | "wands"
  | "cups"
  | "swords"
  | "pentacles";

export type TarotProductionBatch = {
  key: TarotProductionBatchKey;
  label: string;
  ids: number[];
  anchorIds: number[];
};
```

- [ ] **Step 4: Encode the shared rules and exact five production batches**

At the top of `data/tarot-art-manifest.ts`, define the shared original symbol system and batch IDs exactly as follows:

```ts
import type {
  TarotArtManifestEntry,
  TarotProductionBatch
} from "../types/tarot-art.ts";

const GLOBAL_REQUIRED = [
  "portrait 2:3 full-bleed scene",
  "complete visible characters including hands and feet",
  "deep indigo shared base with one dominant color",
  "restrained raised-gold structure at about 10%",
  "asymmetric cinematic action with environment occupying 55–65%"
];

const GLOBAL_FORBIDDEN = [
  "existing tarot deck imagery or composition",
  "named artist imitation",
  "copyrighted character or recognizable franchise",
  "course material or copyright-unknown input",
  "title, number, letters, readable writing, logo, watermark or card border",
  "centered static pose or altar-like symmetry",
  "cropped body, hidden feet, malformed hands or extra limbs",
  "excessive gold, black-and-gold emblem look or cyberpunk neon overload"
];

const SUIT_SYSTEM = {
  wands: {
    symbol: "火种脉杆、彗火导体",
    forbidden: ["traditional wooden wand", "staff bundle"]
  },
  cups: {
    symbol: "潮汐容器、记忆透镜",
    forbidden: ["traditional goblet", "chalice", "cup banquet"]
  },
  swords: {
    symbol: "誓光刃、晶体切面",
    forbidden: ["medieval sword", "crossed steel weapons"]
  },
  pentacles: {
    symbol: "星核印、轨道矿石",
    forbidden: ["coin", "pentagram", "five-pointed star"]
  }
} as const;

export const TAROT_PRODUCTION_BATCHES: TarotProductionBatch[] = [
  { key: "major", label: "大阿尔卡纳", ids: Array.from({ length: 21 }, (_, i) => i + 2), anchorIds: [1, 49] },
  { key: "wands", label: "权杖", ids: Array.from({ length: 14 }, (_, i) => i + 23), anchorIds: [1, 69] },
  { key: "cups", label: "圣杯", ids: [...Array.from({ length: 12 }, (_, i) => i + 37), 50], anchorIds: [49, 1] },
  { key: "swords", label: "宝剑", ids: Array.from({ length: 14 }, (_, i) => i + 51), anchorIds: [1, 49] },
  { key: "pentacles", label: "星币", ids: [...Array.from({ length: 4 }, (_, i) => i + 65), ...Array.from({ length: 9 }, (_, i) => i + 70)], anchorIds: [69, 1] }
];
```

- [ ] **Step 5: Author all 78 entries from the locked content matrix**

Encode every row below as one `TarotArtManifestEntry`. Each row inherits `GLOBAL_REQUIRED` and `GLOBAL_FORBIDDEN`; a minor entry also inherits its `SUIT_SYSTEM` rules. `正/逆视觉线索` must be stored as two separate strings, not merged. Numeric minors use the exact Arabic count in `requiredElements`; court cards use `requiredSymbolCount: null` plus `"至少 1 个清晰花色符号"`.

| ID | 原型与电影式场景 | 角色 / 地点 / 主彩 | 符号 | 正向视觉线索 / 逆向视觉线索 |
| --- | --- | --- | --- | --- |
| 1 愚者 | 星行者在失重渡桥尚未完全凝结时迈向新生星门 | 一名中性青年星行者 / 废弃星象台外的失重渡桥 / 青绿与珊瑚红 | 无 | 脚步主动越过旧门 / 未完成桥面保留风险张力 |
| 2 魔术师 | 工艺师在原火工坊把四路失衡能源汇入一台新生装置 | 一名成年工艺师 / 原火工坊 / 琥珀与孔雀蓝 | 无 | 双手把分散资源化为可用结构 / 一路能源暗示操控过度会反噬 |
| 3 女祭司 | 档案守门人拨开可见资料与隐秘记忆之间的半透明潮幕 | 一名成年档案守门人 / 静潮档案井 / 靛蓝与银紫 | 无 | 安静凝视潮幕后真实纹理 / 潮幕折射出难辨的第二层影像 |
| 4 皇后 | 生态培育者让荒废轨道温室重新长出矿物花林 | 一名成熟女性培育者与两名远景助手 / 轨道温室 / 翡翠与珊瑚 | 无 | 植群向她的照料展开 / 过密根系缠住一段灌溉渠 |
| 5 皇帝 | 城市构架师用发光网格稳定正在漂移的居住环 | 一名中年构架师 / 天穹结构台 / 暗红与冷金 | 无 | 网格形成清楚边界与承重秩序 / 一处过硬节点出现应力裂纹 |
| 6 教皇 | 资深译师向年轻学徒打开会回应提问的活体文明档案 | 一名老年译师与三名学徒 / 回声学宫 / 靛青与暖白 | 无 | 多代知识在共同阅读中传递 / 一页旧规则与现实产生冲突 |
| 7 恋人 | 两名来自不同轨道城的使者在分岔航桥上共同选择第三条新路线 | 两名成年使者 / 双月航桥 / 玫紫与青绿 | 无 | 两人的手势和目光对齐同一路径 / 身后两条安全旧路仍在拉扯选择 |
| 8 战车 | 导航员驾驶轻型航舟穿过两股相反重力流 | 一名成年导航员 / 风暴航道 / 电蓝与琥珀 | 无 | 身体与操纵面共同校准方向 / 舟尾两股力量仍可能撕开航线 |
| 9 力量 | 生态巡护者以呼吸和开放手势安抚失控的等离子巨兽 | 一名成年巡护者与原创能量兽 / 黯兽林 / 珊瑚红与深紫 | 无 | 温和接近使巨兽光焰回落 / 巨兽胸腔仍保留未消散的躁动 |
| 10 隐士 | 信号守塔人独自在断联边境寻找一颗微弱回声星 | 一名老年守塔人 / 星尘灯塔 / 冷蓝与微金 | 无 | 手中窄光找到远方回应 / 灯塔外巨大黑暗提示隔绝风险 |
| 11 命运之轮 | 四名维护者在轨道环城中转动巨型相位机构，让停滞城区重新接轨 | 四名维护者 / 相位环枢纽 / 紫晶与琥珀 | 无 | 多人协作推动周期转向 / 一段回转齿轨仍脱离控制 |
| 12 正义 | 裁定者在非对称证据桥上比对两份互相矛盾的光记录 | 一名成年裁定者与两名当事人 / 因果议庭 / 冰蓝与暗金 | 无 | 透明证据层被逐一对齐 / 被遮挡的小片记录提示信息不全 |
| 13 倒吊人 | 修复者自愿倒悬进入失重井，从反向视角发现隐藏裂缝 | 一名成年修复者 / 重力反转井 / 青紫与冷白 | 无 | 放松姿态让新结构显现 / 连接索过紧暗示停留可能变成拖延 |
| 14 死神 | 旧城市外壳崩解时，迁徙者把活种送入新生舱 | 三名不同年龄迁徙者 / 灰烬花园 / 黑蓝与新绿 | 无 | 新芽与前行队伍承接结束 / 一人回望旧壳显示放不下的代价 |
| 15 节制 | 流体工程师让灼热星浆与冷潮在生物反应桥中稳定汇流 | 一名成年工程师 / 双潮汇流站 / 青绿与橙红 | 无 | 两种能量形成均匀新流体 / 边缘溅出的过量流体提示失衡 |
| 16 恶魔 | 欲望炉前的人们被自己不断收紧的光索牵住，其中一人发现松扣 | 三名成年人 / 深层资源炉 / 暗红与烟紫 | 无 | 清醒者触及可自行打开的扣环 / 另两人仍主动拉紧光索 |
| 17 高塔 | 天塔被一束真实讯号从内部震裂，居民沿应急索有序撤离 | 五名撤离者 / 断裂天塔 / 电紫与火橙 | 无 | 裂缝暴露隐藏的腐坏核心 / 坠落碎片和拥堵出口保留冲击感 |
| 18 星星 | 疗愈者把发光种子撒入受污染的星髓湖，使水面出现微弱复苏 | 一名成年疗愈者 / 星髓疗愈湖 / 青蓝与银白 | 无 | 种子形成通向远方的希望光路 / 湖底仍有大片暗区尚未恢复 |
| 19 月亮 | 两名侦测员在梦雾沼泽中辨认互相冲突的双重倒影 | 两名成年侦测员 / 梦雾观测带 / 月白与深紫 | 无 | 一人用真实触感校准路径 / 倒影生成诱人的错误出口 |
| 20 太阳 | 一群孩子和照护者打开长期封闭的日核温室，让光照进公共花园 | 三名儿童与两名成年人 / 日核温室 / 暖金与珊瑚 | 无 | 开放动作带来共享生命力 / 过曝边缘提示快乐也需节制 |
| 21 审判 | 沉睡舱群收到共同召集信号，人们依次醒来回应过去的承诺 | 多年龄居民群体 / 回声召集港 / 白金与群青 | 无 | 醒来者主动走向汇合平台 / 一些舱门仍关闭显示逃避自省 |
| 22 世界 | 四个轨道城区的代表在环世界合流城接通最后一段文明回路 | 四名不同地区代表 / 环世界合流城 / 多彩矿物色与靛蓝 | 无 | 回路闭合但视野通向下一片星域 / 最后一处接口尚需有人守护 |
| 23 权杖一 | 制造者掌心上方诞生第一根会回应意志的火种脉杆 | 一名青年制造者 / 原火苗圃 / 珊瑚与琥珀 | 1 根火种脉杆 | 新火主动向未建成空间延伸 / 火苗过旺逼近操作者手臂 |
| 24 权杖二 | 航策师用两根彗火导体比较近域与远域两条开拓路线 | 一名成年航策师 / 边境观测台 / 琥珀与靛蓝 | 2 根彗火导体 | 身体转向更宽阔路线 / 一根导体仍锁在熟悉近域 |
| 25 权杖三 | 三名发射员将三根火种脉杆化为远航信标送出环城 | 三名成年人 / 远航发射湾 / 珊瑚与天蓝 | 3 根火种脉杆 | 三道航迹向同一远景展开 / 一道航迹受侧风偏移 |
| 26 权杖四 | 社区成员在新聚落搭起由四根彗火导体支撑的庆典能量穹顶 | 四名不同年龄居民 / 新聚落中庭 / 琥珀与玫红 | 4 根彗火导体 | 四个支点形成可共享的稳定空间 / 一根支点尚未完全锁紧 |
| 27 权杖五 | 五名学徒用五根火种脉杆进行创造竞赛，火流互相缠绕 | 五名青年学徒 / 实验竞技场 / 橙红与紫蓝 | 5 根火种脉杆 | 冲突激发新结构 / 混乱火流遮住彼此意图 |
| 28 权杖六 | 归航信使带着六根悬浮胜利信标穿过欢迎人群 | 一名成年信使与远景居民 / 回航港 / 暖橙与群青 | 6 根彗火导体 | 信标被众人共同确认 / 最后一根信标光弱提示虚荣风险 |
| 29 权杖七 | 船体修复者在高处用七根导体偏转袭来的火流 | 一名成年修复者 / 外壳防御台 / 珊瑚红与深蓝 | 7 根彗火导体 | 稳定站姿守住关键缺口 / 导体角度不一显示防御消耗 |
| 30 权杖八 | 工程师引导八根高速彗火导体穿越真空，抢修远处破口 | 一名成年工程师 / 紧急传输廊 / 橙金与青蓝 | 8 根彗火导体 | 八道动线快速汇向目标 / 其中一道接近碰撞边界 |
| 31 权杖九 | 负伤守望者站在九根有修补痕迹的火种脉杆围成的防线上 | 一名成年守望者 / 边境防线 / 暗红与琥珀 | 9 根火种脉杆 | 人物仍有清醒判断和后备出口 / 过密防线暗示警戒成为封闭 |
| 32 权杖十 | 运输者背负十根沉重导体走向补给站，旁侧有人准备接手 | 两名成年人 / 高压运输坡道 / 锈橙与靛蓝 | 10 根彗火导体 | 可见援手让责任有交接可能 / 重量压低人物视线并遮住路标 |
| 33 权杖侍从 | 年轻传讯者发现一根会随声音生长的火种脉杆 | 一名青年传讯者 / 声火实验室 / 珊瑚与亮紫 | 至少 1 根火种脉杆 | 好奇姿态让火纹展开 / 未戴防护的冲动动作接近危险区 |
| 34 权杖骑士 | 快速响应驾驶员踏着火流滑翼冲向边境事故 | 一名成年驾驶员 / 彗火急行道 / 橙红与电蓝 | 至少 1 根彗火导体 | 身体和航向高度一致 / 过快航迹略过一处警示灯 |
| 35 权杖皇后 | 成熟锻造领袖用一根主脉杆协调多人炉火，而非独占火源 | 一名成熟女性与三名工匠 / 公共锻造厅 / 琥珀与深红 | 至少 1 根火种脉杆 | 开放手势让他人火焰同步 / 她身后的私人火仓仍锁闭 |
| 36 权杖国王 | 资深统筹者在舰队点火台压低一根过热导体，延后鲁莽出发 | 一名中年统筹者与远景船员 / 舰队点火台 / 暗橙与群青 | 至少 1 根彗火导体 | 克制动作把野心变成可执行秩序 / 远方舰船仍被躁动火流牵引 |
| 37 圣杯一 | 一只潮汐容器在疗愈者双手之间形成第一层可承接情绪的水膜 | 一名成年疗愈者 / 潮源室 / 青绿与孔雀蓝 | 1 个潮汐容器 | 容器向外溢出温和共享水光 / 边缘薄弱处开始泄流 |
| 38 圣杯二 | 两名伙伴各持一枚记忆透镜，让两段不同经历在中间同步 | 两名成年人 / 双潮会面桥 / 青绿与玫紫 | 2 枚记忆透镜 | 两人目光与水纹互相回应 / 两枚透镜仍保留不完全重合的边界 |
| 39 圣杯三 | 三名朋友在康复花园交换三只潮汐容器并共同释放压抑记忆 | 三名成年人 / 康复花园 / 孔雀蓝与珊瑚 | 3 个潮汐容器 | 三道水光形成支持网络 / 外缘水花提示群体也可能排他 |
| 40 圣杯四 | 独坐者面对四枚记忆透镜，拒绝其中三段熟悉回放而未看见第四段新讯息 | 一名成年人 / 静思平台 / 灰蓝与青绿 | 4 枚记忆透镜 | 身体暂停以辨认真实需要 / 第四枚透镜在视线外发出微光 |
| 41 圣杯五 | 悼念者跪在五枚记忆透镜之间，三枚破裂、两枚仍完整 | 一名成年人 / 失忆纪念廊 / 深青与烟紫 | 5 枚记忆透镜 | 完整透镜和远方出口仍可被发现 / 人物当前只注视三枚裂片 |
| 42 圣杯六 | 成年归乡者与孩子在祖居花园交换六只保存共同记忆的潮汐容器 | 一名成人与一名儿童 / 祖居花园 / 浅青与暖珊瑚 | 6 个潮汐容器 | 记忆成为跨代照护 / 一只容器被旧影覆盖提示美化过去 |
| 43 圣杯七 | 选择者置身七枚投射不同未来的记忆透镜，真实地面只在一处清晰 | 一名成年人 / 可能性穹室 / 彩紫与青蓝 | 7 枚记忆透镜 | 一只手开始关掉虚幻投影 / 多重美景仍遮住现实出口 |
| 44 圣杯八 | 旅者把八只已耗尽的潮汐容器留在退潮码头，走向未知内陆 | 一名成年旅者 / 退潮码头 / 深青与月白 | 8 个潮汐容器 | 背向旧容器的步伐坚定 / 回头目光保留舍不得的张力 |
| 45 圣杯九 | 主理人在九只充盈的潮汐容器环绕下邀请他人共享成果 | 一名成年主理人与两名访客 / 愿望餐厅 / 孔雀蓝与暖金 | 9 个潮汐容器 | 容器开口朝向公共空间 / 一只过满容器提示自满和过量 |
| 46 圣杯十 | 十只潮汐容器连接一个多代家庭与邻里共同维护的居住舱 | 六名不同年龄居民 / 共潮居住舱 / 青绿与虹彩矿物色 | 10 个潮汐容器 | 水光跨越血缘连接社区 / 一段管路细裂提示和谐需维护 |
| 47 圣杯侍从 | 年轻学徒从一只潮汐容器里收到陌生情绪波纹并认真聆听 | 一名青年学徒 / 初潮研究室 / 青绿与淡紫 | 至少 1 个潮汐容器 | 好奇而不评判地接近波纹 / 手势过快使波纹短暂失真 |
| 48 圣杯骑士 | 情感使者保护一只潮汐容器穿越失重风暴，把讯息送往断联城 | 一名成年使者 / 暴潮航桥 / 孔雀蓝与银白 | 至少 1 个潮汐容器 | 容器保持水平且路线清楚 / 过度理想化的远光遮住近处风险 |
| 49 圣杯皇后 | 成熟女性在潮汐记忆库中触碰液态记忆球 | 一名四十岁左右女性 / 潮汐记忆库 / 青绿与孔雀蓝 | 至少 1 个潮汐容器或记忆透镜 | 触碰手势体现深度倾听与边界 / 球体暗面保留未说出的悲伤 |
| 50 圣杯国王 | 情绪治理者在风暴议厅稳定一只主潮汐容器，让众人先后发言 | 一名中年治理者与四名与会者 / 风暴议厅 / 深青与冷金 | 至少 1 个潮汐容器 | 稳定容器使冲突转为可听见的语言 / 他脚边暗流提示压抑自身情绪 |
| 51 宝剑一 | 求证者举起一柄誓光刃切开覆盖城市的伪讯号幕 | 一名成年求证者 / 讯号断面台 / 冰蓝与白紫 | 1 柄誓光刃 | 切口显出清楚事实路径 / 刃光过强也割裂一段有用语境 |
| 52 宝剑二 | 决策者在两枚相交晶体切面间观察两条代价相近的路线 | 一名成年人 / 静默决策桥 / 冰蓝与灰紫 | 2 枚晶体切面 | 双手放松以等待更多证据 / 两面晶体互遮形成判断僵局 |
| 53 宝剑三 | 三柄誓光刃切断两人之间被误传的共同讯息链 | 两名成年人 / 破讯中继站 / 紫晶与冷红 | 3 柄誓光刃 | 断裂暴露真实伤口并停止谎言 / 三道切口仍让关系处于疼痛中 |
| 54 宝剑四 | 休整者躺在由四柄低亮誓光刃守护的静音修复舱中 | 一名成年人 / 静音修复舱 / 冰蓝与靛青 | 4 柄誓光刃 | 武器降光、身体真正休息 / 一柄刃仍微亮提示思绪未停 |
| 55 宝剑五 | 激烈辩论后五柄誓光刃散落，一名胜者看见他人离场的代价 | 三名成年人 / 争议演算场 / 冷紫与灰蓝 | 5 柄誓光刃 | 胜者放下一柄刃准备修复 / 其余刃尖仍朝向离场者背影 |
| 56 宝剑六 | 六枚晶体切面组成安静导航格，载着避难者穿过讯息风暴 | 一名驾驶者与三名避难者 / 迁移航渠 / 冰蓝与雾紫 | 6 枚晶体切面 | 格网指向较平稳区域 / 舟后旧风暴仍留下追随噪声 |
| 57 宝剑七 | 策略员在失守档案库中转移七柄誓光刃，留下公开去向标记但仍承担误解 | 一名成年策略员 / 失守档案库 / 紫晶与暗青 | 7 柄誓光刃 | 有计划地保护关键工具 / 暗处视线提示策略与欺瞒边界 |
| 58 宝剑八 | 八柄誓光刃投射成自我限制网，困住的人其实可从一处低矮缺口离开 | 一名成年人 / 认知训练场 / 冰蓝与黑紫 | 8 柄誓光刃 | 人物脚尖开始试探出口 / 环绕光网让恐惧显得比现实更牢固 |
| 59 宝剑九 | 研究者深夜被九枚晶体切面投下的重复警报影像包围 | 一名成年研究者 / 夜班观测室 / 冷紫与苍白 | 9 枚晶体切面 | 一束晨光和关闭开关提供暂停 / 九重投影夸大无法证实的灾难 |
| 60 宝剑十 | 十柄誓光刃封住已崩溃的战争机器，幸存者爬向远处晨光 | 一名成年幸存者 / 战争机器残骸 / 冰蓝与暗红 | 10 柄誓光刃 | 机器被彻底终止、人物仍活着前行 / 刃阵和残骸呈现不可逆的代价 |
| 61 宝剑侍从 | 年轻分析员用一柄小型誓光刃测试陌生讯号的真实性 | 一名青年分析员 / 风讯实验台 / 冰蓝与亮紫 | 至少 1 柄誓光刃 | 谨慎试切而非急下结论 / 身后多屏噪声诱发过度警觉 |
| 62 宝剑骑士 | 快速传令员携一柄誓光刃俯冲穿过雷讯风暴 | 一名成年传令员 / 高速雷讯道 / 电蓝与白紫 | 至少 1 柄誓光刃 | 清楚航向体现果断执行 / 过快速度略过侧方求救讯号 |
| 63 宝剑皇后 | 成熟裁定者用一柄誓光刃切开腐败契约，同时让证人完整说完 | 一名成熟女性与一名证人 / 清证议庭 / 冰蓝与银紫 | 至少 1 柄誓光刃 | 清晰边界与倾听同时存在 / 刃尖过近旧伤提示冷硬风险 |
| 64 宝剑国王 | 资深决策者把一柄誓光刃插回地面，在发布裁决前核对最后证据 | 一名中年决策者与两名记录员 / 高阶判断台 / 深蓝与紫晶 | 至少 1 柄誓光刃 | 克制权力并让事实先行 / 高位平台仍制造与他人的距离 |
| 65 星币一 | 采矿者从新开启的矿脉托起第一枚稳定发光的星核印 | 一名成年采矿者 / 新生矿脉 / 暗金与氧化绿 | 1 枚星核印 | 双手稳稳承接现实机会 / 矿脉裂缝提示机会需要维护 |
| 66 星币二 | 调度员在摇摆货运环上平衡两枚沿不同轨道运行的星核印 | 一名成年调度员 / 摇摆货运环 / 氧化绿与琥珀 | 2 枚星核印 | 身体随变化灵活调整 / 两条轨道逐渐拉开造成超负荷 |
| 67 星币三 | 三名不同工种的建造者用三枚轨道矿石校准同一座栖居舱 | 三名成年人 / 栖居舱工地 / 暗金与青绿 | 3 枚轨道矿石 | 三种技能在共同图面汇合 / 一处接口因沟通不足错位 |
| 68 星币四 | 资源保管者紧守四枚星核印，导致需要能量的外部管线停流 | 一名成年保管者 / 封闭资源库 / 暗金与墨绿 | 4 枚星核印 | 稳固姿态保护基本安全 / 抱持过紧让资源无法循环 |
| 69 星币五 | 资源环城断电后，两名受困者相互搀扶，第三人打开庇护 | 三名不同年龄成年人 / 资源环城断电走廊 / 暗金、氧化绿与冷蓝 | 5 枚星核印 | 相互扶持与远方援手形成帮助路径 / 四枚熄灭星核印和破损设施呈现匮乏 |
| 70 星币六 | 分配者把六枚星核印沿公共桌分送给需求不同的社区成员 | 一名分配者与四名居民 / 公共资源厅 / 暗金与青绿 | 6 枚星核印 | 分配路线透明且双向反馈 / 高低台差提示权力不对等风险 |
| 71 星币七 | 培育者在漫长矿植园等待七枚尚未成熟的轨道矿石完成生长 | 一名成年培育者 / 矿植园 / 氧化绿与暗金 | 7 枚轨道矿石 | 记录板显示稳定长期进展 / 一枚停滞矿石引发是否继续投入的疑问 |
| 72 星币八 | 工匠在连续工作台上逐一打磨八枚不同阶段的星核印 | 一名成年工匠 / 精密工坊 / 暗金与蓝绿 | 8 枚星核印 | 细节和重复动作形成真实熟练度 / 过度专注使人物忽略身体疲劳 |
| 73 星币九 | 独立工程师在自己维护的生态庭院巡视九枚稳定供能的轨道矿石 | 一名成熟女性工程师 / 私人生态庭院 / 氧化绿与暖金 | 9 枚轨道矿石 | 自主成果与从容空间同时可见 / 高墙提示独立也可能成为隔离 |
| 74 星币十 | 十枚星核印为多代家庭与工作伙伴共同维护的资源大厅供能 | 多代家庭与工友共七人 / 传承资源厅 / 暗金与深绿 | 10 枚星核印 | 资源、技艺和责任跨代传递 / 一条旧管线提示传承不能只靠惯性 |
| 75 星币侍从 | 年轻学徒仔细研究一枚刚形成、尚无用途标签的轨道矿石 | 一名青年学徒 / 地质学习舱 / 氧化绿与琥珀 | 至少 1 枚轨道矿石 | 专注观察把潜力变成学习计划 / 只看矿石而忽略现场环境的风险 |
| 76 星币骑士 | 稳健运输员护送一枚关键星核印穿过漫长维护隧道 | 一名成年运输员 / 长程维护隧道 / 暗金与靛绿 | 至少 1 枚星核印 | 步伐稳定、检查点逐一完成 / 过度谨慎让远方队伍等待过久 |
| 77 星币皇后 | 成熟生态管理者用一枚主星核印滋养食物、住所和照护网络 | 一名成熟女性与两名社区助手 / 生态供养庭 / 氧化绿与暖金 | 至少 1 枚星核印 | 资源流向身体与社区的真实需要 / 管理者自身的休息区仍为空 |
| 78 星币国王 | 资深资源守护者在公开平台展示一枚主星核印的完整流向 | 一名中年守护者与社区代表 / 可持续资源枢纽 / 深绿与暗金 | 至少 1 枚星核印 | 权力通过透明账目变成长期稳定 / 高座结构提示控制和固化风险 |

Use these deterministic internal-reference rules:

```ts
function internalStyleReferences(cardId: number) {
  if (cardId === 1) return [];
  if (cardId === 49) return [1];
  if (cardId === 69) return [1, 49];
  if (cardId >= 2 && cardId <= 22) return [1, 49];
  if (cardId === 23) return [1, 69];
  if (cardId >= 24 && cardId <= 36) return [23, 1];
  if (cardId >= 37 && cardId <= 50) return [49, 1];
  if (cardId === 51) return [1, 49];
  if (cardId >= 52 && cardId <= 64) return [51, 1];
  return [69, 1];
}
```

Sample-specific forbidden elements must remain exact:

```ts
const SAMPLE_FORBIDDEN = {
  1: ["cliff", "dog", "bundle on a staff", "white rose", "jester clothing"],
  49: ["seaside throne", "traditional cup", "crown", "medieval queen clothing"],
  69: ["church window", "snow beggars", "crutch", "ordinary coin"]
} as const;
```

Export sorted data and a null-returning getter:

```ts
export const tarotArtManifest: TarotArtManifestEntry[] = entries.sort(
  (left, right) => left.cardId - right.cardId
);

export function getTarotArtManifestEntry(cardId: number) {
  return tarotArtManifest.find((entry) => entry.cardId === cardId) ?? null;
}
```

- [ ] **Step 6: Implement the deterministic prompt builder**

Create `lib/tarot-art-prompt.ts`. The complete output must use this order so the exact string can be stored in provenance:

```ts
import type { TarotArtManifestEntry } from "../types/tarot-art.ts";

export function buildTarotArtPrompt(entry: TarotArtManifestEntry) {
  const symbolRule = entry.suitSymbol
    ? entry.requiredSymbolCount === null
      ? `Show at least one clear original suit symbol: ${entry.suitSymbol}.`
      : `Show exactly ${entry.requiredSymbolCount} clear original suit symbols: ${entry.suitSymbol}.`
    : "Do not force a repeated suit object; express this historical turning point through scene and action.";

  return [
    "Use case: final production tarot card face for the original Particle deck.",
    `Card identity: canonical numeric cardId ${entry.cardId}; archetype ${entry.archetype}.`,
    `Primary scene: ${entry.sceneSummary}`,
    `Characters: ${entry.characters.join("; ")}. Complete bodies, believable anatomy, visible hands and feet.`,
    `Location: ${entry.location}. Dominant color: ${entry.dominantColor}.`,
    `Upright visual cue: ${entry.uprightVisualCue}`,
    `Reversed visual tension: ${entry.reversedVisualCue}`,
    symbolRule,
    `Required elements: ${entry.requiredElements.join("; ")}.`,
    "Style: high-end hand-painted cinematic story illustration from one original East-West interstellar mythic civilization; dark colored lacquer with raised gilded relief, mineral pigments, jewel-like highlights, deep indigo shared base, one dominant color, antique gold limited to about 10%.",
    "Composition: portrait 2:3, output 1024 × 1536, full-bleed, environment occupies 55–65%, asymmetric action, strong thumbnail read, no centered static pose and no altar-like symmetry.",
    "Originality: entirely original. Do not imitate or reference any named artist, existing tarot deck, tarot illustration, copyrighted character, recognizable franchise, course material, or copyright-unknown input.",
    `Avoid: ${entry.forbiddenElements.join("; ")}.`,
    "No title, number, border, logo, or watermark."
  ].join("\n\n");
}
```

- [ ] **Step 7: Run tests and verify GREEN**

Run:

```bash
node --experimental-strip-types --test tests/tarot-art-manifest.test.mjs
```

Expected: 5 tests PASS; no missing ID, symbol-count mismatch, duplicate batch ID or empty authoring field.

- [ ] **Step 8: Commit the complete manifest before any bulk image generation**

```bash
git add types/tarot-art.ts data/tarot-art-manifest.ts lib/tarot-art-prompt.ts tests/tarot-art-manifest.test.mjs
git commit -m "feat: define complete original tarot art manifest"
```

Expected: commit succeeds; `git show --stat --oneline HEAD` lists all four files and no image files.

---

### Task 2: 生成仅含运行时字段的 78 条牌库 metadata

**Files:**
- Create: `scripts/tarot-art/generate-library-data.ts`
- Create: `lib/tarot-library.ts`
- Create: `tests/tarot-library-data.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `tarotArtManifest`, `tarotCards`.
- Produces: `TarotLibraryEntry`, `tarotLibraryEntries`, `getTarotLibraryEntry(cardId)`, `npm run tarot:library-data`.
- Contract: generated runtime module contains only `cardId`, `imagePath`, `imageAlt`, `story`, `sceneSummary`, `characters`, `location`, `symbols`, `dominantColor`; it contains no prompt, forbidden list, reference IDs or QA data.

- [ ] **Step 1: Write the failing runtime data tests**

Create `tests/tarot-library-data.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getTarotLibraryEntry,
  tarotLibraryEntries
} from "../lib/tarot-library.ts";
import { tarotCards } from "../lib/tarot-cards.ts";

test("canonical tarot data remains a complete 78-card deck", () => {
  assert.equal(tarotCards.length, 78);
  assert.deepEqual(tarotCards.map((card) => card.id), Array.from({ length: 78 }, (_, i) => i + 1));
  assert.equal(tarotCards.filter((card) => card.arcana_type === "major").length, 22);
  for (const suit of ["wands", "cups", "swords", "pentacles"]) {
    assert.equal(tarotCards.filter((card) => card.suit === suit).length, 14);
  }
  assert.ok(tarotCards.every((card) => card.keywords.length > 0));
  assert.ok(tarotCards.every((card) => card.meaning_upright.trim() && card.meaning_reversed.trim()));
});

test("runtime metadata maps one-to-one by numeric card id", () => {
  assert.equal(tarotLibraryEntries.length, 78);
  assert.equal(new Set(tarotLibraryEntries.map((entry) => entry.cardId)).size, 78);
  for (const card of tarotCards) {
    const entry = getTarotLibraryEntry(card.id);
    assert.ok(entry);
    assert.equal(entry.imagePath, `/images/tarot/cards/${card.id}.webp`);
    assert.match(entry.imageAlt, new RegExp(`^${card.name_cn}原创牌面：`));
    assert.ok(entry.story.length >= entry.sceneSummary.length);
    assert.ok(entry.characters.length > 0);
    assert.ok(entry.symbols.length > 0);
  }
});

test("runtime module excludes production-only authoring data", async () => {
  const source = await readFile(new URL("../lib/tarot-library.ts", import.meta.url), "utf8");
  for (const forbidden of [
    "prompt:",
    "forbiddenElements",
    "internalStyleReferences",
    "sourceSha256",
    "humanReview"
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden));
  }
});

test("getter returns null for unknown ids", () => {
  assert.equal(getTarotLibraryEntry(0), null);
  assert.equal(getTarotLibraryEntry(79), null);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --experimental-strip-types --test tests/tarot-library-data.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/tarot-library.ts`.

- [ ] **Step 3: Implement deterministic runtime generation**

Create `scripts/tarot-art/generate-library-data.ts` so it joins the manifest to `tarotCards`, throws on any missing pair, sorts by `cardId`, and writes the generated module with this exact template:

```ts
const moduleSource = `export type TarotLibraryEntry = {
  cardId: number;
  imagePath: string;
  imageAlt: string;
  story: string;
  sceneSummary: string;
  characters: string[];
  location: string;
  symbols: string[];
  dominantColor: string;
};

export const tarotLibraryEntries = ${JSON.stringify(output, null, 2)} as TarotLibraryEntry[];

export function getTarotLibraryEntry(cardId: number) {
  return tarotLibraryEntries.find((entry) => entry.cardId === cardId) ?? null;
}
`;

await writeFile(new URL("../../lib/tarot-library.ts", import.meta.url), moduleSource, "utf8");
```

The object transformation must be exact:

```ts
const output = tarotCards.map((card) => {
  const art = getTarotArtManifestEntry(card.id);
  if (!art) throw new Error(`Missing art manifest entry for card ${card.id}`);
  return {
    cardId: card.id,
    imagePath: `/images/tarot/cards/${card.id}.webp`,
    imageAlt: `${card.name_cn}原创牌面：${art.sceneSummary}`,
    story: `${art.sceneSummary}。${art.uprightVisualCue}；${art.reversedVisualCue}。`,
    sceneSummary: art.sceneSummary,
    characters: art.characters,
    location: art.location,
    symbols: art.librarySymbols,
    dominantColor: art.dominantColor
  };
});
```

Use `JSON.stringify(output, null, 2)` and a fixed template string so a second run produces no diff. Add this script without changing existing scripts:

```json
"tarot:library-data": "node --experimental-strip-types scripts/tarot-art/generate-library-data.ts"
```

- [ ] **Step 4: Generate the runtime module and prove idempotence**

Run:

```bash
npm run tarot:library-data
git diff -- lib/tarot-library.ts
npm run tarot:library-data
git diff --exit-code -- lib/tarot-library.ts
```

Expected: first command creates all 78 entries; the final command exits 0 because the second generation is byte-for-byte stable.

- [ ] **Step 5: Run tests and verify GREEN**

```bash
node --experimental-strip-types --test tests/tarot-library-data.test.mjs
```

Expected: 4 tests PASS; generated runtime data has 78 unique numeric IDs and no production-only fields.

- [ ] **Step 6: Commit runtime metadata generation**

```bash
git add package.json scripts/tarot-art/generate-library-data.ts lib/tarot-library.ts tests/tarot-library-data.test.mjs
git commit -m "feat: generate complete tarot library metadata"
```

Expected: commit succeeds and does not include `package-lock.json` yet because no dependency was installed in this task.

---

### Task 3: 建立 PNG → WebP、provenance、人工 QA 和批次验证流水线

**Files:**
- Create: `data/tarot-approved-samples.ts` with an empty typed mapping
- Create: `scripts/tarot-art/args.ts`
- Create: `scripts/tarot-art/prompts.ts`
- Create: `scripts/tarot-art/hash.ts`
- Create: `scripts/tarot-art/process.ts`
- Create: `scripts/tarot-art/review.ts`
- Create: `scripts/tarot-art/verify.ts`
- Create: `scripts/tarot-art/contact-sheet.ts`
- Create: `docs/tarot-art-provenance.json`
- Create: `tests/tarot-art-pipeline.test.mjs`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: manifest entries, `buildTarotArtPrompt`, optional approved sample overrides, exact local `artwork-source/tarot/prompts/<id>.txt`, raw `artwork-source/tarot/<id>.png`.
- Produces: `parseCardIds(argv)`, `writeTarotPromptFiles(options)`, `sha256File(path)`, `processTarotArtwork(options)`, `verifyTarotArtwork(options)`, `upsertTarotReview(options)` and six `npm run tarot:*` commands.
- Contract: scripts never invent a passing review, never read external course/reference folders, never delete sources, and fail non-zero when a required file, dimension, hash or QA state is wrong.

- [ ] **Step 1: Install the pinned image dependency**

Run:

```bash
npm install --save-dev sharp@0.33.5
```

Expected: `package.json` adds `sharp` under `devDependencies`; `package-lock.json` records the platform packages; existing scripts remain unchanged.

- [ ] **Step 2: Write failing pipeline tests**

Create `tests/tarot-art-pipeline.test.mjs` with temp-directory tests for these exact behaviors:

```js
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { parseCardIds } from "../scripts/tarot-art/args.ts";
import { processTarotArtwork } from "../scripts/tarot-art/process.ts";
import { sha256File } from "../scripts/tarot-art/hash.ts";
import { verifyTarotArtwork } from "../scripts/tarot-art/verify.ts";

async function fixtureRoot() {
  const root = await mkdtemp(join(tmpdir(), "tarot-art-"));
  const source = join(root, "artwork-source/tarot/2.png");
  await mkdir(join(root, "artwork-source/tarot/prompts"), { recursive: true });
  await mkdir(join(root, "public/images/tarot/cards"), { recursive: true });
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(join(root, "artwork-source/tarot/prompts/2.txt"), "exact test generation prompt\n");
  await writeFile(join(root, "docs/tarot-art-provenance.json"), "[]\n");
  await sharp({ create: { width: 1024, height: 1536, channels: 3, background: "#101936" } })
    .png()
    .toFile(source);
  return root;
}

test("processes a 2:3 PNG into a bounded WebP and records real hashes", async () => {
  const root = await fixtureRoot();
  const result = await processTarotArtwork({ cardId: 2, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" });
  assert.equal(result.width, 1024);
  assert.equal(result.height, 1536);
  assert.ok((await stat(result.webPath)).size <= 600 * 1024);
  assert.equal(result.provenance.sourceSha256, await sha256File(result.sourcePath));
  assert.equal(result.provenance.webSha256, await sha256File(result.webPath));
  assert.deepEqual(result.provenance.externalInputs, []);
  assert.equal(result.provenance.humanReview.anatomy, "fail");
});

test("rejects wrong aspect ratio before writing a runtime image", async () => {
  const root = await fixtureRoot();
  const source = join(root, "artwork-source/tarot/3.png");
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: "#101936" } }).png().toFile(source);
  await assert.rejects(() => processTarotArtwork({ cardId: 3, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" }), /2:3/);
});

test("strict verification rejects unreviewed artwork", async () => {
  const root = await fixtureRoot();
  await processTarotArtwork({ cardId: 2, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" });
  const result = await verifyTarotArtwork({ ids: [2], rootDir: root, requirePassingReview: true });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /human review/);
});

test("provenance JSON remains sorted and idempotent", async () => {
  const root = await fixtureRoot();
  await processTarotArtwork({ cardId: 2, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" });
  const before = await readFile(join(root, "docs/tarot-art-provenance.json"), "utf8");
  await processTarotArtwork({ cardId: 2, rootDir: root, createdAt: "2026-07-13", generator: "test-generator" });
  const after = await readFile(join(root, "docs/tarot-art-provenance.json"), "utf8");
  assert.equal(after, before);
});

test("id parser expands inclusive ranges and rejects duplicates", () => {
  assert.deepEqual(parseCardIds(["--ids", "24-26,50"]), [24, 25, 26, 50]);
  assert.throws(() => parseCardIds(["--ids", "24-26,26"]), /duplicate/i);
  assert.throws(() => parseCardIds(["--ids", "30-24"]), /range/i);
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

```bash
node --experimental-strip-types --test tests/tarot-art-pipeline.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/tarot-art/process.ts`.

- [ ] **Step 4: Implement exact ID parsing and hashing**

`scripts/tarot-art/args.ts` must support:

```text
--ids 1,49,69
--ids 24-36,50
--batch major|wands|cups|swords|pentacles
--root /absolute/test/root
--created-at 2026-07-13
--generator "OpenAI built-in image generation (model version not exposed)"
--anatomy pass|fail
--symbol-count pass|fail|not-applicable
--style-consistency pass|fail
--forbidden-elements pass|fail
```

Support comma-separated IDs and inclusive hyphen ranges because later tasks use both. Expand ranges before validation, then reject duplicates, descending ranges, non-decimal values, zero, negative and >78 IDs. `scripts/tarot-art/hash.ts` must use `createReadStream` plus `createHash("sha256")` and return lowercase hex without loading a source image into a base64 string.

When `--created-at` is omitted for newly generated cards, use the current UTC calendar date in `YYYY-MM-DD`; the approved sample CLI call supplies the known fixed date `2026-07-13` explicitly.

- [ ] **Step 5: Implement bounded conversion and truthful provenance upsert**

`processTarotArtwork({ cardId, rootDir, createdAt, generator })` must:

1. Resolve only `artwork-source/tarot/<cardId>.png` and `public/images/tarot/cards/<cardId>.webp` under `rootDir`.
2. Read metadata with Sharp; require source ratio exactly `2:3` and source dimensions at least `1024 × 1536`.
3. Resize with `fit: "cover"` to exactly `1024 × 1536` without enlargement.
4. Try WebP qualities `[82, 78, 74, 70, 66, 62]`, `effort: 6`, selecting the first buffer at or below `600 * 1024`; throw if none meets the cap.
5. Write the WebP only after all validations pass.
6. If `APPROVED_TAROT_SAMPLES[cardId]` exists, require its known source hash and use its exact original prompt; otherwise require and read the exact `artwork-source/tarot/prompts/<cardId>.txt` used for the final generation. `process.ts` must never rebuild or guess a final prompt after the image exists.
7. Set `externalInputs: []`; set `internalReferenceCardIds` from the approved sample record or manifest.
8. Compute both real hashes after writes.
9. Preserve an existing `humanReview` only when both current source and WebP hashes are byte-for-byte unchanged. If either hash changes, reset `anatomy/styleConsistency/forbiddenElements` to `"fail"` and symbol count to `"not-applicable"` for major cards or `"fail"` for minor cards so regenerated art can never inherit a stale pass.
10. Upsert and sort `docs/tarot-art-provenance.json` by numeric ID with a final newline.

Create `data/tarot-approved-samples.ts` now so `process.ts` has a stable import before sample content is migrated:

```ts
export type ApprovedTarotSample = {
  cardId: 1 | 49 | 69;
  createdAt: "2026-07-13";
  generator: "OpenAI built-in image generation (model version not exposed)";
  prompt: string;
  internalReferenceCardIds: number[];
  sourceSha256: string;
};

export const APPROVED_TAROT_SAMPLES: Partial<
  Record<1 | 49 | 69, ApprovedTarotSample>
> = {};
```

Initialize `docs/tarot-art-provenance.json` as:

```json
[]
```

- [ ] **Step 6: Implement exact prompt materialization**

`scripts/tarot-art/prompts.ts` must resolve IDs from `--ids` or `--batch`, call `buildTarotArtPrompt` for each, and write the exact UTF-8 string plus a final newline to `artwork-source/tarot/prompts/<id>.txt`. It must also write `/tmp/tarot-<batch-or-ids>-prompts.json` with this shape:

```ts
type TarotPromptRecord = {
  cardId: number;
  promptPath: string;
  prompt: string;
  referencePaths: string[];
};
```

`referencePaths` are absolute paths built from `manifest.internalStyleReferences`; the command fails if any reference source file is absent. A corrective regeneration may append exact corrective wording to the `.txt` file, and `process.ts` then records that complete final string.

- [ ] **Step 7: Implement explicit review and strict verification**

`review.ts` must refuse to record a review until source, WebP and provenance exist. It writes the four supplied states exactly; it never assumes pass. `verify.ts` must compare dimensions, file size, current hashes, manifest/provenance ID, non-empty exact prompt, empty `externalInputs`, expected internal reference IDs and each review field. `--strict` means every requested ID exists and all four review dimensions pass, except major `symbolCount` must be `not-applicable`.

Add these scripts:

```json
"tarot:prompts": "node --experimental-strip-types scripts/tarot-art/prompts.ts",
"tarot:process": "node --experimental-strip-types scripts/tarot-art/process.ts",
"tarot:review": "node --experimental-strip-types scripts/tarot-art/review.ts",
"tarot:verify": "node --experimental-strip-types scripts/tarot-art/verify.ts",
"tarot:contact-sheet": "node --experimental-strip-types scripts/tarot-art/contact-sheet.ts"
```

The contact sheet command must write `/tmp/tarot-<batch>-contact-sheet.jpg`, show one 2:3 thumbnail per ID, place numeric labels in a margin outside the art, and never overwrite runtime images.

- [ ] **Step 8: Protect raw sources from ordinary Git**

Append to `.gitignore`:

```gitignore
# Local original tarot source archive and production scratch files
artwork-source/tarot/*.png
artwork-source/tarot/prompts/
artwork-source/tarot/contact-sheets/
```

Do not ignore `public/images/tarot/cards/` or `docs/tarot-art-provenance.json`.

- [ ] **Step 9: Run pipeline tests and verify GREEN**

```bash
node --experimental-strip-types --test tests/tarot-art-pipeline.test.mjs
```

Expected: 5 tests PASS; the temporary WebP is 1024 × 1536, ≤600 KB, hashes match, wrong ratio fails, strict verification rejects the intentionally unreviewed fixture, and ID range parsing is exact.

- [ ] **Step 10: Commit the production pipeline**

```bash
git add .gitignore package.json package-lock.json types/tarot-art.ts data/tarot-approved-samples.ts scripts/tarot-art docs/tarot-art-provenance.json tests/tarot-art-pipeline.test.mjs
git commit -m "feat: add tarot artwork production pipeline"
```

Expected: commit succeeds; `git status --short` does not show temp fixtures or `/tmp` contact sheets.

---

### Task 4: 迁移三张批准样牌并保存真实原始 provenance

**Files:**
- Modify: `data/tarot-approved-samples.ts`
- Local-only create: `artwork-source/tarot/1.png`
- Local-only create: `artwork-source/tarot/49.png`
- Local-only create: `artwork-source/tarot/69.png`
- Create: `public/images/tarot/cards/1.webp`
- Create: `public/images/tarot/cards/49.webp`
- Create: `public/images/tarot/cards/69.webp`
- Modify: `docs/tarot-art-provenance.json`
- Modify: `tests/tarot-art-pipeline.test.mjs`

**Interfaces:**
- Consumes: three approved cache PNGs, exact source SHA-256 values and the three recovered original tool prompts.
- Produces: `APPROVED_TAROT_SAMPLES` keyed by 1/49/69; three local sources, three runtime WebPs and three passing provenance entries.
- Contract: source hash mismatch aborts migration; a reconstructed prompt is never substituted for the original tool input.

- [ ] **Step 1: Add failing approved-sample assertions**

Extend `tests/tarot-art-pipeline.test.mjs`:

```js
import { APPROVED_TAROT_SAMPLES } from "../data/tarot-approved-samples.ts";

test("approved samples preserve known source hashes and original inputs", () => {
  assert.deepEqual(Object.keys(APPROVED_TAROT_SAMPLES), ["1", "49", "69"]);
  assert.equal(APPROVED_TAROT_SAMPLES[1].sourceSha256, "c0fd371caea23fa915a1934346051d1b68958afb4799c8277be722866be530e4");
  assert.equal(APPROVED_TAROT_SAMPLES[49].sourceSha256, "edc94455d1d0e29f6c58b9aed8ae9d84bb7db9814c427be0e37f95f06d15a7bc");
  assert.equal(APPROVED_TAROT_SAMPLES[69].sourceSha256, "aacee379ad1177f0578789fde50f59d0bb3b28826bef4975d6295a0fda3676a7");
  assert.deepEqual(APPROVED_TAROT_SAMPLES[1].internalReferenceCardIds, []);
  assert.deepEqual(APPROVED_TAROT_SAMPLES[49].internalReferenceCardIds, [1]);
  assert.deepEqual(APPROVED_TAROT_SAMPLES[69].internalReferenceCardIds, [1, 49]);
  assert.ok(APPROVED_TAROT_SAMPLES[1].prompt.startsWith("Use case: stylized-concept"));
  assert.match(APPROVED_TAROT_SAMPLES[49].prompt, /Tidal Memory Archive/);
  assert.match(APPROVED_TAROT_SAMPLES[69].prompt, /exactly five distinct faceted/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
node --experimental-strip-types --test tests/tarot-art-pipeline.test.mjs
```

Expected: FAIL because `APPROVED_TAROT_SAMPLES` is still the empty mapping created in Task 3.

- [ ] **Step 3: Record the exact recovered sample inputs**

Replace the empty mapping in `data/tarot-approved-samples.ts` with the three exact recovered prompt literals and records below:

```ts
const FOOL_ORIGINAL_PROMPT = String.raw`Use case: stylized-concept
Asset type: preview-only original tarot card face concept, first of three representative samples
Primary request: Create a completely original vertical narrative illustration for the archetype of The Fool, expressing beginning, openness, voluntary risk, wonder, and trust in an unknown path without borrowing any imagery or composition from existing tarot decks.

Scene/backdrop: A vast abandoned star observatory of an original lacquer-and-light civilization floats above deep indigo cosmic clouds. Its circular doors are closing behind the protagonist. Ahead, a turquoise star gate is only beginning to form. Between them, a “zero-gravity crossing” made of dark lacquer fragments and luminous mineral petals assembles itself one step at a time in empty space; this is not a cliff.

Subject: One androgynous young adult star traveler, complete full body visible including both hands and both feet, placed on the right third of the frame and occupying roughly 40% of the image height. The traveler deliberately steps onto a newly forming bridge segment, body caught in believable forward motion, expression showing calm wonder mixed with a trace of uncertainty, eyes focused on the forming star gate. Original clothing: layered asymmetrical travel robes integrated with a lightweight celestial harness, dark lacquer scale panels, translucent woven sleeves, a coral-red sash moving in zero gravity, small abstract constellation fasteners, practical boots. The design should feel like an invented East-West interstellar mythology, not recognizable Chinese historical dress, European medieval clothing, a jester, or a familiar science-fiction franchise. A small seed-shaped living compass of light floats near the traveler’s open hand; no animal and no additional character.

Style/medium: High-end hand-painted story illustration with cinematic depth. Shared deck material language is “dark colored lacquer with raised gilded relief”: deep translucent lacquer surfaces, restrained embossed gold contour lines, mineral-pigment color, jewel-like highlights, and subtle painterly texture. Keep faces, fabric, atmosphere, and architecture dimensional and emotionally believable. Do not make it a flat icon, decorative poster, stained-glass panel, 3D render, or photorealistic image.

Composition/framing: Portrait 2:3, full-bleed card-face art with no border. Filmic asymmetric scene composition. Environment occupies 55–65% of the frame. Use a clear diagonal story path from the old observatory at lower left, through the traveler on the right third, toward the forming star gate at upper right. The first read at thumbnail size must be the traveler and the portal light; the second read reveals world details. Do not center the figure and do not use altar-like symmetry.

Lighting/mood: Deep indigo and midnight blue shared base, turquoise portal light, one coral-red focal accent on the sash, subtle violet atmosphere, warm pale skin tones, restrained antique gold limited to about 10% of the image. The mood is sacred but alive, adventurous rather than ominous.

Originality constraints: Entirely original concept. Do not imitate or reference any named artist, existing tarot deck, tarot card illustration, copyrighted character, course material, or recognizable franchise. Preserve the archetypal meaning only.
Avoid: classic cliff edge, dog, white rose, bundle on a staff, bright yellow sun, jester hat, Rider-Waite-like pose or layout, medieval costume, ornate gold frame, title text, numbers, letters, readable writing, logo, watermark, cropped body, hidden feet, extra limbs, malformed hands, static standing pose, excessive gold, black-and-gold emblem look, cyberpunk neon overload.`;

const QUEEN_OF_CUPS_ORIGINAL_PROMPT = String.raw`Use case: stylized-concept
Asset type: preview-only original tarot card face concept, second of three representative samples
Input images: Image 1 is a style-system and shared-world reference only. Do not edit it, copy its composition, repeat its protagonist, reuse the star gate, or reproduce the floating bridge. Create an entirely new card scene and a clearly different adult character while preserving only the shared lacquer-gold material language, deep indigo world, cinematic painterly finish, and overall craftsmanship.

Primary request: Create a completely original vertical narrative illustration for the archetype of the Queen of Cups, expressing emotional intelligence, deep listening, intuition, compassionate boundaries, and calm inner authority without borrowing imagery or composition from existing tarot decks.

Scene/backdrop: Inside the “Tidal Memory Archive,” an original chamber of the same interstellar lacquer civilization. Vast curved dark-lacquer ribs rise into a deep indigo dome. Between them float slow arcs of turquoise water and transparent mineral membranes as if gravity has become tidal. A large suspended sphere of living water and light occupies the right side; it contains only abstract concentric ripples and soft constellations, no human faces. The floor is a thin reflective plane crossed by restrained raised-gold channels. There is no seashore and no conventional palace.

Subject: One mature adult woman, roughly in her forties, with a distinctive original face and believable human anatomy, complete full body visible including hands and feet. Place her on the left third, standing in a quiet three-quarter turn toward the water sphere. One open hand gently touches its surface; the other rests loosely near her sternum. Her expression is subtle and readable: she is listening deeply, holding sorrow with composure, neither smiling broadly nor appearing cold. She must look authoritative without being sexualized or idealized as a generic young fantasy princess.

Original clothing: an invented ceremonial working garment from the same civilization—layered midnight-blue and blue-green robes integrated with practical fitted inner trousers and boots, asymmetrical dark lacquer shoulder and waist panels, translucent sleeves like thin water film, pearl-like mineral nodes, restrained raised-gold seam lines, and one muted coral interior layer connecting her visually to the first card. A small open crescent diadem made of dark mineral and pale light may hover behind one side of her head, but no familiar crown and no halo circle.

Style/medium: High-end hand-painted story illustration with cinematic spatial depth. Shared deck material language: deep translucent colored lacquer, subtle embossed gold relief, mineral pigments, jewel-like highlights, tactile fabric, painterly atmosphere, and an emotionally believable face. Preserve the depth and craftsmanship of Image 1 without copying any object or pose. Not a flat icon, decorative poster, stained-glass panel, 3D render, anime image, or photorealistic photograph.

Composition/framing: Portrait 2:3, full-bleed card-face art with no border. Filmic asymmetric scene composition. Environment occupies 55–65% of the frame. Create a flowing S-shaped story path from the figure’s face and touching hand to the suspended water sphere, through the reflected gold channels, and back into the distant archive. The first read at thumbnail size must be her face, gesture, and turquoise memory sphere; the second read reveals clothing and architecture. Do not center her and do not use altar-like symmetry.

Lighting/mood: Deep indigo and midnight blue shared base, turquoise and malachite as the dominant card color, subtle violet atmosphere, warm natural skin tones, one muted coral accent, restrained antique gold limited to about 10%. Soft liquid light from the sphere shapes her face and hands. Mood: intimate, sacred, emotionally steady, not gloomy.

Originality constraints: Entirely original concept. Do not imitate or reference any named artist, existing tarot deck, tarot card illustration, copyrighted character, course material, or recognizable franchise. Preserve the archetypal meaning only.
Avoid: throne by the sea, conventional chalice or cup, crown, angel wings, mermaid, moon-and-ocean cliché, Rider-Waite-like pose or layout, Chinese imperial costume, European medieval queen, excessive jewelry, revealing clothing, glamour portrait, ornate gold frame, title text, numbers, letters, readable writing, logo, watermark, cropped body, hidden feet, extra limbs, malformed hands, centered static pose, excessive gold, black-and-gold emblem look, cyberpunk neon overload.`;

const FIVE_OF_PENTACLES_ORIGINAL_PROMPT = String.raw`Use case: stylized-concept
Asset type: preview-only original tarot card face concept, third of three representative samples
Input images: Image 1 and Image 2 are style-system and shared-world references only. Do not edit them, copy their compositions, repeat their characters, reuse the star gate, floating bridge, memory sphere, or archive chamber. Create an entirely new multi-person scene and new characters while preserving only the same original interstellar civilization, deep-indigo universe, dark colored lacquer, restrained raised-gold relief, mineral-pigment color, cinematic painterly depth, and craftsmanship.

Primary request: Create a completely original vertical narrative illustration for the archetype of the Five of Pentacles, expressing material hardship, exclusion, damaged security, mutual support, and a real but understated path toward help. It must validate a believable multi-person scene and an original suit-symbol system without borrowing imagery or composition from existing tarot decks.

Scene/backdrop: The “Resource Ring District” of the same lacquer-and-light civilization during a long power failure. A huge curved energy-distribution corridor crosses a deep indigo void above a dim city. Its dark lacquer floor is fractured and cold, its raised-gold channels mostly extinguished. Fine translucent mineral dust moves sideways through the air—crystalline debris, not snow. In the upper left, a broken overhead energy lattice contains exactly five distinct faceted “star-core seals”: five dark amber mineral discs with orbital grooves, arranged as an incomplete constellation. Four are extinguished; exactly one retains a faint warm internal glow. These five star-core seals are the original visual equivalent of the Pentacles suit; they must not be coins, pentagrams, or familiar occult symbols.

Subjects and action: Three clearly distinct adults with believable anatomy and readable relationships, all belonging to the same civilization but not repeating the people in Images 1 or 2.
1) In the lower-left foreground, an older maintenance worker in worn dark lacquer work gear has a damaged mechanical leg brace and is struggling to walk.
2) Beside them, a younger courier supports their weight with one arm and uses the other to hold a torn translucent heat-cloth around both bodies. Their posture shows effort and mutual trust, not theatrical despair.
3) In the middle-right distance, a third community keeper stands at an opening shelter membrane, holding it open and extending one hand toward them. A small pool of muted amber light from the refuge reaches across part of the broken floor but has not yet reached the pair.
Show the complete bodies of all three characters including hands and feet. Clothing is practical original interstellar workwear: layered fabric, dark lacquer protection panels, mineral fasteners, restrained gold repair seams, worn boots, diverse ages and faces. No beggar stereotypes and no glamorous heroic poses.

Style/medium: High-end hand-painted narrative illustration with cinematic spatial depth. Deep translucent colored lacquer surfaces, subtle embossed gold relief, tactile worn fabric, mineral-pigment atmosphere, jewel-like but restrained highlights, believable faces, hands, weathering, and material damage. Preserve the shared-world quality of Images 1 and 2 without copying any object, pose, face, or layout. Not a flat icon, decorative poster, stained-glass panel, 3D render, anime image, or photorealistic photograph.

Composition/framing: Portrait 2:3, full-bleed card-face art with no border. Filmic asymmetric scene composition. Environment occupies 55–65% of the image. Use a strong diagonal story path from the five dim star-core seals at upper left, down through the two struggling figures in the lower-left-to-center foreground, then toward the warm refuge and reaching third figure at middle right. The first read at thumbnail size must be the supported pair and the distant warm opening; the second read reveals exactly five suit seals and the broken infrastructure. Maintain clear silhouette separation among all three bodies. Do not center the group and do not use altar-like symmetry.

Lighting/mood and palette: Deep indigo and midnight blue shared base. This Pentacles card uses muted amber, oxidized green, smoke-violet, and a small coral repair-cloth accent. Restrained antique gold limited to about 10%; most gold channels are dim or broken. Cold blue ambient light dominates, while a narrow warm amber route from the refuge supplies quiet hope. Serious and humane, not melodramatic or horror.

Originality constraints: Entirely original concept. Do not imitate or reference any named artist, existing tarot deck, tarot card illustration, copyrighted character, course material, or recognizable franchise. Preserve the archetypal meaning only.
Avoid: church or stained-glass window, snowstorm, two beggars, crutches, conventional coins, pentagrams, five-pointed stars, medieval poverty scene, Rider-Waite-like pose or layout, throne, star gate, floating stepping-stone bridge, giant water sphere, Chinese historical costume, European medieval clothing, excessive jewelry, glamour pose, ornate gold frame, title text, numbers, letters, readable writing, logo, watermark, cropped bodies, hidden feet, extra limbs, duplicated people, malformed hands, centered static group, excessive gold, black-and-gold emblem look, cyberpunk neon overload.`;

type ApprovedTarotSample = {
  cardId: 1 | 49 | 69;
  createdAt: "2026-07-13";
  generator: "OpenAI built-in image generation (model version not exposed)";
  prompt: string;
  internalReferenceCardIds: number[];
  sourceSha256: string;
};

export const APPROVED_TAROT_SAMPLES: Record<1 | 49 | 69, ApprovedTarotSample> = {
  1: { cardId: 1, createdAt: "2026-07-13", generator: "OpenAI built-in image generation (model version not exposed)", prompt: FOOL_ORIGINAL_PROMPT, internalReferenceCardIds: [], sourceSha256: "c0fd371caea23fa915a1934346051d1b68958afb4799c8277be722866be530e4" },
  49: { cardId: 49, createdAt: "2026-07-13", generator: "OpenAI built-in image generation (model version not exposed)", prompt: QUEEN_OF_CUPS_ORIGINAL_PROMPT, internalReferenceCardIds: [1], sourceSha256: "edc94455d1d0e29f6c58b9aed8ae9d84bb7db9814c427be0e37f95f06d15a7bc" },
  69: { cardId: 69, createdAt: "2026-07-13", generator: "OpenAI built-in image generation (model version not exposed)", prompt: FIVE_OF_PENTACLES_ORIGINAL_PROMPT, internalReferenceCardIds: [1, 49], sourceSha256: "aacee379ad1177f0578789fde50f59d0bb3b28826bef4975d6295a0fda3676a7" }
};
```

Set the three prompt constants to the exact unedited `prompt` strings recovered from the source task's three image-generation calls. Required anchor phrases are:

- ID 1: `Asset type: preview-only original tarot card face concept, first of three representative samples` and the full “zero-gravity crossing” scene; no referenced image.
- ID 49: `Asset type: preview-only original tarot card face concept, second of three representative samples`, `Tidal Memory Archive`, and the instruction that Image 1 is style/world reference only.
- ID 69: `Asset type: preview-only original tarot card face concept, third of three representative samples`, `exactly five distinct faceted “star-core seals”`, and the instruction that Images 1 and 2 are style/world references only.

Do not normalize punctuation, translate, shorten, or replace the original prompts with `buildTarotArtPrompt()` output.

Recover the exact three call inputs from the preserved source task rather than memory. This read-only command returns only the three image-generation wrapper calls:

```bash
jq -r 'select(.type=="response_item" and .payload.type=="custom_tool_call" and .payload.name=="exec") | select((.payload.input // "") | test("image_gen__imagegen")) | .payload.input' /Users/xanthe/.codex/sessions/2026/07/13/rollout-2026-07-13T13-01-58-019f59da-7d10-7651-8e06-eab7c16f4f54.jsonl
```

Expected: exactly three wrappers in chronological order. Copy only the literal between each `prompt:\`` and closing backtick into the matching constant; do not copy `referenced_image_paths` or wrapper code into the prompt string.

- [ ] **Step 4: Copy the three approved PNGs into the local source archive**

```bash
mkdir -p artwork-source/tarot public/images/tarot/cards
cp /Users/xanthe/.codex/generated_images/019f59da-7d10-7651-8e06-eab7c16f4f54/exec-72ed32c4-fe62-4e5c-b5de-b984a19b13c3.png artwork-source/tarot/1.png
cp /Users/xanthe/.codex/generated_images/019f59da-7d10-7651-8e06-eab7c16f4f54/exec-2af43369-6e21-46ba-bf81-de1bc578eb50.png artwork-source/tarot/49.png
cp /Users/xanthe/.codex/generated_images/019f59da-7d10-7651-8e06-eab7c16f4f54/exec-333ac641-7c96-4af6-86f4-09f9627a21a0.png artwork-source/tarot/69.png
shasum -a 256 artwork-source/tarot/1.png artwork-source/tarot/49.png artwork-source/tarot/69.png
shasum -a 256 docs/superpowers/specs/assets/original-tarot-library/fool-preview.jpg docs/superpowers/specs/assets/original-tarot-library/queen-of-cups-preview.jpg docs/superpowers/specs/assets/original-tarot-library/five-of-pentacles-preview.jpg
```

Expected source hashes in order: `c0fd371caea23fa915a1934346051d1b68958afb4799c8277be722866be530e4`, `edc94455d1d0e29f6c58b9aed8ae9d84bb7db9814c427be0e37f95f06d15a7bc`, `aacee379ad1177f0578789fde50f59d0bb3b28826bef4975d6295a0fda3676a7`. Expected preview hashes in order: `f896c245000eef1e6c20434a76dcce49495709b6dc7cdae467b786c37a124d04`, `42fd9779edd6b37e8c37062a8282d6da21a523b47bff94f54d740786c307f21e`, `c624ec0ffe75d8a11b8716fc2ad86a79aed24cb0a315a8d5ca914521b790fdd8`. All source PNGs report 1024 × 1536. Abort if any hash differs.

- [ ] **Step 5: Process and record the approved review state**

```bash
npm run tarot:process -- --ids 1,49,69 --created-at 2026-07-13 --generator "OpenAI built-in image generation (model version not exposed)"
npm run tarot:review -- --ids 1 --anatomy pass --symbol-count not-applicable --style-consistency pass --forbidden-elements pass
npm run tarot:review -- --ids 49,69 --anatomy pass --symbol-count pass --style-consistency pass --forbidden-elements pass
npm run tarot:verify -- --ids 1,49,69 --strict
```

Expected: three WebPs are 1024 × 1536 and ≤600 KB; current hashes equal provenance; strict verification reports `3/3 cards passed`.

- [ ] **Step 6: Verify raw sources stay untracked**

```bash
git status --short --ignored artwork-source/tarot public/images/tarot/cards docs/tarot-art-provenance.json
```

Expected: the three PNGs are ignored (`!!`); three WebPs and provenance are visible as tracked candidates, not ignored.

- [ ] **Step 7: Run tests and commit the sample migration**

```bash
node --experimental-strip-types --test tests/tarot-art-pipeline.test.mjs
git add data/tarot-approved-samples.ts public/images/tarot/cards/1.webp public/images/tarot/cards/49.webp public/images/tarot/cards/69.webp docs/tarot-art-provenance.json tests/tarot-art-pipeline.test.mjs
git commit -m "feat: migrate approved original tarot samples"
```

Expected: tests PASS; commit contains no `artwork-source/tarot/*.png` and no generated cache path.


---

### Task 5: 建立搜索筛选、详情 ID、导航和真实资源计数的纯逻辑

**Files:**
- Create: `lib/tarot-library-query.ts`
- Create: `lib/tarot-library-routing.ts`
- Create: `lib/tarot-library-assets.ts`
- Create: `tests/tarot-library-query.test.mjs`
- Create: `tests/tarot-library-routing.test.mjs`

**Interfaces:**
- Consumes: `TarotCard`, `TarotLibraryEntry`.
- Produces: `LibraryArcanaFilter`, `LibrarySuitFilter`, `TarotArtworkTone`, `LibraryFilterState`, `TarotLibraryCardRecord`, `getTarotArtworkTone(card)`, `readLibraryFilters(searchParams)`, `toLibrarySearchParams(filters)`, `filterLibraryCards(records, filters)`, `parseLibraryCardId(raw)`, `getAdjacentLibraryCardIds(cardId)`, `getAvailableTarotCardIds(rootDir)`.
- Contract: all query behavior is deterministic, has no API calls, and preserves numeric card order.

- [ ] **Step 1: Write failing query tests**

Create `tests/tarot-library-query.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  filterLibraryCards,
  getTarotArtworkTone,
  readLibraryFilters,
  toLibrarySearchParams
} from "../lib/tarot-library-query.ts";
import { tarotCards } from "../lib/tarot-cards.ts";
import { getTarotLibraryEntry } from "../lib/tarot-library.ts";

const records = tarotCards.map((card) => ({
  card,
  library: getTarotLibraryEntry(card.id)
}));

function params(value) {
  return new URLSearchParams(value);
}

test("searches Chinese name, English name, keyword and both meanings", () => {
  for (const query of ["愚者", "the fool", "冒险", "新的道路", "确认边界"]) {
    const result = filterLibraryCards(records, { q: query, arcana: "all", suit: "all" });
    assert.equal(result[0].card.id, 1, query);
  }
});

test("combines arcana and suit filters without reordering", () => {
  const cups = filterLibraryCards(records, { q: "", arcana: "minor", suit: "cups" });
  assert.equal(cups.length, 14);
  assert.deepEqual(cups.map(({ card }) => card.id), Array.from({ length: 14 }, (_, i) => i + 37));
  assert.deepEqual(
    filterLibraryCards(records, { q: "", arcana: "major", suit: "cups" }),
    []
  );
});

test("invalid URL values fall back safely", () => {
  assert.deepEqual(readLibraryFilters(params("q=%20Fool%20&arcana=broken&suit=coins")), {
    q: "Fool",
    arcana: "all",
    suit: "all"
  });
});

test("serialization omits defaults and round-trips non-default state", () => {
  assert.equal(toLibrarySearchParams({ q: "", arcana: "all", suit: "all" }).toString(), "");
  const state = { q: "hope", arcana: "minor", suit: "cups" };
  assert.deepEqual(readLibraryFilters(toLibrarySearchParams(state)), state);
});

test("empty search returns canonical numeric order", () => {
  assert.deepEqual(
    filterLibraryCards(records, { q: "", arcana: "all", suit: "all" }).map(({ card }) => card.id),
    Array.from({ length: 78 }, (_, i) => i + 1)
  );
});

test("maps the loose canonical suit string to a safe artwork tone", () => {
  assert.equal(getTarotArtworkTone(tarotCards[0]), "major");
  assert.equal(getTarotArtworkTone(tarotCards[22]), "wands");
  assert.equal(getTarotArtworkTone(tarotCards[36]), "cups");
  assert.equal(getTarotArtworkTone(tarotCards[50]), "swords");
  assert.equal(getTarotArtworkTone(tarotCards[64]), "pentacles");
});
```

- [ ] **Step 2: Write failing routing and asset-count tests**

Create `tests/tarot-library-routing.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { getAvailableTarotCardIds } from "../lib/tarot-library-assets.ts";
import {
  getAdjacentLibraryCardIds,
  parseLibraryCardId
} from "../lib/tarot-library-routing.ts";

test("accepts only canonical decimal ids 1 through 78", () => {
  assert.equal(parseLibraryCardId("1"), 1);
  assert.equal(parseLibraryCardId("49"), 49);
  assert.equal(parseLibraryCardId("78"), 78);
  for (const invalid of ["0", "79", "01", "+1", "1.0", " 1", "1 ", "one", ""]) {
    assert.equal(parseLibraryCardId(invalid), null, invalid);
  }
});

test("previous and next navigation stops at the deck boundaries", () => {
  assert.deepEqual(getAdjacentLibraryCardIds(1), { previousCardId: null, nextCardId: 2 });
  assert.deepEqual(getAdjacentLibraryCardIds(49), { previousCardId: 48, nextCardId: 50 });
  assert.deepEqual(getAdjacentLibraryCardIds(78), { previousCardId: 77, nextCardId: null });
});

test("server-side completion count reports only real WebP ids", async () => {
  const root = await mkdtemp(join(tmpdir(), "tarot-library-assets-"));
  const cards = join(root, "public/images/tarot/cards");
  await mkdir(cards, { recursive: true });
  await writeFile(join(cards, "1.webp"), "fixture");
  await writeFile(join(cards, "49.webp"), "fixture");
  await writeFile(join(cards, "not-a-card.webp"), "fixture");
  assert.deepEqual(getAvailableTarotCardIds(root), [1, 49]);
});
```

- [ ] **Step 3: Run both tests and verify RED**

```bash
node --experimental-strip-types --test tests/tarot-library-query.test.mjs tests/tarot-library-routing.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for the three new libraries.

- [ ] **Step 4: Implement the query contract**

Create `lib/tarot-library-query.ts` with exact public types:

```ts
import type { TarotCard } from "./tarot-cards.ts";
import type { TarotLibraryEntry } from "./tarot-library.ts";

export type LibraryArcanaFilter = "all" | "major" | "minor";
export type LibrarySuitFilter = "all" | "wands" | "cups" | "swords" | "pentacles";
export type TarotArtworkTone = Exclude<LibrarySuitFilter, "all"> | "major";
export type LibraryFilterState = {
  q: string;
  arcana: LibraryArcanaFilter;
  suit: LibrarySuitFilter;
};
export type TarotLibraryCardRecord = {
  card: TarotCard;
  library: TarotLibraryEntry;
};
```

`getTarotArtworkTone` must use a `switch` over `card.suit`, return one of the four literal suit values, and return `"major"` for null or any unexpected string; this narrows the existing loose `TarotCard.suit: string | null` without changing canonical data. `readLibraryFilters` must trim `q` and use exact allowlists. `toLibrarySearchParams` must omit empty/default values and emit keys in `q`, `arcana`, `suit` order. `filterLibraryCards` must normalize lowercase text once per record, match all five specified semantic fields, apply both filters as intersections, and finish with `sort((a, b) => a.card.id - b.card.id)`.

- [ ] **Step 5: Implement strict route parsing and non-looping navigation**

Create `lib/tarot-library-routing.ts`:

```ts
export function parseLibraryCardId(raw: string) {
  if (!/^(?:[1-9]|[1-6][0-9]|7[0-8])$/.test(raw)) return null;
  return Number(raw);
}

export function getAdjacentLibraryCardIds(cardId: number) {
  return {
    previousCardId: cardId > 1 && cardId <= 78 ? cardId - 1 : null,
    nextCardId: cardId >= 1 && cardId < 78 ? cardId + 1 : null
  };
}
```

- [ ] **Step 6: Implement server-only real asset counting**

Create `lib/tarot-library-assets.ts` using `existsSync` and the fixed range 1–78. It accepts `rootDir = process.cwd()` for tests and returns only IDs whose exact path `public/images/tarot/cards/<id>.webp` exists. Do not import this module from any file containing `"use client"`.

- [ ] **Step 7: Run tests and verify GREEN**

```bash
node --experimental-strip-types --test tests/tarot-library-query.test.mjs tests/tarot-library-routing.test.mjs
```

Expected: 9 tests PASS; Chinese/English/keyword/upright/reversed search works, combinations remain sorted, artwork tone is narrowed safely, malformed IDs are rejected and temp asset count returns `[1, 49]`.

- [ ] **Step 8: Commit pure library behavior**

```bash
git add lib/tarot-library-query.ts lib/tarot-library-routing.ts lib/tarot-library-assets.ts tests/tarot-library-query.test.mjs tests/tarot-library-routing.test.mjs
git commit -m "feat: add tarot library query and routing logic"
```

---

### Task 6: 实现 `/library` 浏览、搜索、筛选、响应式网格和图片失败降级

**Files:**
- Create: `components/library/LibraryBrowser.tsx`
- Create: `components/library/LibraryFilters.tsx`
- Create: `components/library/TarotCardGrid.tsx`
- Create: `components/library/TarotLibraryCard.tsx`
- Create: `components/library/TarotCardArtwork.tsx`
- Create: `components/library/Library.module.css`
- Create: `public/images/tarot/card-unavailable.svg`
- Create: `tests/tarot-library-visual-contract.test.mjs`
- Modify: `app/library/page.tsx`

**Interfaces:**
- Consumes: `TarotLibraryCardRecord[]`, `LibraryFilterState`, `getAvailableTarotCardIds()`.
- Produces: `LibraryBrowser({ cards, readyImageCount })`, `LibraryFilters({ filters, onQueryChange, onArcanaChange, onSuitChange, onClear })`, `TarotCardGrid({ cards, filters, onClear })`, `TarotLibraryCard({ record, priority })`, `TarotCardArtwork(props)`.
- Contract: page remains a server component; URL/search ownership lives only in `LibraryBrowser`; image state lives only in `TarotCardArtwork`; no provenance or chat code enters the page.

- [ ] **Step 1: Write failing index-page visual contract tests**

Create `tests/tarot-library-visual-contract.test.mjs` with the index-page cases first:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("library route replaces ComingSoon and composes canonical runtime records", async () => {
  const source = await readProjectFile("app/library/page.tsx");
  assert.doesNotMatch(source, /ComingSoon/);
  assert.match(source, /tarotCards/);
  assert.match(source, /getTarotLibraryEntry/);
  assert.match(source, /getAvailableTarotCardIds/);
  assert.match(source, /LibraryBrowser/);
  assert.match(source, /Suspense/);
});

test("browser owns URL-derived local filtering without an API request", async () => {
  const source = await readProjectFile("components/library/LibraryBrowser.tsx");
  assert.match(source, /useSearchParams/);
  assert.match(source, /useRouter/);
  assert.match(source, /filterLibraryCards/);
  assert.match(source, /toLibrarySearchParams/);
  assert.doesNotMatch(source, /fetch\(|axios|\/api\//);
});

test("card grid exposes image, names, category and keywords without hover-only copy", async () => {
  const [card, grid] = await Promise.all([
    readProjectFile("components/library/TarotLibraryCard.tsx"),
    readProjectFile("components/library/TarotCardGrid.tsx")
  ]);
  assert.match(card, /card\.name_cn/);
  assert.match(card, /card\.name_en/);
  assert.match(card, /card\.keywords/);
  assert.match(card, /TarotCardArtwork/);
  assert.match(grid, /没有找到符合条件的牌/);
  assert.match(grid, /清空筛选/);
});

test("artwork uses next image with bounded priority and one-way failure fallback", async () => {
  const [artwork, grid] = await Promise.all([
    readProjectFile("components/library/TarotCardArtwork.tsx"),
    readProjectFile("components/library/TarotCardGrid.tsx")
  ]);
  assert.match(artwork, /from "next\/image"/);
  assert.match(artwork, /onError/);
  assert.match(artwork, /牌面暂不可用/);
  assert.match(artwork, /aspect-ratio|aspectRatio/);
  assert.match(grid, /index < 6/);
  assert.doesNotMatch(grid, /priority=\{true\}/);
});

test("library CSS provides exact grid breakpoints, focus and reduced motion", async () => {
  const css = await readProjectFile("components/library/Library.module.css");
  assert.match(css, /@media \(min-width: 360px\)/);
  assert.match(css, /@media \(min-width: 768px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(css, /@media \(min-width: 1280px\)/);
  assert.match(css, /@media \(min-width: 1536px\)/);
  assert.match(css, /focus-visible/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
```

- [ ] **Step 2: Run the visual contract and verify RED**

```bash
node --experimental-strip-types --test tests/tarot-library-visual-contract.test.mjs
```

Expected: FAIL because the library components and CSS do not exist and `app/library/page.tsx` still renders `ComingSoon`.

- [ ] **Step 3: Implement the reusable artwork component before the grid**

Create `components/library/TarotCardArtwork.tsx` as a client component with this exact prop contract:

```ts
type TarotCardArtworkProps = {
  src: string;
  alt: string;
  cardName: string;
  tone: TarotArtworkTone;
  sizes: string;
  priority?: boolean;
  className?: string;
};
```

It must hold only `loaded` and `failed` booleans, reset both when `src` changes, render a wrapper with `style={{ aspectRatio: "2 / 3" }}`, and render a low-contrast lacquer placeholder beneath the image. Map `tone` to five explicit CSS variants: major=靛紫/暗金、wands=珊瑚/琥珀、cups=青绿/孔雀蓝、swords=冰蓝/紫晶、pentacles=暗金/氧化绿. Set `onLoad={() => setLoaded(true)}` and `onError={() => setFailed(true)}` once without retry logic. On failure, replace the face with `/images/tarot/card-unavailable.svg`, visible `{cardName}` and `牌面暂不可用`; keep the fallback `alt=""` because the visible text already names the failure.

Create `public/images/tarot/card-unavailable.svg` as an original dark-indigo lacquer field with restrained gold orbital lines, no borrowed tarot symbol, no text and a 2:3 viewBox such as `0 0 200 300`.

- [ ] **Step 4: Implement cards, grid and explicit empty state**

`TarotLibraryCard` must link to `/library/${card.id}` and always render:

```tsx
<TarotCardArtwork
  src={library.imagePath}
  alt={library.imageAlt}
  cardName={card.name_cn}
  tone={getTarotArtworkTone(card)}
  priority={priority}
  sizes="(max-width: 359px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, (max-width: 1535px) 20vw, 16vw"
/>
```

Below the art, render `name_cn`, `name_en`, `大阿尔卡纳` or the Chinese suit label, and every keyword as visible text. `TarotCardGrid` maps `cards` in the already-sorted order with `priority={index < 6}`. When empty, show `没有找到符合条件的牌`, a readable summary of active `q/arcana/suit`, and a 44 px `清空筛选` button.

- [ ] **Step 5: Implement accessible search and filter controls**

`LibraryFilters` must render:

- a labeled `<input type="search">` with visible label or `aria-label="搜索牌名、关键词或牌意"`;
- one horizontal `role="group" aria-label="阿尔卡纳筛选"` with `all/major/minor` buttons;
- one horizontal `role="group" aria-label="花色筛选"` with `all/wands/cups/swords/pentacles` buttons;
- `aria-pressed` on every filter button;
- visible result/reset affordances supplied by the parent, never hover-only controls.

Every button uses a class with `min-height: 44px`; the filter rail uses `overflow-x: auto`, `white-space: nowrap` and retains visible focus rings.

- [ ] **Step 6: Implement URL-owned LibraryBrowser**

Create `LibraryBrowser.tsx` with `"use client"` and:

```ts
type LibraryBrowserProps = {
  cards: TarotLibraryCardRecord[];
  readyImageCount: number;
};
```

Derive `filters` from `readLibraryFilters(useSearchParams())` on every render and derive `filteredCards` with `useMemo`. For search text, update the URL with `router.replace`; for arcana/suit and clear, use `router.push` so browser back/forward restores meaningful states. All updates call `toLibrarySearchParams` and choose `/library` for an empty query or `/library?${params}` otherwise. Do not keep a second independent arcana/suit state that can drift from browser history.

The completion copy is exact:

```ts
const completionCopy =
  readyImageCount === 78
    ? "78 张原创牌组"
    : `${readyImageCount} / 78 张牌面已就绪 · 开发预览`;
```

Render title `原创塔罗牌库`, world copy `同一文明的 78 个历史切面：行动、情感、思想与现实在星际漆彩中彼此回响。`, completion copy, filters, current result count and grid.

- [ ] **Step 7: Replace the route placeholder with a server composition boundary**

`app/library/page.tsx` must:

1. import `tarotCards`, `getTarotLibraryEntry`, `getAvailableTarotCardIds` and `LibraryBrowser`;
2. map all cards to `{ card, library }`, throwing a build-time error if any runtime mapping is missing;
3. compute `readyImageCount` from the real WebP directory;
4. wrap `LibraryBrowser` in `<Suspense>` with a static lacquer loading surface so `useSearchParams` does not force a full-page client bailout;
5. render a home link and the existing `粒子` identity, without adding chat actions.

- [ ] **Step 8: Add exact responsive and motion CSS**

In `Library.module.css` implement:

```css
.grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
@media (min-width: 360px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 768px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (min-width: 1280px) { .grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@media (min-width: 1536px) { .grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }

.artwork { position: relative; overflow: hidden; aspect-ratio: 2 / 3; }
.filterRail { display: flex; min-width: max-content; gap: .5rem; overflow-x: auto; }
.filterButton, .clearButton, .cardLink { min-height: 44px; }
.filterButton:focus-visible, .clearButton:focus-visible, .cardLink:focus-visible { outline: 2px solid var(--accent-gold-bright); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  .cardLink, .artworkImage, .filterButton { animation: none; transition: none; transform: none; }
}
```

Keep text contrast on existing `--text-primary`, `--text-secondary` and gold tokens. Hover lift may enhance pointer use but cannot reveal hidden copy or move under reduced motion.

- [ ] **Step 9: Run focused behavior and visual tests**

```bash
node --experimental-strip-types --test tests/tarot-library-query.test.mjs tests/tarot-library-data.test.mjs tests/tarot-library-visual-contract.test.mjs
```

Expected: all tests PASS; no source contains `/api/`, `ComingSoon`, provenance reads or chat links.

- [ ] **Step 10: Run the first production build gate**

```bash
npm run build
npx tsc --noEmit
npm run lint
```

Expected: build succeeds with static `/library`; typecheck and lint exit 0. At this stage completion copy truthfully shows `3 / 78 张牌面已就绪 · 开发预览`.

- [ ] **Step 11: Commit the library index**

```bash
git add app/library/page.tsx components/library public/images/tarot/card-unavailable.svg tests/tarot-library-visual-contract.test.mjs
git commit -m "feat: build searchable original tarot library"
```

---

### Task 7: 实现 `/library/[cardId]` 详情、正逆位、故事和边界导航

**Files:**
- Create: `app/library/[cardId]/page.tsx`
- Create: `app/library/[cardId]/not-found.tsx`
- Create: `components/library/TarotMeaningTabs.tsx`
- Create: `components/library/TarotStoryPanel.tsx`
- Create: `components/library/TarotDetailNavigation.tsx`
- Modify: `components/library/Library.module.css`
- Modify: `tests/tarot-library-visual-contract.test.mjs`

**Interfaces:**
- Consumes: `parseLibraryCardId`, `getAdjacentLibraryCardIds`, `getTarotCardById`, `getTarotLibraryEntry`, `TarotCardArtwork`.
- Produces: `generateStaticParams()`, `TarotMeaningTabs({ upright, reversed })`, `TarotStoryPanel({ entry })`, `TarotDetailNavigation({ previousCard, nextCard })`.
- Contract: detail route is server-owned except the local tab state and artwork error state; it does not change URL orientation, rotate art, read provenance or expose chat.

- [ ] **Step 1: Add failing detail-page contract tests**

Append to `tests/tarot-library-visual-contract.test.mjs`:

```js
test("detail route statically generates numeric ids and rejects missing data", async () => {
  const source = await readProjectFile("app/library/[cardId]/page.tsx");
  assert.match(source, /generateStaticParams/);
  assert.match(source, /parseLibraryCardId/);
  assert.match(source, /getTarotCardById/);
  assert.match(source, /getTarotLibraryEntry/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, /TarotCardArtwork/);
  assert.match(source, /TarotMeaningTabs/);
  assert.match(source, /TarotStoryPanel/);
  assert.match(source, /TarotDetailNavigation/);
  assert.doesNotMatch(source, /\/chat|DeepSeek|provenance/i);
});

test("meaning switch is an accessible local tab set", async () => {
  const source = await readProjectFile("components/library/TarotMeaningTabs.tsx");
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected/);
  assert.match(source, /aria-controls/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /正位/);
  assert.match(source, /逆位/);
  assert.doesNotMatch(source, /useRouter|useSearchParams|rotate/);
});

test("detail navigation disables both deck boundaries and never loops", async () => {
  const source = await readProjectFile("components/library/TarotDetailNavigation.tsx");
  assert.match(source, /previousCard/);
  assert.match(source, /nextCard/);
  assert.match(source, /aria-disabled/);
  assert.doesNotMatch(source, /78.*previous|1.*next/);
});

test("story panel exposes story, characters, location and symbols", async () => {
  const source = await readProjectFile("components/library/TarotStoryPanel.tsx");
  assert.match(source, /entry\.story/);
  assert.match(source, /entry\.characters/);
  assert.match(source, /entry\.location/);
  assert.match(source, /entry\.symbols/);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
node --experimental-strip-types --test tests/tarot-library-visual-contract.test.mjs
```

Expected: index cases PASS and new detail cases FAIL because the route/components do not exist.

- [ ] **Step 3: Implement accessible orientation tabs**

Create `TarotMeaningTabs.tsx` as a client component. Its only state is `"upright" | "reversed"`, initialized to `"upright"`. Use IDs `meaning-tab-upright`, `meaning-tab-reversed`, `meaning-panel-upright`, `meaning-panel-reversed`; each tab has matching `aria-controls`, each panel has matching `aria-labelledby`, and the selected panel has `tabIndex={0}`. ArrowLeft/ArrowRight moves selection and focus between the two tabs. Do not change the route, card image or any draw orientation.

- [ ] **Step 4: Implement story and non-looping navigation components**

`TarotStoryPanel` receives `{ entry: TarotLibraryEntry }` and renders in order: heading `文明编年`, `entry.story`, character list, location, and symbol list. `TarotDetailNavigation` receives:

```ts
type DetailNavigationCard = { id: number; name_cn: string };
type TarotDetailNavigationProps = {
  previousCard: DetailNavigationCard | null;
  nextCard: DetailNavigationCard | null;
};
```

Render a real `<Link>` only when the neighbor exists. At ID 1/78 render a visually consistent `<span aria-disabled="true">` with `已是第一张` / `已是最后一张`; never wrap.

- [ ] **Step 5: Implement the static detail route and 404 boundary**

`app/library/[cardId]/page.tsx` must export:

```ts
export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: 78 }, (_, index) => ({ cardId: String(index + 1) }));
}
```

In the page, parse `params.cardId`; call `notFound()` on null. Load both semantic and visual data; call `notFound()` if either is absent. Load previous/next semantic cards from `getAdjacentLibraryCardIds`, preserving null at the boundaries.

Render desktop left/right and mobile art-first order:

1. Home/牌库 breadcrumb.
2. `name_cn`, `name_en`, category and keywords.
3. `<TarotCardArtwork>` with `tone={getTarotArtworkTone(card)}`, `sizes="(max-width: 767px) 92vw, (max-width: 1279px) 42vw, 480px"` and no forced priority beyond this single hero image.
4. `<TarotMeaningTabs upright={card.meaning_upright} reversed={card.meaning_reversed} />`.
5. `<TarotStoryPanel entry={entry} />`.
6. `<TarotDetailNavigation ... />`.

Create `not-found.tsx` with heading `没有找到这张牌`, explanation `牌的编号不存在，或牌库资料尚未完成。`, and links to `/library` and `/`. It must not treat a transient image error as 404 because image error state remains inside `TarotCardArtwork`.

- [ ] **Step 6: Add detail layout and mobile CSS**

In `Library.module.css`, add a single-column `.detailLayout` and switch at 768 px to `grid-template-columns: minmax(280px, 0.86fr) minmax(0, 1.14fr)`. Limit the artwork column to 480 px, keep it first in DOM order, give tabs/navigation 44 px targets, and allow long Chinese story text to wrap without horizontal overflow. Preserve `prefers-reduced-motion` behavior from Task 6.

- [ ] **Step 7: Run focused tests and build in the required order**

```bash
node --experimental-strip-types --test tests/tarot-library-routing.test.mjs tests/tarot-library-visual-contract.test.mjs
npm run build
npx tsc --noEmit
npm run lint
```

Expected: all focused tests PASS; build output lists static paths for `/library/[cardId]`; typecheck and lint exit 0.

- [ ] **Step 8: Run HTTP smoke checks**

Start the built app:

```bash
npm run start -- --hostname 127.0.0.1 --port 3108
```

In another terminal:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/1
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/49
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/69
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/79
```

Expected status lines: `200`, `200`, `200`, `200`, `404`. Stop the server cleanly after the checks.

- [ ] **Step 9: Commit the detail experience**

```bash
git add app/library/'[cardId]' components/library/TarotMeaningTabs.tsx components/library/TarotStoryPanel.tsx components/library/TarotDetailNavigation.tsx components/library/Library.module.css tests/tarot-library-visual-contract.test.mjs
git commit -m "feat: add original tarot card detail pages"
```


---

### Task 8: 生产大阿尔卡纳剩余 21 张（ID 2–22）

**Files:**
- Local-only create: `artwork-source/tarot/2.png` … `22.png`
- Local-only create: `artwork-source/tarot/prompts/2.txt` … `22.txt`
- Create: `public/images/tarot/cards/2.webp` … `22.webp`
- Modify: `docs/tarot-art-provenance.json`

**Interfaces:**
- Consumes: manifest IDs 2–22, approved style references `artwork-source/tarot/1.png` and `49.png`, exact prompt files emitted by `tarot:prompts`.
- Produces: 21 reviewed source/WebP/provenance triples; total ready runtime art count becomes 24/78.
- Contract: no external image input; all major entries have `symbolCount: "not-applicable"`; no per-card user approval.

- [ ] **Step 1: Prove the batch is incomplete before generation**

```bash
npm run tarot:verify -- --batch major --strict
```

Expected: non-zero exit listing missing IDs 2–22. IDs 1, 49 and 69 remain valid and unchanged.

- [ ] **Step 2: Materialize the exact prompts and reference paths**

```bash
npm run tarot:prompts -- --batch major
```

Expected: creates ignored prompt files 2–22 and `/tmp/tarot-major-prompts.json`; every JSON record contains `referencePaths` for only `artwork-source/tarot/1.png` and `artwork-source/tarot/49.png`, and the prompt contains its own card ID and scene summary.

- [ ] **Step 3: Generate all 21 final PNGs from their exact prompt files**

For each ID in this exact order:

```text
2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22
```

perform one image-generation call. Read the complete `prompt` string for that ID from `/tmp/tarot-major-prompts.json` and pass it byte-for-byte as the tool's `prompt`; set `referenced_image_paths` exactly to:

```text
/Users/xanthe/Documents/web 粒子-塔罗牌/artwork-source/tarot/1.png
/Users/xanthe/Documents/web 粒子-塔罗牌/artwork-source/tarot/49.png
```

Do not add any other input image. After each tool result, inspect the original output with `view_image`, then copy the accepted 1024 × 1536 PNG to `artwork-source/tarot/<cardId>.png`. If a single output has text, a borrowed traditional composition, cropped anatomy or a scene-contract failure, regenerate that ID without asking the user. If the corrective generation adds wording, append that exact wording to the card's prompt file before the call so provenance records the actual final prompt.

- [ ] **Step 4: Stop and correct batch-level failure signals**

Before conversion, inspect the 21 originals as a set. Pause further batch advancement—not the whole project—when any of these occurs:

- three or more cards lose the deep-indigo lacquer/mineral material system;
- any card repeatedly produces malformed, cropped or duplicated complete-body characters;
- a scene falls back to a recognizable classic tarot composition after one regeneration;
- card-to-card protagonists, locations or camera layouts become mechanically duplicated.

Correct the manifest prompt only if the defect is systemic; rerun `tests/tarot-art-manifest.test.mjs`, regenerate affected cards, and keep all revisions in the final provenance prompt. Do not request 21 individual confirmations.

- [ ] **Step 5: Convert, build a contact sheet and conduct human QA**

```bash
npm run tarot:process -- --batch major --generator "OpenAI built-in image generation (model version not exposed)"
npm run tarot:contact-sheet -- --batch major
```

Expected: `/tmp/tarot-major-contact-sheet.jpg` shows IDs 2–22 outside the art; every WebP is 1024 × 1536 and ≤600 KB. Inspect every full-size source for anatomy, forbidden content and style; use the contact sheet only for cross-card drift and thumbnail readability.

- [ ] **Step 6: Record the inspected batch and run strict verification**

Only after every ID passes the inspection in Step 5:

```bash
npm run tarot:review -- --batch major --anatomy pass --symbol-count not-applicable --style-consistency pass --forbidden-elements pass
npm run tarot:verify -- --batch major --strict
```

Expected: `21/21 cards passed`; provenance has real source/WebP hashes and no external inputs. If any card fails, record it as fail, regenerate/process/review that ID, then rerun the batch check.

- [ ] **Step 7: Verify page completion copy and commit only runtime/provenance files**

```bash
npm run build
git status --short --ignored artwork-source/tarot public/images/tarot/cards docs/tarot-art-provenance.json
git add public/images/tarot/cards/{2..22}.webp docs/tarot-art-provenance.json
git commit -m "feat: add original major arcana artwork"
```

Expected: build succeeds; `/library` compiles with `24 / 78 张牌面已就绪 · 开发预览`; raw PNGs/prompts remain ignored; commit includes 21 WebPs plus provenance only.

---

### Task 9: 生产权杖 14 张（ID 23–36）

**Files:**
- Local-only create: `artwork-source/tarot/23.png` … `36.png`
- Local-only create: `artwork-source/tarot/prompts/23.txt` … `36.txt`
- Create: `public/images/tarot/cards/23.webp` … `36.webp`
- Modify: `docs/tarot-art-provenance.json`

**Interfaces:**
- Consumes: manifest IDs 23–36; ID 23 references approved 1/69, then IDs 24–36 reference reviewed 23/1.
- Produces: 14 reviewed triples with correct fire-seed/conduit counts; total ready count becomes 38/78.
- Contract: numeric cards 23–32 show exactly 1–10 original suit symbols; court cards 33–36 show at least one; no wooden staffs or traditional wand bundles.

- [ ] **Step 1: Verify the pre-batch failure and emit exact prompts**

```bash
npm run tarot:verify -- --batch wands --strict
npm run tarot:prompts -- --batch wands
```

Expected: verification fails only for missing 23–36; prompt JSON contains 14 records. ID 23 references source IDs `[1,69]`; 24–36 reference `[23,1]`.

- [ ] **Step 2: Generate and approve the new suit anchor ID 23 first**

Call image generation with exact `prompts/23.txt` and only source PNGs 1/69. Inspect the original at full size for complete anatomy, one clear fire-seed rod, no traditional wand and shared material consistency. Copy the accepted result to `artwork-source/tarot/23.png`, then run:

```bash
npm run tarot:process -- --ids 23 --generator "OpenAI built-in image generation (model version not exposed)"
npm run tarot:review -- --ids 23 --anatomy pass --symbol-count pass --style-consistency pass --forbidden-elements pass
npm run tarot:verify -- --ids 23 --strict
```

Expected: ID 23 passes before it is used as an internal style reference.

- [ ] **Step 3: Generate IDs 24–36 without per-card confirmation**

For IDs `24,25,26,27,28,29,30,31,32,33,34,35,36`, call image generation with the exact corresponding prompt file and only:

```text
artwork-source/tarot/23.png
artwork-source/tarot/1.png
```

Inspect each returned original, copy accepted output to its numeric source path, and regenerate a single defective card immediately. Preserve the actual corrective prompt in its prompt file.

- [ ] **Step 4: Perform explicit suit-symbol and anatomy QA**

Count symbols at full resolution, not from the contact sheet:

```text
23→1, 24→2, 25→3, 26→4, 27→5, 28→6, 29→7, 30→8, 31→9, 32→10,
33→at least 1, 34→at least 1, 35→at least 1, 36→at least 1.
```

If any numeric count is ambiguous or wrong, stop the batch, append an exact-count correction to that prompt and regenerate before processing. If character hands/feet/limbs fail, correct the affected source before any pass is recorded.

- [ ] **Step 5: Convert, compare the batch and strictly verify**

```bash
npm run tarot:process -- --ids 24-36 --generator "OpenAI built-in image generation (model version not exposed)"
npm run tarot:contact-sheet -- --batch wands
npm run tarot:review -- --ids 24-36 --anatomy pass --symbol-count pass --style-consistency pass --forbidden-elements pass
npm run tarot:verify -- --batch wands --strict
```

Expected: `14/14 cards passed`; contact sheet shows one coherent suit without repeated poses; every numeric symbol count and every court symbol presence has a recorded human pass.

- [ ] **Step 6: Commit the completed Wands batch**

```bash
git add public/images/tarot/cards/{23..36}.webp docs/tarot-art-provenance.json
git commit -m "feat: add original wands artwork"
```

Expected: raw PNGs/prompts remain ignored; runtime ready count becomes 38/78.

---

### Task 10: 生产圣杯剩余 13 张（ID 37–48、50）

**Files:**
- Local-only create: `artwork-source/tarot/37.png` … `48.png`, `50.png`
- Local-only create: corresponding `artwork-source/tarot/prompts/*.txt`
- Create: `public/images/tarot/cards/37.webp` … `48.webp`, `50.webp`
- Modify: `docs/tarot-art-provenance.json`

**Interfaces:**
- Consumes: approved Queen of Cups ID 49 and Fool ID 1 as internal references for every remaining Cups card.
- Produces: 13 reviewed triples; Cups 37–50 becomes complete; total ready count becomes 51/78.
- Contract: numeric IDs 37–46 show exactly 1–10 tidal vessels/memory lenses; court IDs 47,48,50 show at least one; ID 49 remains byte-for-byte unchanged.

- [ ] **Step 1: Verify missing IDs and emit prompts**

```bash
npm run tarot:verify -- --batch cups --strict
npm run tarot:prompts -- --batch cups
```

Expected: strict verification reports only 37–48 and 50 missing; `/tmp/tarot-cups-prompts.json` contains exactly those 13 IDs, each referencing `[49,1]`.

- [ ] **Step 2: Generate all 13 Cups originals**

In order `37,38,39,40,41,42,43,44,45,46,47,48,50`, call image generation with the exact per-ID prompt and only:

```text
artwork-source/tarot/49.png
artwork-source/tarot/1.png
```

Inspect/copy each accepted original. Do not reuse ID 49's character, memory sphere pose or archive chamber; it is a material/world reference, not a composition template. Correct individual defects without user confirmation and save the exact final prompt text.

- [ ] **Step 3: Perform exact Cups symbol and scene QA**

Verify at full resolution:

```text
37→1, 38→2, 39→3, 40→4, 41→5, 42→6, 43→7, 44→8, 45→9, 46→10,
47→at least 1, 48→at least 1, 49→at least 1 (already approved), 50→at least 1.
```

Reject traditional goblets/chalices, seaside-throne imagery and repeated Queen-of-Cups composition. Stop batch advancement on any count/anatomy error until the affected source is regenerated.

- [ ] **Step 4: Convert, compare and strictly verify the complete suit**

```bash
npm run tarot:process -- --batch cups --generator "OpenAI built-in image generation (model version not exposed)"
npm run tarot:contact-sheet -- --ids 37-50
npm run tarot:review -- --ids 37-48,50 --anatomy pass --symbol-count pass --style-consistency pass --forbidden-elements pass
npm run tarot:verify -- --ids 37-50 --strict
```

Expected: `14/14 cards passed` including unchanged ID 49; provenance remains sorted and all source/WebP hashes match current files.

- [ ] **Step 5: Commit the completed Cups batch**

```bash
git add public/images/tarot/cards/{37..48}.webp public/images/tarot/cards/50.webp docs/tarot-art-provenance.json
git commit -m "feat: add original cups artwork"
```

Expected: runtime ready count becomes 51/78; raw sources and prompt scratch remain ignored.

---

### Task 11: 生产宝剑 14 张（ID 51–64）

**Files:**
- Local-only create: `artwork-source/tarot/51.png` … `64.png`
- Local-only create: `artwork-source/tarot/prompts/51.txt` … `64.txt`
- Create: `public/images/tarot/cards/51.webp` … `64.webp`
- Modify: `docs/tarot-art-provenance.json`

**Interfaces:**
- Consumes: ID 51 references approved 1/49; IDs 52–64 reference reviewed 51/1.
- Produces: 14 reviewed triples; total ready count becomes 65/78.
- Contract: numeric IDs 51–60 show exactly 1–10 oathlight blades/crystal facets; court IDs 61–64 show at least one; no ordinary medieval swords.

- [ ] **Step 1: Verify missing IDs and emit prompts**

```bash
npm run tarot:verify -- --batch swords --strict
npm run tarot:prompts -- --batch swords
```

Expected: strict verification fails for 51–64; ID 51 references `[1,49]`, and 52–64 reference `[51,1]`.

- [ ] **Step 2: Generate and approve suit anchor ID 51**

Generate from exact `prompts/51.txt` with only source IDs 1/49. Confirm one unmistakable original oathlight blade cutting a false signal—not a steel sword, religious icon or classic Ace composition—then copy/process/review:

```bash
npm run tarot:process -- --ids 51 --generator "OpenAI built-in image generation (model version not exposed)"
npm run tarot:review -- --ids 51 --anatomy pass --symbol-count pass --style-consistency pass --forbidden-elements pass
npm run tarot:verify -- --ids 51 --strict
```

Expected: ID 51 passes before IDs 52–64 use it as a reference.

- [ ] **Step 3: Generate IDs 52–64 from the reviewed anchor**

For each ID `52,53,54,55,56,57,58,59,60,61,62,63,64`, use its exact prompt file and only `artwork-source/tarot/51.png` plus `1.png`. Inspect and copy accepted originals; record corrective wording in the exact prompt file whenever regeneration changes the prompt.

- [ ] **Step 4: Perform exact Swords symbol, anatomy and tone QA**

Verify counts:

```text
51→1, 52→2, 53→3, 54→4, 55→5, 56→6, 57→7, 58→8, 59→9, 60→10,
61→at least 1, 62→at least 1, 63→at least 1, 64→at least 1.
```

Reject medieval weapon scenes and gratuitous gore. Cards 53, 59 and 60 may be emotionally severe but must keep readable human dignity, a cinematic environment and the approved mineral-light system.

- [ ] **Step 5: Convert, compare and strictly verify**

```bash
npm run tarot:process -- --ids 52-64 --generator "OpenAI built-in image generation (model version not exposed)"
npm run tarot:contact-sheet -- --batch swords
npm run tarot:review -- --ids 52-64 --anatomy pass --symbol-count pass --style-consistency pass --forbidden-elements pass
npm run tarot:verify -- --batch swords --strict
```

Expected: `14/14 cards passed`; no ambiguous symbol counts, repeated medieval swords or anatomy failures.

- [ ] **Step 6: Commit the completed Swords batch**

```bash
git add public/images/tarot/cards/{51..64}.webp docs/tarot-art-provenance.json
git commit -m "feat: add original swords artwork"
```

Expected: runtime ready count becomes 65/78.

---

### Task 12: 生产星币剩余 13 张（ID 65–68、70–78）

**Files:**
- Local-only create: `artwork-source/tarot/65.png` … `68.png`, `70.png` … `78.png`
- Local-only create: corresponding `artwork-source/tarot/prompts/*.txt`
- Create: `public/images/tarot/cards/65.webp` … `68.webp`, `70.webp` … `78.webp`
- Modify: `docs/tarot-art-provenance.json`

**Interfaces:**
- Consumes: approved Five of Pentacles ID 69 and Fool ID 1 as internal references.
- Produces: 13 reviewed triples; Pentacles 65–78 and the complete 78-card deck become production-ready.
- Contract: numeric IDs 65–74 show exactly 1–10 star-core seals/orbital minerals; court IDs 75–78 show at least one; ID 69 remains unchanged; no coins, pentagrams or five-point stars.

- [ ] **Step 1: Verify missing IDs and emit prompts**

```bash
npm run tarot:verify -- --batch pentacles --strict
npm run tarot:prompts -- --batch pentacles
```

Expected: strict verification reports only 65–68 and 70–78 missing; every prompt record references `[69,1]`.

- [ ] **Step 2: Generate all 13 Pentacles originals**

In order `65,66,67,68,70,71,72,73,74,75,76,77,78`, use the exact prompt file and only source PNGs 69/1. Inspect and copy each accepted source. Do not copy ID 69's outage corridor, three-character arrangement or upper-left seal composition; preserve only suit/material/world consistency.

- [ ] **Step 3: Perform exact Pentacles symbol and originality QA**

Verify counts at full resolution:

```text
65→1, 66→2, 67→3, 68→4, 69→5 (already approved), 70→6, 71→7, 72→8, 73→9, 74→10,
75→at least 1, 76→at least 1, 77→at least 1, 78→at least 1.
```

Reject ordinary coins, pentagrams, five-point stars and classic Pentacles scene layouts. Stop batch advancement on any count/anatomy error; regenerate the affected source with the correction preserved in its prompt file.

- [ ] **Step 4: Convert, compare and strictly verify the suit and whole deck**

```bash
npm run tarot:process -- --batch pentacles --generator "OpenAI built-in image generation (model version not exposed)"
npm run tarot:contact-sheet -- --ids 65-78
npm run tarot:review -- --ids 65-68,70-78 --anatomy pass --symbol-count pass --style-consistency pass --forbidden-elements pass
npm run tarot:verify -- --ids 65-78 --strict
npm run tarot:verify -- --ids 1-78 --strict
```

Expected: Pentacles reports `14/14 cards passed`; whole deck reports `78/78 cards passed`; every source, WebP, hash and review is present.

- [ ] **Step 5: Commit the completed Pentacles batch**

```bash
git add public/images/tarot/cards/{65..68}.webp public/images/tarot/cards/{70..78}.webp docs/tarot-art-provenance.json
git commit -m "feat: add original pentacles artwork"
```

Expected: `/library` now computes exactly 78 available runtime images and may truthfully show `78 张原创牌组`.

---

### Task 13: 建立完整发布门槛并验证数据、行为、移动端、失败状态和模块边界

**Files:**
- Create: `tests/tarot-library-assets.test.mjs`
- Modify: `tests/tarot-library-visual-contract.test.mjs`
- Modify only if verification exposes a real defect: files already listed in Tasks 1–7

**Interfaces:**
- Consumes: 78 semantic cards, 78 runtime entries, 78 committed WebPs, 78 provenance entries and local 78 source PNGs.
- Produces: automated release-gate tests plus a recorded manual verification checklist.
- Contract: automated Git-clone tests validate committed WebPs/provenance; local strict verification additionally validates ignored source PNGs and source hashes. No release claim is made until both pass.

- [ ] **Step 1: Write the failing committed-asset release test**

Create `tests/tarot-library-assets.test.mjs`:

```js
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

import { tarotLibraryEntries } from "../lib/tarot-library.ts";

const provenance = JSON.parse(await readFile(new URL("../docs/tarot-art-provenance.json", import.meta.url), "utf8"));
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

test("release contains 78 unique runtime WebPs and provenance entries", () => {
  assert.equal(tarotLibraryEntries.length, 78);
  assert.equal(provenance.length, 78);
  assert.deepEqual(tarotLibraryEntries.map(({ cardId }) => cardId), Array.from({ length: 78 }, (_, i) => i + 1));
  assert.deepEqual(provenance.map(({ cardId }) => cardId), Array.from({ length: 78 }, (_, i) => i + 1));
});

test("every committed card image is WebP, 2:3, 1536px max and at most 600 KB", async () => {
  for (const entry of tarotLibraryEntries) {
    const url = new URL(`../public${entry.imagePath}`, import.meta.url);
    const file = await readFile(url);
    const info = await sharp(file).metadata();
    assert.equal(info.format, "webp", entry.cardId);
    assert.equal(info.width, 1024, entry.cardId);
    assert.equal(info.height, 1536, entry.cardId);
    assert.ok((await stat(url)).size <= 600 * 1024, entry.cardId);
    const record = provenance.find(({ cardId }) => cardId === entry.cardId);
    assert.ok(record, entry.cardId);
    assert.equal(sha256(file), record.webSha256, entry.cardId);
  }
});

test("all provenance records are fully reviewed and use no external inputs", () => {
  for (const record of provenance) {
    assert.deepEqual(record.externalInputs, [], record.cardId);
    assert.ok(record.createdAt.trim(), record.cardId);
    assert.ok(record.generator.trim(), record.cardId);
    assert.ok(Array.isArray(record.internalReferenceCardIds), record.cardId);
    assert.equal(record.humanReview.anatomy, "pass", record.cardId);
    assert.equal(record.humanReview.styleConsistency, "pass", record.cardId);
    assert.equal(record.humanReview.forbiddenElements, "pass", record.cardId);
    if (record.cardId <= 22) {
      assert.equal(record.humanReview.symbolCount, "not-applicable", record.cardId);
    } else {
      assert.equal(record.humanReview.symbolCount, "pass", record.cardId);
    }
    assert.ok(record.prompt.trim(), record.cardId);
    assert.match(record.sourceSha256, /^[a-f0-9]{64}$/);
    assert.match(record.webSha256, /^[a-f0-9]{64}$/);
  }
});
```

- [ ] **Step 2: Run the new test and verify its signal**

```bash
node --experimental-strip-types --test tests/tarot-library-assets.test.mjs
```

Expected at the correct end state: 3 tests PASS. If it fails, treat the exact missing/oversize/hash/review record as a release blocker; do not weaken the assertion.

- [ ] **Step 3: Run the complete automated suite**

```bash
npm test
```

Expected: every existing draw, gesture, interpretation and new library/art test passes. No existing test may be skipped or deleted to make the library pass.

- [ ] **Step 4: Run the local source/provenance integrity gate**

```bash
npm run tarot:verify -- --ids 1-78 --strict
```

Expected: `78/78 cards passed`; current ignored source PNG hashes and committed WebP hashes exactly match provenance. This check is local by design because source PNGs are not committed to ordinary Git.

- [ ] **Step 5: Run engineering checks in the required order**

```bash
npm run build
npx tsc --noEmit
npm run lint
```

Expected: all commands exit 0; build includes `/library` and 78 static detail params; no `.next/types` race appears because typecheck follows build.

- [ ] **Step 6: Run production HTTP checks**

Start:

```bash
npm run start -- --hostname 127.0.0.1 --port 3108
```

Check:

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:3108/library?q=Fool&arcana=major&suit=all'
curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:3108/library?arcana=bad&suit=coins'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/1
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/49
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/69
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/78
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/01
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3108/library/79
```

Expected: first six valid/library requests are `200`; IDs `01` and `79` are `404`. Invalid query filters still return a safe `200` page with `all` behavior.

- [ ] **Step 7: Verify search, filter, history and empty state in a real browser**

At `/library`:

1. Search `愚者`, `The Fool`, `冒险`, a substring from `meaning_upright`, and a substring from `meaning_reversed`; each returns ID 1.
2. Select `小阿尔卡纳 + 圣杯`; count is 14 and order is 37–50.
3. Select `大阿尔卡纳 + 圣杯`; empty state states the active conditions and `清空筛选` restores 78.
4. Use browser Back/Forward after filter changes; controls and results restore from URL without stale state.
5. Confirm no network request targets a project API during search/filter.

Expected: all five behaviors match the specification; failures are fixed in query/browser ownership, not hidden with page reloads.

- [ ] **Step 8: Verify responsive, touch, keyboard and reduced-motion behavior**

Inspect exact viewport widths:

```text
320×740  → one column
360×800  → two columns
768×1024 → three columns
1024×900 → four columns
1280×900 → five columns
1536×960 → six columns
```

At 320/360, filters scroll horizontally without shrinking buttons; no horizontal page overflow occurs. Tab through search, filters, cards, orientation tabs and navigation; every target has a visible focus ring and at least 44 px target. At `/library/1`, mobile order is art before information; at desktop art is left and information right. Emulate `prefers-reduced-motion: reduce`; card lift/parallax stops while all content remains available.

- [ ] **Step 9: Verify image loading and failure without modifying the deck**

Use browser request blocking to block only `/images/tarot/cards/1.webp`, then reload `/library/1`. Expected: the 2:3 layout remains stable, local fallback art, `愚者` and `牌面暂不可用` appear, meanings/story/navigation remain usable, there is no infinite retry and route status stays 200. Remove the block and reload; the real art returns.

On `/library`, inspect initial network behavior: only the bounded priority/visible images load eagerly; there is no 78-image preload. Scroll to verify later images lazy-load and layout does not shift.

- [ ] **Step 10: Verify detail semantics and route boundaries**

For IDs 1, 49, 69 and 78:

- default tab is 正位; keyboard switches to 逆位 and panel text changes without URL/image rotation;
- story, characters, location and symbols are visible;
- ID 1 has no previous link; ID 78 has no next link; ID 49 navigates to 48/50;
- no clickable “与此牌对话” link or other chat entry appears.

Expected: all cases pass with the same numeric ID identity used in URLs and data.

- [ ] **Step 11: Verify scope isolation and originality documentation**

```bash
git diff --name-only 38f4415..HEAD | rg '^(app/chat/|components/chat/|lib/deepseek\.ts|app/api/readings/interpret/|components/draw/|components/gesture-draw/|lib/gesture/|lib/normal-draw/)'
rg -n '绝对无版权风险|zero copyright risk|copyright-free guarantee' app components lib docs/tarot-art-provenance.json
```

Expected: both commands produce no output. Review the 78-card contact sheets for recognizable borrowed composition/character risk; any suspicious card is regenerated or escalated for human/legal review before commercial use.

- [ ] **Step 12: Commit the release gate**

```bash
git add tests/tarot-library-assets.test.mjs tests/tarot-library-visual-contract.test.mjs
git commit -m "test: enforce complete tarot library release gate"
git status --short
```

Expected: commit succeeds and tracked worktree is clean. Ignored local raw sources remain present and must not be deleted.

---

## Plan Self-Review Record

Completed on 2026-07-13 against the approved specification and current `38f4415` workspace. The checks run were:

```bash
rg -n 'TBD|TODO|implement later|fill in details|Add appropriate error handling|add validation|handle edge cases|Write tests for the above|Similar to Task' docs/superpowers/plans/2026-07-13-original-tarot-library.md
rg -n 'cardId: string|slug|/chat|DeepSeek' docs/superpowers/plans/2026-07-13-original-tarot-library.md
awk '/^\| ID \|/{inside=1; next} /^Use these deterministic/{inside=0} inside && /^\| [0-9]+ /{count++} END{print count}' docs/superpowers/plans/2026-07-13-original-tarot-library.md
awk '/^```/{n++} END{print n, (n%2==0 ? "balanced" : "UNBALANCED")}' docs/superpowers/plans/2026-07-13-original-tarot-library.md
git diff --check
```

Actual review result:

- placeholder scan matches only the quoted self-review command itself; there are no implementation placeholders;
- manifest matrix contains exactly 78 numbered rows and code fences are balanced;
- semantic use of `slug` is limited to the global prohibition; its other text occurrences are the self-review query and this result line;
- semantic uses of `/chat` and `DeepSeek` are limited to explicit unchanged/scope-isolation statements and tests; their remaining occurrences are the self-review query and this result line;
- every public type/function name used in Tasks 2–13 is defined in an earlier task or in the same task;
- the existing loose `TarotCard.suit: string | null` cannot be passed directly to a five-value artwork tone; the plan now narrows it through `getTarotArtworkTone()` and tests all five outputs;
- Task 1 covers all 78 briefs before Task 8 starts generation;
- Tasks 8–12 contain exactly 75 unique remaining IDs with counts 21/14/13/14/13;
- sample IDs 1/49/69 use recovered original prompts and known hashes, not rebuilt prompt text;
- image assets, provenance, runtime metadata, query behavior, detail routing, mobile/accessibility, lazy loading, failure behavior, HTTP and originality boundaries each have a concrete implementation task and verification step.

Spec coverage map:

| Approved spec section | Plan coverage |
| --- | --- |
| 1 目标与排除范围 | Global Constraints; Tasks 6, 7, 13 |
| 2 现有项目约束与 canonical ID | Global Constraints; Tasks 1, 2, 5 |
| 3 视觉系统、文明与花色符号 | Task 1 full 78-row matrix; Tasks 8–12 QA |
| 4 三张批准样牌与 provenance 快照 | Task 4 exact prompts, source paths and hashes |
| 5 78 张生产策略、批次、文件和 provenance | Tasks 1, 3, 4, 8–12 |
| 6 数据与组件边界 | File Structure; Tasks 2, 5–7 |
| 7 `/library` 信息架构和 URL 参数 | Tasks 5, 6, 13 |
| 8 `/library/[cardId]` 详情行为 | Tasks 5, 7, 13 |
| 9 移动端、触控、键盘和 reduced motion | Tasks 6, 7, 13 |
| 10 图片性能、加载和失败处理 | Tasks 3, 6, 13 |
| 11 聊天模块边界 | Global Constraints; Tasks 6, 7, 13 |
| 12 数据、行为、工程、HTTP 和视觉验证 | Per-task TDD gates; Task 13 full release gate |
| 13 实施顺序与发布门槛 | Task order 1–13; strict 78/78 verification before complete-deck copy |

## Execution Handoff

Plan implementation does not begin until the user selects one option:

1. **Subagent-Driven (recommended)** — use `superpowers:subagent-driven-development`; dispatch a fresh implementation agent per task and perform spec/code review between tasks.
2. **Inline Execution** — use `superpowers:executing-plans`; execute tasks in this session in reviewable batches with checkpoints.
