# 无气泡沉浸式单聊界面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让单牌聊天呈现为无气泡、无终端栏的沉浸式角色对话，并在完成同意后隐藏声明；补充版权无风险的静态星空和受限桌面指针粒子反馈。

**Architecture:** 保持当前消息状态、请求和安全合同。`ChatMessageList` 只改变语义展示；`SingleCardChat` 条件显示同意卡并收紧输入区；`Chat.module.css` 建立靠位置、颜色与留白区分的沉浸式排版和静态 CSS 星空。新增独立的 `StarfieldParticles` 客户端 Canvas 层，只在精确指针且未减弱动态时进行有限、短暂的视觉绘制。

**Tech Stack:** Next.js 14、React 18、TypeScript、CSS Modules、Node test runner。

## Global Constraints

- 只修改 `components/chat/*`、`tests/chat-visual-contract.test.mjs` 和本规格/计划；不改 API、人格、安全、持久化、群聊、抽牌或解读业务。
- 不显示固定牌面头像、终端栏、在线状态、聊天气泡、角色大标题或假终端日志。
- 角色消息左对齐，采用冷蓝纯文本和微光竖线；用户消息右对齐，采用淡紫纯文本，且不显示“你”。
- 两项同意在未同时确认时才显示；确认后完全从视图消失。
- 输入为深色半透明单一输入条，输入文字浅色、placeholder 低对比度、焦点金色；不出现浏览器默认白底大文本框。
- 输入区固定在聊天视口底部，消息记录须预留等高底部安全空间，避免任何消息被遮挡。
- 保留纯文本渲染、既有发送/重试/重置行为、44px 操作高度、`aria-live` 与 `prefers-reduced-motion`。
- 保留现有未提交改动；不 reset、checkout、stage、commit、push 或创建 PR。
- 静态星空必须仅由 CSS 渐变和颜色构成，不加载外部图像、视频、字体或依赖。
- 粒子必须是 `aria-hidden`、`pointer-events:none` 的 Canvas 覆盖层；只在 `(pointer: fine)` 且不匹配 `prefers-reduced-motion: reduce` 时运行，并在卸载时移除所有监听器、动画帧和观察器。
- 粒子总数必须有固定上限，移动端/粗指针/减弱动态环境只保留静态背景。

---

### Task 1: 为无气泡和已确认隐藏声明建立失败合同

**Files:**
- Modify: `tests/chat-visual-contract.test.mjs`

**Interfaces:**
- Consumes: 三个 chat 组件源码。
- Produces: 纯源码合同，不调用浏览器或网络。

- [ ] **Step 1: 替换旧终端/气泡断言**

在聊天 UI 测试里加入：

```js
assert.match(client, /!ageConfirmed\s*\|\|\s*!aiDisclosureConfirmed/);
assert.match(messages, /assistantMessage/);
assert.match(messages, /userMessage/);
assert.doesNotMatch(client, /terminalHeader|terminalStatus|statusDot/);
assert.doesNotMatch(messages, /assistantBubble|userBubble|观测终端/);
assert.match(css, /\.assistantMessage/);
assert.match(css, /\.userMessage/);
assert.match(css, /\.assistantMessage::before/);
assert.match(css, /\.composer textarea\{[^}]*min-height:\s*(?:52|56|60)px/);
assert.doesNotMatch(css, /\.terminalHeader|\.assistantBubble|\.userBubble/);
```

- [ ] **Step 2: 确认新合同失败**

Run: `node --experimental-strip-types --test tests/chat-visual-contract.test.mjs`

Expected: FAIL because the current implementation still has terminal and bubble names, persistent `consentPanel`, and a 118px textarea.

### Task 2: 实现无气泡消息与确认后隐藏的沉浸界面

**Files:**
- Modify: `components/chat/ChatMessageList.tsx`
- Modify: `components/chat/SingleCardChat.tsx`
- Modify: `components/chat/Chat.module.css`
- Test: `tests/chat-visual-contract.test.mjs`

