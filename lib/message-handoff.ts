/**
 * Message handoff links are prepared locally. No message is transmitted by PULSE.
 * The sender must press Send in WhatsApp/SMS/Viber and confirm contact in PULSE.
 */
export function normalizePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const compact = trimmed.replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;

  let digits: string;
  if (compact.startsWith('+')) {
    digits = compact.slice(1);
  } else if (compact.startsWith('00')) {
    digits = compact.slice(2);
  } else if (compact.startsWith('0')) {
    // Only the Montenegro local dialing prefix is supported without a country code.
    digits = '382' + compact.slice(1);
  } else if (compact.startsWith('382')) {
    digits = compact;
  } else {
    // Avoid guessing a country code for ambiguous unprefixed numbers.
    return null;
  }

  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return '+' + digits;
}

export function whatsappLink(phone: string, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized || !message.trim()) return null;
  return 'https://wa.me/' + normalized.slice(1) + '?text=' + encodeURIComponent(message.trim());
}

export function smsLink(phone: string, message: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized || !message.trim()) return null;
  return 'sms:' + normalized + '?body=' + encodeURIComponent(message.trim());
}

/** Only a presentation hint; desktop browsers with linked-phone SMS apps may still support sms: links. */
export function isMobileMessagingDevice(userAgent: string, touchPoints = 0): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1);
}
