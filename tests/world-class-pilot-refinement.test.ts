import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const atmosphere = readFileSync(new URL('../components/page-atmosphere.tsx', import.meta.url), 'utf8');

test('pilot uses a short first-session intro and immediate repeat loads', () => {
  assert.match(page, /const INTRO_SESSION_KEY = 'pulse-intro-seen-v1';/);
  assert.match(page, /const LOADER_TOTAL_DURATION_MS = 1800;/);
  assert.match(page, /const LOADER_EXIT_DURATION_MS = 250;/);
  assert.match(page, /sessionStorage\.getItem\(INTRO_SESSION_KEY\)/);
  assert.match(page, /sessionStorage\.setItem\(INTRO_SESSION_KEY, '1'\)/);
  assert.doesNotMatch(page, /setAppEntering\(false\), 2400/);
  assert.match(polish, /\.app-shell\.app-shell-entering\s*\{[\s\S]*?animation:\s*pulse-app-shell-enter 280ms/);
});

test('pilot ships one deliberate dark theme without a public theme switch', () => {
  assert.doesNotMatch(page, /theme-toggle/);
  assert.doesNotMatch(page, /toggleTheme/);
  assert.match(html, /document\.documentElement\.classList\.add\('dark'\)/);
  assert.doesNotMatch(html, /prefers-color-scheme/);
});

test('owner makes CSV import the primary pilot action', () => {
  assert.match(page, /workspace === 'owner'[\s\S]*?Uvezi CSV/);
  assert.match(page, /onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}/);
  assert.match(page, /PULSE pretvara vaš CSV u dnevnu listu članova za kontakt i prati šta se obnovilo\./);
  assert.match(page, /Uvezi svoj CSV/);
});

test('owner hero is materially more compact and decorative cyber motion is removed', () => {
  assert.match(polish, /\.owner-hero\s*\{[\s\S]*?min-height:\s*340px/);
  assert.match(polish, /\.owner-hero h2\s*\{[\s\S]*?font-size:\s*clamp\(56px, 6\.8vw, 88px\)/);
  assert.match(polish, /\.owner-hero-frame-pulse\s*\{[\s\S]*?display:\s*none/);
  assert.match(polish, /\.owner-hero::after\s*\{[\s\S]*?display:\s*none/);
});

test('ambient graphics are restrained and WebGL is not mounted on phone-sized screens', () => {
  assert.match(atmosphere, /max-width: 768px/);
  assert.match(atmosphere, /if \(reducedMotion \|\| compactViewport\)/);
  assert.match(polish, /\.page-atmosphere--ambient canvas\s*\{[\s\S]*?opacity:\s*\.18/);
  assert.match(polish, /@media \(max-width: 768px\)[\s\S]*?\.page-atmosphere,[\s\S]*?display:\s*none/);
});

test('primary actions use one accent and reserve green for success', () => {
  assert.doesNotMatch(polish, /linear-gradient\(135deg, var\(--primary\), #2effc7\)/);
  assert.match(polish, /\.pulse-button,[\s\S]*?background:\s*var\(--primary\)/);
  assert.match(polish, /--success:\s*#2ecc9d/);
});

test('reception only shows outcome controls after contact has been initiated', () => {
  assert.match(page, /member\.queuedMessage\s*\?\s*<>/);
  assert.match(page, /Zabilježi ishod/);
  assert.match(page, /Kontaktiraj <ArrowRight/);
});

test('member profile presents one coherent manual message workflow', () => {
  assert.doesNotMatch(page, /channel-tabs/);
  assert.doesNotMatch(page, /Izaberite kanal/);
  assert.match(page, /RAZLOG PRIORITETA/);
  assert.match(page, /KONTAKT I OBNOVA/);
});

test('copy and small affordances are tightened for the pilot', () => {
  assert.doesNotMatch(page, /<Settings2/);
  assert.doesNotMatch(page, /Nizak/);
  assert.match(page, /Bez prioriteta|Nema/);
  assert.match(page, /Cijena članarine/);
  assert.match(page, /Datum isteka/);
  assert.match(page, /Istekle članarine prvo, zatim one koje ističu u narednih 7 dana\./);
  assert.match(html, /CSV.*datum(?:om)? isteka.*obnov/i);
  assert.doesNotMatch(html, /Prepoznaj rizik|može izgubiti/);
});

test('typography sticks to the five loaded Manrope weights and calmer tracking', () => {
  const unsupported = [...(globals + '\n' + polish).matchAll(/font-weight:\s*(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter((weight) => ![400, 500, 600, 700, 800].includes(weight));
  assert.deepEqual([...new Set(unsupported)], []);
  assert.match(polish, /\.eyebrow,[\s\S]*?letter-spacing:\s*\.05em/);
});
