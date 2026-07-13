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

test("browser treats popstate as an authoritative restore and removes its listener", async () => {
  const source = await readProjectFile("components/library/LibraryBrowser.tsx");
  assert.match(source, /window\.addEventListener\("popstate"/);
  assert.match(source, /window\.removeEventListener\("popstate"/);
  assert.match(source, /window\.location\.search/);
  assert.match(source, /intentController\.restore/);
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
  assert.doesNotMatch(
    artwork,
    /className=\{styles\.artworkFallback\}[^>]*role="status"/s
  );
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
  const reducedMotionCss = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reducedMotionCss, /\.cardLink:hover[\s\S]*?transform:\s*none/);
});

test("detail route statically generates numeric ids and rejects missing data", async () => {
  const source = await readProjectFile("app/library/[cardId]/page.tsx");
  assert.match(source, /dynamicParams\s*=\s*false/);
  assert.match(source, /generateStaticParams/);
  assert.match(source, /Array\.from\(\{ length: 78 \}/);
  assert.match(source, /parseLibraryCardId/);
  assert.match(source, /getTarotCardById/);
  assert.match(source, /getTarotLibraryEntry/);
  assert.match(source, /notFound\(\)/);
  assert.match(source, /TarotCardArtwork/);
  assert.match(source, /TarotMeaningTabs/);
  assert.match(source, /TarotStoryPanel/);
  assert.match(source, /TarotDetailNavigation/);
  assert.match(source, /priority/);
  assert.doesNotMatch(source, /\/chat|DeepSeek|provenance/i);
});

test("meaning switch is an accessible local tab set", async () => {
  const source = await readProjectFile("components/library/TarotMeaningTabs.tsx");
  assert.match(source, /useId/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected/);
  assert.match(source, /aria-controls/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /aria-labelledby/);
  assert.match(source, /idPrefix/);
  assert.match(source, /meaning-tab-\$\{orientation\}/);
  assert.match(source, /meaning-panel-\$\{orientation\}/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /\.focus\(\)/);
  assert.match(source, /正位/);
  assert.match(source, /逆位/);
  assert.doesNotMatch(source, /tabId:\s*"meaning-tab-(?:upright|reversed)"/);
  assert.doesNotMatch(source, /panelId:\s*"meaning-panel-(?:upright|reversed)"/);
  assert.doesNotMatch(source, /useRouter|useSearchParams|rotate/);
});

test("detail navigation disables both deck boundaries and never loops", async () => {
  const source = await readProjectFile("components/library/TarotDetailNavigation.tsx");
  assert.match(source, /previousCard/);
  assert.match(source, /nextCard/);
  assert.match(source, /aria-disabled/);
  assert.match(source, /已是第一张/);
  assert.match(source, /已是最后一张/);
  assert.doesNotMatch(source, /78.*previous|1.*next/);
});

test("story panel exposes story, characters, location and symbols", async () => {
  const source = await readProjectFile("components/library/TarotStoryPanel.tsx");
  assert.match(source, /文明编年/);
  assert.match(source, /entry\.story/);
  assert.match(source, /entry\.characters/);
  assert.match(source, /entry\.location/);
  assert.match(source, /entry\.symbols/);
});

test("detail page has a useful 404 and responsive archive layout", async () => {
  const [notFound, reachableNotFound, css] = await Promise.all([
    readProjectFile("app/library/[cardId]/not-found.tsx"),
    readProjectFile("app/not-found.tsx"),
    readProjectFile("components/library/Library.module.css")
  ]);
  for (const source of [notFound, reachableNotFound]) {
    assert.match(source, /没有找到这张牌/);
    assert.match(source, /牌的编号不存在，或牌库资料尚未完成。/);
    assert.match(source, /href="\/library"/);
    assert.match(source, /href="\/"/);
  }
  assert.match(css, /\.detailLayout/);
  assert.match(css, /grid-template-columns:\s*minmax\(280px, 0\.86fr\) minmax\(0, 1\.14fr\)/);
  assert.match(css, /max-width:\s*480px/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});
