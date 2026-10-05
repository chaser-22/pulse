import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoMembers } from '../lib/demo-data.ts';
import {
  addDaysIso,
  inferMembershipState,
  parseMemberCsv,
  toLocalIsoDate,
} from '../lib/csv-import.ts';

test('membership state is inferred from end date without a status column', () => {
  assert.deepEqual(inferMembershipState('2026-09-20', '2026-09-27'), {
    status: 'expired',
    risk: 'high',
  });
  assert.deepEqual(inferMembershipState('2026-10-02', '2026-09-27'), {
    status: 'expiring',
    risk: 'medium',
  });
  assert.deepEqual(inferMembershipState('2026-10-20', '2026-09-27'), {
    status: 'active',
    risk: 'low',
  });
});

test('CSV import accepts Montenegrin headers and semicolon-separated exports', () => {
  const csv = [
    'Ime;Prezime;Telefon;Paket;Cijena;Datum isteka',
    'Marko;Marković;+382 67 111 222;Standard;35,00 €;20.09.2026',
    'Jelena;Jovanović;+382 67 333 444;Plus;45;02.10.2026',
  ].join('\n');

  const result = parseMemberCsv(csv, [], '2026-09-27');

  assert.deepEqual(result.errors, []);
  assert.equal(result.members.length, 2);
  assert.equal(result.members[0].status, 'expired');
  assert.equal(result.members[0].risk, 'high');
  assert.equal(result.members[0].price, 35);
  assert.equal(result.members[0].endDate, '2026-09-20');
  assert.equal(result.members[1].status, 'expiring');
});

test('CSV import accepts common English aliases and quoted comma cells', () => {
  const csv = [
    'first_name,last_name,mobile,membership,monthly_price,expiry_date',
    'Ana,Lakovic,+38267473116,"Premium, Plus",45,2026-10-20',
  ].join('\n');

  const result = parseMemberCsv(csv, [], '2026-09-27');

  assert.deepEqual(result.errors, []);
  assert.equal(result.members[0].packageName, 'Premium, Plus');
  assert.equal(result.members[0].status, 'active');
});

test('invalid required member data blocks replacement instead of inventing defaults', () => {
  const csv = [
    'ime,prezime,telefon,cijena,datum isteka',
    'Mila,Petrovic,,35,2026-10-20',
    'Ivan,Ivic,+38267111222,,2026-10-20',
    'Sara,Saric,+38267333444,40,not-a-date',
  ].join('\n');

  const result = parseMemberCsv(csv, [], '2026-09-27');

  assert.equal(result.members.length, 0);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0], /red 2/i);
});

test('re-import preserves PULSE recovery state for a matching member', () => {
  const recovered = {
    ...createDemoMembers('2026-09-27')[0],
    id: 'existing-member',
    phone: '+382 67 555 777',
    status: 'recovered' as const,
    risk: 'low' as const,
    recoveredAmount: 35,
    recoveredAt: '2026-09-25',
    recoveryOutcome: 'replied' as const,
  };

  const csv = [
    'ime;prezime;telefon;cijena;datum isteka',
    'Milos;Vukovic;+38267555777;40;27.10.2026',
  ].join('\n');

  const result = parseMemberCsv(csv, [recovered], '2026-09-27');

  assert.deepEqual(result.errors, []);
  assert.equal(result.members[0].id, 'existing-member');
  assert.equal(result.members[0].status, 'recovered');
  assert.equal(result.members[0].recoveredAmount, 35);
  assert.equal(result.members[0].recoveryOutcome, 'replied');
  assert.equal(result.members[0].price, 40);
  assert.equal(result.members[0].endDate, '2026-10-27');
});

test('date helpers use the real supplied calendar date and renewal horizon', () => {
  const date = new Date(2026, 8, 27, 12, 0, 0);
  assert.equal(toLocalIsoDate(date), '2026-09-27');
  assert.equal(addDaysIso('2026-09-27', 30), '2026-10-27');
});
