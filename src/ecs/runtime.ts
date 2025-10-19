import type { World } from './world';
import type { SystemRunEvent } from './observer';

export interface System {
  name: string;
  update(world: World, deltaMs: number): void;
}

export interface TickControllerOptions {
  timeProvider?: () => number;
}

type FrameHandle = number | null;

const DEFAULT_DELTA_MS = 16.67;

const defaultNow = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
};

export class TickController {
  private readonly systems: System[] = [];
  private frameHandle: FrameHandle = null;
  private readonly now: () => number;
  private lastTimestamp: number | null = null;
  private tickIndex = 0;
  private running = false;

  constructor(private readonly world: World, options: TickControllerOptions = {}) {
    this.now = options.timeProvider ?? defaultNow;
  }

  register(system: System) {
    this.systems.push(system);
  }

  start() {
    if (this.running) {
      return;
    }

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return;
    }

    this.running = true;
    const step = (timestamp: number) => {
      if (!this.running) {
        return;
      }

      const last = this.lastTimestamp ?? timestamp;
      const deltaMs = Math.max(timestamp - last, 0.5);
      this.lastTimestamp = timestamp;
      this.tick(deltaMs);
      this.frameHandle = window.requestAnimationFrame(step);
    };

    this.frameHandle = window.requestAnimationFrame(step);
  }

  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.lastTimestamp = null;
    if (this.frameHandle !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.frameHandle);
    }
    this.frameHandle = null;
  }

  tick(deltaMs: number = DEFAULT_DELTA_MS) {
    const tickId = this.tickIndex;
    for (const system of this.systems) {
      this.runSystem(system, tickId, deltaMs);
    }
    this.tickIndex += 1;
  }

  private runSystem(system: System, tickId: number, deltaMs: number) {
    this.world.reportSystemRun({
      system: system.name,
      phase: 'start',
      tick: tickId,
      metadata: { deltaMs },
    });

    const start = this.now();
    try {
      system.update(this.world, deltaMs);
    } finally {
      const duration = Math.max(this.now() - start, 0);
      this.world.reportSystemRun({
        system: system.name,
        phase: 'end',
        tick: tickId,
        durationMs: duration,
        metadata: { deltaMs },
      } satisfies Omit<SystemRunEvent, 'timestamp'>);
    }
  }
}
