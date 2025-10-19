# ECS Dev Tooling Tasks

## 1. Lightweight Observer Foundation
- [x] Add optional instrumentation hooks inside `World` (`onEntityCreated`, `onComponentChanged`, `onSystemRun` etc.).
- [x] Emit structured events with timestamps and payloads; guard behind dev-only flag to avoid prod overhead.
- [x] Provide typed observer interface and registration API (`world.observe(observer)`).
- [x] Document event contract and lifecycle ordering.

### Event Contract
- `entity-created` fires immediately after `createEntity` allocates the id and before change listeners run.
- `component-changed` emits for `added`, `updated`, and `removed` transitions with current and previous payloads.
- `entity-destroyed` triggers after components are detached and includes the removed components snapshot.
- `system-run` records explicit invocations of `world.reportSystemRun`, carrying phase, tick, and timing metadata.
- Events always include a high-resolution timestamp (falling back to `Date.now()` outside the browser).

## 2. Instrumentation Adapters
- [x] Create standalone observable stream (e.g., simple event emitter) that buffers the last N events.
- [x] Expose helper utilities for aggregations (e.g., per-system durations, per-entity mutation counts).
- [x] Wire adapters into any existing tick loop once available.

### Telemetry Adapter Notes
- `createWorldTelemetry` wraps `world.observe` to buffer events (default 200) and surfaces stats (`componentChanges`, `entityEventCounts`, `systemRuns`).
- Snapshots retain the total event count even when the ring buffer evicts older entries, enabling downstream deltas.
- Consumers can subscribe for updates, clear/reset the buffer, and dispose the adapter to release observers.

## 3. Inspector Overlay UI
- [x] Scaffold React overlay panel toggled via UI control.
- [x] List recent events, entity activity, and system stats sourced from telemetry stream.
- [ ] Add pinning to focus on a single entity with live updates.
- [ ] Persist inspector visibility and pinned entity between reloads.

## 4. System Timeline View
- Capture system execution events and render a per-tick waterfall chart (Tick N rows, system spans).
- Highlight slow systems based on configurable threshold.
- Allow filtering by system name and tick range.

## 5. Event & Command Console
- Surface message bus publications/subscriptions (hook into bus when implemented).
- Display producer entity/system, payload summary, and resulting subscribers.
- Provide search/filter and ability to pause/resume streaming.

## 6. State Snapshot & Diff
- Implement snapshot API on `World` to clone component data with minimal copying (structured cloning or serialization).
- Store snapshots in ring buffer; enable manual capture from UI.
- Diff snapshots to show component value changes per entity.

## 7. Tick Debugger Controls
- Introduce tick controller that can pause, single-step, or fast-forward the simulation.
- Integrate controls into overlay (play/pause/step buttons, current tick counter).
- Ensure systems respect paused state (no updates when halted).

## 8. Visual Overlays
- Provide rendering hooks for viewport (e.g., drawing vectors, bounds) fed by observer data.
- Allow toggling overlay layers (positions, velocities, destinations).

## 9. Browser DevTools Bridge
- Expose `world` and observer utilities on `window.__SC_WORLD__` in dev builds.
- Document console recipes (querying entities, forcing ticks).
- Consider optional integration with React DevTools custom inspectors.

## 10. Stabilization & Docs
- Add automated coverage for observer events and overlay toggle workflow.
- Extend `TESTING.md` with dev tooling usage instructions.
- Record outstanding follow-ups (performance tuning, accessibility, packaging) for future iterations.
