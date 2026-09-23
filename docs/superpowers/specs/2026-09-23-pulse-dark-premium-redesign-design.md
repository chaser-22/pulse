# PULSE Dark Premium Redesign

## Objective

Transform the existing PULSE validation prototype into a distinctive, premium revenue-recovery operating system for gym owners and reception teams. Preserve the current React state model, demo data, Montenegrin localization, routes/views, member lifecycle, recovery outcomes, and revenue semantics. Change the visual system, information hierarchy, page composition, and interaction feedback wherever needed to make the product clearer, more trustworthy, and more action-oriented.

The governing product sequence is:

**Signal → Attention → Action → Recovery**

Within seconds, an owner should understand what revenue is at risk, how much is realistically actionable, who needs attention, why they need attention, and what changed after the team acted. Reception should be able to find a member, understand the situation, and take the next action with minimal friction.

## Scope and constraints

- Keep the existing single-page React architecture, state transitions, demo reset behavior, member data, automation data, charts, and business logic unless presentation requires a narrowly scoped refactor.
- Do not add persistence, authentication, integrations, new risk formulas, or invented historical data.
- Do not invent business rules. Derived values must be simple, visible aggregations of existing records.
- Preserve all current workflows: workspace switching, navigation, search/filtering, profile opening, check-in, message queueing, recovery outcomes, renewal, member editing/creation, CSV import, automation toggles/previews, pilot entry, and demo reset.
- Optimize for desktop, laptop, and tablet. Mobile remains usable, but the primary pilot surfaces are owner desktop and reception laptop/tablet.
- Keep the implementation appropriate for a validation prototype: expressive enough to validate perceived value and trust, but without enterprise abstractions.

## Recommended architecture

Evolve the current application rather than replacing it. Keep `app/page.tsx` as the state and workflow owner and `lib/pulse-data.ts` as the demo-data source. Refactor presentation into focused local components only where doing so materially improves clarity or makes behavior independently testable.

Add an isolated `RevenueSignal` component for the Three.js visual. It receives semantic state from the application—neutral/risk by default and a short recovered pulse after renewal—but owns rendering, performance controls, reduced-motion handling, lazy loading, and its static fallback. The operational interface must never depend on WebGL availability.

The primary implementation surfaces are:

- `app/globals.css`: Dark Premium tokens, shared layout and component styling, motion, responsive behavior, accessibility states, and removal of obsolete/duplicated visual layers.
- `app/page.tsx`: page composition, owner/reception hierarchy, transparent risk interactions, recovery feedback, and state-to-visual wiring.
- `components/revenue-signal.tsx`: isolated Three.js signal implementation and fallback.
- `package.json` and lockfile: add only the Three.js runtime and required TypeScript definitions.
- Targeted tests or deterministic verification helpers if the current repository supports them without introducing a new test framework. Otherwise, verify through the production build plus structured browser interaction checks.

## Dark Premium visual system

Use these locked core colors:

- Background: `#0E0F10`
- Elevated surface: `#17191B`
- Secondary surface: `#1D1F22`
- Hover/active: `#222529`
- Primary text: `#EDEDED`
- Secondary text: `#9B9FA4`
- Muted text: `#6F7378`
- Border: `#26292D`
- Strong border: `#34383D`
- PULSE coral: `#FF6A5E`
- Recovered teal: `#2ECC9D`
- Warning amber: `#F5A742`

Coral is reserved for the PULSE signal, unresolved opportunity, selected/active state, and primary actions. Teal appears only for genuine positive outcomes such as renewed membership or recovered revenue. Amber marks medium urgency. Most of the interface remains neutral.

Typography and spacing create hierarchy before containment. Use large editorial financial type in the Owner hero, compact operational type in queues, tabular numerals for money, restrained radii, subtle borders, and little or no shadow. Avoid nested cards, gradients, glow, glassmorphism, excessive badges, and decorative icon containers.

Shared controls must provide visible keyboard focus, adequate contrast, non-color status labels, and touch targets appropriate for reception tablets. Functional transitions use 150–300ms timings and are disabled or reduced under `prefers-reduced-motion`.

