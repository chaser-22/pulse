import { useMemo } from 'react';
import { qrcodegen } from '@/lib/qr-code';

type Props = { uri: string; memberName: string };

/** Fully local SVG generation: no QR service receives the member's number/message. */
export function SmsHandoffQr({ uri, memberName }: Props) {
  const qr = useMemo(() => {
    try {
      return qrcodegen.QrCode.encodeText(uri, qrcodegen.QrCode.Ecc.LOW);
    } catch {
      return null;
    }
  }, [uri]);

  const path = useMemo(() => {
    if (!qr) return '';
    const parts: string[] = [];
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) parts.push('M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z');
      }
    }
    return parts.join('');
  }, [qr]);

  if (!qr) {
    return <p className="sms-qr-error">Poruka je preduga za QR. Skratite je ili kopirajte tekst i broj ručno.</p>;
  }

  const size = qr.size + 8;
  return <svg className="sms-qr-image" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`QR kod za SMS poruku članu ${memberName}`} xmlns="http://www.w3.org/2000/svg">
    <title>SMS za {memberName}</title>
    <rect width={size} height={size} fill="#ffffff" />
    <path d={path} fill="#111111" />
  </svg>;
}
