export type MemberStatus = 'active' | 'expiring' | 'absent' | 'expired' | 'recovered';
export type RiskLevel = 'high' | 'medium' | 'low';
export type Channel = 'WhatsApp' | 'Viber' | 'SMS';
export type RecoveryOutcome = 'no_answer' | 'replied' | 'follow_up' | 'declined';

export type Visit = { date: string; time: string };
export type Payment = { date: string; amount: number; method: string; note: string };

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
  lastVisit: string;
  visitsThisMonth: number;
  riskReason: string;
  nextAction: string;
  preferredChannel: Channel;
  attendance: Visit[];
  payments: Payment[];
  recoveredAmount?: number;
  recoveredAt?: string;
  queuedMessage?: { channel: Channel; text: string; queuedAt: string };
  recoveryOutcome?: RecoveryOutcome;
  followUpAt?: string;
};

export type Automation = {
  id: string;
  title: string;
  trigger: string;
  audience: string;
  enabled: boolean;
  channel: Channel;
  message: string;
  sentThisMonth: number;
  lastActivity: string;
};

export const copy = {
  me: {
    gymName: 'PULSE Demo Gym',
    location: 'Podgorica',
    nav: { dashboard: 'Pregled', members: 'Članovi', radar: 'Signali rizika', automations: 'Predlošci poruka' },
    actions: { add: 'Dodaj člana', import: 'Uvezi CSV', checkin: 'Evidentiraj dolazak', renew: 'Označi kao obnovljeno' },
    statuses: { active: 'Aktivan', expiring: 'Ističe', absent: 'Odsutan', expired: 'Istekao', recovered: 'Oporavljen' } as Record<MemberStatus, string>,
  },
};

const visits = (days: Array<[string, string]>): Visit[] => days.map(([date, time]) => ({ date, time }));
const payments = (amount: number, dates: string[]): Payment[] => dates.map((date, index) => ({ date, amount, method: index % 2 ? 'Kartica' : 'Gotovina', note: 'Mjesečna članarina' }));

