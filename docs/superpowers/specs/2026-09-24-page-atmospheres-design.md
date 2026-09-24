# Page atmospheres design

## Purpose

Make PULSE feel more intentional and modern without compromising the speed and clarity needed by gym owners and reception staff. The visual layer must direct attention to decisions and actions, not compete with them.

## Experience direction

PULSE will use a single reusable, lazy-loaded Three.js canvas behind page content. Each workspace view supplies a visual preset rather than mounting multiple renderers. The canvas is decorative, pointer-transparent, and hidden when the user prefers reduced motion or WebGL is unavailable.

The owner overview replaces the current revenue signal with **Revenue Constellation**: a deep spatial field of signal nodes, orbital paths, and a recovery core. Current risk/recovery data drives its intensity and pulse so it reads as a live business instrument rather than an illustration.

Other presets remain deliberately quieter:

- **Reception:** a flowing task lane, suggesting steady progress through today’s contacts.
- **Members:** a low-contrast member constellation, reinforcing search and data overview without reducing table readability.
- **Risk radar:** a radial signal sweep with clustered risk points.
- **Automations:** a restrained message-flow grid with signals moving through channels.

## Architecture

`PageAtmosphere` receives `view`, `workspace`, and small numeric metrics. It lazy-loads one Three.js scene and switches its geometry/material preset in place as views change. It owns the render loop, visibility handling, resize handling, context-loss fallback, and cleanup. The existing `RevenueSignal` component is removed from the owner hero in favour of this system.

Data remains presentation-only: existing member and recovery metrics are passed in; no data model or interaction behaviour changes.

## Layout and accessibility

The polish pass establishes protected content layers above each canvas, preserves readable contrast in both themes, and adds responsive containment rules for dense controls, table headers, page titles, and cards. Decorative canvases are `aria-hidden`, never receive pointer events, and pause off-screen or in hidden tabs. Reduced-motion users receive the established CSS/static presentation.

## Verification

Add focused deterministic tests for preset selection and motion-frame helpers. Run the existing test suite, production build, and targeted lint after the cohesive implementation batch. Perform one desktop and one compact visual check, fixing only observed layout or rendering defects.