**Interfaces:**
- Consumes: `ChatDisplayMessage` `{ id, role, content, isOpening? }` and current `SingleCardChat` props.
- Produces: identical state/API behavior; local classes `assistantMessage` and `userMessage`.

- [ ] **Step 1: 删除消息气泡与身份大标签**

Render each message with pure text:

```tsx
<li className={message.role === "assistant" ? styles.assistantMessage : styles.userMessage}>
  {message.role === "assistant" ? <span className={styles.roleWhisper}>{cardName}</span> : null}
  <p>{message.content}</p>
</li>
```

Do not render `你`, `观测终端`, `<article>`, bubble classes, Markdown or HTML. Keep loading as `aria-live="polite"`.

- [ ] **Step 2: 条件渲染权限卡，移除终端头部**

Remove the `terminalHeader` block. Wrap the existing labels exactly as follows without changing controlled state:

```tsx
{(!ageConfirmed || !aiDisclosureConfirmed) ? (
  <div className={styles.consentPanel}>…existing two checkbox labels…</div>
) : null}
```

Keep a compact, deep input control, the existing counter, the existing send button, `sendMessage`, retry and reset behavior. The retry button remains disabled unless `lastFailedMessage` exists.

- [ ] **Step 3: 替换终端/气泡样式为沉浸式排版**

Use these required CSS anchors:

```css
.assistantMessage { max-width:82%; color:#dbeeff; border-left:1px solid rgba(137,225,199,.72); padding-left:16px; }
.assistantMessage::before { content:""; display:block; width:28px; height:1px; background:#89e1c7; }
.userMessage { max-width:72%; margin-left:auto; text-align:right; color:#e7cdf3; }
.roleWhisper { color:rgba(137,225,199,.68); font-size:.72rem; letter-spacing:.12em; }
.composer textarea { min-height:56px; max-height:112px; background:rgba(10,24,48,.88); color:#f5f0e8; }
.composer textarea::placeholder { color:rgba(231,224,210,.52); }
```

Remove `.terminalHeader`, `.terminalEyebrow`, `.terminalStatus`, `.statusDot`, `.assistantBubble`, `.userBubble`, `.assistantRow` and `.userRow`. On mobile use 92% maximum message widths. Do not use `overflow:hidden` on message text.

- [ ] **Step 4: 确认新界面合同转绿**

Run: `node --experimental-strip-types --test tests/chat-visual-contract.test.mjs`

Expected: PASS with all four tests.

- [ ] **Step 5: 运行完整验证且不构建**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
git diff --check
```

Expected: all tests, type check, lint and whitespace check pass. Do not run `npm run build` while the shared development preview is active.

### Task 3: 固定底部输入区且保护最后一条消息

**Files:**
- Modify: `tests/chat-visual-contract.test.mjs`
- Modify: `components/chat/Chat.module.css`

**Interfaces:**
- Consumes: `.chatShell`、`.messageList` 与 `.composer` 的局部 CSS Module 类。
- Produces: 用 CSS `position: sticky` 固定 composer；不改变 React 请求、状态或 DOM 数据合同。

- [ ] **Step 1: 写入失败的固定底部合同**

在聊天 UI 测试中加入：

```js
assert.match(css, /\.composer\{[^}]*position:\s*sticky/);
assert.match(css, /\.composer\{[^}]*bottom:\s*0/);
assert.match(css, /\.messageList\{[^}]*padding-bottom:\s*(?:160|180|200)px/);
assert.doesNotMatch(css, /\.composer\{[^}]*position:\s*fixed/);
```

- [ ] **Step 2: 确认合同先失败**

Run: `node --experimental-strip-types --test tests/chat-visual-contract.test.mjs`

Expected: FAIL because the composer is currently in normal document flow and the message list has no sticky-composer safety padding.

- [ ] **Step 3: 添加受限 sticky 布局**

在 `Chat.module.css` 使用以下规则：

```css
.messageList { padding-bottom:180px; }
.composer { position:sticky; bottom:0; z-index:2; background:linear-gradient(to bottom,rgba(5,17,38,0),rgba(5,17,38,.96) 22%); padding:18px 0 calc(12px + env(safe-area-inset-bottom)); }
```

保留现有 composer 的 `display:grid`、输入样式、焦点样式和移动端规则。不要使用 `position: fixed`、不要给 `.chatShell` 添加 `overflow:hidden` 或固定高度。

- [ ] **Step 4: 确认合同转绿**

Run: `node --experimental-strip-types --test tests/chat-visual-contract.test.mjs`

Expected: PASS with all four tests.

- [ ] **Step 5: 完整验证**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
git diff --check
```

