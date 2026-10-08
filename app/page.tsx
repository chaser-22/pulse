'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react';
import {
  ArrowRight, Check, CheckCircle2, Copy,
  ChevronRight, Clock3,
  LayoutDashboard, Menu, MessageCircle, Pencil, Phone, Plus, Radar, Search,
  RotateCcw, Send, ShieldAlert, Smartphone, Upload, Users, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SmsHandoffQr } from '@/components/sms-handoff-qr';
import { normalizePhone, smsLink, whatsappLink, isMobileMessagingDevice } from '@/lib/message-handoff';
import {
  copy,
  type Member, type MemberStatus, type RecoveryOutcome, type RiskLevel,
} from '@/lib/pulse-data';
import { createDemoMembers } from '@/lib/demo-data';
import {
  getPulseMetrics,
  getRecoveryActivity,
  getRecoveryLifecycle,
  getRiskMembers,
  memberMatchesSearch,
  type RecoveryActivity,
} from '@/lib/pulse-logic';
import { addDaysIso, inferMembershipState, parseMemberCsv, toLocalIsoDate } from '@/lib/csv-import';

type View = 'dashboard' | 'staff' | 'members' | 'radar';
type Workspace = 'owner' | 'staff';
type Filter = 'all' | MemberStatus;
type MemberForm = Pick<Member, 'firstName' | 'lastName' | 'phone' | 'price' | 'endDate'>;
type ImportPhase = 'idle' | 'reading' | 'validating';
type ImportSummary = { members: number; priorities: number; riskRevenue: number };
type RenewalReveal = { name: string; amount: number };

const STORAGE_KEY = 'pulse-csv-only-demo-v2';
const ONBOARDING_KEY = 'pulse-onboarding-seen-v1';
const IMPORT_PROGRESS_DELAY_MS = 350;
const { me: t } = copy;

function getMemberRevealDelay(index: number, total: number) {
  const step = Math.max(34, Math.min(68, 1_050 / Math.max(total - 1, 1)));
  return `${Math.round(index * step)}ms`;
}

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Svi' }, { id: 'active', label: 'Aktivni' }, { id: 'expiring', label: 'Ističu' },
  { id: 'expired', label: 'Istekli' }, { id: 'recovered', label: 'Obnovljeni u PULSE' },
];

const outcomeLabels: Record<RecoveryOutcome, string> = {
  no_answer: 'Bez odgovora',
  replied: 'Odgovorio/la',
  follow_up: 'Pratiti sjutra',
  declined: 'Ne želi obnovu',
};

const viewMeta: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: 'DANAŠNJI PREGLED', title: 'Pregled članarina', subtitle: '' },
  staff: { eyebrow: 'RECEPCIJA', title: 'Danas', subtitle: '' },
  members: { eyebrow: 'BAZA ČLANOVA', title: 'Članovi', subtitle: '' },
  radar: { eyebrow: 'PRIORITETI', title: 'Prioriteti članarina', subtitle: '' },
};

function euro(value: number) {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value)} €`;
}

function AnimatedCurrency({ value, className }: { value: number; className?: string }) {
  const previousRef = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const from = previousRef.current;
    previousRef.current = value;

    if (from === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 520;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <span className={className}>{euro(displayValue)}</span>;
}

function prettyDate(value: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}.`;
}

function formatActionTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('sr-Latn-ME', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(',', ' ·');
}

