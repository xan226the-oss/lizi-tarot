import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the completed orbit recedes far enough to reveal the shared spread and plinth", async () => {
  const css = await readProjectFile("app/globals.css");

  assert.match(
    css,
    /\.gesture-card-orbit--completed\s*\{[^}]*opacity:\s*0\.(?:[0-2]\d?|3)\s*;/s
  );
});

test("spread sigils use engraved orrery layers instead of a connected star path", async () => {
  const source = await readProjectFile("components/gesture-draw/SpreadSigil.tsx");

  assert.match(source, /spread-sigil__ticks/);
  assert.match(source, /spread-sigil__meridian/);
  assert.match(source, /spread-sigil__hub/);
  assert.match(source, /spread-sigil__core/);
  assert.doesNotMatch(source, /spread-sigil__path/);
});

test("the shared ritual plinth uses calibrated tracks without a solid pentagram", async () => {
  const [source, css] = await Promise.all([
    readProjectFile("components/gesture-draw/RitualPlinth.tsx"),
    readProjectFile("app/globals.css")
  ]);

  assert.match(source, /ritual-plinth__engraving/);
  assert.match(source, /ritual-plinth__axis/);
  assert.match(source, /ritual-plinth__core/);
  assert.doesNotMatch(
    css,
    /clip-path:\s*polygon\(50% 0,\s*61% 36%,\s*100% 36%/s
  );
});

test("spread names share one default color and one hover color", async () => {
  const css = await readProjectFile("app/globals.css");

  assert.match(
    css,
    /\.spread-stage__option strong\s*\{[^}]*color:\s*rgba\(244,\s*235,\s*221,\s*0\.82\)/s
  );
  assert.match(
    css,
    /\.spread-stage__option:hover strong,\s*\.spread-stage__option:focus-visible strong\s*\{[^}]*color:\s*#d6b45a/s
  );
});

test("the question summary aligns its label and copy on the page axis", async () => {
  const css = await readProjectFile("app/globals.css");

  assert.match(
    css,
    /\.spread-stage__question\s*\{[^}]*justify-content:\s*center;[^}]*text-align:\s*center;/s
  );
});