export const initialMembers: Member[] = [
  {
    id: 'milos-vukovic', firstName: 'Miloš', lastName: 'Vuković', phone: '+382 67 214 883', email: 'milos.v@example.test', birthday: '1991-04-12',
    status: 'expired', risk: 'high', packageName: 'Standard', price: 35, startDate: '2026-07-28', endDate: '2026-08-28', lastVisit: '2026-08-24', visitsThisMonth: 7,
    riskReason: 'Članarina je istekla prije 3 dana, a Miloš nije obnovio iako je ranije obnavljao na vrijeme.', nextAction: 'Pošaljite kratku ličnu poruku danas i ponudite rezervaciju obnove.', preferredChannel: 'WhatsApp',
    attendance: visits([['2026-08-24','18:12'],['2026-08-21','17:48'],['2026-08-18','18:02'],['2026-08-14','17:56']]), payments: payments(35, ['2026-07-28','2026-06-28','2026-05-28']),
  },
  {
    id: 'jelena-popovic', firstName: 'Jelena', lastName: 'Popović', phone: '+382 69 331 507', email: 'jelena.p@example.test', birthday: '1988-11-03',
    status: 'absent', risk: 'high', packageName: 'Plus', price: 40, startDate: '2026-08-02', endDate: '2026-09-02', lastVisit: '2026-08-10', visitsThisMonth: 2,
    riskReason: 'Nije dolazila 21 dan. U prethodna dva mjeseca dolazila je prosječno 3 puta sedmično.', nextAction: 'Provjerite da li joj termin i dalje odgovara; poruka podrške bez popusta.', preferredChannel: 'Viber',
    attendance: visits([['2026-08-10','07:42'],['2026-08-05','07:36'],['2026-07-30','07:50'],['2026-07-27','07:41']]), payments: payments(40, ['2026-08-02','2026-07-02','2026-06-02']),
  },
  {
    id: 'nikola-radonjic', firstName: 'Nikola', lastName: 'Radonjić', phone: '+382 68 555 194', email: 'nikola.r@example.test', birthday: '1995-02-17',
    status: 'absent', risk: 'high', packageName: 'Standard', price: 35, startDate: '2026-08-08', endDate: '2026-09-08', lastVisit: '2026-08-13', visitsThisMonth: 2,
    riskReason: 'Nije dolazio 18 dana, a ovog mjeseca su evidentirane samo 2 posjete.', nextAction: 'Pošaljite kratku poruku podrške i pitajte da li mu termin i dalje odgovara.', preferredChannel: 'WhatsApp',
    attendance: visits([['2026-08-13','20:06'],['2026-08-03','19:48'],['2026-07-29','20:01'],['2026-07-26','19:54']]), payments: payments(35, ['2026-08-08','2026-07-08','2026-06-08']),
  },
  {
    id: 'milica-djurisic', firstName: 'Milica', lastName: 'Đurišić', phone: '+382 67 902 410', email: 'milica.dj@example.test', birthday: '1992-09-19',
    status: 'expired', risk: 'high', packageName: 'Neograničeno', price: 45, startDate: '2026-07-25', endDate: '2026-08-25', lastVisit: '2026-08-20', visitsThisMonth: 10,
    riskReason: 'Članarina je istekla prije 6 dana. Milica je bila redovna prije isteka.', nextAction: 'Pozovite je danas; redovni članovi često najbolje reaguju na direktan, lični kontakt.', preferredChannel: 'SMS',
    attendance: visits([['2026-08-20','16:22'],['2026-08-18','16:36'],['2026-08-15','11:02'],['2026-08-12','16:28']]), payments: payments(45, ['2026-07-25','2026-06-25','2026-05-25']),
  },
  {
    id: 'bojan-martinovic', firstName: 'Bojan', lastName: 'Martinović', phone: '+382 69 221 460', email: 'bojan.m@example.test', birthday: '1986-06-08', status: 'expiring', risk: 'medium', packageName: 'Standard', price: 35, startDate: '2026-08-05', endDate: '2026-09-05', lastVisit: '2026-08-29', visitsThisMonth: 11, riskReason: 'Članarina ističe za 5 dana i još nije potvrđena obnova.', nextAction: 'Pošaljite podsjetnik na vrijeme, bez popusta.', preferredChannel: 'Viber', attendance: visits([['2026-08-29','08:10'],['2026-08-27','08:02'],['2026-08-24','08:14']]), payments: payments(35, ['2026-08-05','2026-07-05']),
  },
  {
    id: 'ana-lakovic', firstName: 'Ana', lastName: 'Laković', phone: '+382 67 473 116', email: 'ana.l@example.test', birthday: '1998-12-21', status: 'expiring', risk: 'medium', packageName: 'Neograničeno', price: 45, startDate: '2026-08-06', endDate: '2026-09-06', lastVisit: '2026-08-28', visitsThisMonth: 14, riskReason: 'Članarina ističe za 6 dana. Nema zabilježene namjere za obnovu.', nextAction: 'Pošaljite prijateljski podsjetnik sa datumom isteka.', preferredChannel: 'WhatsApp', attendance: visits([['2026-08-28','17:22'],['2026-08-26','17:13'],['2026-08-24','17:31']]), payments: payments(45, ['2026-08-06','2026-07-06']),
  },
  {
    id: 'stefan-kalezic', firstName: 'Stefan', lastName: 'Kalezić', phone: '+382 68 772 005', email: 'stefan.k@example.test', birthday: '1990-01-26', status: 'absent', risk: 'medium', packageName: 'Plus', price: 40, startDate: '2026-08-18', endDate: '2026-09-18', lastVisit: '2026-08-16', visitsThisMonth: 4, riskReason: 'Nije dolazio 15 dana; posjete su se postepeno prorijedile.', nextAction: 'Pošaljite nenametljiv check-in i pitajte treba li promjenu termina.', preferredChannel: 'SMS', attendance: visits([['2026-08-16','19:10'],['2026-08-12','19:21'],['2026-08-08','19:02']]), payments: payments(40, ['2026-08-18','2026-07-18']),
  },
  {
    id: 'tamara-mugosa', firstName: 'Tamara', lastName: 'Mugoša', phone: '+382 67 608 339', email: 'tamara.m@example.test', birthday: '1994-07-14', status: 'expiring', risk: 'medium', packageName: 'Standard', price: 35, startDate: '2026-08-07', endDate: '2026-09-07', lastVisit: '2026-08-30', visitsThisMonth: 8, riskReason: 'Članarina ističe za 7 dana, a nema buduće uplate.', nextAction: 'Pošaljite ručni podsjetnik sa jasnim datumom isteka.', preferredChannel: 'Viber', attendance: visits([['2026-08-30','10:32'],['2026-08-26','10:28'],['2026-08-22','10:41']]), payments: payments(35, ['2026-08-07','2026-07-07']),
  },
  {
    id: 'luka-vujovic', firstName: 'Luka', lastName: 'Vujović', phone: '+382 69 840 221', email: 'luka.v@example.test', birthday: '2000-05-31', status: 'absent', risk: 'medium', packageName: 'Neograničeno', price: 45, startDate: '2026-08-11', endDate: '2026-09-11', lastVisit: '2026-08-15', visitsThisMonth: 3, riskReason: 'Nije dolazio 16 dana, nakon snažnog početka mjeseca.', nextAction: 'Predložite jedan laki povratni trening bez pritiska.', preferredChannel: 'WhatsApp', attendance: visits([['2026-08-15','21:02'],['2026-08-12','20:47'],['2026-08-11','20:51']]), payments: payments(45, ['2026-08-11','2026-07-11']),
  },
  {
    id: 'marija-boskovic', firstName: 'Marija', lastName: 'Bošković', phone: '+382 67 119 487', email: 'marija.b@example.test', birthday: '1989-03-04', status: 'expiring', risk: 'medium', packageName: 'Plus', price: 40, startDate: '2026-08-04', endDate: '2026-09-04', lastVisit: '2026-08-27', visitsThisMonth: 9, riskReason: 'Članarina ističe za 4 dana. Ranije je obnavljala nakon podsjetnika.', nextAction: 'Pošaljite podsjetnik na preferirani kanal.', preferredChannel: 'Viber', attendance: visits([['2026-08-27','07:18'],['2026-08-24','07:20'],['2026-08-21','07:16']]), payments: payments(40, ['2026-08-04','2026-07-04']),
  },
  {
    id: 'igor-damjanovic', firstName: 'Igor', lastName: 'Damjanović', phone: '+382 68 260 774', email: 'igor.d@example.test', birthday: '1983-10-10', status: 'absent', risk: 'medium', packageName: 'Standard', price: 45, startDate: '2026-08-14', endDate: '2026-09-14', lastVisit: '2026-08-14', visitsThisMonth: 1, riskReason: 'Došao je samo jednom od učlanjenja prije 17 dana.', nextAction: 'Provjerite da li mu treba uvodni plan ili obilazak opreme.', preferredChannel: 'SMS', attendance: visits([['2026-08-14','18:42']]), payments: payments(45, ['2026-08-14']),
  },
  {
    id: 'andjela-krstovic', firstName: 'Anđela', lastName: 'Krstović', phone: '+382 69 491 885', email: 'andjela.k@example.test', birthday: '1997-08-09', status: 'expiring', risk: 'medium', packageName: 'Neograničeno', price: 45, startDate: '2026-08-03', endDate: '2026-09-03', lastVisit: '2026-08-30', visitsThisMonth: 15, riskReason: 'Članarina ističe za 3 dana, a obnova nije evidentirana.', nextAction: 'Pošaljite kratki podsjetnik dok je angažovanje visoko.', preferredChannel: 'WhatsApp', attendance: visits([['2026-08-30','18:15'],['2026-08-28','18:11'],['2026-08-25','18:17']]), payments: payments(45, ['2026-08-03','2026-07-03']),
  },
  {
    id: 'petar-rajkovic', firstName: 'Petar', lastName: 'Rajković', phone: '+382 67 773 608', email: 'petar.r@example.test', birthday: '1993-04-28', status: 'active', risk: 'low', packageName: 'Plus', price: 40, startDate: '2026-08-20', endDate: '2026-09-20', lastVisit: '2026-08-30', visitsThisMonth: 10, riskReason: 'Redovne posjete i dovoljno vremena do isteka članarine.', nextAction: 'Nije potrebna akcija.', preferredChannel: 'Viber', attendance: visits([['2026-08-30','06:55'],['2026-08-28','07:01'],['2026-08-26','06:57']]), payments: payments(40, ['2026-08-20','2026-07-20']),
  },
  {
    id: 'mina-jovovic', firstName: 'Mina', lastName: 'Jovović', phone: '+382 68 992 443', email: 'mina.j@example.test', birthday: '1999-02-08', status: 'active', risk: 'low', packageName: 'Standard', price: 35, startDate: '2026-08-22', endDate: '2026-09-22', lastVisit: '2026-08-29', visitsThisMonth: 6, riskReason: 'Aktivna je i dolasci su stabilni.', nextAction: 'Nije potrebna akcija.', preferredChannel: 'WhatsApp', attendance: visits([['2026-08-29','12:21'],['2026-08-27','12:16'],['2026-08-24','12:23']]), payments: payments(35, ['2026-08-22']),
  },
  {
    id: 'sara-bulatovic', firstName: 'Sara', lastName: 'Bulatović', phone: '+382 67 330 929', email: 'sara.b@example.test', birthday: '1996-09-07', status: 'recovered', risk: 'low', packageName: 'Standard', price: 35, startDate: '2026-08-26', endDate: '2026-09-26', lastVisit: '2026-08-29', visitsThisMonth: 5, riskReason: 'Obnova je ručno označena nakon kontakta tima.', nextAction: 'Pozdravite je pri sljedećem dolasku.', preferredChannel: 'WhatsApp', attendance: visits([['2026-08-29','17:10'],['2026-08-27','17:18']]), payments: payments(35, ['2026-08-26','2026-07-26']), recoveredAmount: 35, recoveredAt: '2026-08-26',
  },
  {
    id: 'ivan-medenica', firstName: 'Ivan', lastName: 'Medenica', phone: '+382 69 807 115', email: 'ivan.m@example.test', birthday: '1987-01-15', status: 'recovered', risk: 'low', packageName: 'Plus', price: 40, startDate: '2026-08-23', endDate: '2026-09-23', lastVisit: '2026-08-28', visitsThisMonth: 7, riskReason: 'Vratio se nakon 19 dana odsustva i obnovio članarinu.', nextAction: 'Pratite dolaske naredne dvije sedmice.', preferredChannel: 'Viber', attendance: visits([['2026-08-28','19:32'],['2026-08-25','19:26']]), payments: payments(40, ['2026-08-23','2026-07-23']), recoveredAmount: 40, recoveredAt: '2026-08-23',
  },
];

