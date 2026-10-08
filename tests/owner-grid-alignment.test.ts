import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

test('Owner queue uses one shared horizontal inset', () => {
  assert.match(css, /--owner-grid-inset:\s*20px/);
  assert.match(css, /\.today-queue__header,[\s\S]*?\.today-queue__footer\s*\{[\s\S]*?padding-inline:\s*var\(--owner-grid-inset\)/);
  assert.match(css, /\.today-queue__columns,[\s\S]*?\.today-queue__main,[\s\S]*?\.today-queue__rail\s*\{[\s\S]*?padding-inline:\s*var\(--owner-grid-inset\)/);
});

test('Recovery activity keeps four equal desktop columns', () => {
  assert.match(css, /\.recovery-activity dl\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
});

test('Owner hero is compact after copy reduction', () => {
  assert.match(css, /\/\* Copy-density cleanup \*\/[\s\S]*?\.owner-hero\s*\{[\s\S]*?min-height:\s*240px/);
  assert.match(css, /\/\* Copy-density cleanup \*\/[\s\S]*?\.owner-hero-copy\s*\{[\s\S]*?width:\s*min\(720px, 100%\)/);
});

test('Owner recovery geometry intentionally collapses to two columns on phones', () => {
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*?\.recovery-activity dl\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});
