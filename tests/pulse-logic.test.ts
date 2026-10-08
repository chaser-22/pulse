import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoMembers } from '../lib/demo-data.ts';
import type { Member } from '../lib/pulse-data.ts';

const initialMembers = createDemoMembers('2026-10-05');
import {
  getActionableRevenue,
  getPulseMetrics,
  getRecoveryActivity,
  getRecoveryLifecycle,
  getRiskMembers,
  memberMatchesSearch,
} from '../lib/pulse-logic.ts';

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
  const detected = { ...initialMembers[0], queuedMessage: undefined, contactConfirmedAt: undefined, recoveryOutcome: undefined };
  const contacted = { ...detected, contactConfirmedAt: '05.10. · 10:00' };
  const renewed = { ...contacted, status: 'recovered' as const, risk: 'low' as const };
  assert.equal(getRecoveryLifecycle(detected), 'detected');
  assert.equal(getRecoveryLifecycle(contacted), 'contacted');
  assert.equal(getRecoveryLifecycle(renewed), 'renewed');
});

test('activity uses only recorded member state', () => {
  const members: Member[] = [
    { ...initialMembers[0], queuedMessage: { channel: 'Poruka', text: 'Test', queuedAt: 'Danas' } },
    { ...initialMembers[1], contactConfirmedAt: '05.10. · 10:00', recoveryOutcome: 'follow_up', followUpAt: 'Sjutra' },
    { ...initialMembers[2], status: 'recovered', risk: 'low', recoveredAmount: 40 },
  ];
  assert.deepEqual(getRecoveryActivity(members), { contacted: 1, followUps: 1, renewed: 1, recoveredAmount: 40 });
});


test('dashboard metrics come only from the current member dataset', () => {
  assert.deepEqual(getPulseMetrics(initialMembers), {
    total: 11,
    active: 9,
    expiring: 5,
    highRisk: 2,
    riskRevenue: 280,
    actionableRevenue: 80,
    recoveredCount: 0,
    recoveredRevenue: 0,
  });
});

test('renewal updates the derived financial picture', () => {
  const target = initialMembers[0];
  const before = getPulseMetrics(initialMembers);
  const renewed = initialMembers.map((member) => member.id === target.id ? {
    ...member, status: 'recovered' as const, risk: 'low' as const, recoveredAmount: member.price,
  } : member);
  const after = getPulseMetrics(renewed);
  assert.equal(after.riskRevenue, before.riskRevenue - 35);
  assert.equal(after.actionableRevenue, before.actionableRevenue - 35);
  assert.equal(after.recoveredRevenue, before.recoveredRevenue + 35);
});

test('member search accepts local and international phone formats', () => {
  const milos = initialMembers.find((member) => member.firstName === 'Miloš');
  assert.ok(milos);
  assert.equal(memberMatchesSearch(milos, '067 214 883'), true);
  assert.equal(memberMatchesSearch(milos, '+38267214883'), true);
  assert.equal(memberMatchesSearch(milos, 'Miloš'), true);
  assert.equal(memberMatchesSearch(milos, 'milos.v@example.test'), false);
});

test('drafts, external app handoffs, and outcomes alone do not prove staff confirmed contact', () => {
  const draft = {
    ...initialMembers[0],
    queuedMessage: { channel: 'Poruka' as const, text: 'Pozdrav', queuedAt: 'Danas' },
  };
  const outcomeWithoutConfirmation = { ...initialMembers[1], recoveryOutcome: 'follow_up' as const };
  const activity = getRecoveryActivity([draft, outcomeWithoutConfirmation]);
  assert.deepEqual(activity, { contacted: 0, followUps: 0, renewed: 0, recoveredAmount: 0 });
  assert.equal(getRecoveryLifecycle(outcomeWithoutConfirmation), 'detected');
});

test('renewal without prior outreach increases renewal and amount, not contact', () => {
  const renewed: Member = {
    ...initialMembers[0],
    contactConfirmedAt: undefined,
    status: 'recovered',
    risk: 'low',
    recoveredAmount: 35,
    recoveredAt: '2026-10-05',
  };
  assert.deepEqual(getRecoveryActivity([renewed]), {
    contacted: 0, followUps: 0, renewed: 1, recoveredAmount: 35,
  });
  assert.equal(getRecoveryLifecycle(renewed), 'renewed');
});

test('a completed renewal closes outstanding follow-up but retains explicitly confirmed contact', () => {
  const followedUp: Member = {
    ...initialMembers[0],
    contactConfirmedAt: '05.10. · 10:00',
    recoveryOutcome: 'follow_up',
    followUpAt: '06.10. · 10:00',
  };
  const before = getRecoveryActivity([followedUp]);
  assert.deepEqual(before, { contacted: 1, followUps: 1, renewed: 0, recoveredAmount: 0 });
  const renewed: Member = {
    ...followedUp, status: 'recovered', risk: 'low', recoveredAmount: 35, recoveredAt: '2026-10-06',
  };
  assert.deepEqual(getRecoveryActivity([renewed]), {
    contacted: 1, followUps: 0, renewed: 1, recoveredAmount: 35,
  });
});

test('contact metrics count distinct members, and only valid recorded renewal amounts', () => {
  const confirmed: Member = { ...initialMembers[0], contactConfirmedAt: 'Danas' };
  const confirmedAndRenewed: Member = {
    ...initialMembers[1], contactConfirmedAt: 'Juče', status: 'recovered', risk: 'low', recoveredAmount: 45,
  };
  const invalidAmount: Member = {
    ...initialMembers[2], status: 'recovered', risk: 'low', recoveredAmount: Number.NaN,
  };
  assert.deepEqual(getRecoveryActivity([confirmed, confirmedAndRenewed, invalidAmount]), {
    contacted: 2, followUps: 0, renewed: 2, recoveredAmount: 45,
  });
});

test('legacy automatically assigned contact timestamps are not counted as confirmed outreach', () => {
  const legacyRenewal: Member = {
    ...initialMembers[0],
    status: 'recovered',
    risk: 'low',
    contactedAt: '05.10. · 10:00',
    contactConfirmedAt: undefined,
    recoveredAmount: 35,
    recoveredAt: '2026-10-05',
  };
  assert.deepEqual(getRecoveryActivity([legacyRenewal]), {
    contacted: 0, followUps: 0, renewed: 1, recoveredAmount: 35,
  });
  assert.equal(getRecoveryLifecycle(legacyRenewal), 'renewed');
});
