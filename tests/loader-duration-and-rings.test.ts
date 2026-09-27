import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../components/pulse-loader-scene.tsx', import.meta.url), 'utf8');

test('loader progress and handoff use a five second loading duration', () => {
  assert.match(page, /elapsed \/ 5000/);
  assert.match(page, /\}, 5000\);/);
  assert.doesNotMatch(page, /elapsed \/ 4000/);
});

test('3D heartbeat no longer renders expanding pulse torus rings', () => {
  assert.doesNotMatch(scene, /const pulseRings =/);
  assert.doesNotMatch(scene, /pulseRings\.forEach/);
  assert.doesNotMatch(scene, /new THREE\.TorusGeometry\(1\.12/);
});
