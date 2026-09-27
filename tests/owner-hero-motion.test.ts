import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('owner hero scan loops without a hard reset seam', () => {
  assert.match(css, /animation:\s*cyber-scan\s+[\d.]+s\s+ease-in-out\s+infinite/);
  assert.match(css, /@keyframes cyber-scan\s*\{[\s\S]*?0%,\s*100%\s*\{[\s\S]*?translateX\(-10%\)[\s\S]*?50%\s*\{[\s\S]*?translateX\(10%\)/);
  assert.doesNotMatch(css, /@keyframes cyber-scan\s*\{[\s\S]*?from\s*\{[\s\S]*?translateX\(-18%\)[\s\S]*?to\s*\{[\s\S]*?translateX\(18%\)/);
});


test('owner hero has a seam-safe perimeter pulse every five seconds', () => {
  assert.match(page, /className="owner-hero-frame-pulse"/);
  assert.match(css, /\.owner-hero-frame-pulse[\s\S]*?animation:\s*owner-hero-frame-flow\s+5s\s+linear\s+infinite/);
  assert.match(css, /@keyframes owner-hero-frame-flow\s*\{[\s\S]*?0%,\s*58%[\s\S]*?opacity:\s*0[\s\S]*?96%[\s\S]*?offset-distance:\s*100%[\s\S]*?100%[\s\S]*?opacity:\s*0/);
});
