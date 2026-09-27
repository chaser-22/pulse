import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('members table and mobile cards receive per-item reveal delays', () => {
  assert.match(page, /className="member-list-item"/);
  assert.match(page, /--member-reveal-delay/);
  assert.match(page, /getMemberRevealDelay\(index, members\.length\)/);
});

test('members animate one by one when the members table becomes visible', () => {
  assert.match(css, /\.table-card\.scroll-reveal\.is-visible \.member-list-item/);
  assert.match(css, /animation-delay:\s*var\(--member-reveal-delay\)/);
  assert.match(css, /@keyframes member-list-enter/);
});

test('member list reveal respects reduced motion', () => {
  assert.match(css, /prefers-reduced-motion:[\s\S]*?\.member-list-item[\s\S]*?animation:\s*none\s*!important/);
});
