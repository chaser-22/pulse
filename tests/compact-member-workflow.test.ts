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

test('editing a message only autosaves its draft (including empty edits)', () => {
  const editor = segment('function updateMessage(', 'async function copyMessage(');
  assert.match(editor, /setMessage\(nextMessage\)/);
  assert.match(editor, /queuedMessage:\s*\{/);
  assert.match(editor, /text: nextMessage/);
  assert.doesNotMatch(editor, /contactConfirmedAt:|status: 'recovered'|\.trim\(\)/);
  assert.match(page, /onMessage=\{updateMessage\}/);
  assert.doesNotMatch(page, /Sačuvaj nacrt|onQueue=|function queueMessage\(/);
});

test('profile shows contact and renewal without extra outcome or lifecycle controls', () => {
  const member = page.slice(page.indexOf('function MemberProfile('));
  assert.match(member, /className="profile-layout compact-member-flow"/);
  assert.match(member, /className="compact-message-stage"/);
  assert.match(member, /className="compact-member-actions"/);
  assert.match(member, /Označi kao kontaktirano/);
  assert.match(member, /Evidentiraj obnovu/);
  assert.match(member, /!renewing \? <Button/);
  assert.match(member, /<form className="renew-form" onSubmit=\{onMarkRenewed\}>/);
  assert.doesNotMatch(member, /onOutcome|recoveryOutcome|ISHOD KONTAKTA|member-recovery-path|RecoveryLifecycle/);
});

test('short desktop editor remains touch-friendly and mobile stays scrollable', () => {
  assert.match(css, /\.member-command-sheet \.profile-layout\.compact-member-flow\s*\{[^}]*overflow-y:auto/);
  assert.match(css, /\.member-command-sheet \.compact-message-field textarea\s*\{[^}]*height:clamp\(104px,13dvh,130px\)/);
  assert.match(css, /\.compact-member-actions \.renew-button\s*\{[^}]*min-height:44px/);
});

test('renewal does not fabricate a contact confirmation', () => {
  const renewal = segment('function markRenewed(', 'function openMemberForm(');
  assert.doesNotMatch(renewal, /contactConfirmedAt:/);
  assert.match(page, /PULSE ne šalje poruke automatski/);
});
