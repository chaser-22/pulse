# PULSE Dark Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the existing PULSE prototype as a Dark Premium revenue-recovery operating system while preserving its current data semantics and workflows.

**Architecture:** Keep `Home` in `app/page.tsx` as the state and workflow owner, extract deterministic revenue/lifecycle selectors into `lib/pulse-logic.ts`, and add one isolated lazy-loaded `RevenueSignal` component. Recompose existing screens and replace the accumulated CSS layers with shared Dark Premium tokens and responsive operational layouts.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, shadcn/Base UI primitives, Lucide React, Three.js, Node 22 native test runner.

**Spec:** `docs/superpowers/specs/2026-09-23-pulse-dark-premium-redesign-design.md`

## Global Constraints

- Preserve the current single-page React state model, demo data, Montenegrin localization, routes/views, and existing workflows.
- Do not add persistence, authentication, integrations, new risk formulas, or invented historical comparisons.
- Use the locked colors: `#0E0F10`, `#17191B`, `#1D1F22`, `#222529`, `#EDEDED`, `#9B9FA4`, `#6F7378`, `#26292D`, `#34383D`, `#FF6A5E`, `#2ECC9D`, and `#F5A742`.
- Coral means PULSE signal, attention, unresolved opportunity, selected state, or primary action. Teal appears only for genuine recovery. Amber means medium urgency.
- Operational UI must work without WebGL. The signal must lazy-load, respect reduced motion, use a static fallback, and stay `aria-hidden`.
- Use 150–300ms motion only for orientation, interaction, and genuine state changes.
- Maintain keyboard usability, visible focus, non-color status labels, adequate contrast, and usable tablet touch targets.
- Keep the implementation appropriate for a validation prototype; add no enterprise framework or speculative feature.

## Review Focus

- Corrupt or unavailable local storage must still load the prototype with initial data and no blank screen; verify in Task 7.
- A long member name or risk explanation must wrap without moving the primary row action off-screen at 1280px, 900px, and 390px; verify in Tasks 3, 5, and 7.
- WebGL failure, hidden-tab rendering, and reduced-motion preference must leave the complete Owner hero usable and stop continuous animation; verify in Tasks 4 and 7.
- Renewing the last active high-risk member must update revenue, remove the row, show the recovered lifecycle, and leave a coherent empty priority state; verify in Tasks 1, 3, 6, and 7.
- Switching from Owner to Reception must remove every owner-level financial total and trend from the first viewport; verify in Tasks 5 and 7.

---

### Task 1: Deterministic recovery selectors and lifecycle tests

**Files:**
- Create: `lib/pulse-logic.ts`
- Create: `tests/pulse-logic.test.ts`
- Modify: `package.json`
- Modify: `app/page.tsx:24-28,164-177`

**Interfaces:**
- Consumes: `Member` from `lib/pulse-data.ts` and the existing base metric values from `app/page.tsx`.
- Produces: `RecoveryLifecycle`, `RecoveryActivity`, `getRiskMembers(members)`, `getActionableRevenue(members)`, `getRecoveryLifecycle(member)`, `getRecoveryActivity(members)`, and `getPulseMetrics(members, base)`.

- [ ] **Step 1: Add the native test command**

Update `package.json` scripts to include:

```json
"test": "node --test tests/*.test.ts"
```

- [ ] **Step 2: Write failing selector tests**

Create `tests/pulse-logic.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { initialMembers, type Member } from '../lib/pulse-data.ts';
import {
  getActionableRevenue,
  getPulseMetrics,
  getRecoveryActivity,
  getRecoveryLifecycle,
  getRiskMembers,
} from '../lib/pulse-logic.ts';

const base = { active: 270, expiring: 13, absent: 23, recoveredCount: 12, recoveredRevenue: 445 };

test('actionable revenue includes only current high-risk non-recovered members', () => {
  const expected = initialMembers
    .filter((member) => member.risk === 'high' && member.status !== 'recovered')
    .reduce((sum, member) => sum + member.price, 0);
  assert.equal(getActionableRevenue(initialMembers), expected);
});

test('risk queue excludes recovered members', () => {
  assert.ok(getRiskMembers(initialMembers).every((member) => member.risk !== 'low' && member.status !== 'recovered'));
});

test('lifecycle advances from detected to contacted to renewed', () => {
  const detected = { ...initialMembers[0], queuedMessage: undefined, recoveryOutcome: undefined };
  const contacted = { ...detected, recoveryOutcome: 'replied' as const };
  const renewed = { ...contacted, status: 'recovered' as const, risk: 'low' as const };
  assert.equal(getRecoveryLifecycle(detected), 'detected');
  assert.equal(getRecoveryLifecycle(contacted), 'contacted');
  assert.equal(getRecoveryLifecycle(renewed), 'renewed');
});

test('activity uses only recorded member state', () => {
  const members: Member[] = [
    { ...initialMembers[0], queuedMessage: { channel: 'WhatsApp', text: 'Test', queuedAt: 'Danas' } },
    { ...initialMembers[1], recoveryOutcome: 'follow_up', followUpAt: 'Sjutra' },
    { ...initialMembers[15], status: 'recovered', recoveredAmount: 40 },
  ];
  assert.deepEqual(getRecoveryActivity(members), { contacted: 2, followUps: 1, renewed: 1, recoveredAmount: 40 });
});

test('renewal updates the derived financial picture', () => {
  const target = initialMembers.find((member) => member.risk === 'high' && member.status !== 'recovered')!;
  const before = getPulseMetrics(initialMembers, base);
  const renewed = initialMembers.map((member) => member.id === target.id ? {
    ...member, status: 'recovered' as const, risk: 'low' as const, recoveredAmount: member.price,
  } : member);
  const after = getPulseMetrics(renewed, base);
  assert.equal(after.riskRevenue, before.riskRevenue - target.price);
  assert.equal(after.actionableRevenue, before.actionableRevenue - target.price);
  assert.equal(after.recoveredRevenue, before.recoveredRevenue + target.price);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL because `lib/pulse-logic.ts` does not exist.

- [ ] **Step 4: Implement the selectors**

Create `lib/pulse-logic.ts`:

```ts
import type { Member } from './pulse-data';

