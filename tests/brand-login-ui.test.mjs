import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared logo is a borderless star-trail particle mark", async () => {
  const source = await readProjectFile("components/ui/ConstellationLogo.tsx");

  assert.match(source, /<path/);
  assert.match(source, /<circle/g);
  assert.doesNotMatch(source, /rounded-full|border-accent|border\s/);
});

test("brand wordmarks use the lighter, tighter shared visual treatment", async () => {
  const [hub, normalCss, gestureCss, libraryCss] = await Promise.all([
    readProjectFile("app/(hub)/page.tsx"),
    readProjectFile("components/draw/NormalDraw.module.css"),
    readProjectFile("components/gesture-draw/QuestionInput.module.css"),
    readProjectFile("components/library/Library.module.css")
  ]);

  assert.match(hub, /font-medium/);
  assert.match(hub, /tracking-\[0\.1em\]/);
  assert.match(normalCss, /\.brand\s*\{[^}]*font-weight:\s*500;[^}]*letter-spacing:\s*0\.1em;/s);
  assert.match(gestureCss, /\.brandLink span\s*\{[^}]*font-weight:\s*500;[^}]*letter-spacing:\s*0\.1em;/s);
  assert.match(libraryCss, /\.brand\s*\{[^}]*font-weight:\s*500;[^}]*letter-spacing:\s*0\.1em;/s);
});

test("login is an explicit display-only phone form with local validation", async () => {
  const source = await readProjectFile("app/login/page.tsx");

  assert.doesNotMatch(source, /ComingSoon/);
  assert.match(source, /"use client"/);
  assert.match(source, /登录你的牌面记录/);
  assert.match(source, /手机号/);
  assert.match(source, /验证码/);
  assert.match(source, /获取验证码/);
  assert.match(source, /演示界面，尚未接入登录服务/);
  assert.match(source, /validatePhone/);
  assert.match(source, /validateCode/);
  assert.match(source, /aria-describedby/);
  assert.match(source, /type="tel"/);
  assert.match(source, /type="submit"/);
});

test("login cannot accidentally become authentication or persistent state", async () => {
  const source = await readProjectFile("app/login/page.tsx");

  assert.match(source, /event\.preventDefault\(\)/);
  assert.doesNotMatch(
    source,
    /fetch\(|axios|\/api\/|localStorage|sessionStorage|document\.cookie|router\.(?:push|replace)|signIn|createUser/
  );
});

test("login keeps its main copy legible against the dark surface", async () => {
  const css = await readProjectFile("app/login/page.module.css");

  assert.match(css, /\.page\s*\{[^}]*color:\s*#f5f0e6;/s);
  assert.match(css, /\.intro h1\s*\{[^}]*color:\s*#f5f0e6;/s);
});
