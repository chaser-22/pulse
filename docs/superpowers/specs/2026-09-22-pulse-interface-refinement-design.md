# PULSE Interface Refinement Design

## Objective

Refine the existing PULSE validation prototype into a restrained, credible B2B operations product for independent gym owners and reception staff. Preserve the current information architecture, Montenegrin localization, demo data, state transitions, and workflows. This pass changes presentation and information hierarchy, not product scope.

## Visual thesis

PULSE will use a matte graphite operations-console aesthetic. Neutral surfaces, subtle borders, compact spacing, and readable typography carry the interface. The existing lime brand color remains the single primary accent, reserved for primary actions, selected states, and recovered outcomes. Red and amber communicate genuine risk only.

Remove gradients, glows, decorative illustrations, ornamental animations, oversized numerals, and unnecessary nested cards. Use a restrained radius scale, consistent controls, and tabular numerals for financial values.

## Shared system

- Establish shared tokens in `app/globals.css` for neutral surfaces, borders, text hierarchy, semantic status colors, spacing, radii, control heights, and focus treatment.
- Use a compact type scale: page titles around 24–28px, section titles around 16–18px, primary body and controls at 14–16px, and metadata no smaller than 12px.
- Replace card-per-metric layouts with sections, summary rows, dividers, and tables where the information belongs to one operational context.
- Keep shadows exceptional and subtle. Use borders and surface contrast for separation.
- Standardize buttons, pills, inputs, table rows, empty states, dialogs, and responsive spacing.
- Remove decorative motion; retain only functional state transitions where they aid orientation.
- Remove emoji from generated recovery copy.

## Owner workspace

The first viewport answers four questions in order: revenue at risk, revenue recovered, members requiring attention, and whether the team is acting.

- Replace the decorative risk hero and competing revenue/KPI cards with a consolidated recovery overview.
- Keep revenue at risk dominant; present recovered revenue and action progress as quieter supporting figures.
- Place the prioritized member list beside or immediately below the recovery overview with member name, reason, value, and action state visible.
- Reduce the six KPI cards to a compact secondary metrics strip or grouped rows.
- Keep financial trend and occupancy information below the recovery workflow. Simplify charts to neutral grids and one accent series.
- Remove the decorative recovery orbit and redundant recovery summaries. Keep one strongest presentation of recovered revenue.
- Demote the pilot explanation so it does not compete with daily operations.

## Reception workspace

Treat reception as a work queue rather than an analytics dashboard.

- Put member search and frequent actions first in a compact toolbar.
- Present today's totals as small supporting counters rather than a briefing card.
- Use a dense, repeatable queue row for member, risk reason, recommended action, contact status, and next action.
- Make one primary action visually dominant per row; keep outcome actions secondary but immediately available.
- Keep financial totals and owner analytics absent. Membership value may remain only where it helps prioritize an individual recovery task.
- Remove explanatory panels that repeat role boundaries already expressed by the workspace separation.

## Members and profiles

- Keep the member directory as a table on desktop, with improved row density, alignment, search prominence, and restrained status treatment.
- Preserve the dedicated mobile member list rather than stacking the desktop table.
- Restructure the profile into a clear identity header followed by grouped membership, attendance, payment, risk, and contact sections.
- Replace the dashboard-like detail tile grid with labeled rows or compact grouped sections.
- Keep the recovery composer and renewal action visible as the primary action area, using a stable side panel on desktop and a prioritized section on mobile.
- Preserve check-in, edit, message queue, and renewal behavior unchanged.

## Churn Radar

- Remove the decorative radar visualization and separate risk-summary cards.
- Use a concise queue summary followed by a table-like prioritized list.
- Make member name, risk reason, monthly value, status, and next action immediately scannable.
- Indicate high risk with a small semantic marker and localized accent, not a red container.
- Preserve current ordering and profile-opening behavior.

## Automations and dialogs

- Retain existing automation controls and preview behavior while simplifying cards into consistent rows or restrained grouped objects.
- Normalize dialog width, padding, header spacing, form controls, and footer actions.
- Preserve all safe-demo explanations, but shorten or visually demote repeated notices.

## Responsive behavior

- Desktop remains dense and efficient, with aligned columns and compact section spacing.
- Tablet reduces secondary columns before stacking primary operational content.
- Mobile prioritizes the main metric, member identity, risk reason, and primary action. Secondary analytics, long explanations, and decorative context are hidden or condensed.
- Ensure controls remain touch-friendly and text does not fall below the defined readable scale.

## Implementation boundaries

Primary changes are limited to `app/page.tsx` and `app/globals.css`. Existing UI primitives and data structures remain in place. No new routes, integrations, persistence, filters, analytics, or workflow states will be added. Component extraction is allowed only when it materially improves clarity within these files and does not expand scope.

## Verification

- Run the production build and TypeScript validation.
- Exercise workspace switching, navigation, member search and filters, profile opening, check-in, outcome recording, message queueing, renewal, member editing/creation, CSV entry point, automation toggles, and demo reset.
- Inspect owner, reception, members, radar, automations, and member profile at representative desktop and mobile widths.
- Confirm no horizontal overflow, clipped controls, unreadably small operational text, decorative gradients/glows, or duplicate nearby summaries remain.
- Confirm owner financial data remains absent from the reception workspace and all visible product copy remains Montenegrin.
