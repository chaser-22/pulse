import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

test('normal application launch has no artificial loading screen', () => {
  assert.doesNotMatch(page, /PulseLoaderScene|LoadingState|loaderVisible|LOADER_TOTAL_DURATION_MS/);
  assert.match(page, /const IMPORT_PROGRESS_DELAY_MS = 350;/);
});

test('first visit uses concise onboarding rather than a fake loader', () => {
  assert.match(page, /const ONBOARDING_KEY = 'pulse-onboarding-seen-v1';/);
  assert.match(page, /Vidite šta je pod rizikom\. Znajte koga kontaktirati\./);
  assert.match(page, /Pokreni demo/);
  assert.match(page, /Uvezi svoj CSV/);
  assert.match(page, /onboarding-signal/);
});

test('CSV progress only appears after a real delay and ends in a value reveal', () => {
  assert.match(page, /setImportPhase\('reading'\)/);
  assert.match(page, /setImportPhase\('validating'\)/);
  assert.match(page, /IMPORT_PROGRESS_DELAY_MS/);
  assert.match(page, /setImportSummary\(\{/);
  assert.match(page, /Pregled je spreman/);
  assert.match(page, /Prihod pod rizikom/);
  assert.doesNotMatch(page, /\{visibleProgress\}%|procenata|progressPercent/);
});

test('renewal completion acknowledges value before returning to the workspace', () => {
  assert.match(page, /setRenewalReveal\(\{ name: memberName, amount \}\)/);
  assert.match(page, /OBNOVA EVIDENTIRANA/);
  assert.match(page, /\+\{euro\(amount\)\}/);
  assert.match(page, /setView\(workspace === 'owner' \? 'dashboard' : 'staff'\)/);
});

test('revenue numbers animate causally and respect reduced motion', () => {
  assert.match(page, /function AnimatedCurrency/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /requestAnimationFrame/);
  assert.match(page, /<AnimatedCurrency value=\{metrics\.riskRevenue\}/);
  assert.match(page, /<AnimatedCurrency value=\{recoveryActivity\.recoveredAmount\}/);
});

test('loading and onboarding visuals use the restrained PULSE signal language', () => {
  assert.match(polish, /\.micro-loading-overlay/);
  assert.match(polish, /\.onboarding-signal/);
  assert.match(polish, /@keyframes pulse-signal-travel/);
  assert.match(polish, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(polish, /loading.*sphere|loading.*icosahedron/i);
});
