import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('pilot no longer depends on a fixed demo date or CSV status column', () => {
  assert.doesNotMatch(page, /const today = '2026-08-31'/);
  assert.doesNotMatch(page, /statusCandidate/);
  assert.match(page, /parseMemberCsv\(/);
  assert.match(page, /toLocalIsoDate\(/);
});

test('CSV import only replaces member data after successful validation', () => {
  assert.match(page, /if \(result\.errors\.length\)/);
  assert.match(page, /setMembers\(result\.members\)/);
});

test('CSV guidance describes the true minimum pilot input', () => {
  assert.match(page, /četiri potrebna polja|četiri polja/i);
  assert.match(page, /Ime.*telefon.*cijena.*datum isteka/is);
  assert.match(page, /status i prioritet/i);
});
