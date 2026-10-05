import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const logic = readFileSync(new URL('../lib/pulse-logic.ts', import.meta.url), 'utf8');
const data = readFileSync(new URL('../lib/pulse-data.ts', import.meta.url), 'utf8');

test('member UI only presents minimum CSV member facts plus derived status/risk', () => {
  for (const unsupported of [
    'member.packageName',
    'member.startDate',
    'member.email',
    'member.birthday',
  ]) {
    assert.doesNotMatch(page, new RegExp(unsupported.replace('.', '\\.')));
  }

  assert.match(page, /member\.phone/);
  assert.match(page, /member\.price/);
  assert.match(page, /member\.endDate/);
  assert.match(page, /member\.riskReason/);
});

test('manual member form asks only for minimum CSV fields', () => {
  for (const label of ['E-mail', 'Paket', 'Početak', 'Preferirani kanal']) {
    assert.doesNotMatch(page, new RegExp(`<Field label="${label}"`));
  }

  assert.match(page, /<Field label="Ime"/);
  assert.match(page, /<Field label="Prezime"/);
  assert.match(page, /<Field label="Telefon"/);
  assert.match(page, /<Field label="Mjesečna cijena"/);
  assert.match(page, /<Field label="Ističe"/);
});

test('search does not rely on optional email data', () => {
  assert.doesNotMatch(page, /ime, telefon ili e-mail/i);
  assert.doesNotMatch(page, /ime, telefon ili e-mail…/i);
  assert.doesNotMatch(logic, /member\.email/);
});

test('message suggestions never invent attendance or past renewal behavior', () => {
  assert.doesNotMatch(page, /nedostaješ nam/i);
  assert.doesNotMatch(page, /vratiš u ritam/i);
  assert.doesNotMatch(page, /ranije obnavlja/i);
  assert.doesNotMatch(data, /ranije obnavlja|dolaz|trening|navik/i);
});

test('demo resets from CSV-derived members and ignores old browser demo state', () => {
  assert.match(page, /createDemoMembers\(\)/);
  assert.match(page, /pulse-csv-only-demo-v2/);
  assert.doesNotMatch(page, /initialMembers/);
});

test('demo chrome does not pretend to know owner or gym location from CSV', () => {
  assert.doesNotMatch(page, /Dobro jutro, Marko\./);
  assert.doesNotMatch(page, /Podgorica/);
});
