import assert from 'node:assert/strict';
import test from 'node:test';
import { initialMembers, type Member } from '../lib/pulse-data.ts';
import {
  getActionableRevenue,
  getPulseMetrics,
  getRecoveryActivity,
  getRecoveryLifecycle,
  getRiskMembers,
  memberMatchesSearch,
} from '../lib/pulse-logic.ts';

const base = { active: 270, expiring: 13, recoveredCount: 12, recoveredRevenue: 445 };

test('risk queue uses only membership-date signals', () => {
  const riskMembers = getRiskMembers(initialMembers);
  assert.equal(riskMembers.every((member) => ['expired', 'expiring'].includes(member.status)), true);
});

test('actionable revenue includes only current high-risk non-recovered members', () => {
  assert.equal(getActionableRevenue(initialMembers), 80);
});

test('risk queue excludes recovered members', () => {
  const riskMembers = getRiskMembers(initialMembers);
  assert.equal(riskMembers.length, 7);
  assert.ok(riskMembers.every((member) => member.risk !== 'low' && member.status !== 'recovered'));
});

test('lifecycle advances from detected to contacted to renewed', () => {
  const detected = { ...initialMembers[0], queuedMessage: undefined, recoveryOutcome: undefined };
  const contacted = { ...detected, recoveryOutcome: 'replied' as const };
  const renewed = { ...contacted, status: 'recovered' as const, risk: 'low' as const };
  assert.equal(getRecoveryLifecycle(detected), 'detected');
  assert.equal(getRecoveryLifecycle(contacted), 'contacted');
  assert.equal(getRecoveryLifecycle(renewed), 'renewed');
});

test('activity uses only recorded member state', () => {
  const members: Member[] = [
    { ...initialMembers[0], queuedMessage: { channel: 'Poruka', text: 'Test', queuedAt: 'Danas' } },
    { ...initialMembers[1], recoveryOutcome: 'follow_up', followUpAt: 'Sjutra' },
    { ...initialMembers[15], status: 'recovered', recoveredAmount: 40 },
  ];
  assert.deepEqual(getRecoveryActivity(members), { contacted: 2, followUps: 1, renewed: 1, recoveredAmount: 40 });
});

test('renewal updates the derived financial picture', () => {
  const target = initialMembers[0];
  const before = getPulseMetrics(initialMembers, base);
  const renewed = initialMembers.map((member) => member.id === target.id ? {
    ...member, status: 'recovered' as const, risk: 'low' as const, recoveredAmount: member.price,
  } : member);
  const after = getPulseMetrics(renewed, base);
  assert.equal(after.riskRevenue, before.riskRevenue - 35);
  assert.equal(after.actionableRevenue, before.actionableRevenue - 35);
  assert.equal(after.recoveredRevenue, before.recoveredRevenue + 35);
});

test('member search accepts local and international phone formats', () => {
  const milos = initialMembers.find((member) => member.id === 'milos-vukovic');
  assert.ok(milos);
  assert.equal(memberMatchesSearch(milos, '067 214 883'), true);
  assert.equal(memberMatchesSearch(milos, '+38267214883'), true);
  assert.equal(memberMatchesSearch(milos, 'Miloš'), true);
  assert.equal(memberMatchesSearch(milos, 'milos.v@example.test'), true);
});
