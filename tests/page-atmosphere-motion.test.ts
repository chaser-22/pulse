import assert from 'node:assert/strict';
import test from 'node:test';
import * as atmosphereMotion from '../lib/page-atmosphere-motion.ts';

const { getAtmosphereFrame, getAtmospherePreset } = atmosphereMotion;

test('each PULSE view receives a distinct, task-appropriate atmosphere preset', () => {
  assert.equal(getAtmospherePreset('dashboard', 'owner'), 'constellation');
  assert.equal(getAtmospherePreset('staff', 'staff'), 'task-lane');
  assert.equal(getAtmospherePreset('members', 'owner'), 'member-field');
  assert.equal(getAtmospherePreset('radar', 'owner'), 'radar-sweep');
});

test('atmosphere frames advance predictably and amplify a recovery pulse', () => {
  const idle = getAtmosphereFrame('constellation', 0, 0);
  const later = getAtmosphereFrame('constellation', 1_000, 0);
  const pulsing = getAtmosphereFrame('constellation', 1_000, 1);

  assert.notEqual(later.phase, idle.phase);
  assert.notEqual(later.drift, idle.drift);
  assert.ok(pulsing.energy > later.energy);
  assert.deepEqual(getAtmosphereFrame('radar-sweep', 0, 0), {
    phase: 0,
    drift: 0,
    energy: 0.56,
    flow: 0,
    signal: 0.2,
    sweep: 0,
    wave: 0,
  });
});

test('constellation motion exposes a pulsing signal wave for the Three.js mesh', () => {
  const idle = getAtmosphereFrame('constellation', 0, 0);
  const later = getAtmosphereFrame('constellation', 1_600, 0.5);

  assert.equal(idle.signal, 0.54);
  assert.ok(later.signal > idle.signal);
  assert.notEqual(later.wave, idle.wave);
  assert.ok(later.energy <= 1);
});

test('recovery flow advances risk signals toward the recovered side', () => {
  const idle = getAtmosphereFrame('constellation', 0, 0);
  const later = getAtmosphereFrame('constellation', 1_000, 1);
  const radar = getAtmosphereFrame('radar-sweep', 1_000, 1);

  assert.equal(idle.flow, 0);
  assert.ok(later.flow > idle.flow);
  assert.ok(later.flow < 1);
  assert.ok(radar.flow < later.flow);
});
