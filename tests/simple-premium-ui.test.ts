import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

test('simple premium UI removes global WebGL atmosphere and heavy 3D loader', () => {
  assert.doesNotMatch(page, /PageAtmosphere/);
  assert.doesNotMatch(page, /PulseLoaderScene/);
  assert.doesNotMatch(page, /visibleProgress/);
  assert.doesNotMatch(page, /5000/);
  assert.match(page, /className="simple-loader-mark"/);
});

test('startup is short and uses one subtle entrance instead of long choreography', () => {
  assert.match(page, /setTimeout\(\(\) => \{[\s\S]*?setReady\(true\)[\s\S]*?650\)/);
  assert.match(page, /simple-shell-entering/);
  assert.match(polish, /\.app-shell\.simple-shell-entering\s*\{[\s\S]*?animation:\s*simple-shell-enter/);
});

test('cyber redesign layer is removed', () => {
  assert.doesNotMatch(globals, /Cyber redesign layer/);
  assert.doesNotMatch(globals, /background-size:\s*78px 78px/);
  assert.doesNotMatch(globals, /linear-gradient\(135deg, var\(--primary\), #2effc7\)/);
});

test('owner summary is compact, left aligned, and uses only a small accent animation', () => {
  assert.match(page, /className="owner-hero-accent"/);
  assert.doesNotMatch(page, /owner-hero-frame-pulse/);
  assert.match(polish, /\.owner-hero\s*\{[\s\S]*?min-height:\s*0/);
  assert.match(polish, /\.owner-hero-copy\s*\{[\s\S]*?align-items:\s*stretch/);
  assert.match(polish, /@keyframes owner-accent-breathe/);
});

test('primary surfaces stay calm and do not use glow shadows', () => {
  assert.match(polish, /\.sidebar,[\s\S]*?\.topbar,[\s\S]*?\.panel-card[\s\S]*?box-shadow:\s*none/);
  assert.match(polish, /\.pulse-button\s*\{[\s\S]*?background:\s*var\(--primary\)/);
});
