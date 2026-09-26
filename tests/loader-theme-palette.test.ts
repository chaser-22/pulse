import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const scene = readFileSync(new URL('../components/pulse-loader-scene.tsx', import.meta.url), 'utf8');

const loaderStart = css.indexOf('/* Centered recovery-reactor loader */');
const loaderEnd = css.indexOf('/* Initial app entrance choreography */');
const loaderCss = css.slice(loaderStart, loaderEnd);

test('loader presentation uses the same semantic palette tokens as the website', () => {
  for (const token of [
    '--background',
    '--surface',
    '--border',
    '--foreground',
    '--muted-foreground',
    '--primary',
  ]) {
    assert.match(loaderCss, new RegExp(`var\\(${token}\\)`));
  }

  assert.doesNotMatch(loaderCss, /#171012|#0b0c0e|#070809|#100a0a/i);
});

test('Three.js loader reactor reads its colors from the active CSS theme', () => {
  assert.match(scene, /getComputedStyle\(document\.documentElement\)/);
  assert.match(scene, /getPropertyValue\('--primary'\)/);
  assert.match(scene, /getPropertyValue\('--foreground'\)/);

  assert.doesNotMatch(scene, /0xff6a5e|0xff8176|0xff7468|0xff8f86/i);
});

test('loader glow texture is generated from the active primary color', () => {
  assert.match(scene, /createGlowTexture\(primaryColor\)/);
  assert.match(scene, /primaryColor\.r/);
  assert.match(scene, /primaryColor\.g/);
  assert.match(scene, /primaryColor\.b/);
});
