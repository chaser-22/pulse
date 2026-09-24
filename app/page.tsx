'use client';

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import {
  Activity, ArrowRight, Check, CheckCircle2,
  ChevronRight, CircleGauge, Clock3, CreditCard, FileSpreadsheet, History,
  LayoutDashboard, LogIn, Menu, MessageCircle, Pencil, Phone, Plus, Radar, Search,
  Moon, RotateCcw, Send, Settings2, ShieldAlert, Sparkles, Sun, Upload, Users, X, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageAtmosphere } from '@/components/page-atmosphere';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  copy, initialAutomations, initialMembers, occupancy,
  type Automation, type Channel, type Member, type MemberStatus, type RecoveryOutcome, type RiskLevel,
} from '@/lib/pulse-data';
import {
  getPulseMetrics,
  getRecoveryActivity,
  getRecoveryLifecycle,
  getRiskMembers,
  memberMatchesSearch,
  type RecoveryActivity,
} from '@/lib/pulse-logic';
import { getThemeClassName, getThemeColor, nextTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';

type View = 'dashboard' | 'staff' | 'members' | 'radar' | 'automations';
type Workspace = 'owner' | 'staff';
type Filter = 'all' | MemberStatus;
type MemberForm = Pick<Member, 'firstName' | 'lastName' | 'phone' | 'email' | 'birthday' | 'packageName' | 'price' | 'startDate' | 'endDate' | 'status' | 'preferredChannel'>;

const STORAGE_KEY = 'pulse-demo-gym-v1';
const BASE_METRICS = { active: 270, expiring: 13, absent: 23, recoveredCount: 12, recoveredRevenue: 445 };
const today = '2026-08-31';
const { me: t } = copy;

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Svi' }, { id: 'active', label: 'Aktivni' }, { id: 'expiring', label: 'Ističu' },
  { id: 'absent', label: 'Odsutni' }, { id: 'expired', label: 'Istekli' }, { id: 'recovered', label: 'Oporavljeni' },
];

const outcomeLabels: Record<RecoveryOutcome, string> = {
  no_answer: 'Bez odgovora',
  replied: 'Odgovorio/la',
  follow_up: 'Pratiti sjutra',
  declined: 'Ne želi obnovu',
};

const viewMeta: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: 'PONEDJELJAK, 31. AVGUST', title: 'Dobro jutro, Marko.', subtitle: 'Evo gdje je prihod u riziku i šta treba uraditi danas.' },
  staff: { eyebrow: 'RADNI PROSTOR RECEPCIJE', title: 'Danas na recepciji', subtitle: 'Prijavite dolaske, dodajte članove i završite kontakte koji su prioritet danas.' },
  members: { eyebrow: 'BAZA ČLANOVA', title: 'Članovi', subtitle: 'Pronađite, ažurirajte i kontaktirajte svakog člana na jednom mjestu.' },
  radar: { eyebrow: 'RANI SIGNALI ODLASKA', title: 'Churn Radar', subtitle: 'Jasan prioritet, razlog rizika i sljedeći najbolji potez.' },
  automations: { eyebrow: 'DOSLJEDAN KONTAKT', title: 'Automatizacije', subtitle: 'Prave poruke u pravom trenutku — za sada samo u redu za slanje.' },
};

function euro(value: number) {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value)} €`;
}

function prettyDate(value: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}.`;
}

function initials(member: Member) {
  return `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`;
}

function fullName(member: Member) {
  return `${member.firstName} ${member.lastName}`;
}

function newMessage(member: Member) {
  if (member.status === 'expired') return `Zdravo ${member.firstName}, primijetili smo da je tvoja članarina istekla. Ako želiš da nastaviš, javi nam i pripremićemo obnovu prije tvog sljedećeg dolaska.`;
  if (member.status === 'expiring') return `Zdravo ${member.firstName}, samo mali podsjetnik: tvoja članarina ističe ${prettyDate(member.endDate)} Javi nam ako želiš da je produžimo. — PULSE Demo Gym`;
  return `Zdravo ${member.firstName}, nedostaješ nam u teretani. Da li ti raspored treninga i dalje odgovara? Tu smo da pomognemo da se vratiš u ritam.`;
}

function riskClass(risk: RiskLevel) {
  return risk === 'high' ? 'risk-high' : risk === 'medium' ? 'risk-medium' : 'risk-low';
}

