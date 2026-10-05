import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('owner dashboard does not use unsupported hard-coded financial totals', () => {
  for (const value of ['BASE_METRICS', '10320', '12500', '9500', '820', '+8,4%']) {
    assert.doesNotMatch(page, new RegExp(value.replace('+', '\\+')));
  }

  assert.doesNotMatch(page, /<RevenueTrend/);
  assert.doesNotMatch(page, /NAPLAĆENO OVOG MJESECA/);
});

test('CSV import replaces the demo member dataset instead of appending to it', () => {
  assert.match(page, /setMembers\(result\.members\)/);
  assert.doesNotMatch(page, /setMembers\(\(current\) => \[\.\.\.imported, \.\.\.current\]\)/);
});

test('owner dashboard keeps only member-derived and PULSE-tracked recovery metrics', () => {
  assert.match(page, /Metric label="Aktivni članovi" value=\{String\(metrics\.active\)\}/);
  assert.match(page, /Metric label="Ističe za 7 dana" value=\{String\(metrics\.expiring\)\}/);
  assert.match(page, /Metric label="Istekle članarine" value=\{String\(metrics\.highRisk\)\}/);
  assert.match(page, /Metric label="Obnove u PULSE" value=\{String\(metrics\.recoveredCount\)\}/);
  assert.match(page, /Metric label="Evidentiran prihod" value=\{euro\(metrics\.recoveredRevenue\)\}/);
});