export type RecoveryLifecycle = 'detected' | 'contacted' | 'renewed';
export type RecoveryActivity = { contacted: number; followUps: number; renewed: number; recoveredAmount: number };
export type BaseMetrics = { active: number; expiring: number; absent: number; recoveredCount: number; recoveredRevenue: number };

export function getRiskMembers(members: Member[]) {
  return members.filter((member) => member.risk !== 'low' && member.status !== 'recovered');
}

export function getActionableRevenue(members: Member[]) {
  return members
    .filter((member) => member.risk === 'high' && member.status !== 'recovered')
    .reduce((sum, member) => sum + member.price, 0);
}

export function getRecoveryLifecycle(member: Member): RecoveryLifecycle {
  if (member.status === 'recovered') return 'renewed';
  if (member.queuedMessage || member.recoveryOutcome) return 'contacted';
  return 'detected';
}

export function getRecoveryActivity(members: Member[]): RecoveryActivity {
  return {
    contacted: members.filter((member) => member.queuedMessage || member.recoveryOutcome).length,
    followUps: members.filter((member) => member.recoveryOutcome === 'follow_up').length,
    renewed: members.filter((member) => member.status === 'recovered').length,
    recoveredAmount: members.reduce((sum, member) => sum + (member.status === 'recovered' ? member.recoveredAmount ?? 0 : 0), 0),
  };
}

export function getPulseMetrics(members: Member[], base: BaseMetrics) {
  const riskMembers = getRiskMembers(members);
  const recovered = members.filter((member) => member.status === 'recovered');
  return {
    active: base.active + members.filter((member) => member.status !== 'expired').length,
    expiring: base.expiring + members.filter((member) => member.status === 'expiring').length,
    absent: base.absent + members.filter((member) => member.status === 'absent').length,
    highRisk: riskMembers.filter((member) => member.risk === 'high').length,
    riskRevenue: riskMembers.reduce((sum, member) => sum + member.price, 0),
    actionableRevenue: getActionableRevenue(members),
    recoveredCount: base.recoveredCount + recovered.length,
    recoveredRevenue: base.recoveredRevenue + recovered.reduce((sum, member) => sum + (member.recoveredAmount ?? 0), 0),
  };
}
```

- [ ] **Step 5: Wire `Home` to the selectors**

Import the selectors and replace the inline derivation:

```ts
import { getPulseMetrics, getRecoveryActivity, getRiskMembers } from '@/lib/pulse-logic';

const riskMembers = useMemo(() => getRiskMembers(members), [members]);
const highRiskMembers = useMemo(() => riskMembers.filter((member) => member.risk === 'high'), [riskMembers]);
const metrics = useMemo(() => getPulseMetrics(members, BASE_METRICS), [members]);
const recoveryActivity = useMemo(() => getRecoveryActivity(members), [members]);
```

Pass `recoveryActivity` to `Dashboard`. Do not change renewal or outcome behavior in this task.

- [ ] **Step 6: Run tests and production build**

Run: `npm test`

Expected: 5 tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 7: Commit**

```powershell
git add package.json lib/pulse-logic.ts tests/pulse-logic.test.ts app/page.tsx
git commit -m "refactor: centralize recovery state selectors"
```

### Task 2: Dark Premium tokens and application shell

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx:341-384,692-696`

