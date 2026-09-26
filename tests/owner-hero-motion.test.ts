import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('owner hero scan loops without a hard reset seam', () => {
  assert.match(css, /animation:\s*cyber-scan\s+[\d.]+s\s+ease-in-out\s+infinite/);
  assert.match(css, /@keyframes cyber-scan\s*\{[\s\S]*?0%,\s*100%\s*\{[\s\S]*?translateX\(-10%\)[\s\S]*?50%\s*\{[\s\S]*?translateX\(10%\)/);
  assert.doesNotMatch(css, /@keyframes cyber-scan\s*\{[\s\S]*?from\s*\{[\s\S]*?translateX\(-18%\)[\s\S]*?to\s*\{[\s\S]*?translateX\(18%\)/);
});
