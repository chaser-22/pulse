'use client';

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, Cake, CalendarClock, Check, CheckCircle2,
  ChevronRight, CircleGauge, Clock3, CreditCard, FileSpreadsheet, History,
  LayoutDashboard, LogIn, Mail, Menu, MessageCircle, Pencil, Phone, Plus, Radar, Search,
  Send, Settings2, ShieldAlert, Sparkles, Upload, UserX, Users, WalletCards, X, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  copy, initialAutomations, initialMembers, occupancy,
  type Automation, type Channel, type Member, type MemberStatus, type RiskLevel,
} from '@/lib/pulse-data';

type View = 'dashboard' | 'members' | 'radar' | 'automations';
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

const viewMeta: Record<View, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: 'PONEDJELJAK, 31. AVGUST', title: 'Dobro jutro, Marko.', subtitle: 'Evo gdje je prihod u riziku i šta treba uraditi danas.' },
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
  if (member.status === 'expired') return `Zdravo ${member.firstName}, primijetili smo da je tvoja članarina istekla. Ako želiš da nastaviš, javi nam i pripremićemo obnovu prije tvog sljedećeg dolaska. 💪`;
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

function blankMemberForm(): MemberForm {
  return {
    firstName: '', lastName: '', phone: '+382 ', email: '', birthday: '', packageName: 'Standard', price: 35,
    startDate: today, endDate: '2026-09-30', status: 'active', preferredChannel: 'WhatsApp',
  };
}

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
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
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const riskMembers = useMemo(() => members.filter((member) => member.risk !== 'low' && member.status !== 'recovered'), [members]);
  const highRiskMembers = useMemo(() => riskMembers.filter((member) => member.risk === 'high'), [riskMembers]);
  const metrics = useMemo(() => {
    const recovered = members.filter((member) => member.status === 'recovered');
    return {
      active: BASE_METRICS.active + members.filter((member) => member.status !== 'expired').length,
      expiring: BASE_METRICS.expiring + members.filter((member) => member.status === 'expiring').length,
      absent: BASE_METRICS.absent + members.filter((member) => member.status === 'absent').length,
      highRisk: highRiskMembers.length,
      riskRevenue: riskMembers.reduce((sum, member) => sum + member.price, 0),
      recoveredCount: BASE_METRICS.recoveredCount + recovered.length,
      recoveredRevenue: BASE_METRICS.recoveredRevenue + recovered.reduce((sum, member) => sum + (member.recoveredAmount ?? 0), 0),
    };
  }, [members, riskMembers, highRiskMembers]);

  const filteredMembers = useMemo(() => {
    const normalized = search.toLocaleLowerCase('me');
    return members.filter((member) => {
      const matchesFilter = filter === 'all' || member.status === filter;
      const haystack = `${fullName(member)} ${member.phone} ${member.email}`.toLocaleLowerCase('me');
      return matchesFilter && haystack.includes(normalized);
    });
  }, [members, filter, search]);

  function goTo(nextView: View) {
    setView(nextView);
    setMobileNav(false);
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
        <div className="brand"><span className="brand-mark">P</span><span>PULSE</span></div>
        <button className="sidebar-close" aria-label="Zatvori meni" onClick={() => setMobileNav(false)}><X /></button>
        <nav aria-label="Glavna navigacija">
          <NavButton active={view === 'dashboard'} icon={<LayoutDashboard />} label={t.nav.dashboard} onClick={() => goTo('dashboard')} />
          <NavButton active={view === 'members'} icon={<Users />} label={t.nav.members} count={members.length} onClick={() => goTo('members')} />
          <NavButton active={view === 'radar'} icon={<Radar />} label={t.nav.radar} count={riskMembers.length} onClick={() => goTo('radar')} />
          <NavButton active={view === 'automations'} icon={<Zap />} label={t.nav.automations} onClick={() => goTo('automations')} />
        </nav>
        <div className="sidebar-insight">
          <span className="pulse-dot" />
          <div><strong>{euro(metrics.recoveredRevenue)}</strong><small>oporavljeno ovog mjeseca</small></div>
        </div>
        <div className="gym-card"><span className="gym-monogram">PD</span><span><strong>{t.gymName}</strong><small>{t.location} · Demo podaci</small></span><Settings2 /></div>
      </aside>

      {mobileNav && <button className="nav-backdrop" aria-label="Zatvori meni" onClick={() => setMobileNav(false)} />}

      <section className="main-panel">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Otvori meni" onClick={() => setMobileNav(true)}><Menu /></button>
          <div className="page-title"><p className="eyebrow">{viewMeta[view].eyebrow}</p><h1>{viewMeta[view].title}</h1><p>{viewMeta[view].subtitle}</p></div>
          <div className="top-actions">
            {view === 'members' && <Button variant="outline" className="dark-outline" onClick={() => fileInputRef.current?.click()}><Upload /> {t.actions.import}</Button>}
            <Button className="lime-button" onClick={() => openMemberForm()}><Plus /> {t.actions.add}</Button>
          </div>
          <input ref={fileInputRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) importCsv(file); event.target.value = ''; }} />
        </header>

        {view === 'dashboard' && <Dashboard metrics={metrics} highRiskMembers={highRiskMembers} members={members} onOpenMember={openMember} onNavigate={goTo} />}
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
            <DialogFooter className="form-footer"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Odustani</Button><Button type="submit" className="lime-button">{editingId ? 'Sačuvaj izmjene' : 'Dodaj člana'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(automationPreviewId)} onOpenChange={(open) => { if (!open) setAutomationPreviewId(null); }}>
        <DialogContent className="automation-dialog">
          {(() => { const automation = automations.find((item) => item.id === automationPreviewId); if (!automation) return null; return <>
            <DialogHeader><DialogTitle>{automation.title}</DialogTitle><DialogDescription>{automation.trigger} · {automation.audience}</DialogDescription></DialogHeader>
            <div className="preview-phone"><div className="preview-phone-top"><span>{automation.channel}</span><span>10:42</span></div><div className="message-bubble">{automation.message.replace('{{ime}}', 'Miloš').replace('{{datum}}', '03.09.2026.')}</div><small>Pregled — poruka neće biti stvarno poslata</small></div>
            <div className="activity-note"><History /><span><strong>Posljednja aktivnost</strong>{automation.lastActivity}</span></div>
            <DialogFooter><Button onClick={() => { setAutomationPreviewId(null); setSuccess('Pregled zatvoren. Nijedna poruka nije poslata.'); }} className="lime-button">U redu</Button></DialogFooter>
          </>; })()}
        </DialogContent>
      </Dialog>

      {success && <output className="success-toast" aria-live="polite"><CheckCircle2 /><span>{success}</span></output>}
    </main>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{typeof count === 'number' && <b>{count}</b>}</button>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="field"><span>{label}{required && ' *'}</span>{children}</label>;
}