## Application shell

Retain the Owner/Reception workspace separation and current navigation destinations. Restyle the shell as a calm operating environment: neutral sidebar, concise page framing, coral selected state, and quieter secondary controls. Remove the current lime identity and any leftover duplicated style rules from the prior visual pass.

Owner navigation may show recovered revenue as a quiet result indicator. Reception navigation may show outstanding work count, but must never expose owner-level revenue totals or trend summaries.

## Owner experience

### Editorial revenue hero

The Owner first viewport becomes the strongest expression of PULSE. It contains one composed hero rather than a KPI-card row.

The hierarchy is:

1. `PRIHOD U RIZIKU`
2. Total at-risk revenue from the existing `riskMembers` aggregation.
3. A short statement that it requires attention.
4. Actionable revenue: the sum of existing monthly values for current high-risk, non-recovered members.
5. One clear action leading to the prioritized risk queue.
6. Recovered revenue as a supporting positive outcome, not a competing headline.

The actionable figure is intentionally a transparent aggregation, not a new prediction model. Copy must describe it as the amount attached to high-priority members that can be acted on now, not as guaranteed recovery.

The `RevenueSignal` occupies a supporting visual region inside the hero without obscuring text or interaction. The static fallback preserves composition if the canvas does not load.

### Today’s priorities

Immediately after or alongside the hero, show `Danas — članovi koji trebaju pažnju` as a compact action queue. Each row includes:

- member identity;
- high/medium urgency in text;
- concise human reason;
- monthly value;
- current lifecycle state where present;
- one primary contextual action.

Rows use separators and alignment rather than large containers. High priority receives a restrained coral marker; medium priority uses amber. Selecting a row opens the existing member detail experience.

### Transparent risk explanation

Risk is expressed as `Visok rizik`, `Srednji rizik`, or `Nizak rizik`, never as an unexplained numeric score. Existing `riskReason`, attendance, expiration, and visit data provide the explanation.

Where compact rows cannot show enough context, a `Zašto?` control expands inline to show available evidence such as days without attendance, prior attendance pattern stated only when directly supported by existing copy/data, expiration date, and recommended next action. Expansion must be keyboard accessible and must not require a modal.

### What changed

Show a compact activity/result section only from supported current state:

- queued contacts;
- recorded outcomes;
- members renewed during the demo session;
- existing recovered member count and recovered amount.

Do not label these values as “since yesterday” or claim a time comparison that the data model cannot prove. Suitable framing is `Aktivnost oporavka` or `Šta se promijenilo u ovom pregledu`.

### Supporting analytics

Keep the revenue view and occupancy only where they aid decisions. Simplify chart gridlines, legends, labels, and series colors. Coral may identify current attention; teal may identify recovered contribution. Convert occupancy into a direct sentence using the existing occupancy dataset, such as the supported peak-period insight. Supporting analytics must remain below the recovery workflow.

## PULSE Revenue Signal

Create one signature Three.js visualization: a slow dimensional ribbon or wave field representing revenue health.

Visual behavior:

- dark translucent material and low-contrast depth;
- restrained coral energy concentrated along one flowing signal;
- extremely slow idle motion;
- no particles, globe, orb, ECG line, cubes, holographic treatment, or dramatic camera motion;
- no pointer-chasing or decorative interaction that competes with work.

Technical behavior:

- lazy-load Three.js and the component where practical;
- cap renderer pixel ratio and use a low-complexity geometry/material;
- pause or minimize work when the surface is not visible;
- respect `prefers-reduced-motion` by rendering a static frame or CSS fallback;
- provide a static fallback for unsupported WebGL or loading failure;
- keep the canvas `aria-hidden` and expose all meaning through adjacent text.

When a member is renewed, send a transient recovery signal to the component. It produces one short teal wave and then returns to the neutral/coral idle state. It must not loop, flash, or block input.

## Recovery lifecycle and feedback

Make the existing cause-and-effect visible:

