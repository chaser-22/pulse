import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('confirmed contact has distinct icon, label, and timestamp elements', () => {
  assert.match(page, /className="contact-confirmed-state" role="status"/);
  assert.match(page, /className="contact-confirmed-copy"><strong>Kontakt potvrđen<\/strong><span>\{member\.contactConfirmedAt\}<\/span>/);
  assert.match(polish, /\.member-command-sheet \.contact-confirmed-state\s*\{\s*display:flex;align-items:center;gap:12px/);
  assert.match(polish, /\.member-command-sheet \.contact-confirmed-copy\s*\{\s*display:flex;align-items:baseline;justify-content:space-between/);
  assert.match(polish, /\.member-command-sheet \.contact-confirmed-state > svg\s*\{[^}]*flex:0 0 20px/);
});

test('outcome actions are grouped and uniformly touch-sized', () => {
  assert.match(page, /className="contact-outcome-label">ISHOD KONTAKTA/);
  assert.match(page, /className="profile-outcome-actions" role="group"/);
  assert.match(polish, /\.member-command-sheet \.profile-outcome-actions\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(polish, /\.member-command-sheet \.profile-outcome-actions button\s*\{[^}]*min-height:44px/);
});

test('renewal uses a neutral inset panel with a separate amount field and actions', () => {
  assert.match(page, /<section className="renewal-section"/);
  assert.match(page, /<form className="renew-form"/);
  assert.match(page, /className="renew-form-actions"/);
  assert.match(polish, /\.member-command-sheet \.renew-form\s*\{[^}]*border:1px solid var\(--border\)/);
  assert.match(polish, /\.member-command-sheet \.renew-form \.amount-input input\s*\{[^}]*height:44px/);
  assert.match(polish, /\.member-command-sheet \.renew-form-actions button\s*\{[^}]*min-height:44px/);
  assert.doesNotMatch(globals, /\.renew-form\s*\{[^}]*#ff6a5e/i);
  assert.doesNotMatch(globals, /\.renew-button\s*\{[^}]*#ff6a5e/i);
});

test('manual sending remains explicit and contact is not inferred from message handoff', () => {
  assert.match(page, /PULSE ne šalje poruke automatski/);
  assert.match(page, /Označi kao kontaktirano/);
  const start = page.indexOf('function beginMessageHandoff(');
  const end = page.indexOf('function queueMessage()', start);
  assert.ok(start > -1 && end > start);
  assert.doesNotMatch(page.slice(start, end), /contactConfirmedAt|contactedAt|recoveryOutcome/);
});