Expected: all commands pass. Do not run `npm run build` while the shared preview is active.

### Task 4: 交付全视口聊天画布

**Files:**
- Modify: `tests/chat-visual-contract.test.mjs`
- Modify: `components/chat/SingleCardChat.tsx`
- Modify: `components/chat/Chat.module.css`

**Interfaces:**
- Consumes: 现有 `SingleCardChat` 请求和消息状态，以及消息列表组件。
- Produces: 全视口容器、独立消息滚动和固定在浏览器底部的 composer；不改 API 或消息协议。

- [ ] **Step 1: 写入失败的全画布合同**

在聊天 UI 测试中加入：

```js
assert.match(client, /chatViewport/);
assert.match(client, /chatScrollArea/);
assert.match(css, /\.chatViewport\{[^}]*min-height:\s*100dvh/);
assert.match(css, /\.chatViewport\{[^}]*display:\s*grid/);
assert.match(css, /\.chatScrollArea\{[^}]*overflow-y:\s*auto/);
assert.match(css, /\.chatShell\{[^}]*max-width:\s*none/);
assert.match(css, /\.composer\{[^}]*position:\s*sticky/);
assert.doesNotMatch(css, /\.chatShell\{[^}]*margin:\s*28px\s+auto/);
```

- [ ] **Step 2: 确认合同先失败**

Run: `node --experimental-strip-types --test tests/chat-visual-contract.test.mjs`

Expected: FAIL because the current page has no `chatViewport`/`chatScrollArea`, and `.chatShell` remains a narrow centered column.

- [ ] **Step 3: 添加画布和独立滚动区域**

Wrap the chat content as follows without moving request logic:

```tsx
<section className={styles.chatViewport}>
  <div className={styles.chatScrollArea}>
    <div className={styles.chatShell}><ChatMessageList ... />{consent}{error}</div>
  </div>
  <form className={styles.composer}>…existing input controls…</form>
</section>
```

Use these CSS rules:

```css
.chatViewport { min-height:100dvh; display:grid; grid-template-rows:minmax(0,1fr) auto; }
.chatScrollArea { min-height:0; overflow-y:auto; }
.chatShell { width:min(100% - 40px, 920px); max-width:none; margin:0 auto; padding:42px 0 72px; }
.composer { position:sticky; bottom:0; width:min(100% - 40px, 920px); margin:0 auto; }
```

Do not set a fixed page height, do not use `position: fixed`, do not hide overflow on message text, and preserve mobile safe-area padding.

- [ ] **Step 4: 确认合同转绿**

Run: `node --experimental-strip-types --test tests/chat-visual-contract.test.mjs`

Expected: PASS with all four tests.

- [ ] **Step 5: 完整验证且不构建**

Run:

```bash
npm test
npx tsc --noEmit
npm run lint
git diff --check
```

Expected: all commands pass. Do not run `npm run build` while the shared preview is active.

### Task 5: 为星空与粒子降级建立失败合同

**Files:**
- Modify: `tests/chat-visual-contract.test.mjs`

**Interfaces:**
- Consumes: `SingleCardChat.tsx`、新建的 `StarfieldParticles.tsx` 与 `Chat.module.css` 源码。
- Produces: 不执行浏览器或网络的源码合同，锁定静态星空、独立 Canvas 覆盖层和无障碍/移动端降级边界。

- [ ] **Step 1: 写入失败合同**

