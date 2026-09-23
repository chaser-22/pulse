import type { Member } from './pulse-data';

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

export function getRiskMembers(members: Member[]) {
  return members.filter((member) => member.risk !== 'low' && member.status !== 'recovered');
}

export function getActionableRevenue(members: Member[]) {
  return members
    .filter((member) => member.risk === 'high' && member.status !== 'recovered')
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

export function getPulseMetrics(members: Member[], base: BaseMetrics) {
  const riskMembers = getRiskMembers(members);
  const recovered = members.filter((member) => member.status === 'recovered');
  return {
    active: base.active + members.filter((member) => member.status !== 'expired').length,
    expiring: base.expiring + members.filter((member) => member.status === 'expiring').length,
    absent: base.absent + members.filter((member) => member.status === 'absent').length,
    highRisk: riskMembers.filter((member) => member.risk === 'high').length,
    riskRevenue: riskMembers.reduce((sum, member) => sum + member.price, 0),
    actionableRevenue: getActionableRevenue(members),
    recoveredCount: base.recoveredCount + recovered.length,
    recoveredRevenue:
      base.recoveredRevenue + recovered.reduce((sum, member) => sum + (member.recoveredAmount ?? 0), 0),
  };
}
