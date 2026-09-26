export type PageAtmosphereView =
  | 'dashboard'
  | 'staff'
  | 'members'
  | 'radar';
export type Workspace = 'owner' | 'staff';
export type AtmospherePreset =
  | 'constellation'
  | 'task-lane'
  | 'member-field'
  | 'radar-sweep';

export function getAtmospherePreset(
  view: PageAtmosphereView,
  workspace: Workspace,
): AtmospherePreset {
  if (view === 'staff' || workspace === 'staff') return 'task-lane';
  if (view === 'members') return 'member-field';
  if (view === 'radar') return 'radar-sweep';
  return 'constellation';
}

export function getAtmosphereFrame(
  preset: AtmospherePreset,
  elapsedMs: number,
  recoveryPulse: number,
) {
  const seconds = elapsedMs / 1_000;
  const baseEnergy: Record<AtmospherePreset, number> = {
    constellation: 0.72,
    'task-lane': 0.48,
    'member-field': 0.4,
    'radar-sweep': 0.56,
  };
  const pulse = Math.max(0, Math.min(recoveryPulse, 1));

  return {
    phase: seconds * (preset === 'radar-sweep' ? 0.9 : 0.62),
    drift: Math.sin(seconds * 0.23) * 0.5 + seconds * 0.04,
    energy: Math.min(1, baseEnergy[preset] + pulse * 0.42),
    flow: preset === 'radar-sweep' ? (seconds * 0.08 + pulse * 0.18) % 1 : (seconds * 0.34 + pulse * 0.34) % 1,
    signal: preset === 'radar-sweep' ? 0.2 : 0.54 + pulse * 0.24 + Math.abs(Math.sin(seconds * 1.45)) * 0.18,
    sweep: preset === 'radar-sweep' ? seconds * 0.9 : seconds * 0.26,
    wave: seconds * 1.25 + pulse * 0.65,
  };
}
