import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('visible copy only describes implemented pilot behavior', () => {
  assert.doesNotMatch(page, /Prijavite dolaske/);
  assert.doesNotMatch(page, /oporavljeno ovog mjeseca/);
  assert.doesNotMatch(page, /Danas u 10:42/);
  assert.doesNotMatch(page, /Sjutra u 10:00/);
  assert.match(page, /nacrt poruke/i);
  assert.match(page, /šalje ručno/i);
});

test('manual member changes use the same date-derived membership state as CSV import', () => {
  assert.match(page, /inferMembershipState\(/);
  assert.doesNotMatch(page, /<Field label="Status">/);
});

test('member actions store real display timestamps instead of demo clock values', () => {
  assert.match(page, /formatActionTimestamp\(/);
  assert.match(page, /formatFollowUpTimestamp\(/);
});

test('top-level copy is concise and operational', () => {
  assert.match(page, /Danas na recepciji/);
  assert.match(page, /Pronađite člana, zabilježite ishod kontakta i završite današnje prioritete\./);
  assert.match(page, /oporavljeno kroz PULSE/);
});
