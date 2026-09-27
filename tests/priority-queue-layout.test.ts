import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('today queue uses isolated compact operational-list markup', () => {
  for (const className of [
    'today-queue',
    'today-queue__header',
    'today-queue__columns',
    'today-queue__item',
    'today-queue__main',
    'today-queue__member',
    'today-queue__risk',
    'today-queue__reason',
    'today-queue__value',
    'today-queue__action',
    'today-queue__rail',
    'today-queue__details',
  ]) {
    assert.match(page, new RegExp(`className="[^"]*\\b${className}\\b`));
  }

  assert.doesNotMatch(page, /priority-row-main|priority-row-meta|priority-reason-block|priority-value-block/);
});

test('desktop today queue shares one predictable five-column grid', () => {
  assert.match(css, /--today-queue-grid:\s*minmax\(190px,\s*\.9fr\)\s+104px\s+minmax\(260px,\s*1\.5fr\)\s+88px\s+124px/);
  assert.match(css, /\.today-queue__columns[\s\S]*?grid-template-columns:\s*var\(--today-queue-grid\)/);
  assert.match(css, /\.today-queue__main[\s\S]*?grid-template-columns:\s*var\(--today-queue-grid\)/);
});

test('today queue primary rows stay compact and avoid absolute layout', () => {
  assert.match(css, /\.today-queue__main\s*\{[\s\S]*?min-height:\s*74px/);
  assert.doesNotMatch(css, /\.today-queue[^\{]*\{[^\}]*position:\s*absolute/);
});

test('today queue has explicit tablet and mobile collapse rules', () => {
  assert.match(css, /@media \(max-width: 1100px\)[\s\S]*?\.today-queue__main\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.today-queue__action\s*\{[\s\S]*?width:\s*100%/);
});
