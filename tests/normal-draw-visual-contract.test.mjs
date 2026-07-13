import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("normal draw production route renders the dedicated experience", async () => {
  const page = await readProjectFile("app/draw/page.tsx");

  assert.match(page, /NormalDrawExperience/);
  assert.doesNotMatch(page, /ComingSoon/);
});

test("atlas keeps question input out and provides moving grouped sigils", async () => {
  const [atlas, sigil, css] = await Promise.all([
    readProjectFile("components/draw/SpreadAtlas.tsx"),
    readProjectFile("components/draw/SpreadSigil.tsx"),
    readProjectFile("components/draw/NormalDraw.module.css")
  ]);

  assert.doesNotMatch(atlas, /textarea|input/);
  assert.match(sigil, /sigilMotion/);
  assert.match(sigil, /nodeIndex/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /focus-visible/);
  assert.match(css, /overflow-x:\s*hidden/);
});

test("question ritual exposes the selected spread, positions and accessible validation", async () => {
  const source = await readProjectFile("components/draw/QuestionRitual.tsx");

  assert.match(source, /aria-describedby/);
  assert.match(source, /aria-invalid/);
  assert.match(source, /开始抽牌/);
  assert.match(source, /更换牌阵/);
  assert.match(source, /slot\.description/);
});

test("draw stage keeps cards as the primary interactive element", async () => {
  const [draw, reveal] = await Promise.all([
    readProjectFile("components/draw/CardDrawStage.tsx"),
    readProjectFile("components/draw/ReadingReveal.tsx")
  ]);

  assert.match(draw, /第.*张/);
  assert.match(draw, /牌堆剩余/);
  assert.match(draw, /选择第/);
  assert.match(draw, /disabled=\{isPlacing\}/);
  assert.match(reveal, /基础牌意/);
  assert.match(reveal, /重新抽牌/);
  assert.doesNotMatch(reveal, /fetch\(|\/api\/readings\/interpret/);
});

test("normal draw adds bounded warm pointer dust and disables it for reduced motion", async () => {
  const [atlas, dust] = await Promise.all([
    readProjectFile("components/draw/SpreadAtlas.tsx"),
    readProjectFile("components/draw/GoldenDustCanvas.tsx")
  ]);

  assert.match(atlas, /GoldenDustCanvas/);
  assert.match(dust, /pointermove/);
  assert.match(dust, /trailBurst\s*=\s*6/);
  assert.match(dust, /maxDust\s*=\s*320/);
  assert.match(dust, /prefers-reduced-motion:\s*reduce/);
  assert.match(dust, /224, 191, 105/);
});

test("spread selection locks the first click and clears its pending transition", async () => {
  const source = await readProjectFile(
    "components/draw/NormalDrawExperience.tsx"
  );

  assert.match(source, /selectionTimerRef/);
  assert.match(source, /if \(selectedSpreadId\) return/);
  assert.match(source, /window\.clearTimeout\(selectionTimerRef\.current\)/);
});

test("normal interpretation stays user-triggered and owned by the experience", async () => {
  const [experience, reveal] = await Promise.all([
    readProjectFile("components/draw/NormalDrawExperience.tsx"),
    readProjectFile("components/draw/ReadingReveal.tsx")
  ]);

  assert.match(experience, /fetch\("\/api\/readings\/interpret"/);
  assert.match(experience, /readingType:\s*"normal"/);
  assert.match(experience, /AbortController/);
  assert.match(experience, /interpretationRequestIdRef/);
  assert.match(experience, /interpretationFingerprintRef/);
  assert.match(experience, /getPublicInterpretationError/);
  assert.doesNotMatch(reveal, /fetch\(|\/api\/readings\/interpret/);
});

test("normal reveal exposes idle loading success and retry contracts", async () => {
  const reveal = await readProjectFile("components/draw/ReadingReveal.tsx");

  assert.match(reveal, /生成综合解读/);
  assert.match(reveal, /正在生成综合解读/);
  assert.match(reveal, /重新生成/);
  assert.match(reveal, /aria-live="polite"/);
  assert.match(reveal, /本次问题与牌面信息将发送至 AI 服务生成解读/);
  assert.match(reveal, /interpretationStatus === "success"/);
  assert.match(reveal, /基础牌意/);
});

test("normal interpretation reset paths cancel and clear request state", async () => {
  const experience = await readProjectFile(
    "components/draw/NormalDrawExperience.tsx"
  );

  assert.match(experience, /clearInterpretation/);
  assert.match(experience, /interpretationControllerRef\.current\?\.abort\(\)/);
  assert.match(experience, /handleResetReading/);
  assert.match(experience, /handleBackToQuestion/);
  assert.match(experience, /handleChangeSpread/);
});
