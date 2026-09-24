export type PageAtmosphereView =
  | 'dashboard'
  | 'staff'
  | 'members'
  | 'radar'
  | 'automations';
export type Workspace = 'owner' | 'staff';
export type AtmospherePreset =
  | 'constellation'
  | 'task-lane'
  | 'member-field'
  | 'radar-sweep'
  | 'message-flow';

export function getAtmospherePreset(
  view: PageAtmosphereView,
  workspace: Workspace,
): AtmospherePreset {
  if (view === 'staff' || workspace === 'staff') return 'task-lane';
  if (view === 'members') return 'member-field';
  if (view === 'radar') return 'radar-sweep';
  if (view === 'automations') return 'message-flow';
  return 'constellation';
}

export function getAtmosphereFrame(
  preset: AtmospherePreset,
  elapsedMs: number,
  recoveryPulse: number,
) {
  const seconds = elapsedMs / 1_000;
  const baseEnergy: Record<AtmospherePreset, number> = {
    constellation: 0.56,
    'task-lane': 0.32,
    'member-field': 0.24,
    'radar-sweep': 0.38,
    'message-flow': 0.3,
  };
  const pulse = Math.max(0, Math.min(recoveryPulse, 1));

  return {
    phase: seconds * (preset === 'radar-sweep' ? 0.72 : 0.42),
    drift: Math.sin(seconds * 0.23) * 0.5 + seconds * 0.04,
    energy: Math.min(1, baseEnergy[preset] + pulse * 0.42),
    flow: preset === 'radar-sweep' ? pulse * 0.18 : (seconds * 0.2 + pulse * 0.34) % 1,
    signal: preset === 'radar-sweep' ? 0 : 0.45 + pulse * 0.24 + Math.abs(Math.sin(seconds * 1.25)) * 0.16,
    sweep: preset === 'radar-sweep' ? seconds * 0.72 : seconds * 0.16,
    wave: seconds * (preset === 'message-flow' ? 1.3 : 0.92) + pulse * 0.65,
  };
}