function LoadingState() {
  return <main className="loading-shell"><aside><div className="skeleton logo" />{[1,2,3,4].map((item) => <div className="skeleton nav" key={item} />)}</aside><section><div className="skeleton title" /><div className="loading-grid"><div className="skeleton large" /><div className="skeleton large" /></div><div className="loading-stats">{[1,2,3,4].map((item) => <div className="skeleton stat" key={item} />)}</div></section><div className="loading-label"><span className="loader-ring" />Učitavanje PULSE podataka…</div></main>;
}

function Dashboard({ metrics, highRiskMembers, members, onOpenMember, onNavigate }: {
  metrics: { active: number; expiring: number; absent: number; highRisk: number; riskRevenue: number; recoveredCount: number; recoveredRevenue: number };
  highRiskMembers: Member[]; members: Member[]; onOpenMember: (member: Member) => void; onNavigate: (view: View) => void;
}) {
  return <div className="screen-stack dashboard-screen">
    <div className="hero-grid">
      <article className="risk-hero">
        <div className="hero-top"><span className="risk-icon"><AlertTriangle /></span><Badge className="live-badge"><span /> Uživo</Badge></div>
        <p className="eyebrow">PROCJENA ZA OVAJ MJESEC</p>
        <div className="risk-number">{euro(metrics.riskRevenue)}</div>
        <h2>prihoda je trenutno u riziku</h2>
        <p>{highRiskMembers.length} člana traže hitnu pažnju. Najbrži put do oporavka je lična poruka danas.</p>
        <Button className="lime-button" onClick={() => onNavigate('radar')}>Otvori Churn Radar <ArrowRight /></Button>
      </article>

      <section className="today-card panel-card">
        <div className="section-heading"><div><p className="eyebrow">PRIORITET DANAS</p><h2>Prvo kontaktirajte ove članove</h2></div><Badge className="high-badge">{highRiskMembers.length} visoki rizik</Badge></div>
        <div className="member-list">
          {highRiskMembers.slice(0, 4).map((member, index) => <button className="member-row" key={member.id} onClick={() => onOpenMember(member)}><span className="rank">0{index + 1}</span><span className="avatar">{initials(member)}</span><span className="member-copy"><strong>{fullName(member)}</strong><small>{member.riskReason}</small></span><b>{euro(member.price)}</b><ChevronRight /></button>)}
        </div>
        <button className="text-button" onClick={() => onNavigate('radar')}>Prikaži sve rizične članove <ArrowRight /></button>
      </section>
    </div>

    <section className="metric-grid" aria-label="Ključne metrike">
      <Metric icon={<Users />} label="Aktivni članovi" value={String(metrics.active)} hint="+8 ovog mjeseca" tone="neutral" />
      <Metric icon={<CalendarClock />} label="Ističe za 7 dana" value={String(metrics.expiring)} hint="6 još nije kontaktirano" tone="amber" />
      <Metric icon={<UserX />} label="Odsutni 14+ dana" value={String(metrics.absent)} hint="4 nova signala" tone="amber" />
      <Metric icon={<ShieldAlert />} label="Visoki rizik" value={String(metrics.highRisk)} hint="Traže akciju danas" tone="red" />
      <Metric icon={<CheckCircle2 />} label="Obnovio uz PULSE" value={String(metrics.recoveredCount)} hint="ovog mjeseca" tone="lime" />
      <Metric icon={<WalletCards />} label="Oporavljen prihod" value={euro(metrics.recoveredRevenue)} hint="ovog mjeseca" tone="lime" />
    </section>

    <div className="lower-grid">
      <section className="panel-card occupancy-card">
        <div className="section-heading"><div><p className="eyebrow">DANAS</p><h2>Popunjenost teretane po satu</h2></div><span className="chart-legend"><i /> Broj dolazaka</span></div>
        <div className="chart-wrap">
          <div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
          <div className="bar-chart">{occupancy.map((item) => <div className={`bar-slot ${item.value > 78 ? 'peak' : ''}`} key={item.hour}><div className="bar" style={{ height: `${item.value}%` }}><span>{item.value}</span></div><small>{item.hour}</small></div>)}</div>
        </div>
        <div className="peak-note"><Sparkles /><span><strong>Najveća gužva: 18:00–19:00</strong>Preporuka: pojačajte recepciju i podsjetite članove na mirniji termin prije 16:00.</span></div>
      </section>
      <section className="panel-card recovery-card">
        <div className="recovery-orbit"><div><span>{metrics.recoveredCount}</span><small>oporavljenih</small></div></div>
        <p className="eyebrow">PULSE UČINAK</p><h2>{euro(metrics.recoveredRevenue)} sačuvanog prihoda</h2><p>Svaka evidentirana obnova odmah se dodaje ovoj vrijednosti.</p>
        <div className="mini-recovered-list">{members.filter((member) => member.status === 'recovered').slice(-3).map((member) => <button key={member.id} onClick={() => onOpenMember(member)}><span className="avatar">{initials(member)}</span><span><strong>{fullName(member)}</strong><small>{euro(member.recoveredAmount ?? member.price)} · obnovljeno</small></span><Check /></button>)}</div>
      </section>
    </div>
  </div>;
}

