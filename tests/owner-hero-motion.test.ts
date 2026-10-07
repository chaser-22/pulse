import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('owner hero no longer uses decorative scan or perimeter motion', () => {
  assert.doesNotMatch(page, /owner-hero-frame-pulse/);
  assert.match(css, /\.owner-hero::before\s*\{[\s\S]*?animation:\s*none/);
  assert.match(css, /\.owner-hero::after\s*\{[\s\S]*?display:\s*none/);
});

test('owner hero keeps money prominent without dominating the first viewport', () => {
  assert.match(css, /\.owner-hero\s*\{[\s\S]*?min-height:\s*340px/);
  assert.match(css, /\.owner-hero h2\s*\{[\s\S]*?font-size:\s*clamp\(56px, 6\.8vw, 88px\)/);
});
