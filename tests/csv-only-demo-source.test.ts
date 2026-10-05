import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoMembers, createDemoMemberCsv } from '../lib/demo-data.ts';

test('default demo is generated from the same minimum CSV a client would provide', () => {
  const csv = createDemoMemberCsv('2026-10-05');
  const [header] = csv.split('\n');

  assert.equal(header, 'Ime i prezime;Telefon;Cijena;Datum isteka');

  const members = createDemoMembers('2026-10-05');
  assert.ok(members.length > 0);
  assert.ok(members.every((member) => member.phone));
  assert.ok(members.every((member) => member.price > 0));
  assert.ok(members.every((member) => member.endDate));
});

test('fresh demo contains no invented recovery/contact history', () => {
  const members = createDemoMembers('2026-10-05');

  assert.ok(members.every((member) => member.status !== 'recovered'));
  assert.ok(members.every((member) => member.recoveredAmount === undefined));
  assert.ok(members.every((member) => member.recoveredAt === undefined));
  assert.ok(members.every((member) => member.queuedMessage === undefined));
  assert.ok(members.every((member) => member.recoveryOutcome === undefined));
  assert.ok(members.every((member) => member.followUpAt === undefined));
});

test('fresh demo does not invent optional member facts', () => {
  const members = createDemoMembers('2026-10-05');

  assert.ok(members.every((member) => member.email === ''));
  assert.ok(members.every((member) => member.birthday === ''));
  assert.ok(members.every((member) => member.startDate === ''));
  assert.ok(members.every((member) => member.packageName === 'Nije navedeno'));
});

test('risk explanations are derived only from expiry date', () => {
  const members = createDemoMembers('2026-10-05');
  const milos = members.find((member) => member.firstName === 'Miloš');

  assert.ok(milos);
  assert.equal(milos.status, 'expired');
  assert.equal(milos.risk, 'high');
  assert.equal(milos.riskReason, 'Članarina je istekla prije 3 dana.');
  assert.doesNotMatch(milos.riskReason, /ranije|obnavlja|dolaz|trening|navik/i);
});
