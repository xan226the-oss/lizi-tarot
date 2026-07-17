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

test("library uses a compact archive header and a fixed-viewport detail contract", async () => {
  const [browser, detail, css] = await Promise.all([
    readProjectFile("components/library/LibraryBrowser.tsx"),
    readProjectFile("app/library/[cardId]/page.tsx"),
    readProjectFile("components/library/Library.module.css")
  ]);

  assert.match(browser, /<h1[^>]*>\s*牌库\s*<\/h1>/);
  assert.doesNotMatch(browser, /同一文明的 78 个历史切面/);
  assert.match(detail, /max-width: 1023px\) 92vw, 22rem/);
  assert.match(detail, /detailPage/);
  assert.match(css, /\.detailPage[\s\S]*?height:\s*100dvh/);
  assert.match(css, /@media \(min-width: 1024px\) and \(min-height: 780px\)[\s\S]*?\.detailLayout[\s\S]*?grid-template-columns:\s*22rem minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-height: 779px\)[\s\S]*?\.detailPage[\s\S]*?overflow:\s*visible/);
  assert.match(css, /\.intro[\s\S]*?padding-block:\s*1\.25rem/);
});

test("library title begins directly after the site header without an outer blank band", async () => {
  const css = await readProjectFile("components/library/Library.module.css");
  const browserRule = css.match(/\.browser\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(browserRule, /padding-top:\s*0/);
});

test("desktop filters reserve room for every visible filter choice", async () => {
  const css = await readProjectFile("components/library/Library.module.css");
  assert.match(
    css,
    /@media \(min-width: 1024px\)\s*\{[\s\S]*?\.filters\s*\{[\s\S]*?grid-template-columns:\s*minmax\(17rem, 1\.15fr\) minmax\(17rem, 0\.9fr\) minmax\(20rem, 1\.1fr\)/,
  );
  assert.match(
    css,
    /@media \(min-width: 1024px\)\s*\{[\s\S]*?\.filterTrack\s*\{[\s\S]*?grid-template-columns:\s*4\.5rem minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /@media \(min-width: 1024px\)\s*\{[\s\S]*?\.filterButton\s*\{[\s\S]*?padding-inline:\s*0\.5rem/,
  );
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
  assert.match(source, /TarotDetailContent/);
  assert.match(source, /getTarotLibraryReading/);
  assert.match(source, /TarotDetailNavigation/);
  assert.match(source, /priority/);
  assert.doesNotMatch(source, /\/chat|DeepSeek|provenance/i);
});

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
  const detailPanelRule = css.match(/\.detailPanel\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(detailPanelRule, /text-overflow:\s*ellipsis|max-height:|overflow:\s*(?:hidden|auto|scroll)/);
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

test("scene panel exposes story, characters, location and symbols", async () => {
  const source = await readProjectFile("components/library/TarotStoryPanel.tsx");
  assert.match(source, /scenePanel/);
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
  assert.match(css, /@media \(min-width: 1440px\)[\s\S]*?\.grid[\s\S]*?repeat\(6, minmax\(0, 1fr\)/);
  assert.match(css, /grid-template-columns:\s*22rem minmax\(0, 1fr\)/);
  assert.match(css, /max-width:\s*22rem/);
  const detailPanelRule = css.match(/\.detailPanel\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(detailPanelRule, /text-overflow:\s*ellipsis|max-height:|overflow:\s*(?:hidden|auto|scroll)/);
});
