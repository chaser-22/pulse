import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

test('member profile describes status as date-derived instead of CSV-only', () => {
  assert.doesNotMatch(page, /sub="iz CSV\/Excel evidencije"/);
  assert.match(page, /sub="izračunato iz datuma isteka"/);
});

test('narrow operational layouts allow long member identity text to wrap instead of clipping', () => {
  assert.match(
    polish,
    /@media \(max-width: 680px\)[\s\S]*?\.task-name h3,[\s\S]*?\.risk-member-identity h3[\s\S]*?white-space:\s*normal[\s\S]*?overflow-wrap:\s*anywhere/,
  );
  assert.match(
    polish,
    /@container pulse-content \(max-width: 560px\)[\s\S]*?\.today-queue__member strong,[\s\S]*?\.today-queue__member small[\s\S]*?white-space:\s*normal[\s\S]*?overflow-wrap:\s*anywhere/,
  );
});

test('mobile dynamic identity text is not visually clipped by inherited ellipsis rules', () => {
  assert.match(
    polish,
    /@media \(max-width: 680px\)[\s\S]*?\.task-person small[\s\S]*?white-space:\s*normal/,
  );
  assert.match(
    polish,
    /@container pulse-content \(max-width: 560px\)[\s\S]*?\.today-queue__member small[\s\S]*?text-overflow:\s*clip/,
  );
});
