import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('Owner screen avoids repeating the same revenue and priority story', () => {
  assert.match(page, /PRIHOD POD RIZIKOM/);
  assert.match(page, /Rezultat kontakata/);
  assert.doesNotMatch(page, /prihoda koji možete zadržati pravovremenim kontaktom/);
  assert.doesNotMatch(page, /Obnovljeno kroz PULSE/);
  assert.doesNotMatch(page, /className="owner-metrics panel-card"/);
  assert.doesNotMatch(page, /CSV pilot bez integracija/);
  assert.doesNotMatch(page, /Prioriteti su spremni za današnji kontakt/);
});

test('Reception sidebar no longer repeats remaining contacts beside its dashboard metrics', () => {
  assert.doesNotMatch(page, /reception-insight|kontakata preostalo/);
  assert.match(page, /<dt>Za kontakt<\/dt>/);
  assert.match(page, /<dt>Kontaktirano<\/dt>/);
  assert.match(page, /workspace === 'owner' && metrics\.recoveredRevenue > 0/);
});

test('Reception and priority screens use short scan labels', () => {
  assert.match(page, /title: 'Danas'/);
  assert.match(page, /<h2>Kontakti<\/h2>/);
  assert.doesNotMatch(page, /NAJBRŽA AKCIJA|RED ZA DANAS|LISTA ZA TIM|ZAŠTO DANAS/);
  assert.match(page, /\{priorityMembers\.length\} prioriteta/);
});

test('Member profile keeps actions and removes duplicate facts', () => {
  assert.doesNotMatch(page, /Prioritet koristi datum isteka i cijenu članarine|profile-basis-note/);
  assert.match(page, /PULSE ne šalje poruke automatski\. Potvrdite kontakt tek nakon slanja/);
  assert.doesNotMatch(page, /Podaci iz CSV-a|RAZLOG PRIORITETA|PULSE prijedlog|znakova/);
  assert.doesNotMatch(page, /profile-history-grid/);
});

test('Onboarding keeps one proposition and two actions', () => {
  assert.match(page, /Vidite šta je pod rizikom\. Znajte koga kontaktirati\./);
  assert.match(page, /Pokreni demo/);
  assert.match(page, /Uvezi svoj CSV/);
  assert.doesNotMatch(page, /onboarding-copy|onboarding-value/);
});
