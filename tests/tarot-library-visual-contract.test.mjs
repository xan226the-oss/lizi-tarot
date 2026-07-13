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