export const initialAutomations: Automation[] = [
  { id: 'expiry', title: 'Predložak prije isteka', trigger: 'Koristi se za članove kojima članarina uskoro ističe', audience: 'Članovi kojima uskoro ističe', enabled: true, channel: 'Viber', message: 'Zdravo {{ime}}, tvoja članarina u PULSE Demo Gym ističe {{datum}}. Javi nam ako želiš da je produžimo. 💪', sentThisMonth: 18, lastActivity: 'Aktivan predložak' },
  { id: 'absence', title: 'Predložak za odsutne članove', trigger: 'Koristi se kada član dugo nije dolazio', audience: 'Aktivni, ali odsutni članovi', enabled: true, channel: 'WhatsApp', message: 'Zdravo {{ime}}, nedostaješ nam u teretani. Da li ti raspored treninga i dalje odgovara? Tu smo da pomognemo da se vratiš u ritam.', sentThisMonth: 11, lastActivity: 'Aktivan predložak' },
  { id: 'winback', title: 'Predložak za istekle članarine', trigger: 'Koristi se kada je članarina već istekla', audience: 'Istekli članovi bez obnove', enabled: true, channel: 'SMS', message: 'Zdravo {{ime}}, tvoja članarina je istekla. Ako želiš da nastaviš, odgovori na ovu poruku i pripremićemo obnovu.', sentThisMonth: 9, lastActivity: 'Aktivan predložak' },
  { id: 'new-member', title: 'Predložak za novu članarinu', trigger: 'Opcionalna poruka podrške za nove članove', audience: 'Novi članovi', enabled: false, channel: 'Viber', message: 'Zdravo {{ime}}, kako ti prolazi prva sedmica? Ako treba pomoć oko sprava ili rasporeda, samo pitaj tim na recepciji.', sentThisMonth: 0, lastActivity: 'Pauzirano' },
  { id: 'birthday', title: 'Rođendanski predložak', trigger: 'Opcionalno ako CSV sadrži datum rođenja', audience: 'Članovi sa datumom rođenja', enabled: false, channel: 'WhatsApp', message: 'Srećan rođendan, {{ime}}! 🎉 PULSE Demo Gym ti želi sjajan dan i još jaču godinu.', sentThisMonth: 0, lastActivity: 'Pauzirano' },
];
