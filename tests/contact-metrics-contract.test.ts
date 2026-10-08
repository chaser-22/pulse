import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const logic = readFileSync(new URL('../lib/pulse-logic.ts', import.meta.url), 'utf8');
const model = readFileSync(new URL('../lib/pulse-data.ts', import.meta.url), 'utf8');

function between(start: string, end: string) {
  const from = page.indexOf(start);
  const to = page.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Expected workflow code not found: ' + start);
  return page.slice(from, to);
}

test('only the explicit staff confirmation action records confirmed contact', () => {
  const confirmation = between('function markContacted(', 'function markRenewed(');
  assert.match(confirmation, /contactConfirmedAt: item\.contactConfirmedAt \?\? formatActionTimestamp\(\)/);

  const outcome = between('function recordOutcome(', 'function resetDemo(');
  assert.match(outcome, /if \(!member\?\.contactConfirmedAt \|\| member\.status === 'recovered'\) return/);
  assert.doesNotMatch(outcome, /contactConfirmedAt\s*:/);

  const renewal = between('function markRenewed(', 'function openMemberForm(');
  assert.doesNotMatch(renewal, /contactConfirmedAt\s*:/);
  assert.match(renewal, /followUpAt: undefined/);
});

test('legacy timestamps cannot masquerade as explicit contact proof', () => {
  assert.match(model, /contactConfirmedAt\?: string/);
  assert.match(logic, /Boolean\(member\.contactConfirmedAt\)/);
  assert.doesNotMatch(logic, /Boolean\(member\.contactedAt\)/);
});

test('owner results are cumulative, staff-entered totals rather than payment-verified receipts', () => {
  assert.match(page, /Ukupno · ručno evidentirano/);
  assert.match(page, /Evidentirani iznos obnove/);
  assert.doesNotMatch(page, /Potvrđene uplate|Naplaćeno preko PULSE/);
});

test('completed recovery does not visually imply a contact that never occurred', () => {
  const lifecycle = between('function RecoveryLifecycle(', 'function Dashboard(');
  assert.match(lifecycle, /contacted: Boolean\(member\.contactConfirmedAt\)/);
  assert.match(lifecycle, /renewed: member\.status === 'recovered'/);
  assert.doesNotMatch(lifecycle, /index <= currentIndex/);
});
