import type { Member, MemberStatus, RiskLevel } from './pulse-data';

export type CsvImportResult = {
  members: Member[];
  errors: string[];
};

type MembershipState = {
  status: MemberStatus;
  risk: RiskLevel;
};

const HEADER_ALIASES = {
  firstName: ['firstname', 'first_name', 'ime'],
  lastName: ['lastname', 'last_name', 'prezime', 'surname'],
  fullName: ['name', 'fullname', 'full_name', 'imeiprezime'],
  phone: ['phone', 'telefon', 'mobile', 'mobitel'],
  email: ['email', 'e-mail'],
  packageName: ['package', 'packagename', 'membership', 'membershiptype', 'paket'],
  price: ['price', 'monthlyprice', 'membershipprice', 'cijena', 'cena', 'cijenaclanarine', 'cijenaclanarine'],
  startDate: ['startdate', 'membershipstart', 'start', 'pocetak', 'datumpocetka'],
  endDate: ['enddate', 'expirydate', 'expirationdate', 'membershipend', 'expiry', 'istek', 'datumisteka'],
  birthday: ['birthday', 'dateofbirth', 'datumrodjenja'],
} as const;

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function countDelimiter(line: string, delimiter: ',' | ';') {
  let count = 0;
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(header: string): ',' | ';' {
  return countDelimiter(header, ';') > countDelimiter(header, ',') ? ';' : ',';
}

function splitDelimitedLine(line: string, delimiter: ',' | ';') {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function validDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return validDateParts(Number(year), Number(month), Number(day)) ? trimmed : '';
  }

  const european = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})\.?$/);
  if (!european) return '';

  const [, day, month, year] = european;
  if (!validDateParts(Number(year), Number(month), Number(day))) return '';

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parsePrice(value: string) {
  let cleaned = value.trim().replace(/[^\d,.-]/g, '');
  if (!cleaned) return Number.NaN;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  return Number(cleaned);
}