`Otkriveno → Kontaktirano → Obnovljeno`

Map current data to this lifecycle without adding a backend state machine:

- `Otkriveno`: at-risk member without a queued message or recorded outcome;
- `Kontaktirano`: queued message or recorded contact outcome;
- `Obnovljeno`: existing recovered status or a renewal completed during the session.

After renewal:

- update the member through the existing `markRenewed` behavior;
- remove the member from active risk and priority queues through existing derived filtering;
- update recovered count and amount;
- show restrained success feedback and a number transition;
- trigger the single teal `RevenueSignal` response;
- retain access to profile history and non-conflicting member actions.

No confetti, explosions, streaks, artificial urgency, or gamification.

## Reception experience

Reception uses the same visual language with a speed-first composition.

The primary control is `Pronađi člana`, presented as an immediate, prominent search affordance. The flow is:

`search → understand status → take action`

Keep daily queue counts compact and operational. Each queue row shows member, reason, recommended action, current contact state, and the next valid control. Check-in, renew, contact, and follow-up actions must remain obvious. Owner-level revenue summaries, financial trends, and strategic analytics stay absent.

Desktop/laptop rows use aligned columns. Tablet collapses explanations beneath identity while keeping the action visible. Touch targets remain at least 40px where practical.

## Member detail

Use the existing contextual dialog as a drawer-like operational workspace rather than adding navigation. Prioritize:

1. member identity and membership status;
2. expiration and last visit;
3. transparent risk explanation;
4. contact information and preferred channel;
5. recovery lifecycle;
6. relevant actions;
7. attendance and payment history.

Keep operational context visible while acting. `Zašto?` expands evidence inline. Renewal, contact, check-in, and editing keep their current semantics. A renewed member shows a clear completed state without hiding unrelated actions.

## Members, Radar, and Automations

Retain the current member directory, Churn Radar destination, and automation controls, but align them with the Dark Premium system.

- Member directory remains a desktop table and a purpose-built mobile list, with search as the visual anchor.
- Churn Radar becomes a transparent prioritized queue rather than a decorative risk visualization.
- Automations remain restrained operational rows. Preserve toggles, channel, trigger, activity, and preview behavior.
- Dialogs share consistent padding, borders, controls, and focus behavior.

These screens support the core workflow and must not compete visually with the Owner hero.

## Error handling and graceful degradation

- A Three.js loading or rendering failure falls back silently to a static signal composition; all financial and operational content remains available.
- Empty filtered member results retain the CSV/import recovery action.
- Empty priority queues show a concise neutral success state without fabricating work.
- Long names and risk explanations wrap without displacing primary actions or causing horizontal overflow.
- Existing demo reset remains the recovery path for local state experimentation.

## Verification

Run the production build and type checking through the existing build command. Exercise the following workflows in a browser:

- Owner and Reception workspace switching;
- navigation across all existing views;
- member search, filters, empty result, and CSV entry point;
- profile opening and closing;
- check-in;
- message queueing across available channels;
- no-answer, replied, follow-up, and declined outcomes;
- renewal and its updates to metrics, queues, lifecycle, success feedback, and the Revenue Signal;
- member creation and editing;
- automation toggle and preview;
- pilot dialog and demo reset.

Visually inspect Owner, Reception, member directory, Churn Radar, automations, and member detail at representative desktop, laptop/tablet, and mobile widths. Confirm:

- no horizontal overflow or clipped actions;
- no owner financial summaries in Reception;
- no color-only state communication;
- keyboard-visible focus and usable tab order;
- reduced-motion behavior;
- static signal fallback;
- restrained GPU usage during idle rendering;
- all visible product copy remains Montenegrin;
- displayed values derive from existing data and update after actions.

## Out of scope

- Backend persistence or real messaging;
- new routes or authentication;
- new risk-scoring or churn logic;
- fabricated historical comparisons;
- onboarding 3D, import animation, social imagery, or secondary visual experiments;
- a new enterprise design-system package;
- deployment or hosting changes unless separately requested.