**Interfaces:**
- Consumes: Existing shell class names, shadcn primitives, workspace state, and navigation callbacks.
- Produces: Stable shared tokens and shell styling used by every later task; no data API changes.

- [ ] **Step 1: Record failing palette and duplication guards**

Run:

```powershell
rg -n "#c9ff3d|#b9e64a|lime-button|Refined owner|Refined reception|Refined radar" app/globals.css app/page.tsx
```

Expected: matches show the lime identity and accumulated override layers that violate the approved direction.

- [ ] **Step 2: Replace root tokens**

Set the shared tokens at the top of `app/globals.css`:

```css
:root, .dark {
  --background: #0e0f10;
  --surface: #17191b;
  --surface-2: #1d1f22;
  --surface-active: #222529;
  --foreground: #ededed;
  --secondary: #9b9fa4;
  --muted-foreground: #6f7378;
  --border: #26292d;
  --border-strong: #34383d;
  --primary: #ff6a5e;
  --primary-foreground: #0e0f10;
  --success: #2ecc9d;
  --warning: #f5a742;
  --danger: #ff6a5e;
  --radius: 8px;
  color-scheme: dark;
}
```

Apply `background: var(--background)`, `color: var(--foreground)`, `font-variant-numeric: tabular-nums` for financial values, and a focus ring of `0 0 0 3px #ff6a5e38`.

- [ ] **Step 3: Rename primary-action styling in JSX**

Replace every `className="lime-button"` with `className="pulse-button"`, including combined class names such as:

```tsx
<Button className="pulse-button queue-button" onClick={onQueue} disabled={!message.trim()}><Send /> Stavi poruku u red</Button>
<Button type="submit" className="pulse-button"><Check /> Potvrdi obnovu</Button>
```

- [ ] **Step 4: Consolidate shell CSS**

Retain one definition per shell selector and remove obsolete override blocks. Use this composition:

```css
.app-shell { min-height: 100dvh; display: grid; grid-template-columns: 224px minmax(0, 1fr); background: var(--background); }
.sidebar { position: sticky; top: 0; height: 100dvh; padding: 24px 16px 16px; border-right: 1px solid var(--border); background: #111214; }
.main-panel { min-width: 0; }
.topbar { min-height: 112px; padding: 24px clamp(22px, 3vw, 44px); border-bottom: 1px solid var(--border); background: #0e0f10e8; backdrop-filter: blur(12px); }
.screen-stack { width: min(1480px, 100%); margin-inline: auto; padding: clamp(20px, 3vw, 42px); }
.panel-card { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); box-shadow: none; }
.nav-item.active { color: var(--foreground); border-color: #ff6a5e4d; background: #ff6a5e0d; }
.nav-item.active svg, .pulse-logo .logo-signal, .pulse-logo .logo-arrow { color: var(--primary); stroke: var(--primary); }
.pulse-button { color: #15100f; border-color: var(--primary); background: var(--primary); font-weight: 750; }
.pulse-button:hover { background: #ff7b70; }
```

- [ ] **Step 5: Verify palette and compile**

Run:

```powershell
rg -n "#c9ff3d|#b9e64a|lime-button" app/globals.css app/page.tsx
```

Expected: no matches.

Run: `npm run build`

Expected: successful build.

- [ ] **Step 6: Commit**

```powershell
git add app/globals.css app/page.tsx
git commit -m "refactor: establish PULSE dark premium system"
```

### Task 3: Owner editorial hero and transparent priority queue

**Files:**
- Modify: `app/page.tsx:380,465-534`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `metrics.actionableRevenue`, `RecoveryActivity`, `highRiskMembers`, `onOpenMember`, and `onNavigate`.
- Produces: `Dashboard` with a stable `.owner-hero`, `.priority-queue`, `.risk-disclosure`, and supported recovery activity section. The hero reserves `.signal-stage` for Task 4.

- [ ] **Step 1: Add a failing structural guard**

Run:

```powershell
rg -n "PRIHOD U RIZIKU|moguće riješiti danas|Danas — članovi koji trebaju pažnju|Zašto\?" app/page.tsx
```

Expected: at least the actionable copy, new section title, and inline disclosure are absent.

- [ ] **Step 2: Change the `Dashboard` contract**

Use the explicit props:

```ts
function Dashboard({ metrics, recoveryActivity, highRiskMembers, members, recoveryPulse, onOpenMember, onNavigate, onPilot }: {
  metrics: ReturnType<typeof getPulseMetrics>;
  recoveryActivity: RecoveryActivity;
  highRiskMembers: Member[];
  members: Member[];
  recoveryPulse: number;
  onOpenMember: (member: Member) => void;
  onNavigate: (view: View) => void;
  onPilot: () => void;
})
```

Import `type RecoveryActivity` and pass `recoveryPulse={recoveryPulse}` from `Home`; Task 6 will increment that state.

Declare the state in `Home` now so this task remains independently buildable:

