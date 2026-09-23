import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getThemeClassName,
  getThemeColor,
  nextTheme,
  resolveThemePreference,
} from '../lib/theme.ts';

test('theme preference uses a stored choice before the system preference', () => {
  assert.equal(resolveThemePreference('light', true), 'light');
  assert.equal(resolveThemePreference('dark', false), 'dark');
});

test('theme preference follows the system when no valid choice is stored', () => {
  assert.equal(resolveThemePreference(null, true), 'dark');
  assert.equal(resolveThemePreference(null, false), 'light');
  assert.equal(resolveThemePreference('invalid', false), 'light');
});

test('theme helpers toggle and expose presentation values', () => {
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(getThemeClassName('dark'), 'dark');
  assert.equal(getThemeClassName('light'), 'light');
  assert.equal(getThemeColor('dark'), '#0e0f10');
  assert.equal(getThemeColor('light'), '#f5f3ef');
});
