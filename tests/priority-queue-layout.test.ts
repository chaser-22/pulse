import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('today priority queue uses a structured aligned row layout', () => {
  assert.match(page, /className="priority-queue priority-queue--today"/);
  assert.match(page, /className="priority-row-main"/);
  assert.match(page, /className="priority-reason-block"/);
  assert.match(page, /className="priority-value-block"/);
  assert.match(page, /className="priority-row-meta"/);
});

test('priority queue exposes clear column labels and aligned desktop grid', () => {
  assert.match(page, /ZAŠTO TREBA PAŽNJU/);
  assert.match(page, /ČLANARINA/);
  assert.match(css, /\.priority-row-main\s*\{[\s\S]*?grid-template-columns:/);
  assert.match(css, /\.priority-row-meta\s*\{[\s\S]*?grid-template-columns:/);
});

test('priority queue collapses cleanly on smaller screens', () => {
  assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.priority-row-main\s*\{[\s\S]*?grid-template-columns:\s*1fr auto/);
});