```ts
const [recoveryPulse, setRecoveryPulse] = useState(0);
```

Task 6 connects `setRecoveryPulse` to successful renewal and reset actions.

- [ ] **Step 3: Build the editorial hero**

Replace the current first viewport with:

```tsx
<section className="owner-hero" aria-labelledby="owner-risk-title">
  <div className="owner-hero-copy">
    <p className="eyebrow">PRIHOD U RIZIKU</p>
    <h2 id="owner-risk-title">{euro(metrics.riskRevenue)}</h2>
    <p className="hero-statement">zahtijeva tvoju pažnju</p>
    <p className="actionable-copy">
      Od toga je <strong>{euro(metrics.actionableRevenue)}</strong> vezano za članove visokog prioriteta koje možeš kontaktirati danas.
    </p>
    <button className="hero-link" onClick={() => onNavigate('radar')}>Pogledaj članove <ArrowRight /></button>
    <dl className="hero-outcomes">
      <div><dt>Oporavljeno</dt><dd>{euro(metrics.recoveredRevenue)}</dd></div>
      <div><dt>Obnovljeni članovi</dt><dd>{metrics.recoveredCount}</dd></div>
    </dl>
  </div>
  <div className="signal-stage" aria-hidden="true"><div className="signal-static" /></div>
</section>
```

The explanatory copy must say “vezano za” rather than promise that the amount will be recovered.

- [ ] **Step 4: Add inline risk disclosure and lifecycle**

For each priority row, render a native disclosure with existing data only:

```tsx
<article className="priority-row" key={member.id}>
  <div className="priority-person"><span className="avatar">{initials(member)}</span><span><strong>{fullName(member)}</strong><small>{member.packageName}</small></span></div>
  <span className={`risk-label ${riskClass(member.risk)}`}>{member.risk === 'high' ? 'Visok rizik' : 'Srednji rizik'}</span>
  <p className="priority-reason">{member.riskReason}</p>
  <strong className="priority-value">{euro(member.price)}</strong>
  <button className="priority-action" onClick={() => onOpenMember(member)}>Kontaktiraj <ArrowRight /></button>
  <details className="risk-disclosure">
    <summary>Zašto?</summary>
    <div><p>{member.riskReason}</p><span><strong>Preporučeni potez</strong>{member.nextAction}</span><span><strong>Članarina ističe</strong>{prettyDate(member.endDate)}</span></div>
  </details>
  <RecoveryLifecycle member={member} />
</article>
```

Create the local component:

```tsx
function RecoveryLifecycle({ member }: { member: Member }) {
  const current = getRecoveryLifecycle(member);
  const steps = [['detected', 'Otkriveno'], ['contacted', 'Kontaktirano'], ['renewed', 'Obnovljeno']] as const;
  const currentIndex = steps.findIndex(([id]) => id === current);
  return <ol className="recovery-lifecycle" aria-label="Status oporavka">{steps.map(([id, label], index) => <li className={index <= currentIndex ? 'complete' : ''} aria-current={id === current ? 'step' : undefined} key={id}><i />{label}</li>)}</ol>;
}
```

- [ ] **Step 5: Add supported activity and empty queue states**

Render:

```tsx
<section className="recovery-activity" aria-labelledby="activity-title">
  <div><p className="eyebrow">AKTIVNOST OPORAVKA</p><h2 id="activity-title">Šta se promijenilo u ovom pregledu?</h2></div>
  <dl>
    <div><dt>Kontaktirano</dt><dd>{recoveryActivity.contacted}</dd></div>
    <div><dt>Za praćenje</dt><dd>{recoveryActivity.followUps}</dd></div>
    <div><dt>Obnovljeno</dt><dd>{recoveryActivity.renewed}</dd></div>
    <div className="positive"><dt>Oporavljeni iznos</dt><dd>{euro(recoveryActivity.recoveredAmount)}</dd></div>
  </dl>
</section>
```

When `highRiskMembers.length === 0`, show `Danas nema članova visokog prioriteta.` and a link to the full radar instead of an empty container.

- [ ] **Step 6: Style the hero and rows responsively**

Add one coherent rule set:

