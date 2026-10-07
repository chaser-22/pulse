import type { Member } from './pulse-data';

export type RecoveryLifecycle = 'detected' | 'contacted' | 'renewed';
export type RecoveryActivity = {
  contacted: number;
  followUps: number;
  renewed: number;
  recoveredAmount: number;
};
function isVisibleRisk(member: Member) {
  if (member.risk === 'low' || member.status === 'recovered') return false;
  return member.status === 'expired' || member.status === 'expiring';
}

export function getRiskMembers(members: Member[]) {
  return members.filter(isVisibleRisk);
}

export function memberMatchesSearch(member: Member, search: string) {
  const normalized = search.trim().toLocaleLowerCase('me');
  if (!normalized) return true;

  const text = `${member.firstName} ${member.lastName}`.toLocaleLowerCase('me');
  if (text.includes(normalized)) return true;

  const queryDigits = normalized.replace(/\D/g, '');
  if (queryDigits.length < 5) return false;
  const memberDigits = member.phone.replace(/\D/g, '');
  const localDigits = memberDigits.startsWith('382') ? `0${memberDigits.slice(3)}` : memberDigits;
  return memberDigits.includes(queryDigits) || localDigits.includes(queryDigits);
}

export function getActionableRevenue(members: Member[]) {
  return members
    .filter((member) => member.risk === 'high' && isVisibleRisk(member))
    .reduce((sum, member) => sum + member.price, 0);
}

export function getRecoveryLifecycle(member: Member): RecoveryLifecycle {
  if (member.status === 'recovered') return 'renewed';
  if (member.contactedAt || member.recoveryOutcome) return 'contacted';
  return 'detected';
}

export function getRecoveryActivity(members: Member[]): RecoveryActivity {
  return {
    contacted: members.filter((member) => member.contactedAt || member.recoveryOutcome).length,
    followUps: members.filter((member) => member.recoveryOutcome === 'follow_up').length,
    renewed: members.filter((member) => member.status === 'recovered').length,
    recoveredAmount: members.reduce(
      (sum, member) => sum + (member.status === 'recovered' ? member.recoveredAmount ?? 0 : 0),
      0,
    ),
  };
}

export function getPulseMetrics(members: Member[]) {
  const riskMembers = getRiskMembers(members);
  const recovered = members.filter((member) => member.status === 'recovered');

  return {
    total: members.length,
    active: members.filter((member) => member.status !== 'expired').length,
    expiring: members.filter((member) => member.status === 'expiring').length,
    highRisk: riskMembers.filter((member) => member.risk === 'high').length,
    riskRevenue: riskMembers.reduce((sum, member) => sum + member.price, 0),
    actionableRevenue: getActionableRevenue(members),
    recoveredCount: recovered.length,
    recoveredRevenue: recovered.reduce((sum, member) => sum + (member.recoveredAmount ?? 0), 0),
  };
}