function Metric({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: 'neutral' | 'amber' | 'red' | 'lime' }) {
  return <article className={`metric-card tone-${tone}`}><span className="metric-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{hint}</small></div></article>;
}

function MembersScreen({ members, total, filter, search, onFilter, onSearch, onOpenMember, onImport }: {
  members: Member[]; total: number; filter: Filter; search: string; onFilter: (filter: Filter) => void; onSearch: (search: string) => void; onOpenMember: (member: Member) => void; onImport: () => void;
}) {
  return <div className="screen-stack">
    <section className="members-toolbar panel-card">
      <div className="search-box"><Search /><Input aria-label="Pretraži članove" placeholder="Pretraži ime, telefon ili e-mail…" value={search} onChange={(event) => onSearch(event.target.value)} />{search && <button aria-label="Obriši pretragu" onClick={() => onSearch('')}><X /></button>}</div>
      <div className="filter-tabs" aria-label="Filtriraj članove">{filters.map((item) => <button className={filter === item.id ? 'active' : ''} key={item.id} onClick={() => onFilter(item.id)}>{item.label}</button>)}</div>
      <span className="result-count">{members.length} od {total} članova</span>
    </section>
    <section className="panel-card table-card">
      {members.length ? <div className="members-table-wrap"><table className="members-table"><thead><tr><th>Član</th><th>Status</th><th>Paket</th><th>Posljednji dolazak</th><th>Ističe</th><th>Rizik</th><th><span className="sr-only">Otvori</span></th></tr></thead><tbody>{members.map((member) => <tr key={member.id} onClick={() => onOpenMember(member)}><td><span className="avatar">{initials(member)}</span><span><strong>{fullName(member)}</strong><small>{member.phone}</small></span></td><td><span className={`status-pill ${statusClass(member.status)}`}>{t.statuses[member.status]}</span></td><td><strong>{member.packageName}</strong><small>{euro(member.price)} / mj.</small></td><td>{member.lastVisit === '—' ? '—' : prettyDate(member.lastVisit)}<small>{member.visitsThisMonth} posjeta ovog mj.</small></td><td>{prettyDate(member.endDate)}</td><td><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki' : member.risk === 'medium' ? 'Srednji' : 'Nizak'}</span></td><td><ChevronRight /></td></tr>)}</tbody></table></div> : <EmptyState icon={<Search />} title="Nema rezultata" text="Pokušajte drugi izraz ili uklonite aktivni filter." action="Uvezi članove iz CSV-a" onAction={onImport} />}
    </section>
    <div className="csv-note"><FileSpreadsheet /><span><strong>CSV uvoz je spreman za demo.</strong> Koristite kolone: firstname, lastname, phone, email, status, price, startdate, enddate.</span></div>
  </div>;
}

function RadarScreen({ members, onOpenMember }: { members: Member[]; onOpenMember: (member: Member) => void }) {
  const high = members.filter((member) => member.risk === 'high');
  const medium = members.filter((member) => member.risk === 'medium');
  return <div className="screen-stack radar-screen">
    <div className="radar-summary">
      <article className="radar-visual panel-card"><div className="radar-rings"><span className="radar-sweep" />{[1,2,3].map((ring) => <i key={ring} />)}<b className="dot d1" /><b className="dot d2" /><b className="dot d3" /><div><Radar /><strong>{members.length}</strong><small>signala</small></div></div><div><p className="eyebrow">RADAR AKTIVAN</p><h2>Rizik je prioritetizovan</h2><p>Prvo kontaktirajte istekle i članove sa naglim padom dolazaka. PULSE objašnjava svaki signal.</p></div></article>
      <article className="risk-summary-card high"><span><ShieldAlert /></span><div><small>VISOKI RIZIK</small><strong>{high.length}</strong><p>Istekla članarina ili značajan prekid dolazaka.</p></div></article>
      <article className="risk-summary-card medium"><span><Clock3 /></span><div><small>SREDNJI RIZIK</small><strong>{medium.length}</strong><p>Ističe u 7 dana ili posjete postepeno padaju.</p></div></article>
    </div>
    <section className="risk-queue panel-card">
      <div className="section-heading"><div><p className="eyebrow">RED ZA AKCIJU</p><h2>{members.length} članova traži pažnju</h2></div><span className="sorted-label"><CircleGauge /> sortirano po riziku</span></div>
      {members.length ? <div className="risk-cards">{members.map((member, index) => <article className="risk-member-card" key={member.id}><span className="risk-order">{String(index + 1).padStart(2, '0')}</span><span className="avatar large">{initials(member)}</span><div className="risk-member-main"><div className="risk-member-title"><h3>{fullName(member)}</h3><span className={`risk-pill ${riskClass(member.risk)}`}><i />{member.risk === 'high' ? 'Visoki rizik' : 'Srednji rizik'}</span><span className={`status-pill ${statusClass(member.status)}`}>{t.statuses[member.status]}</span></div><p><AlertTriangle /> <strong>Zašto:</strong> {member.riskReason}</p><p className="next-action"><Zap /> <strong>Sljedeći potez:</strong> {member.nextAction}</p></div><div className="risk-value"><small>PRIHOD U RIZIKU</small><strong>{euro(member.price)}</strong><Button onClick={() => onOpenMember(member)}>Otvori <ChevronRight /></Button></div></article>)}</div> : <EmptyState icon={<CheckCircle2 />} title="Radar je čist" text="Nijedan član trenutno nema aktivan signal rizika." />}
    </section>
  </div>;
}

function AutomationsScreen({ automations, onToggle, onPreview }: { automations: Automation[]; onToggle: (id: string, enabled: boolean) => void; onPreview: (id: string) => void }) {
  const queued = automations.reduce((sum, item) => sum + item.sentThisMonth, 0);
  return <div className="screen-stack automation-screen">
    <div className="automation-overview panel-card"><div><span className="automation-zap"><Zap /></span><div><p className="eyebrow">OVAJ MJESEC</p><h2>{queued} poruka pripremljeno</h2><p>Nijedna se ne šalje stvarno u ovom prototipu.</p></div></div><div className="overview-stats"><span><strong>{automations.filter((item) => item.enabled).length}</strong><small>aktivne</small></span><span><strong>{automations.length - automations.filter((item) => item.enabled).length}</strong><small>pauzirane</small></span><span><strong>{queued}</strong><small>aktivnosti</small></span></div></div>
    <section className="automations-list">{automations.map((automation) => <article className={`automation-card panel-card ${automation.enabled ? '' : 'disabled'}`} key={automation.id}><div className="automation-head"><span className="automation-icon">{automation.id === 'expiry' ? <CalendarClock /> : automation.id === 'absence' ? <UserX /> : automation.id === 'winback' ? <RefreshArrow /> : automation.id === 'new-member' ? <Sparkles /> : <Cake />}</span><div><h3>{automation.title}</h3><p>{automation.trigger}</p></div><label className="switch-label"><Switch checked={automation.enabled} onCheckedChange={(checked) => onToggle(automation.id, checked)} /><span>{automation.enabled ? 'Uključena' : 'Pauzirana'}</span></label></div><div className="automation-body"><span><small>PUBLIKA</small>{automation.audience}</span><span><small>KANAL</small>{automation.channel}</span><span><small>OVOG MJESECA</small>{automation.sentThisMonth} poruka</span></div><div className="automation-footer"><span><History />{automation.lastActivity}</span><Button variant="outline" onClick={() => onPreview(automation.id)}><MessageCircle /> Pregled poruke</Button></div></article>)}</section>
    <div className="demo-boundary"><ShieldAlert /><span><strong>Sigurna demo granica</strong>Poruke se samo stavljaju u lokalni red. WhatsApp, Viber i SMS integracije nijesu povezane.</span></div>
  </div>;
}

function RefreshArrow() { return <Activity />; }

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
      <section className={`risk-explanation ${riskClass(member.risk)}`}><span><AlertTriangle /></span><div><p className="eyebrow">PULSE OBJAŠNJENJE RIZIKA</p><h3>{member.risk === 'high' ? 'Potrebna je akcija danas' : member.risk === 'medium' ? 'Kontaktirajte prije isteka' : 'Nema hitnog rizika'}</h3><p>{member.riskReason}</p><div><Zap /><span><strong>Preporučeni potez</strong>{member.nextAction}</span></div></div></section>
      <div className="detail-grid"><Detail icon={<CreditCard />} label="Članarina" value={`${member.packageName} · ${euro(member.price)}`} sub={`${prettyDate(member.startDate)} — ${prettyDate(member.endDate)}`} /><Detail icon={<Activity />} label="Posljednji dolazak" value={member.lastVisit === '—' ? 'Nema dolazaka' : prettyDate(member.lastVisit)} sub={`${member.visitsThisMonth} posjeta ovog mjeseca`} /><Detail icon={<Phone />} label="Telefon" value={member.phone} sub={member.preferredChannel} /><Detail icon={<Mail />} label="E-mail" value={member.email} sub={member.birthday ? `Rođendan ${prettyDate(member.birthday)}` : 'Datum rođenja nije unijet'} /></div>
      <div className="profile-history-grid"><section><div className="subsection-title"><Activity /><h3>Istorija dolazaka</h3></div>{member.attendance.length ? <div className="timeline">{member.attendance.slice(0, 5).map((visit, index) => <div key={`${visit.date}-${index}`}><i /><span><strong>{prettyDate(visit.date)}</strong><small>{visit.time}</small></span></div>)}</div> : <p className="muted-empty">Još nema evidentiranih dolazaka.</p>}</section><section><div className="subsection-title"><CreditCard /><h3>Istorija plaćanja</h3></div>{member.payments.length ? <div className="payment-list">{member.payments.slice(0, 4).map((payment, index) => <div key={`${payment.date}-${index}`}><span><strong>{euro(payment.amount)}</strong><small>{prettyDate(payment.date)} · {payment.method}</small></span><CheckCircle2 /></div>)}</div> : <p className="muted-empty">Još nema evidentiranih uplata.</p>}</section></div>
    </div>
    <aside className="recovery-panel">
      <div className="recovery-panel-title"><span><MessageCircle /></span><div><p className="eyebrow">RECOVERY AKCIJA</p><h2>Pripremi poruku</h2></div></div>
      <p className="panel-copy">Personalizujte prijedlog. Poruka će biti samo stavljena u lokalni red.</p>
      <fieldset className="channel-tabs"><legend className="sr-only">Izaberite kanal</legend>{(['WhatsApp','Viber','SMS'] as Channel[]).map((item) => <button type="button" className={channel === item ? 'active' : ''} key={item} onClick={() => onChannel(item)}>{item}</button>)}</fieldset>
      <label className="message-field"><span>PORUKA ZA {member.firstName.toLocaleUpperCase('me')}</span><Textarea value={message} onChange={(event) => onMessage(event.target.value)} rows={7} /></label>
      <div className="message-meta"><span>{message.length} znakova</span><span><Sparkles /> PULSE prijedlog</span></div>
      {member.queuedMessage && <div className="queued-state"><CheckCircle2 /><span><strong>Poruka je u redu</strong>{member.queuedMessage.channel} · {member.queuedMessage.queuedAt}</span></div>}
      <Button className="lime-button queue-button" onClick={onQueue} disabled={!message.trim()}><Send /> Stavi poruku u red</Button>
      <div className="fake-service-note"><ShieldAlert /> Integracije nijesu povezane; slanje je simulirano.</div>
      <div className="recovery-divider"><span>NAKON OBNOVE</span></div>
      {!renewing ? <Button variant="outline" className="renew-button" onClick={onRenew} disabled={member.status === 'recovered'}><CheckCircle2 /> {member.status === 'recovered' ? 'Već je oporavljen' : t.actions.renew}</Button> : <form className="renew-form" onSubmit={onMarkRenewed}><div className="renew-label"><label htmlFor="renewal-amount">Iznos obnove</label><div className="amount-input"><Input id="renewal-amount" type="number" min="1" step="1" value={renewalAmount} onChange={(event) => onRenewalAmount(event.target.value)} /><span>€</span></div></div><p>Ovo će odmah povećati broj oporavljenih članova i prihod.</p><div><Button type="button" variant="ghost" onClick={onCancelRenew}>Odustani</Button><Button type="submit" className="lime-button"><Check /> Potvrdi obnovu</Button></div></form>}
    </aside>
  </div>;
}

function Detail({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="detail-item"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{sub}</p></div></div>;
}