```css
.owner-hero { position: relative; min-height: 460px; display: grid; grid-template-columns: minmax(0, .9fr) minmax(420px, 1.1fr); overflow: hidden; border-bottom: 1px solid var(--border-strong); }
.owner-hero-copy { z-index: 2; align-self: center; padding: clamp(32px, 5vw, 72px); }
.owner-hero h2 { margin: 12px 0 0; font-size: clamp(64px, 8vw, 118px); line-height: .88; letter-spacing: -.07em; }
.hero-statement { margin: 12px 0 28px; color: var(--secondary); font-size: clamp(18px, 2vw, 25px); }
.actionable-copy { max-width: 540px; color: var(--secondary); font-size: 16px; line-height: 1.6; }
.actionable-copy strong { color: var(--foreground); }
.priority-row { display: grid; grid-template-columns: minmax(190px, .85fr) 112px minmax(240px, 1.2fr) 82px 126px; gap: 16px; align-items: center; padding: 18px 0; border-top: 1px solid var(--border); }
.priority-action { min-height: 40px; color: var(--primary); }
.risk-disclosure, .recovery-lifecycle { grid-column: 3 / -1; }
.risk-disclosure summary { width: max-content; color: var(--secondary); cursor: pointer; }
.risk-disclosure[open] > div { margin-top: 10px; padding: 14px; border-left: 2px solid var(--primary); background: var(--surface-2); }
.recovery-lifecycle { display: flex; gap: 18px; color: var(--muted-foreground); font-size: 12px; }
.recovery-lifecycle li.complete { color: var(--foreground); }
.recovery-lifecycle li:last-child.complete { color: var(--success); }
```

- [ ] **Step 7: Build and commit**

Run: `npm test`

Expected: all selector tests PASS.

Run: `npm run build`

Expected: successful build.

```powershell
git add app/page.tsx app/globals.css
git commit -m "feat: redesign owner recovery workspace"
```

### Task 4: Three.js Revenue Signal with graceful fallback

**Files:**
- Create: `components/revenue-signal.tsx`
- Create: `components/revenue-signal-scene.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `pulse: number` incremented after a renewal.
- Produces: `RevenueSignal({ pulse }: { pulse: number })`, a lazy-loaded decorative surface that renders `.signal-static` until the WebGL scene is ready.

- [ ] **Step 1: Install the minimal rendering dependencies**

Run: `npm install three @types/three`

Expected: `package.json` and `package-lock.json` add Three.js and its types only.

- [ ] **Step 2: Record the failing component guard**

Run:

```powershell
rg -n "RevenueSignal|prefers-reduced-motion|IntersectionObserver|WebGLRenderer" components app/page.tsx
```

Expected: no Revenue Signal implementation exists.

- [ ] **Step 3: Create the lazy boundary and fallback**

Create `components/revenue-signal.tsx`:

```tsx
import { lazy, Suspense, useEffect, useState } from 'react';

const RevenueSignalScene = lazy(() => import('./revenue-signal-scene'));