function statusClass(status: MemberStatus) {
  if (status === 'expired') return 'status-expired';
  if (status === 'recovered') return 'status-recovered';
  if (status === 'expiring') return 'status-expiring';
  if (status === 'absent') return 'status-absent';
  return 'status-active';
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
  return {
    firstName: '', lastName: '', phone: '+382 ', email: '', birthday: '', packageName: 'Standard', price: 35,
    startDate: today, endDate: '2026-09-30', status: 'active', preferredChannel: 'WhatsApp',
  };
}

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [workspace, setWorkspace] = useState<Workspace>('owner');
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
  const [ready, setReady] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<Channel>('WhatsApp');
  const [message, setMessage] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewalAmount, setRenewalAmount] = useState('35');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(blankMemberForm());
  const [automationPreviewId, setAutomationPreviewId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [pilotOpen, setPilotOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const [recoveryPulse, setRecoveryPulse] = useState(0);
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.classList.contains('light') ? 'light' : 'dark');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleTheme() {
    const next = nextTheme(theme);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(getThemeClassName(next));
    root.style.colorScheme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getThemeColor(next));
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setTheme(next);
  }

  useEffect(() => {
    let storedMembers: Member[] | undefined;
    let storedAutomations: Automation[] | undefined;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { members?: Member[]; automations?: Automation[] };
        if (parsed.members?.length) storedMembers = parsed.members;
        if (parsed.automations?.length) storedAutomations = parsed.automations;
      }
    } catch {
      // A corrupt local demo snapshot should never prevent the prototype from loading.
    }
    const timer = window.setTimeout(() => {
      if (storedMembers) setMembers(storedMembers);
      if (storedAutomations) setAutomations(storedAutomations);
      setReady(true);
    }, 360);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ members, automations }));
  }, [members, automations, ready]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(''), 3200);
    return () => window.clearTimeout(timer);
  }, [success]);

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null;

  const riskMembers = useMemo(() => getRiskMembers(members), [members]);
  const highRiskMembers = useMemo(() => riskMembers.filter((member) => member.risk === 'high'), [riskMembers]);
  const metrics = useMemo(() => getPulseMetrics(members, BASE_METRICS), [members]);
  const recoveryActivity = useMemo(() => getRecoveryActivity(members), [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesFilter = filter === 'all' || member.status === filter;
      return matchesFilter && memberMatchesSearch(member, search);
    });
  }, [members, filter, search]);

  function goTo(nextView: View) {
    setView(nextView);
    setMobileNav(false);
  }

  function switchWorkspace(nextWorkspace: Workspace) {
    setWorkspace(nextWorkspace);
    setView(nextWorkspace === 'owner' ? 'dashboard' : 'staff');
    setMobileNav(false);
  }

  function recordOutcome(memberId: string, outcome: RecoveryOutcome) {
    const member = members.find((item) => item.id === memberId);
    if (!member) return;
    setMembers((current) => current.map((item) => item.id === memberId ? {
      ...item,
      recoveryOutcome: outcome,
      followUpAt: outcome === 'follow_up' ? 'Sjutra u 10:00' : undefined,
    } : item));
    setSuccess(`${fullName(member)}: ${outcomeLabels[outcome]}.`);
  }

  function resetDemo() {
    setMembers(initialMembers);
    setAutomations(initialAutomations);
    setWorkspace('owner');
    setView('dashboard');
    setSelectedMemberId(null);
    setFilter('all');
    setSearch('');
    setRecoveryPulse(0);
    setResetOpen(false);
    setSuccess('Demo je vraćen na početne podatke i spreman je za novu prezentaciju.');
  }

  function openMember(member: Member) {
    setSelectedMemberId(member.id);
    setChannel(member.preferredChannel);
    setMessage(member.queuedMessage?.text ?? newMessage(member));
    setRenewalAmount(String(member.price));
    setRenewing(false);
  }

  function queueMessage() {
    if (!selectedMember || !message.trim()) return;
    setMembers((current) => current.map((member) => member.id === selectedMember.id ? {
      ...member, preferredChannel: channel, queuedMessage: { channel, text: message.trim(), queuedAt: 'Danas u 10:42' },
    } : member));
    setSuccess(`Poruka za ${selectedMember.firstName} je stavljena u red za ${channel}.`);
  }

  function markRenewed(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    const amount = Number(renewalAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const memberName = fullName(selectedMember);
    setMembers((current) => current.map((member) => member.id === selectedMember.id ? {
      ...member,
      status: 'recovered', risk: 'low', price: amount, recoveredAmount: amount, recoveredAt: today,
      startDate: today, endDate: '2026-09-30', riskReason: `Članarina obnovljena ${prettyDate(today)} uz pomoć PULSE recovery toka.`,
      nextAction: 'Pozdravite člana pri sljedećem dolasku i pratite aktivnost naredne dvije sedmice.',
      payments: [{ date: today, amount, method: 'Evidentirano u PULSE', note: 'Obnovljena članarina' }, ...member.payments],
    } : member));
    setRecoveryPulse((current) => current + 1);
    setSuccess(`${memberName} je oporavljen. ${euro(amount)} je dodato oporavljenom prihodu.`);
    setSelectedMemberId(null);
    setRenewing(false);
    setView('dashboard');
  }

  function simulateCheckin() {
    if (!selectedMember) return;
    const memberName = fullName(selectedMember);
    setMembers((current) => current.map((member) => member.id === selectedMember.id ? {
      ...member, lastVisit: today, visitsThisMonth: member.visitsThisMonth + 1,
      attendance: [{ date: today, time: '10:38' }, ...member.attendance],
      status: member.status === 'absent' ? 'active' : member.status,
      risk: member.status === 'absent' ? 'low' : member.risk,
      riskReason: member.status === 'absent' ? 'Novi dolazak je evidentiran. Rizik je smanjen i aktivnost se prati narednih 14 dana.' : member.riskReason,
      nextAction: member.status === 'absent' ? 'Nije potrebna hitna akcija; pratite kontinuitet dolazaka.' : member.nextAction,
    } : member));
    setSuccess(`Dolazak za ${memberName} je evidentiran u 10:38.`);
  }

  function openMemberForm(member?: Member) {
    if (member) {
      setEditingId(member.id);
      setMemberForm({
        firstName: member.firstName, lastName: member.lastName, phone: member.phone, email: member.email,
        birthday: member.birthday, packageName: member.packageName, price: member.price, startDate: member.startDate,
        endDate: member.endDate, status: member.status, preferredChannel: member.preferredChannel,
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
    if (!memberForm.firstName.trim() || !memberForm.lastName.trim()) return;
    if (editingId) {
      setMembers((current) => current.map((member) => member.id === editingId ? { ...member, ...memberForm, price: Number(memberForm.price) } : member));
      setSuccess('Podaci o članu su sačuvani.');
    } else {
      const id = `${memberForm.firstName}-${memberForm.lastName}-${Date.now()}`.toLocaleLowerCase('me').replace(/\s+/g, '-');
      const created: Member = {
        ...memberForm, id, price: Number(memberForm.price), risk: memberForm.status === 'expired' ? 'high' : memberForm.status === 'expiring' || memberForm.status === 'absent' ? 'medium' : 'low',
        lastVisit: '—', visitsThisMonth: 0,
        riskReason: memberForm.status === 'expired' ? 'Dodati član ima isteklu članarinu.' : 'Nema dovoljno istorije za procjenu rizika.',
        nextAction: memberForm.status === 'expired' ? 'Pošaljite poruku za obnovu.' : 'Pratite prve dolaske.', attendance: [], payments: [],
      };
      setMembers((current) => [created, ...current]);
      setSuccess(`${created.firstName} ${created.lastName} je dodat/a u bazu.`);
    }
    setFormOpen(false);
  }

  function importCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result.trim() : '';
      const rows = text.split(/\r?\n/).filter(Boolean);
      if (rows.length < 2) {
        setSuccess('CSV nema redove za uvoz. Očekuju se zaglavlje i najmanje jedan član.');
        return;
      }
      const headers = rows[0].split(',').map((header) => header.trim().toLowerCase());
      const imported: Member[] = rows.slice(1).map((row, index) => {
        const cells = row.split(',').map((cell) => cell.trim());
        const value = (key: string) => cells[headers.indexOf(key)] ?? '';
        const statusCandidate = value('status') as MemberStatus;
        const status: MemberStatus = ['active','expiring','absent','expired','recovered'].includes(statusCandidate) ? statusCandidate : 'active';
        const price = Number(value('price')) || 35;
        const risk: RiskLevel = status === 'expired' ? 'high' : status === 'expiring' || status === 'absent' ? 'medium' : 'low';
        return {
          id: `csv-${Date.now()}-${index}`, firstName: value('firstname') || value('ime') || 'Novi', lastName: value('lastname') || value('prezime') || `Član ${index + 1}`,
          phone: value('phone') || value('telefon') || '+382 6X XXX XXX', email: value('email') || 'nije-unijeto@example.test', birthday: value('birthday') || '',
          status, risk, packageName: value('package') || 'Standard', price, startDate: value('startdate') || today, endDate: value('enddate') || '2026-09-30',
          lastVisit: value('lastvisit') || '—', visitsThisMonth: 0, preferredChannel: 'WhatsApp', attendance: [], payments: [],
          riskReason: risk === 'high' ? 'Uvezeni član ima isteklu članarinu.' : risk === 'medium' ? 'Uvezeni podaci ukazuju da član traži pažnju.' : 'Nema aktivnih signala rizika.',
          nextAction: risk === 'low' ? 'Nije potrebna akcija.' : 'Provjerite podatke i kontaktirajte člana.',
        };
      });
      setMembers((current) => [...imported, ...current]);
      setSuccess(`Uvezeno je ${imported.length} ${imported.length === 1 ? 'član' : 'člana'} iz CSV fajla.`);
    };
    reader.readAsText(file);
  }

  if (!ready) return <LoadingState />;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand"><PulseLogo /><span className="brand-word">PULSE</span></div>
        <button className="sidebar-close" aria-label="Zatvori meni" onClick={() => setMobileNav(false)}><X /></button>
        <nav aria-label="Glavna navigacija">
          {workspace === 'owner' ? <>
          <NavButton active={view === 'dashboard'} icon={<LayoutDashboard />} label="Vlasnički pregled" onClick={() => goTo('dashboard')} />
          <NavButton active={view === 'members'} icon={<Users />} label={t.nav.members} count={members.length} onClick={() => goTo('members')} />
          <NavButton active={view === 'radar'} icon={<Radar />} label={t.nav.radar} count={riskMembers.length} onClick={() => goTo('radar')} />
          <NavButton active={view === 'automations'} icon={<Zap />} label={t.nav.automations} onClick={() => goTo('automations')} />
          </> : <>
          <NavButton active={view === 'staff'} icon={<CheckCircle2 />} label="Dnevni pregled" count={riskMembers.length} onClick={() => goTo('staff')} />
          <NavButton active={view === 'members'} icon={<Users />} label={t.nav.members} count={members.length} onClick={() => goTo('members')} />
          <NavButton active={view === 'radar'} icon={<Radar />} label="Signali rizika" count={riskMembers.length} onClick={() => goTo('radar')} />
          </>}
        </nav>
        <div className={`sidebar-insight ${workspace === 'staff' ? 'reception-insight' : ''}`}>
          <span className="pulse-dot" />
          {workspace === 'owner' ? <div><strong>{euro(metrics.recoveredRevenue)}</strong><small>oporavljeno ovog mjeseca</small></div> : <div><strong>{riskMembers.filter((member) => !member.recoveryOutcome).length}</strong><small>zadataka preostalo danas</small></div>}
        </div>
        {workspace === 'owner' && <button className="demo-reset-button" onClick={() => setResetOpen(true)}><RotateCcw /> Resetuj demo</button>}
        <div className="gym-card"><span className="gym-monogram">PD</span><span><strong>{t.gymName}</strong><small>{t.location} · Demo podaci</small></span><Settings2 /></div>
      </aside>

      {mobileNav && <button className="nav-backdrop" aria-label="Zatvori meni" onClick={() => setMobileNav(false)} />}

      <section className="main-panel">
        <PageAtmosphere view={view} workspace={workspace} recoveryPulse={recoveryPulse} signalCount={riskMembers.length} />
        <header className="topbar">
          <button className="mobile-menu" aria-label="Otvori meni" onClick={() => setMobileNav(true)}><Menu /></button>
          <div className="page-title"><p className="eyebrow">{viewMeta[view].eyebrow}</p><h1>{viewMeta[view].title}</h1><p>{viewMeta[view].subtitle}</p></div>
          <div className="top-actions">
            <button type="button" className="theme-toggle" aria-label={theme === 'dark' ? 'Uključi svijetlu temu' : 'Uključi tamnu temu'} title={theme === 'dark' ? 'Svijetla tema' : 'Tamna tema'} aria-pressed={theme === 'light'} onClick={toggleTheme}>
              <span className="theme-toggle-glow" aria-hidden="true" /><Sun className="theme-sun" aria-hidden="true" /><Moon className="theme-moon" aria-hidden="true" />
            </button>
            <fieldset className="workspace-switch"><legend className="sr-only">Izaberite radni prostor</legend><button type="button" aria-pressed={workspace === 'owner'} className={workspace === 'owner' ? 'active' : ''} onClick={() => switchWorkspace('owner')}><LayoutDashboard /> Vlasnik</button><button type="button" aria-pressed={workspace === 'staff'} className={workspace === 'staff' ? 'active' : ''} onClick={() => switchWorkspace('staff')}><Users /> Recepcija</button></fieldset>
            {workspace === 'owner' && view === 'members' && <Button variant="outline" className="dark-outline" onClick={() => fileInputRef.current?.click()}><Upload /> {t.actions.import}</Button>}
            <Button className="pulse-button" onClick={() => openMemberForm()}><Plus /> {t.actions.add}</Button>
          </div>
          <input ref={fileInputRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) importCsv(file); event.target.value = ''; }} />
        </header>

        {view === 'dashboard' && <Dashboard metrics={metrics} recoveryActivity={recoveryActivity} highRiskMembers={highRiskMembers} members={members} recoveryPulse={recoveryPulse} signalCount={riskMembers.length} onOpenMember={openMember} onNavigate={goTo} onPilot={() => setPilotOpen(true)} />}
        {view === 'staff' && <StaffBoard members={riskMembers} onOpenMember={openMember} onOutcome={recordOutcome} onAddMember={() => openMemberForm()} onFindMember={() => goTo('members')} />}
        {view === 'members' && <MembersScreen members={filteredMembers} total={members.length} filter={filter} search={search} onFilter={setFilter} onSearch={setSearch} onOpenMember={openMember} onImport={() => fileInputRef.current?.click()} />}
        {view === 'radar' && <RadarScreen members={riskMembers} onOpenMember={openMember} />}
        {view === 'automations' && <AutomationsScreen automations={automations} onToggle={(id, enabled) => { setAutomations((current) => current.map((item) => item.id === id ? { ...item, enabled, lastActivity: enabled ? 'Uključeno upravo sada' : 'Pauzirano upravo sada' } : item)); setSuccess(enabled ? 'Automatizacija je uključena.' : 'Automatizacija je pauzirana.'); }} onPreview={setAutomationPreviewId} />}
      </section>

      <Dialog open={Boolean(selectedMember)} onOpenChange={(open) => { if (!open) setSelectedMemberId(null); }}>
        <DialogContent className="member-dialog" showCloseButton>
          {selectedMember && (
            <MemberProfile
              member={selectedMember} channel={channel} message={message} renewing={renewing} renewalAmount={renewalAmount}
              onChannel={setChannel} onMessage={setMessage} onQueue={queueMessage} onCheckin={simulateCheckin}
              onEdit={() => openMemberForm(selectedMember)} onRenew={() => setRenewing(true)} onCancelRenew={() => setRenewing(false)}
              onRenewalAmount={setRenewalAmount} onMarkRenewed={markRenewed}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="form-dialog">
          <DialogHeader><DialogTitle>{editingId ? 'Uredi člana' : 'Dodaj novog člana'}</DialogTitle><DialogDescription>Demo podaci ostaju samo u ovom pregledaču.</DialogDescription></DialogHeader>
          <form onSubmit={saveMember} className="member-form">
            <div className="form-grid">
              <Field label="Ime" required><Input value={memberForm.firstName} onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })} /></Field>
              <Field label="Prezime" required><Input value={memberForm.lastName} onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })} /></Field>
              <Field label="Telefon"><Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} /></Field>
              <Field label="E-mail"><Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} /></Field>
              <Field label="Paket"><select className="select-input" value={memberForm.packageName} onChange={(e) => setMemberForm({ ...memberForm, packageName: e.target.value })}><option>Standard</option><option>Plus</option><option>Neograničeno</option></select></Field>
              <Field label="Mjesečna cijena"><div className="amount-input"><Input type="number" min="1" value={memberForm.price} onChange={(e) => setMemberForm({ ...memberForm, price: Number(e.target.value) })} /><span>€</span></div></Field>
              <Field label="Početak"><Input type="date" value={memberForm.startDate} onChange={(e) => setMemberForm({ ...memberForm, startDate: e.target.value })} /></Field>
              <Field label="Ističe"><Input type="date" value={memberForm.endDate} onChange={(e) => setMemberForm({ ...memberForm, endDate: e.target.value })} /></Field>
              <Field label="Status"><select className="select-input" value={memberForm.status} onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value as MemberStatus })}>{Object.entries(t.statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
              <Field label="Preferirani kanal"><select className="select-input" value={memberForm.preferredChannel} onChange={(e) => setMemberForm({ ...memberForm, preferredChannel: e.target.value as Channel })}><option>WhatsApp</option><option>Viber</option><option>SMS</option></select></Field>
            </div>
            <DialogFooter className="form-footer"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Odustani</Button><Button type="submit" className="pulse-button">{editingId ? 'Sačuvaj izmjene' : 'Dodaj člana'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(automationPreviewId)} onOpenChange={(open) => { if (!open) setAutomationPreviewId(null); }}>
        <DialogContent className="automation-dialog">
          {(() => { const automation = automations.find((item) => item.id === automationPreviewId); if (!automation) return null; return <>
            <DialogHeader><DialogTitle>{automation.title}</DialogTitle><DialogDescription>{automation.trigger} · {automation.audience}</DialogDescription></DialogHeader>
            <div className="preview-phone"><div className="preview-phone-top"><span>{automation.channel}</span><span>10:42</span></div><div className="message-bubble">{automation.message.replace('{{ime}}', 'Miloš').replace('{{datum}}', '03.09.2026.')}</div><small>Pregled — poruka neće biti stvarno poslata</small></div>
            <div className="activity-note"><History /><span><strong>Posljednja aktivnost</strong>{automation.lastActivity}</span></div>
            <DialogFooter><Button onClick={() => { setAutomationPreviewId(null); setSuccess('Pregled zatvoren. Nijedna poruka nije poslata.'); }} className="pulse-button">U redu</Button></DialogFooter>
          </>; })()}
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="confirm-dialog">
          <DialogHeader><span className="confirm-icon"><RotateCcw /></span><DialogTitle>Resetovati demo?</DialogTitle><DialogDescription>Sve probne poruke, ishodi, dolasci i obnove biće vraćeni na početno stanje. Ovo utiče samo na podatke u ovom pregledaču.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setResetOpen(false)}>Odustani</Button><Button className="pulse-button" onClick={resetDemo}>Resetuj i pripremi demo</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pilotOpen} onOpenChange={setPilotOpen}>
        <DialogContent className="pilot-dialog">
          <DialogHeader><Badge className="pilot-badge">PILOT SA VAŠIM PODACIMA</Badge><DialogTitle>Provjerite koliko prihoda PULSE može vratiti vašoj teretani.</DialogTitle><DialogDescription>Za početak je dovoljan jednostavan Excel ili CSV spisak. Nije potrebna promjena postojećeg sistema.</DialogDescription></DialogHeader>
          <div className="pilot-steps"><div><span>01</span><p><strong>Uvezemo članove</strong>Ime, datum isteka, posljednji dolazak i cijena članarine.</p></div><div><span>02</span><p><strong>PULSE označava rizik</strong>Dobijate prioritetnu listu i jasan razlog za svakog člana.</p></div><div><span>03</span><p><strong>Mjerimo rezultat</strong>Pratimo kontakt, odgovor, obnovu i stvarno oporavljeni prihod.</p></div></div>
          <div className="pilot-note"><ShieldAlert /><span><strong>Vaši podaci ostaju pod vašom kontrolom.</strong>Za demonstraciju nijesu potrebne stvarne poruke niti integracije.</span></div>
          <DialogFooter><Button variant="outline" onClick={() => setPilotOpen(false)}>Zatvori</Button><Button className="pulse-button" onClick={() => { setPilotOpen(false); setView('members'); setWorkspace('owner'); setSuccess('Otvoren je ekran za uvoz članova iz CSV-a.'); }}><Upload /> Pogledaj kako izgleda uvoz</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {success && <output className={`success-toast ${success.includes('oporavljen') ? 'is-recovery' : ''}`} aria-live="polite"><CheckCircle2 /><span>{success}</span></output>}
    </main>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} aria-current={active ? 'page' : undefined} className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{typeof count === 'number' && <b>{count}</b>}</button>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="field"><span>{label}{required && ' *'}</span>{children}</label>;
}

