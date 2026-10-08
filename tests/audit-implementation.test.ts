import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const logic = readFileSync(new URL('../lib/pulse-logic.ts', import.meta.url), 'utf8');

test('Owner risk command uses actual membership values and zero-safe proportions', () => {
  assert.match(page, /PRIHOD POD RIZIKOM/);
  assert.match(page, /<AnimatedCurrency value=\{metrics\.riskRevenue\}/);
  assert.match(page, /metrics\.riskRevenue > 0 \? \(expiredValue \/ metrics\.riskRevenue\) \* 100 : 0/);
  assert.match(page, /className="risk-distribution"/);
  assert.match(page, /role="img" aria-label=/);
  assert.match(page, /expiredShare/);
  assert.match(page, /Otvori \{signalCount\} prioriteta/);
});

test('Owner and Reception preserve distinct operating hierarchies', () => {
  assert.match(page, /dashboard-screen/);
  assert.match(page, /staff-screen/);
  assert.match(page, /Pronađi člana/);
  assert.match(page, /Rezultat kontakata/);
  assert.match(page, /Članovi za kontakt/);
  assert.doesNotMatch(page, /<RevenueTrend|CHURN SCORE|occupancy rate/i);
});

test('Recovery sheet exposes truthful contact outcomes without bypassing confirmation', () => {
  assert.match(page, /member-dialog member-command-sheet/);
  assert.match(page, /Označi kao kontaktirano/);
  assert.match(page, /Slanje je ručno\. Nakon slanja potvrdite kontakt/);
  assert.match(page, /Ishod kontakta/);
  assert.match(page, /onOutcome\('no_answer'\)/);
  assert.match(page, /onOutcome\('replied'\)/);
  assert.match(page, /onOutcome\('follow_up'\)/);
  assert.match(logic, /member\.contactedAt \|\| member\.recoveryOutcome/);
});

test('New semantic dark system has one active palette', () => {
  assert.match(polish, /DARK PERFORMANCE INTELLIGENCE/);
  for (const color of ['#05080b','#2ccfe3','#f36c68','#e4ad4b','#35c99a']) {
    assert.ok(polish.includes(color), 'Missing active color ' + color);
  }
  assert.doesNotMatch(polish, /\/\* World-class pilot refinement/);
  assert.doesNotMatch(polish, /\/\* Copy-density cleanup/);
});

test('No obsolete startup animation or 3D background in app', () => {
  assert.doesNotMatch(page, /PageAtmosphere|PulseLoaderScene|useScrollReveal/);
  assert.doesNotMatch(globals, /\/\* PULSE cinematic startup \*\//);
  assert.doesNotMatch(globals, /\/\* Initial app entrance choreography \*\//);
  assert.match(polish, /prefers-reduced-motion:reduce/);
});

test('Member command sheet is responsive and keyboard-safe', () => {
  assert.match(polish, /\.member-command-sheet\s*\{/);
  assert.match(polish, /width:min\(720px,100vw\)!important/);
  assert.match(polish, /@media \(max-width:680px\)/);
  assert.match(polish, /width:100vw!important/);
  assert.match(polish, /focus-visible/);
});