export function RevenueSignal({ pulse }: { pulse: number }) {
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  if (reducedMotion) return <div className="signal-static" aria-hidden="true" />;
  return <Suspense fallback={<div className="signal-static" aria-hidden="true" />}><RevenueSignalScene pulse={pulse} /></Suspense>;
}
```

- [ ] **Step 4: Implement the low-cost ribbon scene**

Create `components/revenue-signal-scene.tsx` with these exact lifecycle controls:

```tsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function RevenueSignalScene({ pulse }: { pulse: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const lastPulse = useRef(pulse);
  const pulseStarted = useRef(0);

  useEffect(() => {
    if (pulse !== lastPulse.current) {
      lastPulse.current = pulse;
      pulseStarted.current = performance.now();
    }
  }, [pulse]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { host.dataset.fallback = 'true'; return; }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
    camera.position.set(0, 0, 7);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(7.6, 2.8, 48, 10);
    const base = geometry.attributes.position.array.slice();
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x2a1717, emissive: 0xff6a5e, emissiveIntensity: .16,
      transparent: true, opacity: .72, roughness: .72, metalness: .08,
      side: THREE.DoubleSide, wireframe: false,
    });
    const ribbon = new THREE.Mesh(geometry, material);
    ribbon.rotation.x = -.52;
    ribbon.rotation.z = -.12;
    scene.add(ribbon);
    scene.add(new THREE.AmbientLight(0xffffff, .55));

    let frame = 0;
    let visible = true;
    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .05 });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(host);
    resizeObserver.observe(host);
    resize();

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden) return;
      const positions = geometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        const x = base[index * 3];
        const y = base[index * 3 + 1];
        positions.setZ(index, Math.sin(x * 1.15 + now * .00022) * .22 + Math.cos(y * 2.1 + now * .00013) * .08);
      }
      positions.needsUpdate = true;
      const recovering = pulseStarted.current > 0 && now - pulseStarted.current < 900;
      material.emissive.setHex(recovering ? 0x2ecc9d : 0xff6a5e);
      material.emissiveIntensity = recovering ? .42 * (1 - (now - pulseStarted.current) / 900) + .12 : .16;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="revenue-signal" aria-hidden="true"><div className="signal-static" /></div>;
}
```

- [ ] **Step 5: Mount the component and style the fallback**

In `app/page.tsx`:

```tsx
import { RevenueSignal } from '@/components/revenue-signal';
// inside .signal-stage
<RevenueSignal pulse={recoveryPulse} />
```

In `app/globals.css`:

```css
.signal-stage { position: relative; min-height: 420px; overflow: hidden; background: radial-gradient(circle at 72% 48%, #ff6a5e12, transparent 48%); }
.revenue-signal, .signal-static { position: absolute; inset: 0; }
.revenue-signal canvas { width: 100%; height: 100%; display: block; }
.signal-static { background: linear-gradient(155deg, transparent 22%, #ff6a5e0a 48%, transparent 72%); clip-path: polygon(0 58%, 18% 42%, 43% 50%, 70% 27%, 100% 42%, 100% 68%, 72% 55%, 45% 72%, 18% 62%, 0 78%); }
@media (prefers-reduced-motion: reduce) { .signal-static { transform: none; } }
```

The fallback is an abstract signal surface, not a representational illustration.

- [ ] **Step 6: Build, inspect bundle split, and commit**

Run: `npm run build`

Expected: successful build and a separate lazy-loaded Revenue Signal chunk in `dist/assets`.

```powershell
git add package.json package-lock.json components/revenue-signal.tsx components/revenue-signal-scene.tsx app/page.tsx app/globals.css
git commit -m "feat: add PULSE revenue signal"
```

### Task 5: Reception speed flow and contextual member detail

**Files:**
- Modify: `app/page.tsx:535-560,579-696`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Existing Reception callbacks, `getRecoveryLifecycle(member)`, and all existing member profile callbacks.
- Produces: Search-first Reception toolbar, accessible `WhyRisk` disclosure, and lifecycle-aware member detail without callback contract changes.

- [ ] **Step 1: Record failing content guards**

Run:

```powershell
rg -n "reception-search-shell|member-recovery-path|details.*profile-risk" app/page.tsx
```

Expected: no new search shell or member lifecycle treatment exists.

- [ ] **Step 2: Make Reception search the dominant action**

Replace the toolbar action cluster with:

```tsx
<section className="reception-search-shell" aria-labelledby="reception-search-title">
  <button type="button" className="reception-search" onClick={onFindMember}>
    <Search />
    <span><small>NAJBRŽA AKCIJA</small><strong id="reception-search-title">Pronađi člana</strong><em>Ime, telefon ili e-mail</em></span>
    <kbd>⌘ K</kbd>
  </button>
  <button type="button" className="reception-secondary" onClick={onAddMember}><Plus /> Dodaj člana</button>
  <dl className="staff-stats"><div><dt>Preostalo</dt><dd>{members.length - completed}</dd></div><div><dt>Završeno</dt><dd>{completed}</dd></div><div><dt>Praćenja</dt><dd>{followUps}</dd></div></dl>
</section>
```

Do not implement a global keyboard shortcut; the visual key hint describes the familiar interaction pattern but would be misleading without behavior. Therefore omit `<kbd>` in the shipped markup unless Task 7 adds and verifies the shortcut. The default implementation ships without the hint.

- [ ] **Step 3: Simplify queue actions by current state**

Keep one primary action per row:

```tsx
<div className="task-actions">
  {member.status === 'recovered' ? <span className="task-done"><CheckCircle2 /> Obnovljeno</span> :
   member.recoveryOutcome ? <><span className={`outcome-badge outcome-${member.recoveryOutcome}`}><Check /> {outcomeLabels[member.recoveryOutcome]}</span><button onClick={() => onOpenMember(member)}>Nastavi <ArrowRight /></button></> :
   <><button className="task-primary" onClick={() => onOpenMember(member)}>Kontaktiraj <ArrowRight /></button><button onClick={() => onOutcome(member.id, 'no_answer')}>Bez odgovora</button><button onClick={() => onOutcome(member.id, 'follow_up')}>Prati sjutra</button></>}
</div>
```

Keep the full reason and recommended action in the row. Do not show owner revenue totals in Reception.

- [ ] **Step 4: Add contextual risk explanation to the member detail**

Replace the always-expanded risk block with:

```tsx
<section className={`profile-risk ${riskClass(member.risk)}`}>
  <div><p className="eyebrow">PULSE SIGNAL</p><h3>{member.risk === 'high' ? 'Potrebna je akcija danas' : member.risk === 'medium' ? 'Kontaktirajte prije isteka' : 'Nema hitnog rizika'}</h3></div>
  <details open={member.risk === 'high'}>
    <summary>Zašto?</summary>
    <p>{member.riskReason}</p>
    <dl><div><dt>Ističe</dt><dd>{prettyDate(member.endDate)}</dd></div><div><dt>Posljednji dolazak</dt><dd>{member.lastVisit === '—' ? 'Nije evidentiran' : prettyDate(member.lastVisit)}</dd></div></dl>
    <span><strong>Preporučeni potez</strong>{member.nextAction}</span>
  </details>
</section>
<RecoveryLifecycle member={member} />
```

- [ ] **Step 5: Reorder member detail around action context**

Keep the existing dialog, but move its current blocks into this visual order without changing their internal callbacks:

```text
div.profile-main
section.profile-context
aside.recovery-panel
section.profile-history-grid
```

Preserve `onCheckin`, `onEdit`, `onQueue`, `onRenew`, and `onMarkRenewed`. Keep renewal disabled for recovered members while leaving check-in, edit, and messaging enabled.

- [ ] **Step 6: Apply Reception and detail responsive styling**

Use:

```css
.reception-search-shell { display: grid; grid-template-columns: minmax(360px, 1fr) auto auto; gap: 14px; align-items: stretch; }
.reception-search { min-height: 76px; display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 14px; align-items: center; padding: 16px 18px; border: 1px solid #ff6a5e66; background: #ff6a5e0a; text-align: left; }
.reception-search span { display: grid; gap: 2px; }
.reception-search strong { font-size: 18px; }
.reception-search em { color: var(--secondary); font-size: 13px; font-style: normal; }
.profile-layout { display: grid; grid-template-columns: minmax(0, 1fr) 370px; grid-template-rows: auto auto 1fr; }
.recovery-panel { grid-column: 2; grid-row: 1 / 4; border-left: 1px solid var(--border); background: #131416; }
.profile-risk details > div, .profile-risk details > p { color: var(--secondary); }
@media (max-width: 900px) { .reception-search-shell { grid-template-columns: 1fr auto; } .staff-stats { grid-column: 1 / -1; } }
@media (max-width: 760px) { .profile-layout { display: flex; flex-direction: column; } .recovery-panel { order: 2; border-left: 0; border-top: 1px solid var(--border); } }
```

- [ ] **Step 7: Build and commit**

Run: `npm test`

Expected: selector tests PASS.

Run: `npm run build`

Expected: successful build.

```powershell
git add app/page.tsx app/globals.css
git commit -m "feat: accelerate reception recovery workflow"
```

### Task 6: Recovery feedback, analytics simplification, and shared screen polish

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Existing `markRenewed`, `success`, Owner metrics, occupancy data, and `RevenueSignal({ pulse })`.
- Produces: `recoveryPulse` state, visible renewal cause-and-effect, simplified charts, and consistent Members/Radar/Automations styling.

- [ ] **Step 1: Add a failing pulse wiring guard**

Run:

```powershell
rg -n "recoveryPulse|setRecoveryPulse|data-recovery-feedback|number-shift" app/page.tsx app/globals.css
```

Expected: the renewal-to-signal wiring and feedback selectors are absent.

- [ ] **Step 2: Wire renewal to one signal pulse**

In `Home` add:

```ts
const [recoveryPulse, setRecoveryPulse] = useState(0);
```

At the end of a valid renewal, before closing the dialog:

```ts
setRecoveryPulse((current) => current + 1);
setSuccess(`${memberName} je oporavljen. ${euro(amount)} je dodato oporavljenom prihodu.`);
```

Pass `recoveryPulse` to `Dashboard` and then to `RevenueSignal`. Reset it to `0` in `resetDemo()`.

- [ ] **Step 3: Make success feedback semantic and restrained**

Change the live output to expose recovery styling only when the message represents a renewal:

```tsx
{success && <output className={`success-toast ${success.includes('oporavljen') ? 'is-recovery' : ''}`} aria-live="polite"><CheckCircle2 /><span>{success}</span></output>}
```

Style:

```css
.success-toast { animation: toast-enter 220ms ease-out both; }
.success-toast.is-recovery { border-color: #2ecc9d66; color: var(--foreground); }
.success-toast.is-recovery svg { color: var(--success); }
@keyframes toast-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
```

- [ ] **Step 4: Simplify financial and occupancy analytics**

Keep the current figures but remove decorative legends and animated bar delays. Render the occupancy insight before the bars:

```tsx
<p className="occupancy-insight"><strong>Najveća gužva je danas od 18:00–20:00.</strong> Pojačajte recepciju i članovima preporučite mirniji termin prije 16:00.</p>
```

Use neutral grid lines, coral for the current revenue endpoint, and teal only for recovered contribution. Remove inline `animationDelay` from occupancy bars.

- [ ] **Step 5: Align Members, Radar, and Automations**

Replace bright or legacy classes with the shared semantic styles:

```css
.status-recovered, .task-done, .positive { color: var(--success); }
.risk-high { color: var(--primary); }
.risk-medium { color: var(--warning); }
.members-table tr:hover, .risk-member-card:hover, .automation-row:hover { background: var(--surface-active); }
.members-table th, .risk-reason small, .risk-next small, .automation-meta small { color: var(--muted-foreground); }
.row-open-button:focus-visible, .priority-action:focus-visible, summary:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
```

Keep Radar as a queue, Automations as rows, the desktop member table, and the dedicated mobile member list. Do not add cards or new metrics.

- [ ] **Step 6: Verify motion guards and compile**

Run:

```powershell
rg -n "animationDelay|drop-shadow|box-shadow:.*ff6a5e|transition:.*[4-9][0-9][0-9]ms" app/page.tsx app/globals.css
```

Expected: no decorative stagger, coral glow, or transition above 300ms.

Run: `npm test`

Expected: selector tests PASS.

Run: `npm run build`

Expected: successful build.

- [ ] **Step 7: Commit**

```powershell
git add app/page.tsx app/globals.css
git commit -m "feat: connect recovery actions to visible outcomes"
```

### Task 7: Responsive, accessibility, and end-to-end verification

**Files:**
- Modify: `app/page.tsx` only for defects found during verification
- Modify: `app/globals.css` only for defects found during verification
- Modify: `components/revenue-signal-scene.tsx` only for lifecycle/performance defects found during verification
- Modify: `tests/pulse-logic.test.ts` only when a discovered logic regression needs a permanent test

**Interfaces:**
- Consumes: All completed PULSE screens and interactions.
- Produces: A verified build with no known P0/P1 regressions.

- [ ] **Step 1: Run automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite complete successfully.

Run: `npm run lint`

Expected: no lint errors in changed files.

- [ ] **Step 2: Start the existing development server**

Run: `npm run dev`

Expected: Vite reports a local URL and serves the app without a runtime error. Keep this server running for the remaining checks.

- [ ] **Step 3: Verify the Owner flow at desktop and tablet widths**

At 1440×900, 1280×800, and 900×1024 confirm:

```text
Owner hero shows total risk, actionable high-risk amount, recovered outcome, and the Revenue Signal.
Today's priority rows show name, written risk level, reason, value, action, disclosure, and lifecycle.
Opening “Zašto?” does not shift the primary action off-screen.
Revenue and occupancy appear below the action workflow.
Signal motion is slow, does not capture input, and pauses when the tab is hidden.
```

- [ ] **Step 4: Verify recovery cause-and-effect**

Use one high-risk member and perform:

```text
Open profile → queue message → close/reopen profile → confirm “Kontaktirano” → start renewal → enter a valid positive amount → confirm.
```

Expected:

```text
The member leaves active priority queues, recovered revenue increases by the entered amount, recovered count increases, a restrained success message appears, and the Revenue Signal emits one teal pulse before returning to coral.
```

Repeat by renewing remaining high-risk members until the high-risk Owner queue is empty. Confirm the neutral empty state and full Radar link remain coherent.

- [ ] **Step 5: Verify Reception separation and action speed**

Switch from Owner to Reception at 1280×800 and 900×1024. Confirm:

```text
“Pronađi člana” is the dominant first action.
No total risk revenue, recovered revenue total, monthly revenue trend, or owner financial hero is visible.
Untouched, no-answer, replied, follow-up, and recovered rows each show a valid next action.
Long risk copy wraps without horizontal overflow.
```

- [ ] **Step 6: Verify remaining workflows**

Exercise:

```text
Member search by name, phone, and e-mail.
An unmatched search and its CSV action.
Every member filter.
Check-in for an absent member and the resulting risk reduction.
Member creation and editing.
CSV import with one valid row and a header-only file.
Automation toggle and message preview.
Pilot dialog.
Demo reset after state changes.
```

Expected: existing behavior remains intact and all success/error feedback is readable.

- [ ] **Step 7: Verify mobile, keyboard, and reduced motion**

At 390×844 confirm every screen has no horizontal overflow and actions remain at least 40px high. Navigate the complete shell, priority disclosures, profile, form, and dialogs using only Tab, Shift+Tab, Enter, Space, and Escape.

Enable reduced motion and reload. Expected:

```text
The Revenue Signal renders a static fallback, transitions complete effectively immediately, and all information and actions remain available.
```

Disable WebGL in browser settings or force `new THREE.WebGLRenderer()` to throw during a local check. Expected: the static signal remains and the Owner hero is fully usable.

- [ ] **Step 8: Fix verified defects with the smallest targeted changes**

For each defect, first add a regression assertion to `tests/pulse-logic.test.ts` when it concerns a selector or lifecycle. For visual/layout defects, edit only the owning selector and recheck the affected width plus one adjacent width. After fixes run:

```powershell
npm test
npm run build
npm run lint
```

Expected: all commands succeed.

- [ ] **Step 9: Commit final verification fixes**

```powershell
git add app/page.tsx app/globals.css components/revenue-signal-scene.tsx tests/pulse-logic.test.ts
git commit -m "fix: complete PULSE dark premium verification"
```

If no source changes were needed after verification, do not create an empty commit.
