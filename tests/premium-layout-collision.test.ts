import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

test('tablet risk rows reserve enough width for the profile action', () => {
  assert.match(
    polish,
    /@media \(max-width: 1180px\)[\s\S]*?\.risk-member-card\s*\{[\s\S]*?grid-template-columns:\s*24px minmax\(0, 1fr\) minmax\(0, 1fr\) minmax\(126px, auto\)/,
  );
});

test('mobile member identity lets name and risk badge wrap without colliding', () => {
  assert.match(
    polish,
    /@media \(max-width: 680px\)[\s\S]*?\.mobile-member-main > span:first-child\s*\{[\s\S]*?justify-content:\s*flex-start[\s\S]*?flex-wrap:\s*wrap/,
  );
  assert.match(
    polish,
    /\.task-name\s*\{[\s\S]*?flex-wrap:\s*wrap/,
  );
});

test('premium type roles use a compact consistent weight hierarchy', () => {
  assert.match(
    polish,
    /:where\(\.status-pill, \.risk-pill, \.summary-count, \.sorted-label, \.mode-note, \.today-queue__count, \.outcome-badge, \.task-done\)[\s\S]*?font-weight:\s*600/,
  );
  assert.match(
    polish,
    /:where\(\.metric-line strong, \.hero-outcomes dd, \.recovery-activity dd, \.radar-summary dd, \.risk-value strong\)[\s\S]*?font-weight:\s*700/,
  );
});
