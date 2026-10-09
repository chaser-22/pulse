import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/layout-polish.css', import.meta.url), 'utf8');

function segment(start: string, end: string): string {
  const from = page.indexOf(start);
  const to = page.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Missing workflow boundary: ' + start);
  return page.slice(from, to);
}

test('message editing immediately persists local draft, even if cleared, without contact side effects', () => {
  const editor = segment('function updateMessage(', 'async function copyMessage(');
  assert.match(editor, /setMessage\(nextMessage\)/);
  assert.match(editor, /if \(!selectedMemberId\) return/);
  assert.match(editor, /queuedMessage:\s*\{/);
  assert.match(editor, /text: nextMessage/);
  assert.doesNotMatch(editor, /\.trim\(\)/);
  assert.doesNotMatch(editor, /contactConfirmedAt:|recoveryOutcome:|status: 'recovered'/);
  assert.match(page, /onMessage=\{updateMessage\}/);
  assert.doesNotMatch(page, /function queueMessage\(|onQueue=|Sačuvaj nacrt|Nacrt sačuvan/);
});

test('member sheet keeps messaging, contact, and renewal as progressive sections', () => {
  assert.match(page, /className="profile-layout compact-member-flow"/);
  assert.match(page, /className="compact-member-overview"/);
  assert.match(page, /className="compact-message-stage"/);
  assert.match(page, /className="compact-member-actions"/);
  assert.match(page, /className="message-field compact-message-field"/);
  assert.match(page, /className="compact-member-risk-details"/);
  const contact = segment('className="compact-member-actions"', '</div>;\n}');
  assert.match(contact, /!member\.contactConfirmedAt && member\.status !== 'recovered'/);
  assert.match(contact, /member\.contactConfirmedAt &&/);
  assert.match(contact, /!member\.recoveryOutcome \? <div className="contact-outcome-group"/);
  assert.match(contact, /!renewing \? <div className="compact-renewal-summary"/);
});

test('compact flow uses the short message editor and preserves mobile scrolling', () => {
  assert.match(css, /\.member-command-sheet \.profile-layout\.compact-member-flow\s*\{[^}]*overflow-y:auto/);
  assert.match(css, /\.member-command-sheet \.compact-message-field textarea\s*\{[^}]*height:clamp\(104px,13dvh,130px\)/);
  assert.match(css, /@media \(max-width:680px\)[\s\S]*?\.profile-layout\.compact-member-flow/);
  assert.match(css, /\.member-command-sheet \.compact-member-actions \.renewal-section\s*\{[^}]*border-top:1px solid var\(--border\)/);
});

test('outcomes and renewal still require separate explicit actions', () => {
  const outcome = segment('function recordOutcome(', 'function resetDemo(');
  const renewal = segment('function markRenewed(', 'function openMemberForm(');
  assert.match(outcome, /if \(!member\?\.contactConfirmedAt \|\| member\.status === 'recovered'\) return/);
  assert.doesNotMatch(renewal, /contactConfirmedAt:/);
  assert.match(page, /PULSE ne šalje poruke automatski/);
});
