# Agent Playbook

## Purpose
- Capture the shared agreements for anyone acting as an implementation agent on this project.
- Keep the guidance close to the codebase so it can evolve alongside the product.

## Core Disciplines
- **Run tests** before handing work back. At minimum execute `npm run test:e2e`; add unit/integration commands as they become available.
- **Add coverage** whenever you introduce new user-facing behaviour or non-trivial logic. Extend the Playwright suite (or future test layers) so the change is observable.
- **Validate builds** if tooling, dependencies, or bundling paths change. `npm run build` is the current canonical command.

## Implementation Notes
- **Balance file structure**: prefer cohesive modules over sprawling everything-in-one-place, but avoid scattering single-purpose files unless they unlock clear reuse or readability.
- **React conventions**: keep components lean; extract hooks/utilities when logic is reusable or complex.
- **Styling**: centralise shared styling in `src/styles.css` until scale demands modularisation; document any bespoke tokens.

## Workflow Reminders
- Reflect process updates in this document as they emerge.
- Flag surprises (failing tests, unexpected diff noise) to the team instead of silently patching around them.