function LoadingState() {
  return <main className="loading-shell"><aside><div className="skeleton logo" />{[1,2,3,4].map((item) => <div className="skeleton nav" key={item} />)}</aside><section><div className="skeleton title" /><div className="loading-grid"><div className="skeleton large" /><div className="skeleton large" /></div><div className="loading-stats">{[1,2,3,4].map((item) => <div className="skeleton stat" key={item} />)}</div></section><div className="loading-label"><span className="loader-ring" />Učitavanje PULSE podataka…</div></main>;
}

function RecoveryLifecycle({ member }: { member: Member }) {
  const current = getRecoveryLifecycle(member);
  const steps = [['detected', 'Otkriveno'], ['contacted', 'Kontaktirano'], ['renewed', 'Obnovljeno']] as const;
  const currentIndex = steps.findIndex(([id]) => id === current);
  return <ol className="recovery-lifecycle" aria-label="Status oporavka">{steps.map(([id, label], index) => <li className={index <= currentIndex ? 'complete' : ''} aria-current={id === current ? 'step' : undefined} key={id}><i />{label}</li>)}</ol>;
}

function Dashboard({ metrics, recoveryActivity, highRiskMembers, recoveryPulse, signalCount, onOpenMember, onNavigate, onPilot }: {
  metrics: ReturnType<typeof getPulseMetrics>;
  recoveryActivity: RecoveryActivity;
  highRiskMembers: Member[]; members: Member[]; recoveryPulse: number; signalCount: number; onOpenMember: (member: Member) => void; onNavigate: (view: View) => void; onPilot: () => void;
}) {
  const collectedRevenue = 10320 + metrics.recoveredRevenue;
  const monthlyTarget = 12500;
  const targetProgress = Math.min(100, (collectedRevenue / monthlyTarget) * 100);
  return <div className="screen-stack dashboard-screen">
    <section className="owner-hero" aria-labelledby="owner-risk-title">
      <div className="owner-hero-copy">
        <p className="eyebrow">PRIHOD U RIZIKU</p>
        <h2 id="owner-risk-title">{euro(metrics.riskRevenue)}</h2>
        <p className="hero-statement">zahtijeva tvoju pažnju</p>
        <p className="actionable-copy">Od toga je <strong>{euro(metrics.actionableRevenue)}</strong> vezano za članove visokog prioriteta koje možeš kontaktirati danas.</p>
        <button type="button" className="hero-link" onClick={() => onNavigate('radar')}>Pogledaj članove <ArrowRight /></button>
        <dl className="hero-outcomes">
          <div><dt>Oporavljeno</dt><dd className="number-shift" key={metrics.recoveredRevenue}>{euro(metrics.recoveredRevenue)}</dd></div>
          <div><dt>Obnovljeni članovi</dt><dd>{metrics.recoveredCount}</dd></div>
        </dl>
      </div>
      <div className="signal-stage"><PageAtmosphere view="dashboard" workspace="owner" recoveryPulse={recoveryPulse} signalCount={signalCount} /></div>
    </section>

    <section className="priority-queue" aria-labelledby="priority-title">
      <div className="section-heading"><div><p className="eyebrow">DANAS</p><h2 id="priority-title">Danas — članovi koji trebaju pažnju</h2></div><span className="summary-count">{highRiskMembers.length} visoki prioritet</span></div>
      {highRiskMembers.length ? <div className="priority-list">{highRiskMembers.map((member) => <article className="priority-row" key={member.id}>
        <div className="priority-person"><span className="avatar">{initials(member)}</span><span><strong>{fullName(member)}</strong><small>{member.packageName}</small></span></div>
        <span className={`risk-label ${riskClass(member.risk)}`}>{member.risk === 'high' ? 'Visok rizik' : 'Srednji rizik'}</span>
        <p className="priority-reason">{member.riskReason}</p>
        <strong className="priority-value">{euro(member.price)}</strong>
        <button type="button" className="priority-action" onClick={() => onOpenMember(member)}>Kontaktiraj <ArrowRight /></button>
        <details className="risk-disclosure"><summary>Zašto?</summary><div><p>{member.riskReason}</p><span><strong>Preporučeni potez</strong>{member.nextAction}</span><span><strong>Članarina ističe</strong>{prettyDate(member.endDate)}</span></div></details>
        <RecoveryLifecycle member={member} />
      </article>)}</div> : <div className="priority-empty"><CheckCircle2 /><span><strong>Danas nema članova visokog prioriteta.</strong><small>Pregledajte sve aktivne signale u Churn Radaru.</small></span></div>}
      <button type="button" className="text-button" onClick={() => onNavigate('radar')}>Prikaži sve rizične članove <ArrowRight /></button>
    </section>

    <section className="recovery-activity" aria-labelledby="activity-title">
      <div><p className="eyebrow">AKTIVNOST OPORAVKA</p><h2 id="activity-title">Šta se promijenilo u ovom pregledu?</h2></div>
      <dl>
        <div><dt>Kontaktirano</dt><dd>{recoveryActivity.contacted}</dd></div>
        <div><dt>Za praćenje</dt><dd>{recoveryActivity.followUps}</dd></div>
        <div><dt>Obnovljeno</dt><dd>{recoveryActivity.renewed}</dd></div>
        <div className="positive"><dt>Oporavljeni iznos</dt><dd>{euro(recoveryActivity.recoveredAmount)}</dd></div>
      </dl>
    </section>

    <section className="owner-metrics panel-card" aria-label="Ključne operativne metrike">
      <Metric label="Aktivni članovi" value={String(metrics.active)} hint="+8 ovog mjeseca" />
      <Metric label="Ističe za 7 dana" value={String(metrics.expiring)} hint="6 nije kontaktirano" tone="warning" />
      <Metric label="Odsutni 14+ dana" value={String(metrics.absent)} hint="4 nova signala" tone="warning" />
      <Metric label="Visoki rizik" value={String(metrics.highRisk)} hint="akcija danas" tone="danger" />
      <Metric label="Obnovljeni" value={String(metrics.recoveredCount)} hint="ovog mjeseca" tone="success" />
      <Metric label="Oporavljen prihod" value={euro(metrics.recoveredRevenue)} hint="ovog mjeseca" tone="success" />
    </section>

    <div className="lower-grid">
      <section className="revenue-overview panel-card" aria-label="Finansijski pregled ovog mjeseca">
        <div className="revenue-total">
          <div className="revenue-title-row"><p className="eyebrow">NAPLAĆENO OVOG MJESECA</p><span className="period-label">Avgust 2026.</span></div>
          <strong>{euro(collectedRevenue)}</strong>
          <p><span>+8,4%</span> u odnosu na jul</p>
          <div className="revenue-progress-copy"><span>{Math.round(targetProgress)}% mjesečnog cilja</span><b>Cilj {euro(monthlyTarget)}</b></div>
          <div className="revenue-progress"><span style={{ width: `${targetProgress}%` }} /></div>
        </div>
        <RevenueTrend collectedRevenue={collectedRevenue} />
        <div className="revenue-breakdown">
          <div><span className="breakdown-dot memberships" /><p><small>Redovne članarine</small><strong>{euro(9500)}</strong></p></div>
          <div><span className="breakdown-dot recovered" /><p><small>PULSE oporavak</small><strong>{euro(metrics.recoveredRevenue)}</strong></p></div>
          <div><span className="breakdown-dot other" /><p><small>Dnevne karte i ostalo</small><strong>{euro(820)}</strong></p></div>
        </div>
      </section>
      <section className="panel-card occupancy-card">
        <div className="section-heading"><div><p className="eyebrow">DANAS</p><h2>Popunjenost teretane po satu</h2></div><span className="chart-legend"><i /> Broj dolazaka</span></div>
        <p className="occupancy-insight"><strong>Najveća gužva je danas od 18:00–20:00.</strong> Pojačajte recepciju i članovima preporučite mirniji termin prije 16:00.</p>
        <div className="chart-wrap">
          <div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
          <div className="bar-chart">{occupancy.map((item) => <div className={`bar-slot ${item.value > 78 ? 'peak' : ''}`} key={item.hour}><div className="bar" style={{ height: `${item.value}%` }}><span>{item.value}</span></div><small>{item.hour}</small></div>)}</div>
        </div>
      </section>
    </div>
    <section className="pilot-footer"><div><strong>Spremni za pilot sa stvarnim podacima?</strong><span>Za početak je dovoljan Excel ili CSV spisak članova.</span></div><Button variant="outline" onClick={onPilot}>Pogledaj pilot proces <ArrowRight /></Button></section>
  </div>;
}

