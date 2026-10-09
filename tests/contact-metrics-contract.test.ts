import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const logic = readFileSync(new URL('../lib/pulse-logic.ts', import.meta.url), 'utf8');
const model = readFileSync(new URL('../lib/pulse-data.ts', import.meta.url), 'utf8');
const importSource = readFileSync(new URL('../lib/csv-import.ts', import.meta.url), 'utf8');

function between(start: string, end: string) {
  const from = page.indexOf(start);
  const to = page.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Expected workflow code not found: ' + start);
  return page.slice(from, to);
}

test('contact still requires an independent explicit reception action', () => {
  const confirmation = between('function markContacted(', 'function markRenewed(');
  const renewal = between('function markRenewed(', 'function openMemberForm(');
  assert.match(confirmation, /contactConfirmedAt: item\.contactConfirmedAt \?\? formatActionTimestamp\(\)/);
  assert.doesNotMatch(renewal, /contactConfirmedAt\s*:/);
  assert.match(page, /Označi kao kontaktirano/);
});

test('legacy contact timestamps cannot become confirmed outreach', () => {
  assert.match(model, /contactConfirmedAt\?: string/);
  assert.match(logic, /Boolean\(member\.contactConfirmedAt\)/);
  assert.doesNotMatch(logic, /Boolean\(member\.contactedAt\)/);
  assert.match(importSource, /contactConfirmedAt: existing\?\.contactConfirmedAt/);
});

test('no obsolete outcome / follow-up workflow affects metrics or member state', () => {
  assert.doesNotMatch(page, /recordOutcome|onOutcome|Prati sjutra|Bez odgovora|ISHOD KONTAKTA/);
  assert.doesNotMatch(logic, /followUps|recoveryOutcome|followUpAt/);
  assert.doesNotMatch(model, /RecoveryOutcome|recoveryOutcome|followUpAt/);
  assert.doesNotMatch(importSource, /recoveryOutcome|followUpAt/);
});

test('recorded renewals never claim verified payments', () => {
  assert.match(page, /Evidentirani iznos obnove/);
  assert.match(page, /Evidentiraj obnovu/);
  assert.doesNotMatch(page, /Potvrđene uplate|Naplaćeno preko PULSE/);
  assert.doesNotMatch(page, /recoveryActivity\.followUps/);
  assert.match(logic, /recoveredAmount: members\.reduce/);
});

test('a compact status replaces the three-stage progress UI', () => {
  assert.doesNotMatch(page, /function RecoveryLifecycle\(/);
  assert.match(page, /className="simple-contact-state"/);
  assert.match(page, /className="contact-confirmed-state" role="status"/);
});
