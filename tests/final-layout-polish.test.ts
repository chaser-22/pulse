import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

test('final polish stylesheet does not carry obsolete queue or removed revenue layout', () => {
  assert.doesNotMatch(css, /\.priority-row\b/);
  assert.doesNotMatch(css, /\.priority-list\b/);
  assert.doesNotMatch(css, /\.revenue-overview\b/);
  assert.doesNotMatch(css, /\.revenue-breakdown\b/);
});

test('desktop layout keeps a controlled reading width and consistent spacing tokens', () => {
  assert.match(css, /--page-gutter:\s*clamp\(16px,\s*2\.4vw,\s*36px\)/);
  assert.match(css, /--section-gap:\s*clamp\(18px,\s*2vw,\s*28px\)/);
  assert.match(css, /width:\s*min\(1280px,\s*calc\(100% - var\(--page-gutter\) \* 2\)\)/);
});

test('interactive controls have comfortable touch targets', () => {
  assert.match(css, /--control-height:\s*44px/);
  assert.match(css, /\.today-queue__action[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.task-actions button[\s\S]*?min-height:\s*44px/);
});

test('today queue has deliberate desktop, tablet, and phone layouts', () => {
  assert.match(css, /\.today-queue\s*\{/);
  assert.match(css, /@container pulse-content \(max-width: 900px\)[\s\S]*?\.today-queue__columns\s*\{\s*display:\s*none/);
  assert.match(css, /@container pulse-content \(max-width: 560px\)[\s\S]*?\.today-queue__action[\s\S]*?width:\s*100%/);
});

test('dialogs are viewport-safe and mobile form actions stack cleanly', () => {
  assert.match(css, /max-height:\s*calc\(100dvh - 32px\)/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.form-footer[\s\S]*?flex-direction:\s*column/);
});