function StaffBoard({ members, onOpenMember, onOutcome, onAddMember, onFindMember }: { members: Member[]; onOpenMember: (member: Member) => void; onOutcome: (memberId: string, outcome: RecoveryOutcome) => void; onAddMember: () => void; onFindMember: () => void }) {
  const completed = members.filter((member) => member.recoveryOutcome || member.queuedMessage).length;
  const followUps = members.filter((member) => member.recoveryOutcome === 'follow_up').length;
  return <div className="screen-stack staff-screen">
    <section className="reception-search-shell" aria-labelledby="reception-search-title">
      <button type="button" className="reception-search" onClick={onFindMember}><Search /><span><small>NAJBRŽA AKCIJA</small><strong id="reception-search-title">Pronađi člana</strong><em>Ime, telefon ili e-mail</em></span><ArrowRight /></button>
      <button type="button" className="reception-secondary" onClick={onAddMember}><Plus /> Dodaj člana</button>
      <dl className="staff-stats"><div><dt>Preostalo</dt><dd>{members.length - completed}</dd></div><div><dt>Završeno</dt><dd>{completed}</dd></div><div><dt>Praćenja</dt><dd>{followUps}</dd></div></dl>
    </section>
    <section className="staff-queue panel-card" id="staff-queue">
      <div className="section-heading"><div><p className="eyebrow">RED ZA DANAS</p><h2>Kontakti po prioritetu</h2></div><span className="summary-count">{members.length - completed} preostalo</span></div>
      <div className="staff-task-list">{members.map((member, index) => <article className={`staff-task ${member.recoveryOutcome || member.status === 'recovered' ? 'completed' : ''}`} key={member.id}>
        <span className="task-priority">{String(index + 1).padStart(2, '0')}</span>
        <div className="task-person"><span className="avatar large">{initials(member)}</span><span><span className="task-name"><h3>{fullName(member)}</h3><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki' : 'Srednji'}</span></span><small><MessageCircle /> {member.preferredChannel} · {member.packageName}</small></span></div>
        <div className="task-reason"><small>RAZLOG RIZIKA</small><p>{member.riskReason}</p></div>
        <div className="task-next"><small>PREPORUČENI POTEZ</small><p>{member.nextAction}</p></div>
        <div className="task-actions">
          {member.status === 'recovered' ? <span className="task-done"><CheckCircle2 /> Obnovljeno</span> : member.recoveryOutcome ? <><span className={`outcome-badge outcome-${member.recoveryOutcome}`}><Check /> {outcomeLabels[member.recoveryOutcome]}</span><button onClick={() => onOpenMember(member)}>Nastavi <ArrowRight /></button></> : <><button className="task-primary" onClick={() => onOpenMember(member)}>Kontaktiraj <ArrowRight /></button><button onClick={() => onOutcome(member.id, 'no_answer')}><Phone /> Bez odgovora</button><button onClick={() => onOutcome(member.id, 'replied')}><MessageCircle /> Odgovorio/la</button><button onClick={() => onOutcome(member.id, 'follow_up')}><Clock3 /> Prati sjutra</button></>}
        </div>
      </article>)}</div>
    </section>
  </div>;
}

