export type MemberStatus = 'active' | 'expiring' | 'expired' | 'recovered';
export type RiskLevel = 'high' | 'medium' | 'low';
export type Channel = 'Telefon' | 'Poruka' | 'E-mail';
export type RecoveryOutcome = 'no_answer' | 'replied' | 'follow_up' | 'declined';

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthday: string;
  status: MemberStatus;
  risk: RiskLevel;
  packageName: string;
  price: number;
  startDate: string;
  endDate: string;
  riskReason: string;
  nextAction: string;
  preferredChannel: Channel;
  recoveredAmount?: number;
  recoveredAt?: string;
  queuedMessage?: { channel: Channel; text: string; queuedAt: string };
  recoveryOutcome?: RecoveryOutcome;
  followUpAt?: string;
};

export const copy = {
  me: {
    gymName: 'PULSE Demo Gym',
    location: 'Podgorica',
    nav: { dashboard: 'Pregled', members: 'Članovi', radar: 'Signali rizika' },
    actions: { add: 'Dodaj člana', import: 'Uvezi CSV', renew: 'Označi kao obnovljeno' },
    statuses: { active: 'Aktivan', expiring: 'Ističe', expired: 'Istekao', recovered: 'Oporavljen' } as Record<MemberStatus, string>,
  },
};

export const initialMembers: Member[] = [
  {
    id: 'milos-vukovic', firstName: 'Miloš', lastName: 'Vuković', phone: '+382 67 214 883', email: 'milos.v@example.test', birthday: '1991-04-12',
    status: 'expired', risk: 'high', packageName: 'Standard', price: 35, startDate: '2026-07-28', endDate: '2026-08-28',
    riskReason: 'Članarina je istekla prije 3 dana.', nextAction: 'Kontaktirajte ga danas i ponudite jednostavnu obnovu.', preferredChannel: 'Poruka',
  },
  {
    id: 'milica-djurisic', firstName: 'Milica', lastName: 'Đurišić', phone: '+382 67 902 410', email: 'milica.dj@example.test', birthday: '1992-09-19',
    status: 'expired', risk: 'high', packageName: 'Neograničeno', price: 45, startDate: '2026-07-25', endDate: '2026-08-25',
    riskReason: 'Članarina je istekla prije 6 dana.', nextAction: 'Pozovite je danas i pitajte želi li obnovu.', preferredChannel: 'Telefon',
  },
  {
    id: 'bojan-martinovic', firstName: 'Bojan', lastName: 'Martinović', phone: '+382 69 221 460', email: 'bojan.m@example.test', birthday: '1986-06-08',
    status: 'expiring', risk: 'medium', packageName: 'Standard', price: 35, startDate: '2026-08-05', endDate: '2026-09-05',
    riskReason: 'Članarina ističe za 5 dana.', nextAction: 'Pošaljite podsjetnik prije isteka.', preferredChannel: 'Poruka',
  },
  {
    id: 'ana-lakovic', firstName: 'Ana', lastName: 'Laković', phone: '+382 67 473 116', email: 'ana.l@example.test', birthday: '1998-12-21',
    status: 'expiring', risk: 'medium', packageName: 'Neograničeno', price: 45, startDate: '2026-08-06', endDate: '2026-09-06',
    riskReason: 'Članarina ističe za 6 dana.', nextAction: 'Pošaljite prijateljski podsjetnik sa datumom isteka.', preferredChannel: 'Poruka',
  },
  {
    id: 'tamara-mugosa', firstName: 'Tamara', lastName: 'Mugoša', phone: '+382 67 608 339', email: 'tamara.m@example.test', birthday: '1994-07-14',
    status: 'expiring', risk: 'medium', packageName: 'Standard', price: 35, startDate: '2026-08-07', endDate: '2026-09-07',
    riskReason: 'Članarina ističe za 7 dana.', nextAction: 'Pošaljite ručni podsjetnik sa jasnim datumom isteka.', preferredChannel: 'Poruka',
  },
  {
    id: 'marija-boskovic', firstName: 'Marija', lastName: 'Bošković', phone: '+382 67 119 487', email: 'marija.b@example.test', birthday: '1989-03-04',
    status: 'expiring', risk: 'medium', packageName: 'Plus', price: 40, startDate: '2026-08-04', endDate: '2026-09-04',
    riskReason: 'Članarina ističe za 4 dana.', nextAction: 'Pošaljite podsjetnik na preferirani kanal.', preferredChannel: 'Poruka',
  },
  {
    id: 'andjela-krstovic', firstName: 'Anđela', lastName: 'Krstović', phone: '+382 69 491 885', email: 'andjela.k@example.test', birthday: '1997-08-09',
    status: 'expiring', risk: 'medium', packageName: 'Neograničeno', price: 45, startDate: '2026-08-03', endDate: '2026-09-03',
    riskReason: 'Članarina ističe za 3 dana.', nextAction: 'Pošaljite kratki podsjetnik dok je članarina još aktivna.', preferredChannel: 'Poruka',
  },
  {
    id: 'petar-rajkovic', firstName: 'Petar', lastName: 'Rajković', phone: '+382 67 773 608', email: 'petar.r@example.test', birthday: '1993-04-28',
    status: 'active', risk: 'low', packageName: 'Plus', price: 40, startDate: '2026-08-20', endDate: '2026-09-20',
    riskReason: 'Članarina je aktivna i ne ističe uskoro.', nextAction: 'Nije potrebna akcija.', preferredChannel: 'Poruka',
  },
  {
    id: 'mina-jovovic', firstName: 'Mina', lastName: 'Jovović', phone: '+382 68 992 443', email: 'mina.j@example.test', birthday: '1999-02-08',
    status: 'active', risk: 'low', packageName: 'Standard', price: 35, startDate: '2026-08-22', endDate: '2026-09-22',
    riskReason: 'Članarina je aktivna i ne ističe uskoro.', nextAction: 'Nije potrebna akcija.', preferredChannel: 'Poruka',
  },
  {
    id: 'sara-bulatovic', firstName: 'Sara', lastName: 'Bulatović', phone: '+382 67 330 929', email: 'sara.b@example.test', birthday: '1996-09-07',
    status: 'recovered', risk: 'low', packageName: 'Standard', price: 35, startDate: '2026-08-26', endDate: '2026-09-26',
    riskReason: 'Obnova je ručno označena nakon kontakta tima.', nextAction: 'Nije potrebna akcija.', preferredChannel: 'Poruka', recoveredAmount: 35, recoveredAt: '2026-08-26',
  },
  {
    id: 'ivan-medenica', firstName: 'Ivan', lastName: 'Medenica', phone: '+382 69 807 115', email: 'ivan.m@example.test', birthday: '1987-01-15',
    status: 'recovered', risk: 'low', packageName: 'Plus', price: 40, startDate: '2026-08-23', endDate: '2026-09-23',
    riskReason: 'Obnova je ručno označena nakon kontakta tima.', nextAction: 'Nije potrebna akcija.', preferredChannel: 'Telefon', recoveredAmount: 40, recoveredAt: '2026-08-23',
  },
];
