import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

test('initial app entrance is temporary and finishes quickly after the loader', () => {
  assert.match(page, /const \[appEntering, setAppEntering\] = useState\(false\)/);
  assert.match(page, /setAppEntering\(true\)/);
  assert.match(page, /setAppEntering\(false\), 320/);
  assert.match(page, /app-shell \$\{appEntering \? 'app-shell-entering' : ''\}/);
});

test('post-loader entrance reveals the whole product immediately instead of staggering business content', () => {
  assert.match(css, /\.app-shell\.app-shell-entering\s*\{[\s\S]*?pulse-app-shell-enter 280ms/);
  assert.match(css, /\.app-shell\.app-shell-entering :is\([\s\S]*?\.screen-stack[\s\S]*?animation:\s*none !important/);
  assert.match(css, /opacity:\s*1 !important/);
});
