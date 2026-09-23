# PULSE Repository

PULSE is currently a validation prototype. Prefer the smallest maintainable implementation that supports the pilot; avoid premature enterprise complexity.

## Scope

* Search or narrow the problem before opening many files.
* Inspect only the files and dependencies needed to make the change safely.
* Stop exploring once there is enough evidence to implement correctly.
* Do not refactor unrelated code.

## Changes

* Prefer the smallest correct change and targeted edits.
* Preserve existing architecture, conventions, and unrelated behavior unless the task requires changing them.
* Reuse established repository context when still reliable; re-check it when the code may have changed or correctness depends on it.

## Planning and verification

* Implement straightforward tasks directly.
* For risky or cross-cutting changes, identify affected areas and verification needs before editing.
* Start with the smallest relevant verification and expand when scope, dependencies, failures, or risk justify it.

## Repository-specific facts

- Dev: `npm run dev`
- Test: `npm test`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
