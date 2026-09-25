import type { Member } from './pulse-data';

export type GymDataMode = 'basic' | 'attendance';
export type RecoveryLifecycle = 'detected' | 'contacted' | 'renewed';
export type RecoveryActivity = {
  contacted: number;
  followUps: number;
  renewed: number;
  recoveredAmount: number;
};
export type BaseMetrics = {
  active: number;
  expiring: number;
  absent: number;
  recoveredCount: number;
  recoveredRevenue: number;
};

export function getDataModeProfile(mode: GymDataMode) {
  return mode === 'attendance' ? {
    label: 'Kartice',
    title: 'Članarine + dolasci',
    description: 'Za gymove koji imaju kartice, QR ili izvoz dolazaka. PULSE koristi i odsustvo kao signal.',
    riskBasis: 'Članarina, istek i dolasci',
    usesAttendance: true,
  } : {
    label: 'Basic',
    title: 'Članarine bez kartica',
    description: 'Za gymove koji vode članove u Excelu ili ručno. PULSE koristi datume isteka i status članarine.',
    riskBasis: 'Članarina i datum isteka',
    usesAttendance: false,
  };
}

function isVisibleRisk(member: Member, mode: GymDataMode) {
  if (member.risk === 'low' || member.status === 'recovered') return false;
  if (mode === 'basic' && member.status === 'absent') return false;
  return true;
}

export function getRiskMembers(members: Member[], mode: GymDataMode = 'attendance') {
  return members.filter((member) => isVisibleRisk(member, mode));
}

export function memberMatchesSearch(member: Member, search: string) {
  const normalized = search.trim().toLocaleLowerCase('me');
  if (!normalized) return true;

  const text = `${member.firstName} ${member.lastName} ${member.email}`.toLocaleLowerCase('me');
  if (text.includes(normalized)) return true;

  const queryDigits = normalized.replace(/\D/g, '');
  if (queryDigits.length < 5) return false;
  const memberDigits = member.phone.replace(/\D/g, '');
  const localDigits = memberDigits.startsWith('382') ? `0${memberDigits.slice(3)}` : memberDigits;
  return memberDigits.includes(queryDigits) || localDigits.includes(queryDigits);
}

export function getActionableRevenue(members: Member[], mode: GymDataMode = 'attendance') {
  return members
    .filter((member) => member.risk === 'high' && isVisibleRisk(member, mode))
    .reduce((sum, member) => sum + member.price, 0);
}

export function getRecoveryLifecycle(member: Member): RecoveryLifecycle {
  if (member.status === 'recovered') return 'renewed';
  if (member.queuedMessage || member.recoveryOutcome) return 'contacted';
  return 'detected';
}

export function getRecoveryActivity(members: Member[]): RecoveryActivity {
  return {
    contacted: members.filter((member) => member.queuedMessage || member.recoveryOutcome).length,
    followUps: members.filter((member) => member.recoveryOutcome === 'follow_up').length,
    renewed: members.filter((member) => member.status === 'recovered').length,
    recoveredAmount: members.reduce(
      (sum, member) => sum + (member.status === 'recovered' ? member.recoveredAmount ?? 0 : 0),
      0,
    ),
  };
}

export function getPulseMetrics(members: Member[], base: BaseMetrics, mode: GymDataMode = 'attendance') {
  const riskMembers = getRiskMembers(members, mode);
  const recovered = members.filter((member) => member.status === 'recovered');
  return {
    active: base.active + members.filter((member) => member.status !== 'expired').length,
    expiring: base.expiring + members.filter((member) => member.status === 'expiring').length,
    absent: mode === 'attendance' ? base.absent + members.filter((member) => member.status === 'absent').length : 0,
    highRisk: riskMembers.filter((member) => member.risk === 'high').length,
    riskRevenue: riskMembers.reduce((sum, member) => sum + member.price, 0),
    actionableRevenue: getActionableRevenue(members, mode),
    recoveredCount: base.recoveredCount + recovered.length,
    recoveredRevenue:
      base.recoveredRevenue + recovered.reduce((sum, member) => sum + (member.recoveredAmount ?? 0), 0),
  };
}
