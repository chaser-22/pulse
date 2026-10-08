import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const atmosphere = readFileSync(new URL('../components/page-atmosphere-scene.tsx', import.meta.url), 'utf8');
const logic = readFileSync(new URL('../lib/pulse-logic.ts', import.meta.url), 'utf8');

test('owner hierarchy leads with revenue risk and priorities', () => {
  assert.match(page, /PRIHOD POD RIZIKOM/);
  assert.match(page, /Otvori \{signalCount\} prioriteta/);
  assert.match(page, /Rezultat kontakata/);
  assert.doesNotMatch(page, /className="owner-metrics panel-card"/);
});

test('drafts do not count as confirmed contacts', () => {
  assert.match(page, /Slanje je ručno\. Nakon slanja potvrdite kontakt\./);
  assert.match(page, /Označi kao kontaktirano/);
  assert.match(logic, /member\.contactedAt \|\| member\.recoveryOutcome/);
});

test('3D is owner-only and data-bound', () => {
  assert.match(page, /workspace === 'owner' && view === 'dashboard'/);
  assert.match(page, /urgentCount=\{highRiskMembers\.length\}/);
  assert.doesNotMatch(page, /PulseLoaderScene|LoadingState|loaderVisible/);
  assert.match(atmosphere, /lineIndex < current\.signalCount/);
  assert.match(atmosphere, /lineIndex < current\.urgentCount/);
});

test('carbon and aqua palette is semantic', () => {
  assert.match(polish, /--background:\s*#06090d/);
  assert.match(polish, /--primary:\s*#28cfe3/);
  assert.match(polish, /--danger:\s*#f46c68/);
  assert.match(polish, /--warning:\s*#e6ad4b/);
  assert.match(polish, /--success:\s*#36c99a/);
});