在现有聊天视觉合同中读取 `components/chat/StarfieldParticles.tsx`，并断言：`SingleCardChat` 渲染 `StarfieldParticles`；粒子模块含 `(pointer: fine)`、`prefers-reduced-motion: reduce`、`pointermove`、`cancelAnimationFrame` 与 `aria-hidden`；CSS 含 `.chatViewport::before`、`.starfieldParticles` 的 `pointer-events:none` 以及减弱动态媒体查询。

- [ ] **Step 2: 确认合同先失败**

Run: `node --experimental-strip-types --test tests/chat-visual-contract.test.mjs`

Expected: FAIL because the particle component, static starfield pseudo-layer and guarded animation lifecycle do not exist.

### Task 6: 实现静态 CSS 星空与受限指针粒子层

**Files:**
- Create: `components/chat/StarfieldParticles.tsx`
- Modify: `components/chat/SingleCardChat.tsx`
- Modify: `components/chat/Chat.module.css`
- Test: `tests/chat-visual-contract.test.mjs`

**Interfaces:**
- Consumes: 浏览器 `matchMedia`、`HTMLCanvasElement.getContext("2d")` 和可选的 `ResizeObserver`；不接收 props，不读取聊天状态。
- Produces: `StarfieldParticles(): JSX.Element`，向 Canvas 层添加有上限、会消散的粒子；在禁用能力或降级偏好时仅返回无绘制 Canvas。

- [ ] **Step 1: 创建最小 Canvas 视觉组件**

创建组件，渲染 `<canvas ref={canvasRef} className={styles.starfieldParticles} aria-hidden="true" />`。在 `useEffect` 内仅当精确指针且未请求减弱动态时启用；没有 2D context 时直接返回。`pointermove` 每次最多添加两个、总数最多 32 个粒子；单一 `requestAnimationFrame` 循环清空 Canvas、按寿命降低 alpha、绘制和过滤过期粒子。清理时移除监听器、取消帧并断开已创建的 `ResizeObserver`。

- [ ] **Step 2: 将视觉层置入聊天画布**

在 `SingleCardChat.tsx` 导入组件并将其放为 `chatViewport` 的第一个子节点。不得改变 `sendMessage`、`reset`、同意条件、请求体、错误处理或聊天 props。

- [ ] **Step 3: 添加静态星空和叠层样式**

让 `.chatViewport` 建立 `position:relative` 和 `isolation:isolate`，使用多个低对比度 CSS 径向渐变作为深蓝星空；用 `.chatViewport::before` 放置额外静态星点。`.starfieldParticles` 绝对定位、全尺寸、`z-index:0`、`pointer-events:none`；消息滚动区与输入区相对定位并处于其上。在既有减弱动态媒体查询中隐藏 Canvas。不得加载外部资产，且 JavaScript 精确指针保护必须是移动端降级主机制。

- [ ] **Step 4: 确认合同转绿**

Run: `node --experimental-strip-types --test tests/chat-visual-contract.test.mjs`

Expected: PASS with all four tests.

- [ ] **Step 5: 完整验证且不构建**

Run: `npm test`, `npx tsc --noEmit`, `npm run lint`, then `git diff --check`.

Expected: all commands pass. Do not run `npm run build` while the shared preview is active.

## Plan Self-Review

- **Spec coverage:** Task 1 covers regression assertions; Task 2 covers no bubbles/no terminal header, left/right immersive text, conditional consent, compact dark composer, responsive and accessibility constraints; Task 3 covers fixed bottom placement and protected message scrolling; Task 4 covers full viewport use and independent message scrolling; Tasks 5-6 cover CSS-only static starfield, isolated bounded Canvas particles and required mobile/reduced-motion teardown behavior.
- **Scope:** no API or state behavior changes are planned.
- **Consistency:** Task 2 defines all classes asserted by Task 1 and preserves `ChatDisplayMessage` plus the existing props. Task 6 defines `StarfieldParticles` and every class asserted by Task 5.
- **Placeholder scan:** no TODO/TBD or undefined interface names remain.

## Execution Handoff

Execute Tasks 1-6 in order with `executing-plans` and `test-driven-development`; do not stage or commit.