function isoToUtcMs(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function differenceInDays(fromIso: string, toIso: string) {
  return Math.round((isoToUtcMs(toIso) - isoToUtcMs(fromIso)) / 86_400_000);
}

function getRiskCopy(state: MembershipState, endDate: string, todayIso: string) {
  if (state.status === 'expired') {
    const days = Math.max(1, differenceInDays(endDate, todayIso));
    return {
      reason: days === 1 ? 'Članarina je istekla juče.' : `Članarina je istekla prije ${days} dana.`,
      action: 'Kontaktirajte člana danas i ponudite jednostavnu obnovu.',
    };
  }

  if (state.status === 'expiring') {
    const days = Math.max(0, differenceInDays(todayIso, endDate));
    return {
      reason: days === 0 ? 'Članarina ističe danas.' : `Članarina ističe za ${days} dana.`,
      action: 'Pošaljite podsjetnik prije isteka članarine.',
    };
  }

  return {
    reason: 'Članarina je aktivna i ne ističe u narednih 7 dana.',
    action: 'Nije potrebna akcija.',
  };
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function findExistingMember(existingMembers: Member[], phone: string, email: string) {
  const phoneDigits = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  return existingMembers.find((member) => {
    if (phoneDigits && normalizePhone(member.phone) === phoneDigits) return true;
    return Boolean(normalizedEmail && normalizeEmail(member.email) === normalizedEmail);
  });
}

function getHeaderIndex(headers: string[], aliases: readonly string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(header));
}

export function toLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(isoDate: string, days: number) {
  const normalized = normalizeDate(isoDate);
  if (!normalized) return isoDate;

  const date = new Date(isoToUtcMs(normalized));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function inferMembershipState(endDate: string, todayIso = toLocalIsoDate()): MembershipState {
  const normalizedEnd = normalizeDate(endDate);
  const normalizedToday = normalizeDate(todayIso);

  if (!normalizedEnd || !normalizedToday) {
    return { status: 'active', risk: 'low' };
  }

  const daysUntilExpiry = differenceInDays(normalizedToday, normalizedEnd);
  if (daysUntilExpiry < 0) return { status: 'expired', risk: 'high' };
  if (daysUntilExpiry <= 7) return { status: 'expiring', risk: 'medium' };
  return { status: 'active', risk: 'low' };
}

export function parseMemberCsv(
  text: string,
  existingMembers: Member[] = [],
  todayIso = toLocalIsoDate(),
): CsvImportResult {
  const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((row) => row.trim());
  if (rows.length < 2) {
    return { members: [], errors: ['CSV mora imati zaglavlje i najmanje jedan red sa članom.'] };
  }

  const delimiter = detectDelimiter(rows[0]);
  const headers = splitDelimitedLine(rows[0], delimiter).map(normalizeHeader);
  const indexes = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, getHeaderIndex(headers, aliases)]),
  ) as Record<keyof typeof HEADER_ALIASES, number>;

  const missingColumns: string[] = [];
  if (indexes.phone < 0) missingColumns.push('telefon');
  if (indexes.price < 0) missingColumns.push('cijena');
  if (indexes.endDate < 0) missingColumns.push('datum isteka');
  if (indexes.firstName < 0 && indexes.fullName < 0) missingColumns.push('ime');

  if (missingColumns.length) {
    return {
      members: [],
      errors: [`Nedostaju obavezne kolone: ${missingColumns.join(', ')}.`],
    };
  }

  const errors: string[] = [];
  const parsed: Member[] = [];

  rows.slice(1).forEach((row, rowIndex) => {
    const cells = splitDelimitedLine(row, delimiter);
    const value = (key: keyof typeof HEADER_ALIASES) => {
      const index = indexes[key];
      return index >= 0 ? (cells[index] ?? '').trim() : '';
    };

    let firstName = value('firstName');
    let lastName = value('lastName');
    const fullName = value('fullName');

    if (!firstName && fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      firstName = parts.shift() ?? '';
      lastName = parts.join(' ');
    }

    const phone = value('phone');
    const email = value('email');
    const price = parsePrice(value('price'));
    const endDate = normalizeDate(value('endDate'));
    const rawStartDate = value('startDate');
    const startDate = rawStartDate ? normalizeDate(rawStartDate) : '';

    const rowErrors: string[] = [];
    if (!firstName) rowErrors.push('ime');
    if (!phone) rowErrors.push('telefon');
    if (!Number.isFinite(price) || price <= 0) rowErrors.push('cijena');
    if (!endDate) rowErrors.push('datum isteka');
    if (rawStartDate && !startDate) rowErrors.push('datum početka');

    if (rowErrors.length) {
      errors.push(`Red ${rowIndex + 2}: provjerite ${rowErrors.join(', ')}.`);
      return;
    }

    const existing = findExistingMember(existingMembers, phone, email);
    const inferred = inferMembershipState(endDate, todayIso);
    const wasRecovered = Boolean(existing?.recoveredAt || existing?.status === 'recovered');
    const state: MembershipState = wasRecovered
      ? { status: 'recovered', risk: 'low' }
      : inferred;
    const copy = wasRecovered
      ? {
          reason: existing?.riskReason ?? 'Član je ranije označen kao obnovljen u PULSE.',
          action: existing?.nextAction ?? 'Nije potrebna akcija.',
        }
      : getRiskCopy(state, endDate, todayIso);

    const phoneDigits = normalizePhone(phone);
    const emailKey = normalizeEmail(email).replace(/[^a-z0-9]/g, '-');
    const generatedKey = phoneDigits || emailKey || `${normalizeHeader(firstName)}-${rowIndex + 1}`;

    parsed.push({
      id: existing?.id ?? `csv-${generatedKey}`,
      firstName,
      lastName,
      phone,
      email,
      birthday: value('birthday') ? normalizeDate(value('birthday')) : '',
      status: state.status,
      risk: state.risk,
      packageName: value('packageName') || 'Nije navedeno',
      price,
      startDate,
      endDate,
      riskReason: copy.reason,
      nextAction: copy.action,
      preferredChannel: existing?.preferredChannel ?? 'Poruka',
      recoveredAmount: existing?.recoveredAmount,
      recoveredAt: existing?.recoveredAt,
      queuedMessage: existing?.queuedMessage,
      recoveryOutcome: existing?.recoveryOutcome,
      followUpAt: existing?.followUpAt,
    });
  });

  if (errors.length) return { members: [], errors };
  return { members: parsed, errors: [] };
}
