# PULSE Interface Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing PULSE prototype into a restrained, readable B2B operations interface while preserving every current workflow and Montenegrin user journey.

**Architecture:** Keep the current single-page React state model and existing shadcn primitives. Restructure presentation inside `app/page.tsx`, then replace the visual layer in `app/globals.css` with a compact neutral design system. Validate behavior through the production build and targeted browser interaction checks rather than introducing a new test framework.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, shadcn/Base UI primitives, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-09-22-pulse-interface-refinement-design.md`

## Global Constraints

- Preserve the current information architecture, Montenegrin localization, demo data, state transitions, and workflows.
- Add no routes, integrations, persistence, filters, analytics, or workflow states.
- Use matte neutral surfaces and one restrained lime accent; reserve red and amber for real risk and green for recovery.
- Remove gradients, glows, decorative illustrations, ornamental animations, oversized numerals, and unnecessary nested cards.
- Keep operational body and control text at 14–16px and metadata at 12px or larger.
- Keep primary implementation changes in `app/page.tsx` and `app/globals.css`.
- Preserve all existing UI primitives and data structures.

## Review Focus

- A long Montenegrin risk explanation must wrap without pushing the row action off-screen; verify on the first high-risk queue item at 1280px and 390px.
- An empty filtered member result must retain the existing CSV recovery action and remain vertically compact; verify by searching for an unmatched string.
- A completed, replied, follow-up, and untouched reception task must each expose a clear state and valid next action; exercise all four outcomes in the queue.
- A recovered member must show a disabled renewal action without hiding message, edit, or check-in controls; open a recovered profile on desktop and mobile.
- Workspace switching must never expose owner financial summaries in reception; inspect the reception first viewport after switching from the owner dashboard.

---

### Task 1: Shared visual system and application shell

**Files:**
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Existing CSS class names emitted by `Home`, `NavButton`, dialogs, and shared UI primitives.
- Produces: A neutral token system and consistent shell used by all later page-specific tasks; no TypeScript API changes.

- [ ] **Step 1: Record the failing visual guardrails**

Run:

```powershell
rg -n "gradient|drop-shadow|box-shadow:.*#c7|font-size: (7|8|9|10|11)px|animation:" app/globals.css
rg -n "💪" app/page.tsx
```

Expected: both commands find current violations, proving the existing interface fails the approved visual constraints.

- [ ] **Step 2: Replace the base tokens and shell styling**

In `app/globals.css`, define a restrained system centered on these values and apply it to the body, sidebar, topbar, buttons, inputs, badges, dialogs, and focus states:

```css
:root, .dark {
  --background: #0f1110;
  --foreground: #f2f4f0;
  --surface: #151715;
  --surface-subtle: #191c19;
  --border: #2a2e2a;
  --muted: #9aa099;
  --primary: #b9e64a;
  --danger: #ef6b64;
  --warning: #dfa94d;
  --success: #6fc38a;
  --radius: 8px;
}
```

Use a 232px desktop sidebar, a maximum 1440px content width, 24–32px desktop page padding, 8px panel radius, 36–40px controls, 24–28px page titles, 16–18px section titles, 14px operational text, and 12px metadata. Remove background gradients, glow shadows, hover translation, and decorative entrance animations.

- [ ] **Step 3: Remove the emoji from recovery copy**

Change the expired-member message in `newMessage()` to end after the sentence, with no pictograph:

```ts
if (member.status === 'expired') return `Zdravo ${member.firstName}, primijetili smo da je tvoja članarina istekla. Ako želiš da nastaviš, javi nam i pripremićemo obnovu prije tvog sljedećeg dolaska.`;
```

- [ ] **Step 4: Run the production compiler**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 5: Commit the shared system**

```powershell
git add app/globals.css app/page.tsx
git commit -m "refactor: establish restrained PULSE visual system"
```

### Task 2: Owner recovery hierarchy

**Files:**
- Modify: `app/page.tsx` (`Dashboard`, `Metric`, `RevenueTrend`)
- Modify: `app/globals.css` (dashboard, revenue, metric, chart, and pilot selectors)

**Interfaces:**
- Consumes: Existing `metrics`, `highRiskMembers`, `members`, `onOpenMember`, `onNavigate`, and `onPilot` props.
- Produces: The same `Dashboard` prop contract with a consolidated recovery overview and secondary operational analytics.

- [ ] **Step 1: Confirm the hierarchy currently fails**

Run:

```powershell
rg -n "risk-hero|metric-grid|weekly-proof|recovery-orbit|pilot-cta" app/page.tsx
```

Expected: all five competing presentations are present.

- [ ] **Step 2: Consolidate the owner first viewport**

Restructure `Dashboard` so the first grid contains one recovery summary and one priority queue. The summary must display, in order:

```tsx
<strong className="risk-number">{euro(metrics.riskRevenue)}</strong>
<span>prihoda u riziku</span>
<strong>{euro(metrics.recoveredRevenue)}</strong>
<span>oporavljeno ovog mjeseca</span>
<strong>{completedActions}</strong>
<span>zabilježenih akcija tima</span>
```

Keep `Otvori Churn Radar` as the sole primary action. In the adjacent queue, keep member name, risk reason, monthly value, and profile action. Remove the live badge and decorative risk icon treatment.

- [ ] **Step 3: Collapse secondary metrics and remove duplicate recovery storytelling**

Replace six independent metric cards and the weekly proof chain with one compact metrics section using dividers. Retain active, expiring, absent, high risk, recovered count, and recovered revenue, but show no icon tile per metric. Remove the recovery orbit section entirely because recovered revenue already appears in the primary summary and revenue breakdown.

- [ ] **Step 4: Simplify revenue and occupancy**

Keep the existing data and charts, but use one neutral chart panel, thin grid lines, tabular numbers, and lime only for the active series/recovery contribution. Convert the peak note to a simple bordered annotation row. Render the pilot entry as a quiet footer action rather than a promotional panel.

- [ ] **Step 5: Verify owner edge cases**

At 1280px and 390px, confirm the first viewport reveals risk, recovered revenue, priority members, and team activity in that order. Confirm long risk reasons wrap, the empty recovered-member list does not leave a blank decorative panel, and all financial values use aligned numerals.

- [ ] **Step 6: Build and commit**

Run: `npm run build`

Expected: successful production build.

```powershell
git add app/page.tsx app/globals.css
git commit -m "refactor: focus owner workspace on revenue recovery"
```

### Task 3: Reception queue and member directory

**Files:**
- Modify: `app/page.tsx` (`StaffBoard`, `MembersScreen`)
- Modify: `app/globals.css` (reception, queue, directory, and mobile list selectors)

**Interfaces:**
- Consumes: Existing staff callbacks (`onOpenMember`, `onOutcome`, `onAddMember`, `onFindMember`) and member-directory filter/search callbacks.
- Produces: Unchanged callback contracts with faster queue scanning and member lookup.

- [ ] **Step 1: Confirm reception is currently panel-led**

Run:

```powershell
rg -n "reception-launchpad|staff-briefing|staff-boundary" app/page.tsx
```

Expected: three explanatory/summary panels surround the work queue.

- [ ] **Step 2: Convert reception header to an operational toolbar**

Merge search/navigation, add-member, and today-contact actions into one compact section. Replace the briefing card with inline counters for remaining, completed, and follow-up tasks. Remove the repeated role-boundary panel; workspace navigation already communicates the separation.

- [ ] **Step 3: Refine queue rows**

Use a desktop grid with stable columns for priority/member, risk reason, recommended action, status, and controls. Keep `Evidentiraj obnovu` as the primary untouched-row action. Preserve the existing outcome buttons and completed states. On mobile, order each task as member identity, reason, recommended action, then controls; do not preserve empty desktop columns.

- [ ] **Step 4: Normalize member directory**

Keep the desktop table and mobile list. Increase operational text to at least 14px, metadata to 12px, standardize 56px desktop rows, reduce pill saturation, and make search the visual anchor of the toolbar. Preserve every filter and empty-state CSV action.

- [ ] **Step 5: Exercise queue and directory states**

Verify untouched, no-answer, replied, follow-up, and recovered rows. Search for an unmatched member string and confirm the empty state remains compact with CSV action. Switch from owner to reception and confirm owner revenue summary, trend, and total business result are absent.

- [ ] **Step 6: Build and commit**

Run: `npm run build`

Expected: successful production build.

```powershell
git add app/page.tsx app/globals.css
git commit -m "refactor: turn reception into a focused work queue"
```

### Task 4: Churn Radar, member profile, and automations

**Files:**
- Modify: `app/page.tsx` (`RadarScreen`, `MemberProfile`, `Detail`, `AutomationsScreen`)
- Modify: `app/globals.css` (radar, profile, automation, dialog, and responsive selectors)

**Interfaces:**
- Consumes: Existing member, automation, channel, message, outcome, edit, check-in, and renewal props.
- Produces: The same public component contracts and all existing user actions.

- [ ] **Step 1: Confirm decorative structures are present**

Run:

```powershell
rg -n "radar-rings|risk-summary-card|detail-grid|automation-zap" app/page.tsx
```

Expected: decorative radar, separate summary cards, profile tiles, and automation icon treatment are present.

- [ ] **Step 2: Convert Churn Radar to a table-like priority queue**

Remove radar rings and separate high/medium cards. Add a compact summary line for total, high, and medium risk. Render each queue item with aligned fields for member/status, risk reason, monthly value, next action, and `Otvori profil`. Use a 3px semantic edge or small marker for high risk rather than a red container.

- [ ] **Step 3: Simplify the member profile**

Keep the identity header and quick actions. Replace `detail-grid` tiles with grouped labeled rows under membership/contact and attendance/payment sections. Render the risk explanation as a restrained bordered section. Keep the recovery panel visible on desktop and move it immediately after identity/risk on mobile. Preserve channel switching, message editing, queueing, check-in, edit, and renewal behavior.

- [ ] **Step 4: Normalize automations and dialogs**

Render automations as consistent grouped rows with title, trigger, audience, channel, activity, toggle, and preview action. Remove large icon surfaces. Standardize dialog maximum widths, 24px desktop padding, 16px mobile padding, 40px controls, and quiet safe-demo notes.

- [ ] **Step 5: Verify profile and automation edge cases**

Open a high-risk, medium-risk, and recovered profile at desktop and mobile widths. Confirm long messages scroll within the dialog, histories remain readable, recovered renewal is disabled while other actions remain available, and dialog controls are not clipped. Toggle and preview each automation without changing its existing behavior.

- [ ] **Step 6: Build and commit**

Run: `npm run build`

Expected: successful production build.

```powershell
git add app/page.tsx app/globals.css
git commit -m "refactor: simplify radar profiles and automations"
```

### Task 5: Responsive and consistency verification

**Files:**
- Modify: `app/globals.css` only if verification exposes a layout defect.
- Modify: `app/page.tsx` only if verification exposes duplicate or inaccessible markup.

**Interfaces:**
- Consumes: Completed interface from Tasks 1–4.
- Produces: A production-ready, responsive refinement with unchanged workflows.

- [ ] **Step 1: Run static constraint checks**

Run:

```powershell
rg -n "gradient|drop-shadow|font-size: (7|8|9|10|11)px|💪" app/page.tsx app/globals.css
```

Expected: no matches.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript passes and Vite emits the production bundle.

- [ ] **Step 3: Perform desktop interaction verification**

At approximately 1440×900, exercise owner/reception switching, every navigation item, member search and filters, profile opening, check-in, all contact outcomes, message queueing, renewal, edit/create dialogs, CSV entry point, automation toggles/previews, and demo reset. Confirm the strongest action remains visually clear at every stage.

- [ ] **Step 4: Perform mobile interaction verification**

At approximately 390×844, repeat navigation, member lookup, profile actions, and reception queue use. Confirm there is no unintended horizontal scrolling, the desktop tables become purpose-built mobile rows, secondary analytics are condensed, and primary actions remain visible.

- [ ] **Step 5: Inspect consistency and regression risks**

Confirm 8px panel radius, consistent 36–40px controls, semantic colors, 12px minimum metadata, aligned financial numerals, compact empty states, and normalized dialogs. Confirm no owner financial totals appear in reception and all visible product text remains Montenegrin.

- [ ] **Step 6: Commit any verification fixes**

```powershell
git add app/page.tsx app/globals.css
git commit -m "fix: complete responsive PULSE consistency pass"
```
