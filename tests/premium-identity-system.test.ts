import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

test('PULSE uses one deliberate premium UI type stack without synthetic weights', () => {
  assert.match(globals, /--font-ui:\s*"Inter",[\s\S]*?system-ui,[\s\S]*?sans-serif/);
  assert.match(globals, /--font-display:\s*"Inter",[\s\S]*?system-ui,[\s\S]*?sans-serif/);
  assert.match(globals, /body\s*\{[\s\S]*?font-family:\s*var\(--font-ui\)/);
  assert.match(globals, /font-synthesis:\s*none/);
  assert.match(polish, /:where\(h1, h2, h3, \[data-slot='dialog-title'\]\)[\s\S]*?font-family:\s*var\(--font-display\)/);
});

test('shared avatars are isolated fixed-size identity marks that cannot collide with text', () => {
  assert.match(polish, /\.avatar\s*\{[\s\S]*?display:\s*inline-grid[\s\S]*?flex:\s*0 0 auto[\s\S]*?aspect-ratio:\s*1[\s\S]*?overflow:\s*hidden[\s\S]*?line-height:\s*1/);
  assert.match(polish, /\.task-person > \.avatar,[\s\S]*?\.risk-member-identity > \.avatar,[\s\S]*?\.today-queue__member > \.avatar,[\s\S]*?align-self:\s*center/);
});

test('identity groups reserve space for avatars and allow the text column to shrink safely', () => {
  assert.match(polish, /:where\(\.task-person, \.risk-member-identity, \.today-queue__member\)[\s\S]*?display:\s*flex[\s\S]*?min-width:\s*0/);
  assert.match(polish, /:where\(\.task-person, \.risk-member-identity, \.today-queue__member\) > span:last-child[\s\S]*?min-width:\s*0/);
});

test('interface icons do not shrink into or overlap their labels', () => {
  assert.match(polish, /:where\(button, \.nav-item, \.csv-note, \.queued-state, \.fake-service-note\) svg[\s\S]*?flex:\s*0 0 auto/);
  assert.match(polish, /:where\(\.pulse-button, \.dark-outline, \.today-queue__action, \.task-actions button\) svg[\s\S]*?width:\s*16px[\s\S]*?height:\s*16px/);
});

test('primary UI typography uses restrained standard weights instead of ultra-heavy display weights', () => {
  assert.match(polish, /\.brand-word[\s\S]*?font-weight:\s*800/);
  assert.match(polish, /\.page-title h1[\s\S]*?font-weight:\s*700/);
  assert.match(polish, /\.owner-hero h2[\s\S]*?font-weight:\s*700/);
});
