'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react';
import {
  ArrowRight, Check, CheckCircle2,
  ChevronRight, CircleGauge, Clock3, FileSpreadsheet,
  LayoutDashboard, Menu, MessageCircle, Pencil, Phone, Plus, Radar, Search,
  Moon, RotateCcw, Send, Settings2, ShieldAlert, Sparkles, Sun, Upload, Users, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageAtmosphere } from '@/components/page-atmosphere';
import { PulseLoaderScene } from '@/components/pulse-loader-scene';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  copy, initialMembers,
  type Channel, type Member, type MemberStatus, type RecoveryOutcome, type RiskLevel,
} from '@/lib/pulse-data';
import {
  getPulseMetrics,
  getRecoveryActivity,
  getRecoveryLifecycle,
  getRiskMembers,
  memberMatchesSearch,
  type RecoveryActivity,
} from '@/lib/pulse-logic';
import { addDaysIso, inferMembershipState, parseMemberCsv, toLocalIsoDate } from '@/lib/csv-import';
import { getThemeClassName, getThemeColor, nextTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

type View = 'dashboard' | 'staff' | 'members' | 'radar';
type Workspace = 'owner' | 'staff';
type Filter = 'all' | MemberStatus;
type MemberForm = Pick<Member, 'firstName' | 'lastName' | 'phone' | 'email' | 'birthday' | 'packageName' | 'price' | 'startDate' | 'endDate' | 'status' | 'preferredChannel'>;

const STORAGE_KEY = 'pulse-demo-gym-v1';
const { me: t } = copy;

function getMemberRevealDelay(index: number, total: number) {
  const step = Math.max(34, Math.min(68, 1_050 / Math.max(total - 1, 1)));
  return `${Math.round(index * step)}ms`;
}

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Svi' }, { id: 'active', label: 'Aktivni' }, { id: 'expiring', label: 'Ističu' },
  { id: 'expired', label: 'Istekli' }, { id: 'recovered', label: 'Oporavljeni' },
];

const outcomeLabels: Record<RecoveryOutcome, string> = {
  no_answer: 'Bez odgovora',
  replied: 'Odgovorio/la',
  follow_up: 'Pratiti sjutra',
  declined: 'Ne želi obnovu',
};

const viewMeta: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: 'DANAŠNJI PREGLED', title: 'Dobro jutro, Marko.', subtitle: 'Evo gdje je prihod u riziku i šta treba uraditi danas.' },
  staff: { eyebrow: 'RADNI PROSTOR RECEPCIJE', title: 'Danas na recepciji', subtitle: 'Pronađite člana, zabilježite ishod kontakta i završite današnje prioritete.' },
  members: { eyebrow: 'BAZA ČLANOVA', title: 'Članovi', subtitle: 'Pretražite članove, provjerite članarinu i otvorite sljedeću akciju.' },
  radar: { eyebrow: 'SIGNALI RIZIKA', title: 'Signali rizika', subtitle: 'Prioriteti izračunati iz datuma isteka i vrijednosti članarine.' },
};

