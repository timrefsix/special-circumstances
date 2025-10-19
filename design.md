# Modular Machine Programming Concept (Web)

## System Concept
- Each robot is represented by a machine frame that owns named module slots; installing a module populates the slot and wires the module into the frame runtime.
- Frames cannot enter the simulation unless both a `CpuModule` and `MemoryModule` are installed; other modules (sensors, actuators, utilities) advertise callable operations and events that scripts can consume.
- Boot sequence: discover installed modules -> validate dependencies -> CPU requests program bytes from memory -> scripting VM registers module APIs -> program loop runs per tick while emitting lifecycle events.

## Module Model
- Base interface `MachineModule` exposes metadata (id, category, slot type requirements, power draw, dependencies) plus lifecycle hooks (`onInstall`, `onRemove`, `onTick`) and an `registerApi` method for the scripting VM.
- Slot definitions live on the frame (e.g. `Hardpoint` with slot id, allowed categories, capacity); modules declare compatible categories to ensure only valid pairings.
- Inter-module communication flows through a lightweight message bus owned by the frame to avoid hard coupling; payloads can be typed objects with discriminated unions.
- Module categories include `SensorModule` (measurement APIs), `ActuatorModule` (world-altering commands), `UtilityModule` (timers, math helpers), and `CommModule` (robot-to-robot messaging).

## Scripting Surface
- CPU hosts a sandboxed interpreter running in the browser (options: jailed `Function` wrapper, JS sandbox like SES, or embedded Lua/JS interpreters via WASM such as QuickJS or Fengari).
- On boot, CPU gathers exported functions/constants from each module (`registerApi` returns a descriptor). The VM exposes them as globals or a namespaced object while preventing direct DOM or network access.
- Memory module stores program source/bytecode and optional persistent state. CPU fetches program text via `getProgram()` and reads/writes state through `read(key)`/`write(key, value)` APIs.
- Enforce deterministic execution windows by limiting instruction counts per tick, providing cooperative yield helpers, and potentially scheduling VM steps via `requestAnimationFrame`.

## Data & Authoring
- Author module definitions as JSON or YAML documents transformed into TypeScript types at build time (e.g. using `zod` for validation).
- Frame prefabs describe slot layout, visuals, and default modules. Visual representation can be SVG/Canvas components that bind to runtime state.
- Persist saves as JSON blobs capturing frame composition, module configuration, program text, and memory contents.

## Web App Architecture
- Use Vite + TypeScript as the build setup (already scaffolded). Consider component library choices (e.g. React, Solid, or vanilla lit-html) for editing UI and simulation surfaces.
- Separate concerns into packages: `core` (simulation logic), `editor` (UI for assembling frames), `runtime` (simulation loop), and `scripting` (VM integration).
- State management can rely on reactive stores (e.g. Zustand, Redux Toolkit, or RxJS) to keep simulation state and UI in sync.
- Rendering options: DOM for editor tooling, Canvas/WebGL for simulation visualization of robots and environment.

## Runtime Flow
1. Player assembles a frame by selecting modules for each slot; validator enforces required modules and dependency rules.
2. Memory module is populated with program text through an in-browser code editor (Monaco/CodeMirror) with syntax hints for module APIs.
3. On simulation start, CPU spins up the sandboxed VM, registers module APIs, and loads the program from memory.
4. Game loop advances in ticks: CPU executes bounded instruction slices, modules update via `onTick`, sensors publish readings, actuators enqueue world state changes.
5. Results feed visual feedback and logs so players can debug scripts (breakpoints, step mode, telemetry panels).

## Tooling Considerations
- Provide a code generation step that emits TypeScript typings for module APIs to power editor autocompletion.
- Build testing utilities that simulate ticks headlessly and assert CPU-module interactions for regression coverage.
- Instrument the VM for profiling (execution budget usage, errors) and expose diagnostics in the UI.

## Next Steps
1. Choose the scripting VM approach (sandboxed JS vs embedded WASM interpreter) and prototype API registration.
2. Sketch core TypeScript modules: `MachineFrame`, `ModuleRegistry`, `CpuModule`, `MemoryModule`, and message bus abstractions.
3. Implement a minimal UI to mount modules and run a sample script controlling a basic actuator to validate the loop.
4. Add automated tests for module lifecycle, message passing, and CPU-to-memory contracts to ensure stability.
