import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('priority numbers are inset from the red risk marker', () => {
  const activeRow = css.match(/\.risk-member-card\s*\{\s*grid-template-columns:24px minmax\(200px,1fr\)[\s\S]*?\}/);
  assert.ok(activeRow, 'Active desktop priority row rule exists');
  assert.match(activeRow[0], /padding:17px 0 17px 18px/);
  assert.match(globals, /\.risk-member-card\.is-high::before/);
});

test('Otvori button is confined to its grid cell and aligns with row dividers', () => {
  const activeButton = css.match(/\.risk-member-card>button\s*\{\s*grid-area:action;[\s\S]*?\}/);
  assert.ok(activeButton, 'Active desktop action rule exists');
  assert.match(activeButton[0], /width:100%;min-width:0;box-sizing:border-box/);
  assert.match(activeButton[0], /min-height:44px;justify-self:stretch;align-self:center/);
  assert.match(activeButton[0], /white-space:nowrap/);
});

test('mobile priorities continue to use a full width action', () => {
  assert.match(css, /@media \(max-width:680px\)[\s\S]*?\.risk-member-card>button \{width:100%\}/);
});
