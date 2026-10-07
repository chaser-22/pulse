import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('post-loader dashboard becomes usable immediately', () => {
  assert.match(page, /setAppEntering\(true\)/);
  assert.match(page, /window\.setTimeout\(\(\) => setAppEntering\(false\), 420\)/);
  assert.doesNotMatch(css, /animation-delay:\s*(?:7[6-9]0|[89]\d\d|1\d{3})ms/);
});

test('owner exposes CSV import as the primary pilot action', () => {
  assert.match(page, /Uvezi svoj CSV/);
  assert.match(page, /onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}/);
  assert.match(page, /Pogledaj pilot proces/);
});

test('pilot ships dark-only instead of exposing an unfinished light theme', () => {
  assert.doesNotMatch(page, /theme-toggle/);
  assert.doesNotMatch(page, /toggleTheme/);
  assert.match(html, /document\.documentElement\.classList\.add\('dark'\)/);
});

test('reception reveals outcomes after contact instead of showing four competing actions', () => {
  assert.match(page, /member\.queuedMessage \? <>/);
  assert.doesNotMatch(page, /<button className="task-primary"[^>]*>Kontaktiraj[\s\S]*?Bez odgovora[\s\S]*?Odgovorio\/la[\s\S]*?Prati sjutra/);
});

test('profile has one truthful manual-message workflow', () => {
  assert.doesNotMatch(page, /channel-tabs/);
  assert.match(page, /Poruka za/);
  assert.match(page, /Kopirajte ili pošaljite ručno/);
});

test('copy and metadata align with the CSV-only product', () => {
  assert.match(page, /PULSE pretvara vaš CSV u dnevnu listu članova za kontakt/);
  assert.doesNotMatch(page, /PULSE SIGNAL/);
  assert.match(html, /istekle i uskoro ističuće članarine/i);
  assert.doesNotMatch(html, /Prepoznaj rizik/);
});

test('visual system is restrained and uses one primary accent', () => {
  assert.match(css, /--primary:\s*#ff6a5e/);
  assert.match(css, /\.owner-hero\s*\{[\s\S]*?min-height:\s*360px/);
  assert.match(css, /\.owner-hero h2\s*\{[\s\S]*?font-size:\s*clamp\(64px, 7vw, 88px\)/);
  assert.match(css, /\.page-atmosphere--ambient canvas\s*\{[\s\S]*?opacity:\s*\.18/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.main-panel > \.page-atmosphere[\s\S]*?display:\s*none/);
});

test('minor pilot polish removes fake affordances and ambiguous labels', () => {
  assert.doesNotMatch(page, /<Settings2 \/>/);
  assert.match(page, /Cijena članarine/);
  assert.match(page, /Datum isteka/);
  assert.doesNotMatch(page, />Nizak</);
});
