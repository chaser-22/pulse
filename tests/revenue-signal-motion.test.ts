import assert from 'node:assert/strict';
import test from 'node:test';
import * as signalMotion from '../lib/revenue-signal-motion.ts';

const { getRevenueSignalFrame } = signalMotion;

test('signal frame advances visible three-dimensional motion over time', () => {
  const start = getRevenueSignalFrame(0, Number.POSITIVE_INFINITY);
  const later = getRevenueSignalFrame(1_000, Number.POSITIVE_INFINITY);

  assert.notEqual(later.wavePhase, start.wavePhase);
  assert.notEqual(later.rotationY, start.rotationY);
  assert.notEqual(later.particleOffset, start.particleOffset);
});

test('recovery pulse peaks brightly and returns to the idle signal', () => {
  const peak = getRevenueSignalFrame(2_000, 120);
  const almostSettled = getRevenueSignalFrame(2_000, 899);
  const settled = getRevenueSignalFrame(2_000, 1_000);

  assert.ok(peak.recoveryMix > 0.8);
  assert.ok(almostSettled.recoveryMix < 0.01);
  assert.equal(settled.recoveryMix, 0);
  assert.ok(peak.glow > settled.glow);
});

test('motion is deterministic for an identical elapsed frame', () => {
  const first = getRevenueSignalFrame(1_250, 300);
  const repeated = getRevenueSignalFrame(1_250, 300);

  assert.deepEqual(repeated, first);
  assert.deepEqual(getRevenueSignalFrame(0, Number.POSITIVE_INFINITY), {
    wavePhase: 0,
    rotationY: 0,
    particleOffset: 0,
    recoveryMix: 0,
    glow: 0.55,
  });
});

test('render presentation falls back whenever the WebGL context is unavailable', () => {
  const getSignalPresentation = (
    signalMotion as typeof signalMotion & {
      getSignalPresentation: (
        contextAvailable: boolean,
        renderedFrame: boolean,
      ) => 'canvas' | 'fallback';
    }
  ).getSignalPresentation;

  assert.equal(getSignalPresentation(true, true), 'canvas');
  assert.equal(getSignalPresentation(false, true), 'fallback');
  assert.equal(getSignalPresentation(true, false), 'fallback');
});
