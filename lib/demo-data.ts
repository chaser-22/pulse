import { addDaysIso, parseMemberCsv, toLocalIsoDate } from './csv-import.ts';
import type { Member } from './pulse-data.ts';

const demoRows = [
  ['Miloš Vuković', '+382 67 214 883', 35, -3],
  ['Milica Đurišić', '+382 67 902 410', 45, -6],
  ['Bojan Martinović', '+382 69 221 460', 35, 5],
  ['Ana Laković', '+382 67 473 116', 45, 6],
  ['Tamara Mugoša', '+382 67 608 339', 35, 7],
  ['Marija Bošković', '+382 67 119 487', 40, 4],
  ['Anđela Krstović', '+382 69 491 885', 45, 3],
  ['Petar Rajković', '+382 67 773 608', 40, 18],
  ['Mina Jovović', '+382 68 992 443', 35, 22],
  ['Sara Bulatović', '+382 67 330 929', 35, 25],
  ['Ivan Medenica', '+382 69 807 115', 40, 30],
] as const;

export function createDemoMemberCsv(todayIso = toLocalIsoDate()) {
  const rows = demoRows.map(([name, phone, price, offset]) => (
    [name, phone, String(price), addDaysIso(todayIso, offset)].join(';')
  ));

  return ['Ime i prezime;Telefon;Cijena;Datum isteka', ...rows].join('\n');
}

export function createDemoMembers(todayIso = toLocalIsoDate()): Member[] {
  const result = parseMemberCsv(createDemoMemberCsv(todayIso), [], todayIso);

  if (result.errors.length) {
    throw new Error(`Demo CSV nije validan: ${result.errors.join(' ')}`);
  }

  return result.members;
}