function RevenueTrend({ collectedRevenue }: { collectedRevenue: number }) {
  return <div className="revenue-trend">
    <div className="trend-heading"><span>Trend prihoda</span><strong>+{euro(collectedRevenue - 10000)}</strong></div>
    <svg viewBox="0 0 360 112">
      <title>Trend naplaćenog prihoda od marta do avgusta raste sa 8.900 na preko 10.800 eura</title>
      <path className="trend-grid-line" d="M8 24H352M8 55H352M8 86H352" />
      <path className="revenue-line" pathLength="1" d="M10 82 C45 78 62 70 78 68 S130 59 146 61 S198 70 214 55 S265 49 282 40 S327 24 350 20" />
      <circle className="revenue-current-dot" cx="350" cy="20" r="4" />
    </svg>
    <div className="trend-months"><span>MAR</span><span>APR</span><span>MAJ</span><span>JUN</span><span>JUL</span><span>AVG</span></div>
  </div>;
}

function Metric({ label, value, hint, tone = 'neutral' }: { label: string; value: string; hint: string; tone?: 'neutral' | 'warning' | 'danger' | 'success' }) {
  return <div className={`metric-line tone-${tone}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

function MembersScreen({ members, total, filter, search, onFilter, onSearch, onOpenMember, onImport }: {
  members: Member[]; total: number; filter: Filter; search: string; onFilter: (filter: Filter) => void; onSearch: (search: string) => void; onOpenMember: (member: Member) => void; onImport: () => void;
}) {
  return <div className="screen-stack">
    <section className="members-toolbar panel-card">
      <div className="search-box"><Search /><Input aria-label="Pretraži članove" placeholder="Pretraži ime, telefon ili e-mail…" value={search} onChange={(event) => onSearch(event.target.value)} />{search && <button aria-label="Obriši pretragu" onClick={() => onSearch('')}><X /></button>}</div>
      <div className="filter-tabs" aria-label="Filtriraj članove">{filters.map((item) => <button type="button" aria-pressed={filter === item.id} className={filter === item.id ? 'active' : ''} key={item.id} onClick={() => onFilter(item.id)}>{item.label}</button>)}</div>
      <span className="result-count">{members.length} od {total} članova</span>
    </section>
    <section className="panel-card table-card">
      {members.length ? <>
        <div className="members-table-wrap"><table className="members-table"><thead><tr><th>Član</th><th>Status</th><th>Paket</th><th>Posljednji dolazak</th><th>Ističe</th><th>Rizik</th><th><span className="sr-only">Otvori</span></th></tr></thead><tbody>{members.map((member) => <tr key={member.id} onClick={() => onOpenMember(member)}><td><span className="avatar">{initials(member)}</span><span><strong>{fullName(member)}</strong><small>{member.phone}</small></span></td><td><span className={`status-pill ${statusClass(member.status)}`}>{t.statuses[member.status]}</span></td><td><strong>{member.packageName}</strong><small>{euro(member.price)} / mj.</small></td><td>{member.lastVisit === '—' ? '—' : prettyDate(member.lastVisit)}<small>{member.visitsThisMonth} posjeta ovog mj.</small></td><td>{prettyDate(member.endDate)}</td><td><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki' : member.risk === 'medium' ? 'Srednji' : 'Nizak'}</span></td><td><button type="button" className="row-open-button" aria-label={`Otvori profil: ${fullName(member)}`} onClick={(event) => { event.stopPropagation(); onOpenMember(member); }}><ChevronRight /></button></td></tr>)}</tbody></table></div>
        <div className="mobile-member-list">{members.map((member) => <button type="button" className="mobile-member-card" key={member.id} onClick={() => onOpenMember(member)}><span className="avatar">{initials(member)}</span><span className="mobile-member-main"><span><strong>{fullName(member)}</strong><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki' : member.risk === 'medium' ? 'Srednji' : 'Nizak'}</span></span><small>{member.packageName} · {euro(member.price)} mjesečno</small><span className="mobile-member-meta"><span><b>Status</b>{t.statuses[member.status]}</span><span><b>Ističe</b>{prettyDate(member.endDate)}</span><span><b>Posjete</b>{member.visitsThisMonth} ovaj mj.</span></span></span><ChevronRight /></button>)}</div>
      </> : <EmptyState icon={<Search />} title="Nema rezultata" text="Pokušajte drugi izraz ili uklonite aktivni filter." action="Uvezi članove iz CSV-a" onAction={onImport} />}
    </section>
    <div className="csv-note"><FileSpreadsheet /><span><strong>CSV uvoz je spreman za demo.</strong> Koristite kolone: firstname, lastname, phone, email, status, price, startdate, enddate.</span></div>
  </div>;
}

function RadarScreen({ members, onOpenMember }: { members: Member[]; onOpenMember: (member: Member) => void }) {
  const high = members.filter((member) => member.risk === 'high');
  const medium = members.filter((member) => member.risk === 'medium');
  return <div className="screen-stack radar-screen">
    <section className="radar-summary panel-card" aria-label="Sažetak rizika"><div><p className="eyebrow">RED ZA AKCIJU</p><h2>Prioriteti za zadržavanje članova</h2><p>Lista je sortirana po nivou rizika i hitnosti sljedećeg poteza.</p></div><dl><div><dt>Ukupno</dt><dd>{members.length}</dd></div><div className="high"><dt>Visoki rizik</dt><dd>{high.length}</dd></div><div className="medium"><dt>Srednji rizik</dt><dd>{medium.length}</dd></div></dl></section>
    <section className="risk-queue panel-card">
      <div className="section-heading"><div><p className="eyebrow">PRIORITETNA LISTA</p><h2>{members.length} članova traži pažnju</h2></div><span className="sorted-label"><CircleGauge /> Sortirano po riziku</span></div>
      {members.length ? <div className="risk-cards">{members.map((member, index) => <article className={`risk-member-card ${member.risk === 'high' ? 'is-high' : ''}`} key={member.id}><span className="risk-order">{String(index + 1).padStart(2, '0')}</span><div className="risk-member-identity"><span className="avatar large">{initials(member)}</span><span><h3>{fullName(member)}</h3><span className={`status-pill ${statusClass(member.status)}`}>{t.statuses[member.status]}</span></span></div><div className="risk-reason"><small>RAZLOG RIZIKA</small><p>{member.riskReason}</p></div><div className="risk-next"><small>SLJEDEĆI POTEZ</small><p>{member.nextAction}</p></div><div className="risk-value"><small>ČLANARINA</small><strong>{euro(member.price)}</strong></div><Button variant="outline" onClick={() => onOpenMember(member)}>Otvori profil <ChevronRight /></Button></article>)}</div> : <EmptyState icon={<CheckCircle2 />} title="Radar je čist" text="Nijedan član trenutno nema aktivan signal rizika." />}
    </section>
  </div>;
}

function AutomationsScreen({ automations, onToggle, onPreview }: { automations: Automation[]; onToggle: (id: string, enabled: boolean) => void; onPreview: (id: string) => void }) {
  const queued = automations.reduce((sum, item) => sum + item.sentThisMonth, 0);
  return <div className="screen-stack automation-screen">
    <section className="automation-overview panel-card"><div><p className="eyebrow">OVAJ MJESEC</p><h2>{queued} poruka pripremljeno</h2><p>Nijedna poruka se ne šalje stvarno u ovom prototipu.</p></div><dl className="overview-stats"><div><dt>Aktivne</dt><dd>{automations.filter((item) => item.enabled).length}</dd></div><div><dt>Pauzirane</dt><dd>{automations.length - automations.filter((item) => item.enabled).length}</dd></div></dl></section>
    <section className="automations-list panel-card">{automations.map((automation) => <article className={`automation-row ${automation.enabled ? '' : 'disabled'}`} key={automation.id}><div className="automation-main"><h3>{automation.title}</h3><p>{automation.trigger}</p></div><div className="automation-meta"><span><small>PUBLIKA</small>{automation.audience}</span><span><small>KANAL</small>{automation.channel}</span><span><small>AKTIVNOST</small>{automation.lastActivity}</span></div><label className="switch-label"><Switch checked={automation.enabled} onCheckedChange={(checked) => onToggle(automation.id, checked)} /><span>{automation.enabled ? 'Uključena' : 'Pauzirana'}</span></label><Button variant="outline" onClick={() => onPreview(automation.id)}><MessageCircle /> Pregled poruke</Button></article>)}</section>
    <div className="demo-boundary"><ShieldAlert /><span><strong>Sigurna demo granica</strong>Poruke se samo stavljaju u lokalni red. WhatsApp, Viber i SMS integracije nijesu povezane.</span></div>
  </div>;
}

function EmptyState({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p>{action && <Button variant="outline" onClick={onAction}>{action}</Button>}</div>;
}

function MemberProfile({ member, channel, message, renewing, renewalAmount, onChannel, onMessage, onQueue, onCheckin, onEdit, onRenew, onCancelRenew, onRenewalAmount, onMarkRenewed }: {
  member: Member; channel: Channel; message: string; renewing: boolean; renewalAmount: string;
  onChannel: (channel: Channel) => void; onMessage: (message: string) => void; onQueue: () => void; onCheckin: () => void; onEdit: () => void;
  onRenew: () => void; onCancelRenew: () => void; onRenewalAmount: (amount: string) => void; onMarkRenewed: (event: SyntheticEvent<HTMLFormElement>) => void;
}) {
  return <div className="profile-layout">
    <div className="profile-main">
      <DialogHeader className="profile-header"><div className="avatar profile-avatar">{initials(member)}</div><div><div className="profile-badges"><span className={`status-pill ${statusClass(member.status)}`}>{t.statuses[member.status]}</span><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki rizik' : member.risk === 'medium' ? 'Srednji rizik' : 'Nizak rizik'}</span></div><DialogTitle>{fullName(member)}</DialogTitle><DialogDescription>{member.packageName} · {euro(member.price)} mjesečno</DialogDescription></div></DialogHeader>
      <div className="profile-quick-actions"><Button variant="outline" onClick={onCheckin}><LogIn /> {t.actions.checkin}</Button><Button variant="outline" onClick={onEdit}><Pencil /> Uredi podatke</Button></div>
    </div>
    <section className="profile-context">
      <section className={`profile-risk ${riskClass(member.risk)}`}>
        <div><p className="eyebrow">PULSE SIGNAL</p><h3>{member.risk === 'high' ? 'Potrebna je akcija danas' : member.risk === 'medium' ? 'Kontaktirajte prije isteka' : 'Nema hitnog rizika'}</h3></div>
        <details open={member.risk === 'high' ? true : undefined}><summary>Zašto?</summary><p>{member.riskReason}</p><dl><div><dt>Ističe</dt><dd>{prettyDate(member.endDate)}</dd></div><div><dt>Posljednji dolazak</dt><dd>{member.lastVisit === '—' ? 'Nije evidentiran' : prettyDate(member.lastVisit)}</dd></div></dl><span><strong>Preporučeni potez</strong>{member.nextAction}</span></details>
      </section>
      <section className="member-recovery-path" aria-labelledby="member-recovery-title"><p className="eyebrow" id="member-recovery-title">TOK OPORAVKA</p><RecoveryLifecycle member={member} /></section>
      <div className="profile-info-grid"><section><h3>Članarina i aktivnost</h3><dl className="profile-info-list"><Detail label="Paket" value={`${member.packageName} · ${euro(member.price)}`} sub={`${prettyDate(member.startDate)} — ${prettyDate(member.endDate)}`} /><Detail label="Posljednji dolazak" value={member.lastVisit === '—' ? 'Nema dolazaka' : prettyDate(member.lastVisit)} sub={`${member.visitsThisMonth} posjeta ovog mjeseca`} /></dl></section><section><h3>Kontakt podaci</h3><dl className="profile-info-list"><Detail label="Telefon" value={member.phone} sub={member.preferredChannel} /><Detail label="E-mail" value={member.email} sub={member.birthday ? `Rođendan ${prettyDate(member.birthday)}` : 'Datum rođenja nije unijet'} /></dl></section></div>
    </section>
    <aside className="recovery-panel">
      <div className="recovery-panel-title"><span><MessageCircle /></span><div><p className="eyebrow">RECOVERY AKCIJA</p><h2>Pripremi poruku</h2></div></div>
      <p className="panel-copy">Personalizujte prijedlog. Poruka će biti samo stavljena u lokalni red.</p>
      <fieldset className="channel-tabs"><legend className="sr-only">Izaberite kanal</legend>{(['WhatsApp','Viber','SMS'] as Channel[]).map((item) => <button type="button" className={channel === item ? 'active' : ''} key={item} onClick={() => onChannel(item)}>{item}</button>)}</fieldset>
      <label className="message-field"><span>PORUKA ZA {member.firstName.toLocaleUpperCase('me')}</span><Textarea value={message} onChange={(event) => onMessage(event.target.value)} rows={7} /></label>
      <div className="message-meta"><span>{message.length} znakova</span><span><Sparkles /> PULSE prijedlog</span></div>
      {member.queuedMessage && <div className="queued-state"><CheckCircle2 /><span><strong>Poruka je u redu</strong>{member.queuedMessage.channel} · {member.queuedMessage.queuedAt}</span></div>}
      <Button className="pulse-button queue-button" onClick={onQueue} disabled={!message.trim()}><Send /> Stavi poruku u red</Button>
      <div className="fake-service-note"><ShieldAlert /> Integracije nijesu povezane; slanje je simulirano.</div>
      <div className="recovery-divider"><span>NAKON OBNOVE</span></div>
      {!renewing ? <Button variant="outline" className="renew-button" onClick={onRenew} disabled={member.status === 'recovered'}><CheckCircle2 /> {member.status === 'recovered' ? 'Već je oporavljen' : t.actions.renew}</Button> : <form className="renew-form" onSubmit={onMarkRenewed}><div className="renew-label"><label htmlFor="renewal-amount">Iznos obnove</label><div className="amount-input"><Input id="renewal-amount" type="number" min="1" step="1" value={renewalAmount} onChange={(event) => onRenewalAmount(event.target.value)} /><span>€</span></div></div><p>Ovo će odmah povećati broj oporavljenih članova i prihod.</p><div><Button type="button" variant="ghost" onClick={onCancelRenew}>Odustani</Button><Button type="submit" className="pulse-button"><Check /> Potvrdi obnovu</Button></div></form>}
    </aside>
    <div className="profile-history-grid"><section><div className="subsection-title"><Activity /><h3>Istorija dolazaka</h3></div>{member.attendance.length ? <div className="timeline">{member.attendance.slice(0, 5).map((visit, index) => <div key={`${visit.date}-${index}`}><i /><span><strong>{prettyDate(visit.date)}</strong><small>{visit.time}</small></span></div>)}</div> : <p className="muted-empty">Još nema evidentiranih dolazaka.</p>}</section><section><div className="subsection-title"><CreditCard /><h3>Istorija plaćanja</h3></div>{member.payments.length ? <div className="payment-list">{member.payments.slice(0, 4).map((payment, index) => <div key={`${payment.date}-${index}`}><span><strong>{euro(payment.amount)}</strong><small>{prettyDate(payment.date)} · {payment.method}</small></span><CheckCircle2 /></div>)}</div> : <p className="muted-empty">Još nema evidentiranih uplata.</p>}</section></div>
  </div>;
}

function Detail({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="detail-item"><dt>{label}</dt><dd><strong>{value}</strong><span>{sub}</span></dd></div>;
}
