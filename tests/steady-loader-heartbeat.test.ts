import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../components/pulse-loader-scene.tsx', import.meta.url), 'utf8');

test('3D loader heartbeat runs at a steady rate independent from loading progress', () => {
  assert.match(page, /<PulseLoaderScene \/>/);
  assert.doesNotMatch(page, /<PulseLoaderScene progress=/);

  assert.match(scene, /const PULSE_RATE = 1\.05/);
  assert.doesNotMatch(scene, /getLoaderPulseRate/);
  assert.doesNotMatch(scene, /progressRef/);
  assert.doesNotMatch(scene, /progressEnergy/);
});

test('steady heartbeat remains independent from the shorter loader duration', () => {
  assert.match(page, /LOADER_TOTAL_DURATION_MS = 3500/);
  assert.match(page, /elapsed \/ LOADER_PROGRESS_DURATION_MS/);
  assert.doesNotMatch(page, /elapsed \/ 5000/);
});
