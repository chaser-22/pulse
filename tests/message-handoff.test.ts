import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePhone, whatsappLink, smsLink, isMobileMessagingDevice } from '../lib/message-handoff.ts';
import { readFileSync } from 'node:fs';

test('normalizes Montenegro phone numbers without guessing ambiguous country codes', () => {
  assert.equal(normalizePhone('+382 (67) 902-410'), '+38267902410');
  assert.equal(normalizePhone('067 902 410'), '+38267902410');
  assert.equal(normalizePhone('00382 67 902 410'), '+38267902410');
  assert.equal(normalizePhone('38267902410'), '+38267902410');
  assert.equal(normalizePhone('67902410'), null);
  assert.equal(normalizePhone('invalid'), null);
  assert.equal(normalizePhone(''), null);
});

test('WhatsApp and SMS links contain encoded user-edited text with the correct member number', () => {
  const message = 'Zdravo Milice, članarina je istekla. Želiš li da obnovimo?';
  const wa = whatsappLink('+382 67 902 410', message);
  const sms = smsLink('067902410', message);
  assert.equal(wa, 'https://wa.me/38267902410?text=' + encodeURIComponent(message));
  assert.equal(sms, 'sms:+38267902410?body=' + encodeURIComponent(message));
  assert.equal(whatsappLink('bad-number', message), null);
  assert.equal(smsLink('+38267902410', '  '), null);
});

test('mobile guidance is only a device hint, never a delivery guarantee', () => {
  assert.equal(isMobileMessagingDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), true);
  assert.equal(isMobileMessagingDevice('Mozilla/5.0 (Linux; Android 15; Pixel)'), true);
  assert.equal(isMobileMessagingDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0), false);
  assert.equal(isMobileMessagingDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5), true);
});

test('opening messaging applications never updates contactedAt or recoveryOutcome', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const start = page.indexOf('function beginMessageHandoff(');
  const end = page.indexOf('function queueMessage()', start);
  const handoff = page.slice(start, end);
  assert.ok(start > -1 && end > start);
  assert.match(handoff, /queuedMessage:/);
  assert.doesNotMatch(handoff, /contactConfirmedAt|contactedAt|recoveryOutcome|recoveredAt/);
  assert.match(page, /Označi kao kontaktirano/);
  assert.match(page, /PULSE ne šalje poruke automatski/);
});

test('desktop SMS QR data stays local and QR uses complete SMS URI', () => {
  const component = readFileSync(new URL('../components/sms-handoff-qr.tsx', import.meta.url), 'utf8');
  assert.match(component, /qrcodegen.QrCode.encodeText\(uri, qrcodegen.QrCode.Ecc.LOW\)/);
  assert.match(component, /role="img"/);
  assert.doesNotMatch(component, /fetch\(|<img[^>]+src=/);
});
