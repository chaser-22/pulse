import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../components/pulse-loader-scene.tsx', import.meta.url), 'utf8');

test('first-session loading screen is brief and its exit fits inside 1.8 seconds total', () => {
  assert.match(page, /const LOADER_TOTAL_DURATION_MS = 1800;/);
  assert.match(page, /const LOADER_EXIT_DURATION_MS = 250;/);
  assert.match(page, /const LOADER_PROGRESS_DURATION_MS = LOADER_TOTAL_DURATION_MS - LOADER_EXIT_DURATION_MS;/);
  assert.match(page, /elapsed \/ LOADER_PROGRESS_DURATION_MS/);
  assert.match(page, /\}, LOADER_PROGRESS_DURATION_MS\);/);
  assert.match(page, /\}, LOADER_EXIT_DURATION_MS\);/);
  assert.match(css, /\.pulse-loader\.is-leaving\s*\{[\s\S]*?animation:\s*pulse-loader-exit 250ms/);
});

test('3D heartbeat no longer renders expanding pulse torus rings', () => {
  assert.doesNotMatch(scene, /const pulseRings =/);
  assert.doesNotMatch(scene, /pulseRings\.forEach/);
  assert.doesNotMatch(scene, /new THREE\.TorusGeometry\(1\.12/);
});
