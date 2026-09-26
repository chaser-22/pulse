import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('initial app entrance is temporary and independent from the loader exit state', () => {
  assert.match(page, /const \[appEntering, setAppEntering\] = useState\(false\)/);
  assert.match(page, /setAppEntering\(true\)/);
  assert.match(page, /setAppEntering\(false\)/);
  assert.match(page, /app-shell \$\{appEntering \? 'app-shell-entering' : ''\}/);
});

test('initial app entrance staggers shell chrome and visible page content', () => {
  assert.match(css, /\.app-shell\.app-shell-entering \.sidebar \.brand/);
  assert.match(css, /\.app-shell\.app-shell-entering \.sidebar \.nav-item:nth-child\(1\)/);
  assert.match(css, /\.app-shell\.app-shell-entering \.topbar \.page-title/);
  assert.match(css, /\.app-shell\.app-shell-entering \.topbar \.top-actions > \*/);
  assert.match(css, /\.app-shell\.app-shell-entering \.screen-stack > \.scroll-reveal\.is-visible/);
});

test('loader wordmark stack sits lower while retaining a short-height safe override', () => {
  const desktop = css.match(/\.pulse-loader-center \{[\s\S]*?top:\s*([\d.]+)%/);
  const shortHeight = css.match(/@media \(max-height: 680px\)[\s\S]*?\.pulse-loader-center \{[\s\S]*?top:\s*([\d.]+)%/);

  assert.ok(desktop);
  assert.ok(shortHeight);
  assert.ok(Number(desktop[1]) >= 74);
  assert.ok(Number(shortHeight[1]) >= 73);
  assert.ok(Number(shortHeight[1]) <= 76);
});
