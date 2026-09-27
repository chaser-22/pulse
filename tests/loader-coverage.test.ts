import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('app content stays hidden while the loader is mounted', () => {
  assert.match(page, /loaderVisible \? 'app-shell-loader-covered' : ''/);
  assert.match(css, /\.app-shell-loader-covered\s*\{[\s\S]*?visibility:\s*hidden/);
});

test('app entrance starts only after the loader exit completes', () => {
  assert.match(
    page,
    /exitTimer\s*=\s*window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*?setLoaderVisible\(false\)[\s\S]*?setAppEntering\(true\)[\s\S]*?\},\s*900\)/,
  );
});
