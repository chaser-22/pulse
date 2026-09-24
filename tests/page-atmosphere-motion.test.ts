import assert from 'node:assert/strict';
import test from 'node:test';
import * as atmosphereMotion from '../lib/page-atmosphere-motion.ts';

const { getAtmosphereFrame, getAtmospherePreset } = atmosphereMotion;

test('each PULSE view receives a distinct, task-appropriate atmosphere preset', () => {
  assert.equal(getAtmospherePreset('dashboard', 'owner'), 'constellation');
  assert.equal(getAtmospherePreset('staff', 'staff'), 'task-lane');
  assert.equal(getAtmospherePreset('members', 'owner'), 'member-field');
  assert.equal(getAtmospherePreset('radar', 'owner'), 'radar-sweep');
  assert.equal(getAtmospherePreset('automations', 'owner'), 'message-flow');
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
    energy: 0.38,
    sweep: 0,
  });
});