function euro(value: number) {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value)} €`;
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
    firstName: '', lastName: '', phone: '+382 ', email: '', birthday: '', packageName: 'Standard', price: 35,
    startDate: today, endDate: addDaysIso(today, 30), status: 'active', preferredChannel: 'Poruka',
  };
}

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [workspace, setWorkspace] = useState<Workspace>('owner');
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [ready, setReady] = useState(false);
  const [loaderLeaving, setLoaderLeaving] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [appEntering, setAppEntering] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<Channel>('Poruka');
  const [message, setMessage] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewalAmount, setRenewalAmount] = useState('35');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<MemberForm>(blankMemberForm());
  const [resetOpen, setResetOpen] = useState(false);
  const [pilotOpen, setPilotOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const [importError, setImportError] = useState('');
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
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { members?: Member[] };
        if (parsed.members?.length) storedMembers = parsed.members;
      }
    } catch {
      // A corrupt local demo snapshot should never prevent the prototype from loading.
    }
    let exitTimer = 0;
    let entranceTimer = 0;
    const timer = window.setTimeout(() => {
      if (storedMembers) setMembers(storedMembers);
      setReady(true);
      setLoaderLeaving(true);
      exitTimer = window.setTimeout(() => {
        setLoaderVisible(false);
        setAppEntering(true);
        entranceTimer = window.setTimeout(() => setAppEntering(false), 2400);
      }, 900);
    }, 5000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(entranceTimer);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ members }));
  }, [members, ready]);

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

  useScrollReveal(ready, `${workspace}:${view}`);

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
      followUpAt: outcome === 'follow_up' ? formatFollowUpTimestamp() : undefined,
    } : item));
    setSuccess(`${fullName(member)}: ${outcomeLabels[outcome]}.`);
  }

  function resetDemo() {
    setMembers(initialMembers);
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
      ...member, preferredChannel: channel, queuedMessage: { channel, text: message.trim(), queuedAt: formatActionTimestamp() },
    } : member));
    setSuccess(`Nacrt poruke za ${selectedMember.firstName} je sačuvan za kanal: ${channel}.`);
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
      status: 'recovered', risk: 'low', price: amount, recoveredAmount: amount, recoveredAt: today,
      startDate: today, endDate: addDaysIso(today, 30), riskReason: `Članarina obnovljena ${prettyDate(today)} uz pomoć PULSE recovery toka.`,
      nextAction: 'Nije potrebna akcija.',
    } : member));
    setRecoveryPulse((current) => current + 1);
    setSuccess(`${memberName} je oporavljen. ${euro(amount)} je dodato oporavljenom prihodu.`);
    setSelectedMemberId(null);
    setRenewing(false);
    setView('dashboard');
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
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseMemberCsv(text, members, toLocalIsoDate());

      if (result.errors.length) {
        setSuccess('');
        setImportError(`CSV nije uvezen. ${result.errors.slice(0, 3).join(' ')}`);
        return;
      }

      setMembers(result.members);
      setSelectedMemberId(null);
      setRecoveryPulse(0);
      setImportError('');
      setSuccess(`Uvezeno je ${result.members.length} ${result.members.length === 1 ? 'član' : 'članova'} iz CSV fajla.`);
    };
    reader.onerror = () => {
      setSuccess('');
      setImportError('CSV nije uvezen. Fajl nije moguće pročitati.');
    };
    reader.readAsText(file);
  }

  return (
    <>
    <main className={`app-shell ${appEntering ? 'app-shell-entering' : ''} ${loaderVisible ? 'app-shell-loader-covered' : ''}`}>
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="brand"><PulseLogo /><span className="brand-word">PULSE</span></div>
        <button className="sidebar-close" aria-label="Zatvori meni" onClick={() => setMobileNav(false)}><X /></button>
        <nav aria-label="Glavna navigacija">
          {workspace === 'owner' ? <>
          <NavButton active={view === 'dashboard'} icon={<LayoutDashboard />} label="Vlasnički pregled" onClick={() => goTo('dashboard')} />
          <NavButton active={view === 'members'} icon={<Users />} label={t.nav.members} count={members.length} onClick={() => goTo('members')} />
          <NavButton active={view === 'radar'} icon={<Radar />} label={t.nav.radar} count={riskMembers.length} onClick={() => goTo('radar')} />
          </> : <>
          <NavButton active={view === 'staff'} icon={<CheckCircle2 />} label="Dnevni pregled" count={riskMembers.length} onClick={() => goTo('staff')} />
          <NavButton active={view === 'members'} icon={<Users />} label={t.nav.members} count={members.length} onClick={() => goTo('members')} />
          <NavButton active={view === 'radar'} icon={<Radar />} label="Signali rizika" count={riskMembers.length} onClick={() => goTo('radar')} />
          </>}
        </nav>
        <div className={`sidebar-insight ${workspace === 'staff' ? 'reception-insight' : ''}`}>
          <span className="pulse-dot" />
          {workspace === 'owner' ? <div><strong>{euro(metrics.recoveredRevenue)}</strong><small>oporavljeno kroz PULSE</small></div> : <div><strong>{riskMembers.filter((member) => !member.recoveryOutcome).length}</strong><small>prioriteta preostalo</small></div>}
        </div>
        {workspace === 'owner' && <button className="demo-reset-button" onClick={() => setResetOpen(true)}><RotateCcw /> Resetuj demo</button>}
        <div className="gym-card"><span className="gym-monogram">PD</span><span><strong>{t.gymName}</strong><small>{t.location} · Demo podaci</small></span><Settings2 /></div>
      </aside>

      {mobileNav && <button className="nav-backdrop" aria-label="Zatvori meni" onClick={() => setMobileNav(false)} />}

      <section className="main-panel">
        <PageAtmosphere view={view} workspace={workspace} recoveryPulse={recoveryPulse} signalCount={riskMembers.length} surface="ambient" />
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
      </section>

      <Dialog open={Boolean(selectedMember)} onOpenChange={(open) => { if (!open) setSelectedMemberId(null); }}>
        <DialogContent className="member-dialog" showCloseButton>
          {selectedMember && (
            <MemberProfile
              member={selectedMember} channel={channel} message={message} renewing={renewing} renewalAmount={renewalAmount}
              onChannel={setChannel} onMessage={setMessage} onQueue={queueMessage}
              onEdit={() => openMemberForm(selectedMember)} onRenew={() => setRenewing(true)} onCancelRenew={() => setRenewing(false)}
              onRenewalAmount={setRenewalAmount} onMarkRenewed={markRenewed}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="form-dialog">
          <DialogHeader><DialogTitle>{editingId ? 'Uredi člana' : 'Dodaj člana'}</DialogTitle><DialogDescription>Status i rizik računaju se iz datuma isteka. Podaci ovog pilota ostaju samo u ovom pregledaču.</DialogDescription></DialogHeader>
          <form onSubmit={saveMember} className="member-form">
            <div className="form-grid">
              <Field label="Ime" required><Input value={memberForm.firstName} onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })} /></Field>
              <Field label="Prezime" required><Input value={memberForm.lastName} onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })} /></Field>
              <Field label="Telefon" required><Input required value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} /></Field>
              <Field label="E-mail"><Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} /></Field>
              <Field label="Paket"><select className="select-input" value={memberForm.packageName} onChange={(e) => setMemberForm({ ...memberForm, packageName: e.target.value })}><option>Standard</option><option>Plus</option><option>Neograničeno</option></select></Field>
              <Field label="Mjesečna cijena" required><div className="amount-input"><Input required type="number" min="1" value={memberForm.price} onChange={(e) => setMemberForm({ ...memberForm, price: Number(e.target.value) })} /><span>€</span></div></Field>
              <Field label="Početak"><Input type="date" value={memberForm.startDate} onChange={(e) => setMemberForm({ ...memberForm, startDate: e.target.value })} /></Field>
              <Field label="Ističe" required><Input required type="date" value={memberForm.endDate} onChange={(e) => setMemberForm({ ...memberForm, endDate: e.target.value })} /></Field>
              
              <Field label="Preferirani kanal"><select className="select-input" value={memberForm.preferredChannel} onChange={(e) => setMemberForm({ ...memberForm, preferredChannel: e.target.value as Channel })}><option>Telefon</option><option>Poruka</option><option>E-mail</option></select></Field>
            </div>
            <DialogFooter className="form-footer"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Odustani</Button><Button type="submit" className="pulse-button">{editingId ? 'Sačuvaj izmjene' : 'Dodaj člana'}</Button></DialogFooter>
          </form>
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
          <DialogHeader><Badge className="pilot-badge">PILOT SA VAŠIM PODACIMA</Badge><DialogTitle>Provjerite koliko prihoda PULSE može vratiti vašoj teretani.</DialogTitle><DialogDescription>Za početak je dovoljan običan CSV iz Excela ili postojećeg sistema. Nije potrebna promjena načina rada.</DialogDescription></DialogHeader>
          <div className="pilot-steps"><div><span>01</span><p><strong>Uvezemo članove</strong>Ime, telefon, cijena i datum isteka su dovoljni. Status nije potreban.</p></div><div><span>02</span><p><strong>PULSE računa status i rizik</strong>Datum isteka automatski određuje ko je aktivan, kome uskoro ističe i kome je članarina istekla.</p></div><div><span>03</span><p><strong>Tim prati rezultat</strong>Kontakt, odgovor, praćenje, obnova i oporavljeni prihod ostaju sačuvani u PULSE toku.</p></div></div>
          <div className="pilot-note"><ShieldAlert /><span><strong>PULSE provjerava CSV prije zamjene podataka.</strong>Ako nedostaje ime, telefon, cijena ili datum isteka, postojeći podaci ostaju netaknuti i dobićete jasan opis greške.</span></div>
          <DialogFooter><Button variant="outline" onClick={() => setPilotOpen(false)}>Zatvori</Button><Button className="pulse-button" onClick={() => { setPilotOpen(false); setView('members'); setWorkspace('owner'); setSuccess('Otvoren je ekran za uvoz članova iz CSV-a.'); }}><Upload /> Pogledaj kako izgleda uvoz</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {success && <output className={`success-toast ${success.includes('oporavljen') ? 'is-recovery' : ''}`} aria-live="polite"><CheckCircle2 /><span>{success}</span></output>}
      {importError && <output className="success-toast is-error" aria-live="assertive"><ShieldAlert /><span>{importError}</span></output>}
    </main>
    {loaderVisible && <LoadingState leaving={loaderLeaving} />}
    </>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} aria-current={active ? 'page' : undefined} className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{typeof count === 'number' && <b>{count}</b>}</button>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="field"><span>{label}{required && ' *'}</span>{children}</label>;
}

function LoadingState({ leaving = false }: { leaving?: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const next = Math.min(100, Math.floor((elapsed / 5000) * 100));
      setProgress(next);
      if (next >= 100) window.clearInterval(timer);
    }, 40);

    return () => window.clearInterval(timer);
  }, []);

  const visibleProgress = leaving ? 100 : progress;

  return <main className={`pulse-loader pulse-loader-centered ${leaving ? 'is-leaving' : ''}`} aria-live="polite" aria-busy={!leaving}>
    <div className="pulse-loader-grid" aria-hidden="true" />
    <div className="pulse-loader-vignette" aria-hidden="true" />
    <PulseLoaderScene />

    <section className="pulse-loader-center" aria-label={`PULSE loading ${visibleProgress}%`}>
      <div className="pulse-loader-wordmark" aria-hidden="true">
        <h1>PULSE</h1>
      </div>

      <div className="pulse-loader-meter">
        <div className="pulse-loader-progress" aria-hidden="true">
          <span style={{ width: `${visibleProgress}%` }} />
        </div>
        <output className="pulse-loader-percent" aria-label={`${visibleProgress} percent`}>
          {visibleProgress}<span>%</span>
        </output>
      </div>
    </section>
  </main>;
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
  return <div className="screen-stack dashboard-screen">
    <section className="owner-hero" aria-labelledby="owner-risk-title">
      <span className="owner-hero-frame-pulse" aria-hidden="true" />
      <div className="owner-hero-copy">
        <p className="eyebrow">PRIHOD U RIZIKU</p>
        <h2 id="owner-risk-title">{euro(metrics.riskRevenue)}</h2>
        <p className="hero-statement">zahtijeva tvoju pažnju</p>
        <p className="actionable-copy">Od toga je <strong>{euro(metrics.actionableRevenue)}</strong> vezano za članove visokog prioriteta koje možeš kontaktirati danas.</p>
        <div className="mode-note"><span>CSV</span>Članarina i datum isteka</div>
        <button type="button" className="hero-link" onClick={() => onNavigate('radar')}>Pogledaj članove <ArrowRight /></button>
        <dl className="hero-outcomes">
          <div><dt>Oporavljeno</dt><dd className="number-shift" key={metrics.recoveredRevenue}>{euro(metrics.recoveredRevenue)}</dd></div>
          <div><dt>Obnovljeni članovi</dt><dd>{metrics.recoveredCount}</dd></div>
        </dl>
      </div>
    </section>

    <section className="today-queue" aria-labelledby="priority-title">
      <header className="today-queue__header">
        <div className="today-queue__heading">
          <p className="eyebrow">DANAS</p>
          <h2 id="priority-title">Danas — članovi koji trebaju pažnju</h2>
          <p>Najvažniji članovi za današnji kontakt, poredani za brz pregled i akciju.</p>
        </div>
        <span className="today-queue__count"><strong>{highRiskMembers.length}</strong> visoki prioritet</span>
      </header>

      {highRiskMembers.length ? <div className="today-queue__list" role="list">
        <div className="today-queue__columns" aria-hidden="true">
          <span>Član</span>
          <span>Rizik</span>
          <span>Zašto treba pažnju</span>
          <span>Članarina</span>
          <span>Akcija</span>
        </div>

        {highRiskMembers.map((member) => <article className="today-queue__item" role="listitem" key={member.id}>
          <div className="today-queue__main">
            <div className="today-queue__member">
              <span className="avatar">{initials(member)}</span>
              <span>
                <strong>{fullName(member)}</strong>
                <small>{member.packageName}</small>
              </span>
            </div>

            <div className="today-queue__risk">
              <span className={riskClass(member.risk)}><i />{member.risk === 'high' ? 'Visok rizik' : 'Srednji rizik'}</span>
            </div>

            <div className="today-queue__reason">
              <small className="today-queue__mobile-label">Zašto treba pažnju</small>
              <p>{member.riskReason}</p>
            </div>

            <div className="today-queue__value">
              <small className="today-queue__mobile-label">Članarina</small>
              <strong>{euro(member.price)}</strong>
            </div>

            <button type="button" className="today-queue__action" onClick={() => onOpenMember(member)}>
              Kontaktiraj <ArrowRight />
            </button>
          </div>

          <div className="today-queue__rail">
            <RecoveryLifecycle member={member} />
            <details className="today-queue__details">
              <summary>Detalji rizika</summary>
              <div className="today-queue__details-panel">
                <p>{member.riskReason}</p>
                <span><strong>Preporučeni potez</strong>{member.nextAction}</span>
                <span><strong>Članarina ističe</strong>{prettyDate(member.endDate)}</span>
              </div>
            </details>
          </div>
        </article>)}
      </div> : <div className="today-queue__empty"><CheckCircle2 /><span><strong>Danas nema članova visokog prioriteta.</strong><small>Pregledajte sve aktivne signale rizika.</small></span></div>}

      <footer className="today-queue__footer">
        <span>Prioriteti su spremni za današnji kontakt.</span>
        <button type="button" className="text-button" onClick={() => onNavigate('radar')}>Prikaži sve rizične članove <ArrowRight /></button>
      </footer>
    </section>

    <section className="recovery-activity" aria-labelledby="activity-title">
      <div><p className="eyebrow">AKTIVNOST OPORAVKA</p><h2 id="activity-title">Rezultat kontakata</h2></div>
      <dl>
        <div><dt>Kontaktirano</dt><dd>{recoveryActivity.contacted}</dd></div>
        <div><dt>Za praćenje</dt><dd>{recoveryActivity.followUps}</dd></div>
        <div><dt>Obnovljeno</dt><dd>{recoveryActivity.renewed}</dd></div>
        <div className="positive"><dt>Oporavljeni iznos</dt><dd>{euro(recoveryActivity.recoveredAmount)}</dd></div>
      </dl>
    </section>

    <section className="owner-metrics panel-card" aria-label="Ključne operativne metrike">
      <Metric label="Aktivni članovi" value={String(metrics.active)} hint="trenutni skup članova" />
      <Metric label="Ističe za 7 dana" value={String(metrics.expiring)} hint="za kontakt prije isteka" tone="warning" />
      <Metric label="Izvor podataka" value="CSV" hint="članovi i članarine" />
      <Metric label="Visoki rizik" value={String(metrics.highRisk)} hint="akcija danas" tone="danger" />
      <Metric label="Obnovljeni" value={String(metrics.recoveredCount)} hint="zabilježeno u PULSE" tone="success" />
      <Metric label="Oporavljen prihod" value={euro(metrics.recoveredRevenue)} hint="zabilježeno u PULSE" tone="success" />
    </section>
    <section className="pilot-footer"><div><strong>CSV pilot bez integracija</strong><span>Za početak su dovoljni članovi, telefoni, cijene i datumi isteka članarine.</span></div><Button variant="outline" onClick={onPilot}>Pogledaj pilot proces <ArrowRight /></Button></section>
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
      <div className="section-heading"><div><p className="eyebrow">RED ZA DANAS</p><h2>Današnji kontakti</h2></div><span className="summary-count">{members.length - completed} preostalo</span></div>
      <div className="staff-task-list">{members.map((member, index) => <article className={`staff-task ${member.recoveryOutcome || member.status === 'recovered' ? 'completed' : ''}`} key={member.id}>
        <span className="task-priority">{String(index + 1).padStart(2, '0')}</span>
        <div className="task-person"><span className="avatar large">{initials(member)}</span><span><span className="task-name"><h3>{fullName(member)}</h3><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki' : 'Srednji'}</span></span><small><MessageCircle /> {member.preferredChannel} · {member.packageName}</small></span></div>
        <div className="task-reason"><small>RAZLOG RIZIKA</small><p>{member.riskReason}</p></div>
        <div className="task-next"><small>PREDLOG PORUKE</small><p>{member.nextAction}</p></div>
        <div className="task-actions">
          {member.status === 'recovered' ? <span className="task-done"><CheckCircle2 /> Obnovljeno</span> : member.recoveryOutcome ? <><span className={`outcome-badge outcome-${member.recoveryOutcome}`}><Check /> {outcomeLabels[member.recoveryOutcome]}</span><button onClick={() => onOpenMember(member)}>Nastavi <ArrowRight /></button></> : <><button className="task-primary" onClick={() => onOpenMember(member)}>Kontaktiraj <ArrowRight /></button><button onClick={() => onOutcome(member.id, 'no_answer')}><Phone /> Bez odgovora</button><button onClick={() => onOutcome(member.id, 'replied')}><MessageCircle /> Odgovorio/la</button><button onClick={() => onOutcome(member.id, 'follow_up')}><Clock3 /> Prati sjutra</button></>}
        </div>
      </article>)}</div>
    </section>
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
        <div className="members-table-wrap"><table className="members-table">
          <thead><tr><th>Član</th><th>Status</th><th>Paket</th><th>Početak</th><th>Ističe</th><th>Rizik</th><th><span className="sr-only">Otvori</span></th></tr></thead>
          <tbody>{members.map((member, index) => <tr className="member-list-item" style={{ '--member-reveal-delay': getMemberRevealDelay(index, members.length) } as CSSProperties} key={member.id} onClick={() => onOpenMember(member)}>
            <td><div className="table-member"><span className="avatar">{initials(member)}</span><span><strong>{fullName(member)}</strong><small>{member.phone}</small></span></div></td>
            <td><span className={`status-pill ${statusClass(member.status)}`}>{(t.statuses[member.status] ?? 'Provjeriti')}</span></td>
            <td><strong>{member.packageName}</strong><small>{euro(member.price)} / mj.</small></td>
            <td>{prettyDate(member.startDate)}</td><td>{prettyDate(member.endDate)}</td>
            <td><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki' : member.risk === 'medium' ? 'Srednji' : 'Nizak'}</span></td>
            <td><button type="button" className="row-open-button" aria-label={`Otvori profil: ${fullName(member)}`} onClick={(event) => { event.stopPropagation(); onOpenMember(member); }}><ChevronRight /></button></td>
          </tr>)}</tbody>
        </table></div>
        <div className="mobile-member-list">{members.map((member, index) => <button type="button" className="mobile-member-card member-list-item" style={{ '--member-reveal-delay': getMemberRevealDelay(index, members.length) } as CSSProperties} key={member.id} onClick={() => onOpenMember(member)}><span className="avatar">{initials(member)}</span><span className="mobile-member-main"><span><strong>{fullName(member)}</strong><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki' : member.risk === 'medium' ? 'Srednji' : 'Nizak'}</span></span><small>{member.packageName} · {euro(member.price)} mjesečno</small><span className="mobile-member-meta"><span><b>Status</b>{(t.statuses[member.status] ?? 'Provjeriti')}</span><span><b>Ističe</b>{prettyDate(member.endDate)}</span><span><b>Cijena</b>{euro(member.price)}</span></span></span><ChevronRight /></button>)}</div>
      </> : <EmptyState icon={<Search />} title="Nema rezultata" text="Pokušajte drugi izraz ili uklonite aktivni filter." action="Uvezi članove iz CSV-a" onAction={onImport} />}
    </section>
    <div className="csv-note"><FileSpreadsheet /><span><strong>Minimum za pilot: ime, telefon, cijena i datum isteka.</strong> Status nije potreban — PULSE ga računa iz datuma isteka. Prihvatamo česte nazive kolona na crnogorskom/engleskom i CSV sa zarezom ili tačka-zarezom.</span></div>
  </div>;
}

function RadarScreen({ members, onOpenMember }: { members: Member[]; onOpenMember: (member: Member) => void }) {
  const high = members.filter((member) => member.risk === 'high');
  const medium = members.filter((member) => member.risk === 'medium');
  return <div className="screen-stack radar-screen">
    <section className="radar-summary panel-card" aria-label="Sažetak rizika"><div><p className="eyebrow">RED ZA AKCIJU</p><h2>Članovi sa signalima članarine</h2><p>PULSE računa status i rizik iz datuma isteka i cijene članarine iz CSV fajla.</p></div><dl><div><dt>Ukupno</dt><dd>{members.length}</dd></div><div className="high"><dt>Hitno</dt><dd>{high.length}</dd></div><div className="medium"><dt>Za praćenje</dt><dd>{medium.length}</dd></div></dl></section>
    <section className="risk-queue panel-card">
      <div className="section-heading"><div><p className="eyebrow">LISTA ZA TIM</p><h2>{members.length} članova za provjeru</h2></div><span className="sorted-label"><CircleGauge /> Članarina i datum isteka</span></div>
      {members.length ? <div className="risk-cards">{members.map((member, index) => <article className={`risk-member-card ${member.risk === 'high' ? 'is-high' : ''}`} key={member.id}><span className="risk-order">{String(index + 1).padStart(2, '0')}</span><div className="risk-member-identity"><span className="avatar large">{initials(member)}</span><span><h3>{fullName(member)}</h3><span className={`status-pill ${statusClass(member.status)}`}>{(t.statuses[member.status] ?? 'Provjeriti')}</span></span></div><div className="risk-reason"><small>SIGNAL</small><p>{member.riskReason}</p></div><div className="risk-next"><small>PREDLOG PORUKE</small><p>{member.nextAction}</p></div><div className="risk-value"><small>ČLANARINA</small><strong>{euro(member.price)}</strong></div><Button variant="outline" onClick={() => onOpenMember(member)}>Otvori profil <ChevronRight /></Button></article>)}</div> : <EmptyState icon={<CheckCircle2 />} title="Lista je čista" text="Nijedan član trenutno nema aktivan signal." />}
    </section>
  </div>;
}

function EmptyState({ icon, title, text, action, onAction }: { icon: React.ReactNode; title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p>{action && <Button variant="outline" onClick={onAction}>{action}</Button>}</div>;
}

function MemberProfile({ member, channel, message, renewing, renewalAmount, onChannel, onMessage, onQueue, onEdit, onRenew, onCancelRenew, onRenewalAmount, onMarkRenewed }: {
  member: Member; channel: Channel; message: string; renewing: boolean; renewalAmount: string;
  onChannel: (channel: Channel) => void; onMessage: (message: string) => void; onQueue: () => void; onEdit: () => void;
  onRenew: () => void; onCancelRenew: () => void; onRenewalAmount: (amount: string) => void; onMarkRenewed: (event: SyntheticEvent<HTMLFormElement>) => void;
}) {
  return <div className="profile-layout">
    <div className="profile-main">
      <DialogHeader className="profile-header"><div className="avatar profile-avatar">{initials(member)}</div><div><div className="profile-badges"><span className={`status-pill ${statusClass(member.status)}`}>{(t.statuses[member.status] ?? 'Provjeriti')}</span><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki rizik' : member.risk === 'medium' ? 'Srednji rizik' : 'Nizak rizik'}</span></div><DialogTitle>{fullName(member)}</DialogTitle><DialogDescription>{member.packageName} · {euro(member.price)} mjesečno</DialogDescription></div></DialogHeader>
      <div className="profile-quick-actions"><Button variant="outline" onClick={onEdit}><Pencil /> Uredi podatke</Button></div>
    </div>
    <section className="profile-context">
      <section className={`profile-risk ${riskClass(member.risk)}`}>
        <div><p className="eyebrow">PULSE SIGNAL</p><h3>{member.risk === 'high' ? 'Potrebna je provjera danas' : member.risk === 'medium' ? 'Kontaktirajte prije isteka' : 'Nema hitnog signala'}</h3></div>
        <details open={member.risk === 'high' ? true : undefined}><summary>Zašto?</summary><p>{member.riskReason}</p><dl><div><dt>Početak</dt><dd>{prettyDate(member.startDate)}</dd></div><div><dt>Ističe</dt><dd>{prettyDate(member.endDate)}</dd></div></dl><span><strong>Preporučeni potez</strong>{member.nextAction}</span></details>
      </section>
      <section className="member-recovery-path" aria-labelledby="member-recovery-title"><p className="eyebrow" id="member-recovery-title">TOK OPORAVKA</p><RecoveryLifecycle member={member} /></section>
      <div className="profile-info-grid"><section><h3>Članarina</h3><dl className="profile-info-list"><Detail label="Paket" value={`${member.packageName} · ${euro(member.price)}`} sub={`${prettyDate(member.startDate)} — ${prettyDate(member.endDate)}`} /><Detail label="Status" value={(t.statuses[member.status] ?? 'Provjeriti')} sub="iz CSV/Excel evidencije" /></dl></section><section><h3>Kontakt podaci</h3><dl className="profile-info-list"><Detail label="Telefon" value={member.phone} sub={member.preferredChannel} /><Detail label="E-mail" value={member.email} sub={member.birthday ? `Rođendan ${prettyDate(member.birthday)}` : 'Datum rođenja nije unijet'} /></dl></section></div>
    </section>
    <aside className="recovery-panel">
      <div className="recovery-panel-title"><span><MessageCircle /></span><div><p className="eyebrow">AKCIJA OPORAVKA</p><h2>Pripremi poruku</h2></div></div>
      <p className="panel-copy">Prilagodite prijedlog i sačuvajte nacrt. Slanje se u pilotu obavlja ručno.</p>
      <fieldset className="channel-tabs"><legend className="sr-only">Izaberite kanal</legend>{(['Telefon','Poruka','E-mail'] as Channel[]).map((item) => <button type="button" className={channel === item ? 'active' : ''} key={item} onClick={() => onChannel(item)}>{item}</button>)}</fieldset>
      <label className="message-field"><span>PORUKA ZA {member.firstName.toLocaleUpperCase('me')}</span><Textarea value={message} onChange={(event) => onMessage(event.target.value)} rows={7} /></label>
      <div className="message-meta"><span>{message.length} znakova</span><span><Sparkles /> PULSE prijedlog</span></div>
      {member.queuedMessage && <div className="queued-state"><CheckCircle2 /><span><strong>Nacrt je sačuvan</strong>{member.queuedMessage.channel} · {member.queuedMessage.queuedAt}</span></div>}
      <Button className="pulse-button queue-button" onClick={onQueue} disabled={!message.trim()}><Send /> Sačuvaj nacrt</Button>
      <div className="fake-service-note"><ShieldAlert /> Ovo je nacrt poruke. Tim je šalje ručno iz izabranog kanala.</div>
      <div className="recovery-divider"><span>NAKON OBNOVE</span></div>
      {!renewing ? <Button variant="outline" className="renew-button" onClick={onRenew} disabled={member.status === 'recovered'}><CheckCircle2 /> {member.status === 'recovered' ? 'Već je oporavljen' : t.actions.renew}</Button> : <form className="renew-form" onSubmit={onMarkRenewed}><div className="renew-label"><label htmlFor="renewal-amount">Iznos obnove</label><div className="amount-input"><Input id="renewal-amount" type="number" min="1" step="1" value={renewalAmount} onChange={(event) => onRenewalAmount(event.target.value)} /><span>€</span></div></div><p>Ovo će odmah povećati broj oporavljenih članova i prihod.</p><div><Button type="button" variant="ghost" onClick={onCancelRenew}>Odustani</Button><Button type="submit" className="pulse-button"><Check /> Potvrdi obnovu</Button></div></form>}
    </aside>
    <div className="profile-history-grid"><section><div className="subsection-title"><FileSpreadsheet /><h3>CSV pilot</h3></div><p className="muted-empty">Signal dolazi samo iz statusa članarine i datuma isteka.</p></section></div>
  </div>;
}

function Detail({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="detail-item"><dt>{label}</dt><dd><strong>{value}</strong><span>{sub}</span></dd></div>;
}