function formatFollowUpTimestamp(date = new Date()) {
  const followUp = new Date(date);
  followUp.setDate(followUp.getDate() + 1);
  followUp.setHours(10, 0, 0, 0);
  return new Intl.DateTimeFormat('sr-Latn-ME', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(followUp).replace(',', ' ·');
}

function memberSignalCopy(status: MemberStatus) {
  if (status === 'expired') {
    return {
      riskReason: 'Članarina je istekla.',
      nextAction: 'Kontaktirajte člana danas i ponudite jednostavnu obnovu.',
    };
  }
  if (status === 'expiring') {
    return {
      riskReason: 'Članarina ističe u narednih 7 dana.',
      nextAction: 'Pošaljite podsjetnik prije isteka članarine.',
    };
  }
  return {
    riskReason: 'Članarina je aktivna i ne ističe u narednih 7 dana.',
    nextAction: 'Nije potrebna akcija.',
  };
}

function initials(member: Member) {
  return `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`;
}

function fullName(member: Member) {
  return `${member.firstName} ${member.lastName}`;
}

function membershipUrgencyLabel(member: Member) {
  if (member.status === 'expired') {
    return member.riskReason
      .replace(/^Članarina je istekla prije\s*/i, 'Isteklo · ')
      .replace(/^Članarina je istekla\s*/i, 'Isteklo · ')
      .replace(/\.$/, '');
  }
  if (member.status === 'expiring') {
    return member.riskReason
      .replace(/^Članarina ističe\s*/i, 'Ističe · ')
      .replace(/\.$/, '');
  }
  return t.statuses[member.status] ?? 'Provjeriti';
}

function newMessage(member: Member) {
  if (member.status === 'expired') return `Zdravo ${member.firstName}, primijetili smo da je tvoja članarina istekla. Ako želiš da nastaviš, javi nam i pripremićemo obnovu.`;
  if (member.status === 'expiring') return `Zdravo ${member.firstName}, samo mali podsjetnik: tvoja članarina ističe ${prettyDate(member.endDate)} Javi nam ako želiš da je produžimo.`;
  return `Zdravo ${member.firstName}, tvoja članarina je aktivna do ${prettyDate(member.endDate)}.`;
}

function riskClass(risk: RiskLevel) {
  return risk === 'high' ? 'risk-high' : risk === 'medium' ? 'risk-medium' : 'risk-low';
}

function statusClass(status: MemberStatus) {
  if (status === 'expired') return 'status-expired';
  if (status === 'recovered') return 'status-recovered';
  if (status === 'expiring') return 'status-expiring';
  return status === 'active' ? 'status-active' : 'status-unknown';
}

function PulseLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`pulse-logo ${compact ? 'compact' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 48 48">
      <path className="logo-frame" d="M12 5h24c4 0 7 3 7 7v24c0 4-3 7-7 7H12c-4 0-7-3-7-7V12c0-4 3-7 7-7Z" />
      <path className="logo-signal" d="M12 31.5l8.3-8.2 5.6 5.5L36 17.5" />
      <path className="logo-arrow" d="M29.8 17.5H36v6.2" />
      <circle cx="12" cy="31.5" r="2.2" />
    </svg>
  </span>;
}

function blankMemberForm(): MemberForm {
  const today = toLocalIsoDate();
  return {
    firstName: '',
    lastName: '',
    phone: '+382 ',
    price: 35,
    endDate: addDaysIso(today, 30),
  };
}

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [workspace, setWorkspace] = useState<Workspace>('owner');
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { members?: Member[] };
        if (parsed.members?.length) return parsed.members;
      }
    } catch {
      // A corrupt or unavailable snapshot falls back to the CSV-generated demo.
    }
    return createDemoMembers();
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [message, setMessage] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewalAmount, setRenewalAmount] = useState('35');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(blankMemberForm());
  const [resetOpen, setResetOpen] = useState(false);
  const [pilotOpen, setPilotOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const [success, setSuccess] = useState('');
  const [importError, setImportError] = useState('');
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle');
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [renewalReveal, setRenewalReveal] = useState<RenewalReveal | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importProgressTimerRef = useRef<number | null>(null);
  const renewalTimerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ members }));
  }, [members]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(''), 3200);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!importError) return;
    const timer = window.setTimeout(() => setImportError(''), 6000);
    return () => window.clearTimeout(timer);
  }, [importError]);

  useEffect(() => {
    return () => {
      if (importProgressTimerRef.current !== null) window.clearTimeout(importProgressTimerRef.current);
      if (renewalTimerRef.current !== null) window.clearTimeout(renewalTimerRef.current);
    };
  }, []);


  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null;

  const riskMembers = useMemo(() => getRiskMembers(members), [members]);
  const highRiskMembers = useMemo(() => riskMembers.filter((member) => member.risk === 'high'), [riskMembers]);
  const metrics = useMemo(() => getPulseMetrics(members), [members]);
  const recoveryActivity = useMemo(() => getRecoveryActivity(members), [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesFilter = filter === 'all' || member.status === filter;
      return matchesFilter && memberMatchesSearch(member, search);
    });
  }, [members, filter, search]);

  const quickMatches = useMemo(() => members.filter((member) => memberMatchesSearch(member, quickQuery)).slice(0, 6), [members, quickQuery]);

  useEffect(() => {
    function openFromKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuickQuery('');
        setQuickSearchOpen(true);
      }
    }
    window.addEventListener('keydown', openFromKeyboard);
    return () => window.removeEventListener('keydown', openFromKeyboard);
  }, []);

  function completeOnboarding() {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // Onboarding can still continue when storage is unavailable.
    }
    setOnboardingOpen(false);
  }

  function startDemo() {
    setWorkspace('owner');
    setView('dashboard');
    completeOnboarding();
  }

  function finishImportProgress() {
    if (importProgressTimerRef.current !== null) {
      window.clearTimeout(importProgressTimerRef.current);
      importProgressTimerRef.current = null;
    }
    setShowImportProgress(false);
    setImportPhase('idle');
  }

  function goTo(nextView: View) {
    setView(nextView);
    setMobileNav(false);
  }

  function openQuickSearch() {
    setQuickQuery('');
    setQuickSearchOpen(true);
  }

  function selectQuickMember(member: Member) {
    setQuickSearchOpen(false);
    openMember(member);
  }

  function switchWorkspace(nextWorkspace: Workspace) {
    setWorkspace(nextWorkspace);
    setView(nextWorkspace === 'owner' ? 'dashboard' : 'staff');
    setMobileNav(false);
  }

  function recordOutcome(memberId: string, outcome: RecoveryOutcome) {
    const member = members.find((item) => item.id === memberId);
    // Recording an outcome must not implicitly count as contacting the member.
    if (!member?.contactConfirmedAt || member.status === 'recovered') return;
    setMembers((current) => current.map((item) => item.id === memberId && item.contactConfirmedAt && item.status !== 'recovered' ? {
      ...item,
      recoveryOutcome: outcome,
      followUpAt: outcome === 'follow_up' ? formatFollowUpTimestamp() : undefined,
    } : item));
    setSuccess(`${fullName(member)}: ${outcomeLabels[outcome]}.`);
  }

  function resetDemo() {
    setMembers(createDemoMembers());
    setWorkspace('owner');
    setView('dashboard');
    setSelectedMemberId(null);
    setFilter('all');
    setSearch('');
    setResetOpen(false);
    setSuccess('Demo je vraćen na početne podatke i spreman je za novu prezentaciju.');
  }

  function openMember(member: Member) {
    setSelectedMemberId(member.id);
    setMessage(member.queuedMessage?.text ?? newMessage(member));
    setRenewalAmount(String(member.price));
    setRenewing(false);
  }

  async function copyMessage() {
    if (!selectedMember || !message.trim()) return false;
    try {
      await navigator.clipboard.writeText(message.trim());
      setSuccess(`Poruka za ${selectedMember.firstName} je kopirana.`);
      return true;
    } catch {
      setSuccess('Kopiranje nije uspjelo. Označite tekst poruke i kopirajte ga ručno.');
      return false;
    }
  }

  function beginMessageHandoff() {
    if (!selectedMember || !message.trim()) return;
    // Only preserve the draft. A handoff is NOT a delivered message or confirmed contact.
    setMembers((current) => current.map((member) => {
      if (member.id !== selectedMember.id) return member;
      if (member.queuedMessage?.text === message.trim()) return member;
      return {
        ...member,
        queuedMessage: { channel: 'Poruka', text: message.trim(), queuedAt: formatActionTimestamp() },
      };
    }));
  }

  function queueMessage() {
    if (!selectedMember || !message.trim()) return;
    setMembers((current) => current.map((member) => member.id === selectedMember.id ? {
      ...member, preferredChannel: 'Poruka', queuedMessage: { channel: 'Poruka', text: message.trim(), queuedAt: formatActionTimestamp() },
    } : member));
    setSuccess(`Nacrt poruke za ${selectedMember.firstName} je sačuvan. Kontakt nije evidentiran dok ga ručno ne potvrdite.`);
  }

  function markContacted(memberId: string) {
    const member = members.find((item) => item.id === memberId);
    if (!member) return;
    setMembers((current) => current.map((item) => item.id === memberId ? {
      ...item,
      contactConfirmedAt: item.contactConfirmedAt ?? formatActionTimestamp(),
    } : item));
    setSuccess(`${fullName(member)} je evidentiran/a kao kontaktiran/a.`);
  }

  function markRenewed(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    const amount = Number(renewalAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const memberName = fullName(selectedMember);
    const today = toLocalIsoDate();

    setMembers((current) => current.map((member) => member.id === selectedMember.id ? {
      ...member,
      // Renewal is a separate, staff-recorded event; it does not confirm prior outreach.
      status: 'recovered', risk: 'low', price: amount, recoveredAmount: amount, recoveredAt: today,
      startDate: today, endDate: addDaysIso(today, 30), followUpAt: undefined,
      riskReason: `Članarina obnovljena ${prettyDate(today)} uz pomoć PULSE recovery toka.`,
      nextAction: 'Nije potrebna akcija.',
    } : member));
    setRenewing(false);
    setRenewalReveal({ name: memberName, amount });

    if (renewalTimerRef.current !== null) window.clearTimeout(renewalTimerRef.current);
    renewalTimerRef.current = window.setTimeout(() => {
      setSelectedMemberId(null);
      setRenewalReveal(null);
      setView(workspace === 'owner' ? 'dashboard' : 'staff');
      setSuccess(`${memberName} je obnovio članarinu. ${euro(amount)} je dodato evidentiranom prihodu.`);
      renewalTimerRef.current = null;
    }, 900);
  }

  function openMemberForm(member?: Member) {
    if (member) {
      setEditingId(member.id);
      setMemberForm({
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        price: member.price,
        endDate: member.endDate,
      });
      setSelectedMemberId(null);
    } else {
      setEditingId(null);
      setMemberForm(blankMemberForm());
    }
    setFormOpen(true);
  }

  function saveMember(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberForm.firstName.trim() || !memberForm.lastName.trim() || !memberForm.phone.trim()) return;

    const price = Number(memberForm.price);
    if (!Number.isFinite(price) || price <= 0 || !memberForm.endDate) return;

    const inferred = inferMembershipState(memberForm.endDate, toLocalIsoDate());
    const copyForState = memberSignalCopy(inferred.status);

    if (editingId) {
      setMembers((current) => current.map((member) => {
        if (member.id !== editingId) return member;
        if (member.status === 'recovered') {
          return { ...member, ...memberForm, price, status: 'recovered', risk: 'low' };
        }
        return {
          ...member,
          ...memberForm,
          price,
          status: inferred.status,
          risk: inferred.risk,
          ...copyForState,
        };
      }));
      setSuccess('Podaci o članu su sačuvani.');
    } else {
      const id = `${memberForm.firstName}-${memberForm.lastName}-${Date.now()}`.toLocaleLowerCase('me').replace(/\s+/g, '-');
      const created: Member = {
        ...memberForm,
        id,
        email: '',
        birthday: '',
        packageName: 'Nije navedeno',
        startDate: '',
        preferredChannel: 'Poruka',
        price,
        status: inferred.status,
        risk: inferred.risk,
        ...copyForState,
      };
      setMembers((current) => [created, ...current]);
      setSuccess(`${created.firstName} ${created.lastName} je dodat/a u bazu.`);
    }
    setFormOpen(false);
  }

  function importCsv(file: File) {
    setImportSummary(null);
    setImportError('');
    setImportPhase('reading');
    setShowImportProgress(false);

    if (importProgressTimerRef.current !== null) window.clearTimeout(importProgressTimerRef.current);
    importProgressTimerRef.current = window.setTimeout(() => {
      setShowImportProgress(true);
      importProgressTimerRef.current = null;
    }, IMPORT_PROGRESS_DELAY_MS);

    const reader = new FileReader();
    reader.onload = () => {
      setImportPhase('validating');
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseMemberCsv(text, members, toLocalIsoDate());

      if (result.errors.length) {
        finishImportProgress();
        setSuccess('');
        setImportError(`CSV nije uvezen. ${result.errors.slice(0, 3).join(' ')}`);
        return;
      }

      const importedMetrics = getPulseMetrics(result.members);
      const importedPriorities = getRiskMembers(result.members).length;

      setMembers(result.members);
      setSelectedMemberId(null);
        setWorkspace('owner');
      setView('dashboard');
      setImportError('');
      finishImportProgress();
      setImportSummary({
        members: result.members.length,
        priorities: importedPriorities,
        riskRevenue: importedMetrics.riskRevenue,
      });
      if (onboardingOpen) completeOnboarding();
    };
    reader.onerror = () => {
      finishImportProgress();
      setSuccess('');
      setImportError('CSV nije uvezen. Fajl nije moguće pročitati.');
    };
    reader.readAsText(file);
  }

  return (
    <main className="app-shell" data-workspace={workspace}>
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand"><PulseLogo /><span className="brand-word">PULSE</span></div>
        <button className="sidebar-close" aria-label="Zatvori meni" onClick={() => setMobileNav(false)}><X /></button>
        <nav aria-label="Glavna navigacija">
          {workspace === 'owner' ? <>
          <NavButton active={view === 'dashboard'} icon={<LayoutDashboard />} label="Vlasnički pregled" onClick={() => goTo('dashboard')} />
          <NavButton active={view === 'members'} icon={<Users />} label={t.nav.members} count={members.length} onClick={() => goTo('members')} />
          <NavButton active={view === 'radar'} icon={<Radar />} label="Prioriteti članarina" count={riskMembers.length} onClick={() => goTo('radar')} />
          </> : <>
          <NavButton active={view === 'staff'} icon={<CheckCircle2 />} label="Danas" count={riskMembers.length} onClick={() => goTo('staff')} />
          <NavButton active={view === 'members'} icon={<Users />} label={t.nav.members} count={members.length} onClick={() => goTo('members')} />
          </>}
        </nav>
        {workspace === 'owner'
          ? metrics.recoveredRevenue > 0 && <div className="sidebar-insight"><span className="pulse-dot" /><div><strong>{euro(metrics.recoveredRevenue)}</strong><small>obnovljeno</small></div></div>
          : <div className="sidebar-insight reception-insight"><span className="pulse-dot" /><div><strong>{riskMembers.filter((member) => !member.recoveryOutcome && member.status !== 'recovered').length}</strong><small>kontakata preostalo</small></div></div>}
        {workspace === 'owner' && <button className="demo-reset-button" onClick={() => setResetOpen(true)}><RotateCcw /> Resetuj demo</button>}
        <button type="button" className="gym-card gym-card-button" onClick={() => setPilotOpen(true)}><span className="gym-monogram">PD</span><span><strong>{t.gymName}</strong><small>CSV demo</small></span></button>
      </aside>

      {mobileNav && <button className="nav-backdrop" aria-label="Zatvori meni" onClick={() => setMobileNav(false)} />}

      <section className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Otvori meni" onClick={() => setMobileNav(true)}><Menu /></button>
          <div className="page-title"><p className="eyebrow">{viewMeta[view].eyebrow}</p><h1>{viewMeta[view].title}</h1>{viewMeta[view].subtitle && <p>{viewMeta[view].subtitle}</p>}</div>
          <div className="top-actions">
            <fieldset className="workspace-switch"><legend className="sr-only">Izaberite radni prostor</legend><button type="button" aria-pressed={workspace === 'owner'} className={workspace === 'owner' ? 'active' : ''} onClick={() => switchWorkspace('owner')}><LayoutDashboard /> Vlasnik</button><button type="button" aria-pressed={workspace === 'staff'} className={workspace === 'staff' ? 'active' : ''} onClick={() => switchWorkspace('staff')}><Users /> Recepcija</button></fieldset>
            {workspace === 'owner' ? <>
              <Button variant="outline" className="dark-outline csv-primary-action" onClick={() => fileInputRef.current?.click()}><Upload /> Ažuriraj CSV</Button>
              <Button variant="outline" className="dark-outline" onClick={() => openMemberForm()}><Plus /> {t.actions.add}</Button>
            </> : <Button variant="outline" className="dark-outline" onClick={() => openMemberForm()}><Plus /> {t.actions.add}</Button>}
          </div>
          <input ref={fileInputRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) importCsv(file); event.target.value = ''; }} />
        </header>

        {view === 'dashboard' && <Dashboard metrics={metrics} recoveryActivity={recoveryActivity} highRiskMembers={highRiskMembers} signalCount={riskMembers.length} onOpenMember={openMember} onNavigate={goTo} />}
        {view === 'staff' && <StaffBoard members={riskMembers} onOpenMember={openMember} onContacted={markContacted} onOutcome={recordOutcome} onAddMember={() => openMemberForm()} onFindMember={openQuickSearch} />}
        {view === 'members' && <MembersScreen members={filteredMembers} total={members.length} filter={filter} search={search} onFilter={setFilter} onSearch={setSearch} onOpenMember={openMember} onImport={() => fileInputRef.current?.click()} />}
        {view === 'radar' && <RadarScreen members={riskMembers} onOpenMember={openMember} />}
      </section>

      <Dialog open={quickSearchOpen} onOpenChange={setQuickSearchOpen}>
        <DialogContent className="quick-search-dialog" aria-label="Brza pretraga članova">
          <DialogHeader><DialogTitle>Pronađi člana</DialogTitle></DialogHeader>
          <div className="quick-search-field"><Search /><Input autoFocus value={quickQuery} onChange={(event) => setQuickQuery(event.target.value)} placeholder="Ime ili telefon" aria-label="Ime ili telefon" /></div>
          <div className="quick-search-results" aria-label="Rezultati pretrage">
            {quickMatches.length ? quickMatches.map((member) => <button key={member.id} type="button" onClick={() => selectQuickMember(member)}>
              <span className="avatar">{initials(member)}</span>
              <span className="quick-search-person"><strong>{fullName(member)}</strong><small>{member.phone}</small></span>
              <span className={`status-pill ${statusClass(member.status)}`}>{membershipUrgencyLabel(member)}</span>
              <ChevronRight />
            </button>) : <p className="quick-search-empty">Nema rezultata</p>}
          </div>
          <button type="button" className="quick-search-all" onClick={() => { setQuickSearchOpen(false); setSearch(quickQuery); goTo('members'); }}>Svi članovi <ArrowRight /></button>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedMember)} onOpenChange={(open) => { if (!open && !renewalReveal) setSelectedMemberId(null); }}>
        <DialogContent className={renewalReveal ? 'member-dialog renewal-reveal-dialog' : 'member-dialog member-command-sheet'} showCloseButton={!renewalReveal}>
          {renewalReveal ? <RenewalConfirmation name={renewalReveal.name} amount={renewalReveal.amount} /> : selectedMember && (
            <MemberProfile
              key={selectedMember.id} member={selectedMember} message={message} renewing={renewing} renewalAmount={renewalAmount}
              onMessage={setMessage} onCopy={copyMessage} onQueue={queueMessage} onHandoff={beginMessageHandoff} onContacted={() => markContacted(selectedMember.id)} onOutcome={(outcome) => recordOutcome(selectedMember.id, outcome)}
              onEdit={() => openMemberForm(selectedMember)} onRenew={() => setRenewing(true)} onCancelRenew={() => setRenewing(false)}
              onRenewalAmount={setRenewalAmount} onMarkRenewed={markRenewed}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="form-dialog">
          <DialogHeader><DialogTitle>{editingId ? 'Uredi člana' : 'Dodaj člana'}</DialogTitle></DialogHeader>
          <form onSubmit={saveMember} className="member-form">
            <div className="form-grid">
              <Field label="Ime" required><Input value={memberForm.firstName} onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })} /></Field>
              <Field label="Prezime" required><Input value={memberForm.lastName} onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })} /></Field>
              <Field label="Telefon" required><Input required value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} /></Field>
              <Field label="Cijena članarine" required><div className="amount-input"><Input required type="number" min="1" value={memberForm.price} onChange={(e) => setMemberForm({ ...memberForm, price: Number(e.target.value) })} /><span>€</span></div></Field>
              <Field label="Datum isteka" required><Input required type="date" value={memberForm.endDate} onChange={(e) => setMemberForm({ ...memberForm, endDate: e.target.value })} /></Field>
            </div>
            <DialogFooter className="form-footer"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Odustani</Button><Button type="submit" className="pulse-button">{editingId ? 'Sačuvaj izmjene' : 'Dodaj člana'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(importSummary)} onOpenChange={(open) => { if (!open) setImportSummary(null); }}>
        <DialogContent className="import-reveal-dialog">
          {importSummary && <>
            <DialogHeader>
              <div className="import-reveal-icon"><CheckCircle2 /></div>
              <p className="eyebrow">CSV JE SPREMAN</p>
              <DialogTitle>Pregled je spreman</DialogTitle>
              <DialogDescription>PULSE je provjerio podatke i izdvojio članarine koje zahtijevaju pažnju.</DialogDescription>
            </DialogHeader>
            <dl className="import-reveal-metrics">
              <div><dt>Učitano članova</dt><dd>{importSummary.members}</dd></div>
              <div><dt>Za pažnju</dt><dd>{importSummary.priorities}</dd></div>
              <div className="risk"><dt>Prihod pod rizikom</dt><dd>{euro(importSummary.riskRevenue)}</dd></div>
            </dl>
            <DialogFooter>
              <Button className="pulse-button" onClick={() => setImportSummary(null)}>Otvori pregled <ArrowRight /></Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="confirm-dialog">
          <DialogHeader><span className="confirm-icon"><RotateCcw /></span><DialogTitle>Resetovati demo?</DialogTitle><DialogDescription>Sve probne poruke, ishodi i obnove biće vraćeni na početno stanje. Ovo utiče samo na podatke u ovom pregledaču.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setResetOpen(false)}>Odustani</Button><Button className="pulse-button" onClick={resetDemo}>Resetuj i pripremi demo</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pilotOpen} onOpenChange={setPilotOpen}>
        <DialogContent className="pilot-dialog">
          <DialogHeader><Badge className="pilot-badge">PILOT SA VAŠIM PODACIMA</Badge><DialogTitle>Četiri polja su dovoljna za početak.</DialogTitle><DialogDescription>Ime, telefon, cijena članarine i datum isteka pretvaraju se u dnevnu listu prioriteta za kontakt.</DialogDescription></DialogHeader>
          <div className="pilot-steps"><div><span>01</span><p><strong>Uvezemo CSV</strong>Ime, telefon, cijena i datum isteka su dovoljni.</p></div><div><span>02</span><p><strong>PULSE računa status i prioritet</strong>Datum isteka određuje ko je aktivan, kome ističe u narednih 7 dana i kome je članarina već istekla.</p></div><div><span>03</span><p><strong>Tim bilježi akcije</strong>Kontakt, odgovor i obnova postoje tek kada ih tim zabilježi unutar PULSE-a.</p></div></div>
          <div className="pilot-note"><ShieldAlert /><span><strong>PULSE koristi samo podatke koje imate.</strong>Ne pretpostavlja istoriju dolazaka, plaćanja ili prethodnih obnova, a neispravan CSV neće zamijeniti postojeće podatke.</span></div>
          <DialogFooter><Button variant="outline" onClick={() => setPilotOpen(false)}>Zatvori</Button><Button className="pulse-button" onClick={() => { setPilotOpen(false); fileInputRef.current?.click(); }}><Upload /> Uvezi svoj CSV</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {onboardingOpen && <OnboardingExperience onStartDemo={startDemo} onImport={() => fileInputRef.current?.click()} />}
      {showImportProgress && importPhase !== 'idle' && <MicroLoadingState phase={importPhase} />}
      {success && <output className={`success-toast ${success.includes('obnovio članarinu') ? 'is-recovery' : ''}`} aria-live="polite"><CheckCircle2 /><span>{success}</span></output>}
      {importError && <output className="success-toast is-error" aria-live="assertive"><ShieldAlert /><span>{importError}</span></output>}
    </main>
  );
}

function OnboardingExperience({ onStartDemo, onImport }: { onStartDemo: () => void; onImport: () => void }) {
  return <section className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
    <div className="onboarding-card">
      <div className="onboarding-brand"><PulseLogo compact /><span>PULSE</span></div>
      <div className="onboarding-signal" aria-hidden="true"><i /><span /></div>
      <h1 id="onboarding-title">Vidite šta je pod rizikom. Znajte koga kontaktirati.</h1>
      <div className="onboarding-actions">
        <Button className="pulse-button" onClick={onStartDemo}>Pokreni demo <ArrowRight /></Button>
        <Button variant="outline" className="dark-outline" onClick={onImport}><Upload /> Uvezi svoj CSV</Button>
      </div>
      <small>Ime, telefon, cijena i datum isteka su dovoljni za pilot.</small>
    </div>
  </section>;
}

function MicroLoadingState({ phase }: { phase: Exclude<ImportPhase, 'idle'> }) {
  return <section className="micro-loading-overlay" role="status" aria-live="polite" aria-label="PULSE obrađuje CSV">
    <div className="micro-loading-card">
      <div className="micro-loading-brand">PULSE</div>
      <div className="micro-loading-signal" aria-hidden="true"><i /><span /></div>
      <strong>{phase === 'reading' ? 'Čitamo CSV' : 'Računamo prioritete'}</strong>
    </div>
  </section>;
}

function RenewalConfirmation({ name, amount }: RenewalReveal) {
  return <section className="renewal-confirmation" role="status" aria-live="polite">
    <div className="renewal-confirmation-mark"><Check /></div>
    <p className="eyebrow">OBNOVA EVIDENTIRANA</p>
    <h2>+{euro(amount)}</h2>
    <strong>{name}</strong>
  </section>;
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} aria-current={active ? 'page' : undefined} className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{typeof count === 'number' && <b>{count}</b>}</button>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="field"><span>{label}{required && ' *'}</span>{children}</label>;
}

function RecoveryLifecycle({ member }: { member: Member }) {
  const current = getRecoveryLifecycle(member);
  const steps = [['detected', 'Otkriveno'], ['contacted', 'Kontaktirano'], ['renewed', 'Obnovljeno']] as const;
  // A renewal can happen without confirmed outreach. Display each actual event independently.
  const recorded = {
    detected: true,
    contacted: Boolean(member.contactConfirmedAt),
    renewed: member.status === 'recovered',
  };
  return <ol className="recovery-lifecycle" aria-label="Tok u PULSE">{steps.map(([id, label]) => <li className={recorded[id] ? 'complete' : ''} aria-current={id === current ? 'step' : undefined} key={id}><i />{label}</li>)}</ol>;
}

function Dashboard({ metrics, recoveryActivity, highRiskMembers, signalCount, onOpenMember, onNavigate }: {
  metrics: ReturnType<typeof getPulseMetrics>;
  recoveryActivity: RecoveryActivity;
  highRiskMembers: Member[]; signalCount: number; onOpenMember: (member: Member) => void; onNavigate: (view: View) => void;
}) {
  const expiredValue = Math.min(metrics.actionableRevenue, metrics.riskRevenue);
  const expiringValue = Math.max(0, metrics.riskRevenue - expiredValue);
  const expiredShare = metrics.riskRevenue > 0 ? (expiredValue / metrics.riskRevenue) * 100 : 0;

  return <div className="screen-stack dashboard-screen">
    <section className="owner-hero" aria-labelledby="owner-risk-title">
      <div className="owner-hero-copy">
        <div className="risk-command-primary">
          <p className="eyebrow">PRIHOD POD RIZIKOM</p>
          <h2 id="owner-risk-title"><AnimatedCurrency value={metrics.riskRevenue} className="number-shift" /></h2>
          <div className="hero-priority-summary">
            <span className="priority-urgent"><i />{metrics.highRisk} hitno</span>
            <span className="priority-upcoming"><i />{metrics.expiring} za praćenje</span>
          </div>
        </div>
        <div className="risk-command-detail">
          <div className="risk-command-label">STRUKTURA RIZIKA</div>
          <div className="risk-command-breakdown">
            <div><span className="risk-legend-dot expired" /><span>Isteklo</span><strong>{euro(expiredValue)}</strong></div>
            <div><span className="risk-legend-dot expiring" /><span>Ističe za 7 dana</span><strong>{euro(expiringValue)}</strong></div>
          </div>
          <div className="risk-distribution" role="img" aria-label={`Istekle članarine ${euro(expiredValue)}, članarine koje ističu ${euro(expiringValue)}`}>
            {metrics.riskRevenue > 0 ? <>
              <span className="risk-distribution-expired" style={{ width: `${expiredShare}%` }} />
              <span className="risk-distribution-expiring" style={{ width: `${100 - expiredShare}%` }} />
            </> : <span className="risk-distribution-empty" />}
          </div>
          <button type="button" className="hero-link hero-primary-action" onClick={() => onNavigate('radar')}>
            Otvori {signalCount} prioriteta <ArrowRight />
          </button>
        </div>
      </div>
    </section>

    <section className="today-queue" aria-labelledby="priority-title">
      <header className="today-queue__header">
        <div className="today-queue__heading">
          <p className="eyebrow">DANAS</p>
          <h2 id="priority-title">Članovi za kontakt</h2>
        </div>
        <span className="today-queue__count"><strong>{highRiskMembers.length}</strong> već isteklo</span>
      </header>

      {highRiskMembers.length ? <div className="today-queue__list" role="list">
        <div className="today-queue__columns" aria-hidden="true">
          <span>Član</span>
          <span>Status</span>
          <span>Sljedeći potez</span>
          <span>Članarina</span>
          <span>Akcija</span>
        </div>

        {highRiskMembers.map((member) => <article className="today-queue__item" role="listitem" key={member.id}>
          <div className="today-queue__main">
            <div className="today-queue__member">
              <span className="avatar">{initials(member)}</span>
              <span>
                <strong>{fullName(member)}</strong>
                <small>{member.phone}</small>
              </span>
            </div>

            <div className="today-queue__risk">
              <span className={riskClass(member.risk)}><i />{membershipUrgencyLabel(member)}</span>
            </div>

            <div className="today-queue__reason">
              <small className="today-queue__mobile-label">Sljedeći potez</small>
              <p>{member.nextAction}</p>
            </div>

            <div className="today-queue__value">
              <small className="today-queue__mobile-label">Članarina</small>
              <strong>{euro(member.price)}</strong>
            </div>

            <button type="button" className="today-queue__action" onClick={() => onOpenMember(member)}>
              Kontaktiraj <ArrowRight />
            </button>
          </div>

          {(member.contactConfirmedAt || member.recoveryOutcome || member.status === 'recovered') && <div className="today-queue__rail"><RecoveryLifecycle member={member} /></div>}
        </article>)}
      </div> : <div className="today-queue__empty"><CheckCircle2 /><span><strong>Nema hitnih kontakata.</strong></span></div>}

      <footer className="today-queue__footer">
        <button type="button" className="text-button" onClick={() => onNavigate('radar')}>Svi prioriteti <ArrowRight /></button>
      </footer>
    </section>

    <section className="recovery-activity" aria-labelledby="activity-title">
      <div className="recovery-activity__heading">
        <h2 id="activity-title">Rezultat kontakata</h2>
        <span>Ukupno · ručno evidentirano</span>
      </div>
      {recoveryActivity.contacted || recoveryActivity.followUps || recoveryActivity.renewed ? <dl>
        <div><dt>Kontaktirano</dt><dd>{recoveryActivity.contacted}</dd></div>
        <div><dt>Za praćenje</dt><dd>{recoveryActivity.followUps}</dd></div>
        <div><dt>Obnovljeno</dt><dd>{recoveryActivity.renewed}</dd></div>
        <div className="positive"><dt>Evidentirani iznos obnove</dt><dd><AnimatedCurrency value={recoveryActivity.recoveredAmount} className="number-shift" /></dd></div>
      </dl> : <div className="recovery-zero-state"><strong>Još nema evidentiranih aktivnosti.</strong></div>}
    </section>
  </div>;
}

function StaffBoard({ members, onOpenMember, onContacted, onOutcome, onAddMember, onFindMember }: { members: Member[]; onOpenMember: (member: Member) => void; onContacted: (memberId: string) => void; onOutcome: (memberId: string, outcome: RecoveryOutcome) => void; onAddMember: () => void; onFindMember: () => void }) {
  const completed = members.filter((member) => (member.contactConfirmedAt && member.recoveryOutcome) || member.status === 'recovered').length;
  const followUps = members.filter((member) => member.contactConfirmedAt && member.recoveryOutcome === 'follow_up' && member.status !== 'recovered').length;
  return <div className="screen-stack staff-screen">
    <section className="reception-search-shell" aria-labelledby="reception-search-title">
      <button type="button" className="reception-search" onClick={onFindMember}><Search /><span><strong id="reception-search-title">Pronađi člana</strong><em>Ime ili telefon</em></span><ArrowRight /></button>
      <button type="button" className="reception-secondary" onClick={onAddMember}><Plus /> Dodaj člana</button>
      <dl className="staff-stats"><div><dt>Preostalo</dt><dd>{members.length - completed}</dd></div><div><dt>Završeno</dt><dd>{completed}</dd></div><div><dt>Praćenja</dt><dd>{followUps}</dd></div></dl>
    </section>
    <section className="staff-queue panel-card" id="staff-queue">
      <div className="section-heading"><div><h2>Kontakti</h2></div><span className="summary-count">{members.length - completed} preostalo</span></div>
      <div className="staff-task-list">{members.map((member, index) => <article className={`staff-task ${(member.contactConfirmedAt && member.recoveryOutcome) || member.status === 'recovered' ? 'completed' : ''}`} key={member.id}>
        <span className="task-priority">{String(index + 1).padStart(2, '0')}</span>
        <div className="task-person"><span className="avatar large">{initials(member)}</span><span><span className="task-name"><h3>{fullName(member)}</h3></span><small><Phone /> {member.phone} · {euro(member.price)}</small></span></div>
        <div className="task-reason" aria-label="Status"><p>{membershipUrgencyLabel(member)}</p></div>
        <div className="task-next" aria-label="Sljedeći potez"><p>{member.nextAction}</p></div>
        <div className="task-actions">
          {member.status === 'recovered'
            ? <span className="task-done"><CheckCircle2 /> Obnovljeno</span>
            : member.recoveryOutcome && member.contactConfirmedAt
              ? <><span className={`outcome-badge outcome-${member.recoveryOutcome}`}><Check /> {outcomeLabels[member.recoveryOutcome]}</span><button onClick={() => onOpenMember(member)}>Nastavi <ArrowRight /></button></>
              : member.contactConfirmedAt ? <>
                  <span className="task-contacted"><CheckCircle2 /> Kontakt potvrđen</span>
                  <div className="task-outcome-actions">
                    <button onClick={() => onOutcome(member.id, 'no_answer')}><Phone /> Bez odgovora</button>
                    <button onClick={() => onOutcome(member.id, 'replied')}><MessageCircle /> Odgovorio/la</button>
                    <button onClick={() => onOutcome(member.id, 'follow_up')}><Clock3 /> Prati sjutra</button>
                  </div>
                </>
                : member.queuedMessage ? <>
                    <span className="task-draft-ready"><CheckCircle2 /> Nacrt spreman</span>
                    <button className="task-primary" onClick={() => onContacted(member.id)}>Označi kao kontaktirano <ArrowRight /></button>
                  </>
                  : <button className="task-primary" onClick={() => onOpenMember(member)}>Kontaktiraj <ArrowRight /></button>}
        </div>
      </article>)}</div>
    </section>
  </div>;
}

function MembersScreen({ members, total, filter, search, onFilter, onSearch, onOpenMember, onImport }: {
  members: Member[]; total: number; filter: Filter; search: string; onFilter: (filter: Filter) => void; onSearch: (search: string) => void; onOpenMember: (member: Member) => void; onImport: () => void;
}) {
  return <div className="screen-stack">
    <section className="members-toolbar panel-card">
      <div className="search-box"><Search /><Input aria-label="Pretraži članove" placeholder="Pretraži ime ili telefon…" value={search} onChange={(event) => onSearch(event.target.value)} />{search && <button aria-label="Obriši pretragu" onClick={() => onSearch('')}><X /></button>}</div>
      <div className="filter-tabs" aria-label="Filtriraj članove">{filters.map((item) => <button type="button" aria-pressed={filter === item.id} className={filter === item.id ? 'active' : ''} key={item.id} onClick={() => onFilter(item.id)}>{item.label}</button>)}</div>
      <span className="result-count">{members.length === total ? `${total} članova` : `${members.length} od ${total}`}</span>
    </section>
    <section className="panel-card table-card">
      {members.length ? <>
        <div className="members-table-wrap"><table className="members-table">
          <thead><tr><th>Član</th><th>Članarina</th><th>Ističe</th><th>Vrijednost</th><th><span className="sr-only">Otvori</span></th></tr></thead>
          <tbody>{members.map((member, index) => <tr className="member-list-item" style={{ '--member-reveal-delay': getMemberRevealDelay(index, members.length) } as CSSProperties} key={member.id} onClick={() => onOpenMember(member)}>
            <td><div className="table-member"><span className="avatar">{initials(member)}</span><span><strong>{fullName(member)}</strong><small>{member.phone}</small></span></div></td>
            <td><span className={`status-pill ${statusClass(member.status)}`}>{membershipUrgencyLabel(member)}</span></td>
            <td>{prettyDate(member.endDate)}</td>
            <td><strong>{euro(member.price)}</strong></td>
            <td><button type="button" className="row-open-button" aria-label={`Otvori profil: ${fullName(member)}`} onClick={(event) => { event.stopPropagation(); onOpenMember(member); }}><ChevronRight /></button></td>
          </tr>)}</tbody>
        </table></div>
        <div className="mobile-member-list">{members.map((member, index) => <button type="button" className="mobile-member-card member-list-item" style={{ '--member-reveal-delay': getMemberRevealDelay(index, members.length) } as CSSProperties} key={member.id} onClick={() => onOpenMember(member)}><span className="avatar">{initials(member)}</span><span className="mobile-member-main"><span><strong>{fullName(member)}</strong><span className={`status-pill ${statusClass(member.status)}`}>{membershipUrgencyLabel(member)}</span></span><small>{member.phone}</small><span className="mobile-member-meta"><span><b>Ističe</b>{prettyDate(member.endDate)}</span><span><b>Cijena</b>{euro(member.price)}</span></span></span><ChevronRight /></button>)}</div>
      </> : <EmptyState icon={<Search />} title="Nema rezultata" text="Pokušajte drugi izraz ili uklonite aktivni filter." action="Uvezi članove iz CSV-a" onAction={onImport} />}
    </section>
  </div>;
}

function RadarScreen({ members, onOpenMember }: { members: Member[]; onOpenMember: (member: Member) => void }) {
  const priorityMembers = [...members].sort((a, b) => {
    const priorityDelta = (a.risk === 'high' ? 0 : 1) - (b.risk === 'high' ? 0 : 1);
    return priorityDelta || a.endDate.localeCompare(b.endDate);
  });
  const high = priorityMembers.filter((member) => member.risk === 'high');
  const medium = priorityMembers.filter((member) => member.risk === 'medium');
  return <div className="screen-stack radar-screen">
    <section className="radar-summary panel-card" aria-label="Sažetak prioriteta"><dl><div><dt>Ukupno</dt><dd>{priorityMembers.length}</dd></div><div className="high"><dt>Hitno</dt><dd>{high.length}</dd></div><div className="medium"><dt>Za praćenje</dt><dd>{medium.length}</dd></div></dl></section>
    <section className="risk-queue panel-card">
      <div className="section-heading"><div><h2>{priorityMembers.length} prioriteta</h2></div></div>
      {members.length ? <div className="risk-cards">{priorityMembers.map((member, index) => <article className={`risk-member-card ${member.risk === 'high' ? 'is-high' : ''}`} key={member.id}><span className="risk-order">{String(index + 1).padStart(2, '0')}</span><div className="risk-member-identity"><span className="avatar large">{initials(member)}</span><span><h3>{fullName(member)}</h3><span className={`status-pill ${statusClass(member.status)}`}>{membershipUrgencyLabel(member)}</span></span></div><div className="risk-next"><p>{member.nextAction}</p></div><div className="risk-value"><small>VRIJEDNOST</small><strong>{euro(member.price)}</strong></div><Button variant="outline" onClick={() => onOpenMember(member)}>Otvori <ChevronRight /></Button></article>)}</div> : <EmptyState icon={<CheckCircle2 />} title="Lista je čista" text="Nema članarina za prioritetnu akciju." />}
    </section>
  </div>;
}

function EmptyState({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p>{action && <Button variant="outline" onClick={onAction}>{action}</Button>}</div>;
}

function MemberProfile({ member, message, renewing, renewalAmount, onMessage, onCopy, onQueue, onHandoff, onContacted, onOutcome, onEdit, onRenew, onCancelRenew, onRenewalAmount, onMarkRenewed }: {
  member: Member; message: string; renewing: boolean; renewalAmount: string;
  onMessage: (message: string) => void; onCopy: () => Promise<boolean>; onQueue: () => void; onHandoff: () => void; onContacted: () => void; onOutcome: (outcome: RecoveryOutcome) => void; onEdit: () => void;
  onRenew: () => void; onCancelRenew: () => void; onRenewalAmount: (amount: string) => void; onMarkRenewed: (event: SyntheticEvent<HTMLFormElement>) => void;
}) {
  const [handoff, setHandoff] = useState<'sms' | 'viber' | 'whatsapp' | null>(null);
  const [viberCopied, setViberCopied] = useState(false);
  const whatsapp = whatsappLink(member.phone, message);
  const sms = smsLink(member.phone, message);
  const normalizedPhone = normalizePhone(member.phone);

  function openSms() {
    if (!sms) return;
    onHandoff();
    if (isMobileMessagingDevice(navigator.userAgent, navigator.maxTouchPoints)) {
      setHandoff('sms');
      window.location.href = sms;
    } else {
      setHandoff('sms');
    }
  }

  async function openViber() {
    if (!message.trim()) return;
    onHandoff();
    const copied = await onCopy();
    setViberCopied(copied);
    setHandoff('viber');
  }

  return <div className="profile-layout">
    <div className="profile-main">
      <DialogHeader className="profile-header"><div className="avatar profile-avatar">{initials(member)}</div><div><div className="profile-badges"><span className={`status-pill ${statusClass(member.status)}`}>{membershipUrgencyLabel(member)}</span></div><DialogTitle>{fullName(member)}</DialogTitle><DialogDescription>{member.phone} · {euro(member.price)}</DialogDescription></div></DialogHeader>
      <div className="profile-quick-actions"><Button variant="outline" onClick={onEdit}><Pencil /> Uredi podatke</Button></div>
    </div>
    <section className="profile-context">
      <section className={`profile-risk ${riskClass(member.risk)}`}>
        <div><h3>{member.risk === 'high' ? 'Članarina je istekla' : member.risk === 'medium' ? 'Članarina uskoro ističe' : 'Članarina je aktivna'}</h3></div>
        <details open={member.risk === 'high' ? true : undefined}><summary>Detalji</summary><dl><div><dt>Cijena</dt><dd>{euro(member.price)}</dd></div><div><dt>Ističe</dt><dd>{prettyDate(member.endDate)}</dd></div></dl><span>{member.nextAction}</span></details>
      </section>
      <section className="member-recovery-path" aria-labelledby="member-recovery-title"><p className="eyebrow" id="member-recovery-title">TOK</p><RecoveryLifecycle member={member} /></section>
      <p className="profile-basis-note">Prioritet koristi datum isteka i cijenu članarine.</p>
    </section>
    <aside className="recovery-panel">
      <div className="recovery-panel-title"><span><MessageCircle /></span><div><h2>Poruka</h2></div></div>
      <label className="message-field"><span>ZA {member.firstName.toLocaleUpperCase('me')}</span><Textarea value={message} onChange={(event) => onMessage(event.target.value)} rows={7} /></label>
      <div className="message-channel-title">OTVORI PORUKU</div>
      <div className="message-channel-actions">
        {whatsapp
          ? <a className="message-channel message-channel-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => { onHandoff(); setHandoff('whatsapp'); }}><MessageCircle />WhatsApp<ArrowRight /></a>
          : <button type="button" className="message-channel" disabled aria-label="WhatsApp nije dostupan: provjerite telefonski broj"><MessageCircle />WhatsApp</button>}
        <button type="button" className="message-channel" onClick={openSms} disabled={!sms}><Smartphone />SMS<ArrowRight /></button>
        <button type="button" className="message-channel" onClick={openViber} disabled={!message.trim()}><MessageCircle />Viber<ArrowRight /></button>
      </div>
      {!normalizedPhone && <p className="message-handoff-warning">Provjerite broj telefona u profilu da biste otvorili WhatsApp ili SMS.</p>}
      {handoff === 'sms' && sms && !isMobileMessagingDevice(navigator.userAgent, navigator.maxTouchPoints) && <section className="sms-handoff" aria-label="SMS preko telefona">
        <div className="sms-handoff-top"><strong>SMS preko telefona</strong><button type="button" aria-label="Zatvori QR prikaz" onClick={() => setHandoff(null)}><X /></button></div>
        <div className="sms-handoff-body">
          <SmsHandoffQr uri={sms} memberName={fullName(member)} />
          <div>
            <p>Skenirajte QR kod telefonom da otvorite SMS za <strong>{member.phone}</strong>.</p>
            <p className="message-handoff-secondary">Ako kamera ne prepoznaje SMS QR, kopirajte poruku i unesite broj ručno.</p>
            <a className="sms-open-on-device" href={sms}>Otvori SMS na ovom uređaju <ArrowRight /></a>
          </div>
        </div>
      </section>}
      {handoff === 'viber' && <section className="viber-handoff" aria-label="Poruka za Viber">
        <strong>{viberCopied ? 'Viber — poruka kopirana' : 'Viber — otvorite aplikaciju'}</strong>
        <p>Otvorite Viber, pronađite <strong>{member.phone}</strong> i {viberCopied ? 'nalijepite poruku' : 'kopirajte poruku ručno'}. Direktno otvaranje privatnog razgovora nije pouzdano na svim uređajima.</p>
        {normalizedPhone && <a href={`viber://chat?number=${encodeURIComponent(normalizedPhone)}`} className="sms-open-on-device">Pokušaj otvoriti Viber <ArrowRight /></a>}
      </section>}
      {handoff === 'whatsapp' && <p className="message-handoff-status">WhatsApp je otvoren u novoj kartici ili aplikaciji. Provjerite da je poruka poslata.</p>}
      <div className="message-actions">
        <Button variant="outline" className="dark-outline" onClick={onCopy} disabled={!message.trim()}><Copy /> Kopiraj</Button>
        <Button className="pulse-button" onClick={onQueue} disabled={!message.trim() || member.queuedMessage?.text === message.trim()}>{member.queuedMessage?.text === message.trim() ? <><Check /> Nacrt sačuvan</> : <><Send /> Sačuvaj nacrt</>}</Button>
      </div>
      <div className="fake-service-note"><ShieldAlert /> PULSE ne šalje poruke automatski. Pošaljite u aplikaciji, pa potvrdite kontakt.</div>
      {!member.contactConfirmedAt && member.status !== 'recovered' && <Button className="contact-confirm-button" onClick={onContacted}><CheckCircle2 /> Označi kao kontaktirano</Button>}
      {member.contactConfirmedAt && member.status !== 'recovered' && <>
        <div className="contact-confirmed-state"><CheckCircle2 /><span><strong>Kontakt potvrđen</strong>{member.contactConfirmedAt}</span></div>
        {!member.recoveryOutcome ? <div className="profile-outcome-actions" role="group" aria-label="Ishod kontakta">
          <button type="button" onClick={() => onOutcome('no_answer')}>Bez odgovora</button>
          <button type="button" onClick={() => onOutcome('replied')}>Odgovorio/la</button>
          <button type="button" onClick={() => onOutcome('follow_up')}>Prati sjutra</button>
        </div> : <span className="profile-outcome-confirmed"><CheckCircle2 />{outcomeLabels[member.recoveryOutcome]}</span>}
      </>}
      <div className="recovery-divider" aria-hidden="true" />
      {!renewing ? <Button variant="outline" className="renew-button" onClick={onRenew} disabled={member.status === 'recovered'}><CheckCircle2 /> {member.status === 'recovered' ? 'Već je obnovljeno' : t.actions.renew}</Button> : <form className="renew-form" onSubmit={onMarkRenewed}><div className="renew-label"><label htmlFor="renewal-amount">Iznos obnove</label><div className="amount-input"><Input id="renewal-amount" type="number" min="1" step="1" value={renewalAmount} onChange={(event) => onRenewalAmount(event.target.value)} /><span>€</span></div></div><div><Button type="button" variant="ghost" onClick={onCancelRenew}>Odustani</Button><Button type="submit" className="pulse-button"><Check /> Potvrdi obnovu</Button></div></form>}
    </aside>
  </div>;
}
