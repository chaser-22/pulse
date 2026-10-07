export type MemberStatus = 'active' | 'expiring' | 'expired' | 'recovered';
export type RiskLevel = 'high' | 'medium' | 'low';
export type Channel = 'Telefon' | 'Poruka';
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
  contactedAt?: string;
  recoveryOutcome?: RecoveryOutcome;
  followUpAt?: string;
};

export const copy = {
  me: {
    gymName: 'PULSE Demo',
    location: 'CSV demo',
    nav: { dashboard: 'Pregled', members: 'Članovi', radar: 'Prioriteti članarina' },
    actions: { add: 'Dodaj člana', import: 'Uvezi CSV', renew: 'Označi kao obnovljeno' },
    statuses: { active: 'Aktivan', expiring: 'Ističe', expired: 'Istekao', recovered: 'Obnovljen' } as Record<MemberStatus, string>,
  },
};
