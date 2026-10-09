import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const polish = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('confirmed contact status keeps icon and timestamp aligned', () => {
  assert.match(page, /className="contact-confirmed-state" role="status"/);
  assert.match(page, /className="contact-confirmed-copy"><strong>Kontaktirano<\/strong><span>\{member\.contactConfirmedAt\}<\/span>/);
  assert.match(polish, /\.member-command-sheet \.contact-confirmed-state\s*\{\s*display:flex;align-items:center;gap:12px/);
  assert.match(polish, /\.member-command-sheet \.contact-confirmed-state > svg\s*\{[^}]*flex:0 0 20px/);
});

test('member profile has only one separate renewal action', () => {
  assert.match(page, /Evidentiraj obnovu/);
  assert.match(page, /Potvrdi obnovu/);
  assert.doesNotMatch(page, /Ishod kontakta|Bez odgovora|Odgovorio\/la|Prati sjutra/);
  assert.match(polish, /\.member-command-sheet \.compact-member-actions \.renew-button\s*\{[^}]*width:100%;min-height:44px/);
  assert.match(polish, /\.member-command-sheet \.renew-form \.amount-input input\s*\{[^}]*height:44px/);
  assert.doesNotMatch(globals, /\.renew-form\s*\{[^}]*#ff6a5e/i);
});

test('opening messaging apps does not confirm contact', () => {
  const start = page.indexOf('function beginMessageHandoff(');
  const end = page.indexOf('function markContacted(', start);
  assert.ok(start > -1 && end > start);
  assert.doesNotMatch(page.slice(start, end), /contactConfirmedAt|contactedAt/);
  assert.match(page, /PULSE ne šalje poruke automatski/);
});
