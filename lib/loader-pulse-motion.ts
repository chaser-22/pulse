export function getLoaderPulseRate(progress: number) {
  const normalized = Math.min(1, Math.max(0, progress / 100));
  return 0.68 + 2.62 * normalized ** 1.8;
}
