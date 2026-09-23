export type RevenueSignalFrame = {
  wavePhase: number;
  rotationY: number;
  particleOffset: number;
  recoveryMix: number;
  glow: number;
};

export function getSignalPresentation(
  contextAvailable: boolean,
  renderedFrame: boolean,
) {
  return contextAvailable && renderedFrame ? 'canvas' : 'fallback';
}

export function getRevenueSignalFrame(
  elapsedMs: number,
  recoveryElapsedMs: number,
): RevenueSignalFrame {
  const recoveryMix =
    recoveryElapsedMs >= 0 ? Math.max(0, 1 - recoveryElapsedMs / 900) : 0;

  return {
    wavePhase: elapsedMs * 0.00115,
    rotationY: Math.sin(elapsedMs * 0.00028) * 0.16,
    particleOffset: (elapsedMs * 0.00022) % 1,
    recoveryMix,
    glow: 0.55 + recoveryMix * 0.75,
  };
}
