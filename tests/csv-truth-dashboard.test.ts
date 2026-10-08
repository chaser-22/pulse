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

test('owner keeps member-derived risk and tracked recovery without duplicate KPI strips', () => {
  assert.match(page, /PRIHOD POD RIZIKOM/);
  assert.match(page, /recoveryActivity\.contacted/);
  assert.match(page, /recoveryActivity\.followUps/);
  assert.match(page, /recoveryActivity\.renewed/);
  assert.match(page, /recoveryActivity\.recoveredAmount/);
  assert.doesNotMatch(page, /function Metric\(/);
  assert.doesNotMatch(page, /className="owner-metrics panel-card"/);
  assert.doesNotMatch(page, /Metric label="Izvor podataka" value="CSV"/);
});
