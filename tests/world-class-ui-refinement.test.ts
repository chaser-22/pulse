import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('post-loader dashboard becomes usable immediately', () => {
  assert.match(page, /setAppEntering\(true\)/);
  assert.match(page, /setAppEntering\(false\), 320/);
  assert.match(polish, /\.app-shell\.app-shell-entering\s*\{[\s\S]*?animation:\s*pulse-app-shell-enter 280ms/);
  assert.match(polish, /transition-delay:\s*0ms !important/);
});

test('owner exposes CSV import as the primary pilot action', () => {
  assert.match(page, /Uvezi svoj CSV/);
  assert.match(page, /csv-primary-action/);
  assert.match(page, /fileInputRef\.current\?\.click\(\)/);
});

test('pilot ships dark-only instead of exposing an unfinished light theme', () => {
  assert.doesNotMatch(page, /theme-toggle/);
  assert.doesNotMatch(page, /toggleTheme/);
  assert.match(html, /document\.documentElement\.classList\.add\('dark'\)/);
});

test('reception reveals outcomes after contact instead of showing them before contact', () => {
  assert.match(page, /member\.queuedMessage \? <>/);
  assert.match(page, /Kontakt započet/);
  assert.match(page, /Zabilježi ishod/);
});

test('member profile uses one truthful manual-message workflow', () => {
  assert.doesNotMatch(page, /channel-tabs/);
  assert.match(page, /Slanje se u pilotu obavlja ručno/);
  assert.match(page, /Tim ga šalje ručno koristeći broj telefona iz CSV-a/);
});

test('copy and metadata align with the CSV-only product', () => {
  assert.match(page, /PULSE pretvara vaš CSV u dnevnu listu članova za kontakt i prati šta se obnovilo/);
  assert.doesNotMatch(page, /PULSE SIGNAL/);
  assert.doesNotMatch(page, /Članovi sa signalima članarine/);
  assert.match(page, /Osnova prioriteta/);
  assert.match(html, /CSV → prioriteti za kontakt → evidentirane obnove članarina/);
  assert.doesNotMatch(html, /Prepoznaj rizik/);
});

test('visual system is restrained while preserving the existing identity', () => {
  assert.match(polish, /\.page-atmosphere--ambient canvas\s*\{[\s\S]*?opacity:\s*\.18/);
  assert.match(polish, /\.owner-hero\s*\{[\s\S]*?min-height:\s*340px/);
  assert.match(polish, /\.owner-hero h2\s*\{[\s\S]*?font-size:\s*clamp\(56px, 6\.8vw, 88px\)/);
  assert.match(globals, /\.pulse-button,[\s\S]*?background:\s*var\(--primary\)/);
  assert.match(polish, /@media \(max-width: 768px\)[\s\S]*?\.page-atmosphere,[\s\S]*?display:\s*none !important/);
});

test('minor pilot polish removes fake affordances and ambiguous labels', () => {
  assert.doesNotMatch(page, /<Settings2 \/>/);
  assert.match(page, /Cijena članarine/);
  assert.match(page, /Datum isteka/);
  assert.match(page, /Status i prioritet PULSE računa automatski/);
  assert.doesNotMatch(page, />Nizak</);
  assert.match(page, /obnovio članarinu/);
});
