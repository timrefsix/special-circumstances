import type {
  ComponentChangedEvent,
  SystemRunEvent,
  SystemRunPhase,
  WorldEvent,
} from './observer';
import type { World } from './world';

type Listener = () => void;

export interface ComponentChangeStats {
  added: number;
  updated: number;
  removed: number;
  lastValue: unknown;
}

export interface SystemRunStats {
  runs: number;
  totalDurationMs: number;
  lastDurationMs: number | null;
  lastPhase: SystemRunPhase;
  lastTick?: number;
  lastMetadata?: Record<string, unknown>;
}

export interface WorldTelemetrySnapshot {
  events: WorldEvent[];
  totalEvents: number;
  componentChanges: Record<string, ComponentChangeStats>;
  entityEventCounts: Record<string, number>;
  systemRuns: Record<string, SystemRunStats>;
}

export interface WorldTelemetry {
  getSnapshot(): WorldTelemetrySnapshot;
  subscribe(listener: Listener): () => void;
  clear(): void;
  dispose(): void;
}

export interface WorldTelemetryOptions {
  bufferSize?: number;
}

const DEFAULT_BUFFER_SIZE = 200;

export const createWorldTelemetry = (
  world: World,
  options: WorldTelemetryOptions = {},
): WorldTelemetry => {
  const bufferSize = options.bufferSize ?? DEFAULT_BUFFER_SIZE;
  const events: WorldEvent[] = [];
  const componentStats = new Map<string, ComponentChangeStats>();
  const entityCounts = new Map<number, number>();
  const systemStats = new Map<string, SystemRunStats>();
  const listeners = new Set<Listener>();
  let totalEvents = 0;

  const recordEvent = (event: WorldEvent) => {
    totalEvents += 1;
    events.push(cloneEvent(event));
    if (events.length > bufferSize) {
      events.shift();
    }

    switch (event.type) {
      case 'entity-created':
      case 'entity-destroyed':
        incrementEntityCount(event.entity);
        break;
      case 'component-changed':
        incrementEntityCount(event.entity);
        recordComponentChange(event);
        break;
      case 'system-run':
        recordSystemRun(event);
        break;
      default: {
        // exhaustive check
        const neverEvent: never = event;
        throw new Error(`Unhandled event type ${(neverEvent as { type: string }).type}`);
      }
    }

    notify();
  };

  const recordComponentChange = (event: ComponentChangedEvent) => {
    const key = event.component.name;
    const existing =
      componentStats.get(key) ?? { added: 0, updated: 0, removed: 0, lastValue: undefined };

    if (event.changeType === 'added') {
      existing.added += 1;
    } else if (event.changeType === 'updated') {
      existing.updated += 1;
    } else {
      existing.removed += 1;
    }

    existing.lastValue = event.value;
    componentStats.set(key, existing);
  };

  const recordSystemRun = (event: SystemRunEvent) => {
    const existing =
      systemStats.get(event.system) ??
      {
        runs: 0,
        totalDurationMs: 0,
        lastDurationMs: null,
        lastPhase: event.phase,
        lastTick: undefined,
        lastMetadata: undefined,
      };

    existing.runs += 1;
    if (typeof event.durationMs === 'number') {
      existing.totalDurationMs += event.durationMs;
      existing.lastDurationMs = event.durationMs;
    } else {
      existing.lastDurationMs = null;
    }

    existing.lastPhase = event.phase;
    existing.lastTick = event.tick;
    existing.lastMetadata = event.metadata;

    systemStats.set(event.system, existing);
  };

  const incrementEntityCount = (entity: number) => {
    const current = entityCounts.get(entity) ?? 0;
    entityCounts.set(entity, current + 1);
  };

  const cloneEvent = (event: WorldEvent): WorldEvent => {
    if (event.type === 'entity-destroyed') {
      return {
        ...event,
        components: event.components.map((component) => ({
          component: component.component,
          value: component.value,
        })),
      };
    }

    if (event.type === 'component-changed') {
      return { ...event };
    }

    if (event.type === 'system-run') {
      return { ...event };
    }

    return { ...event };
  };

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const unsubscribe = world.observe({
    onEntityCreated: recordEvent,
    onEntityDestroyed: recordEvent,
    onComponentChanged: recordEvent,
    onSystemRun: recordEvent,
  });

  const getSnapshot = (): WorldTelemetrySnapshot => {
    return {
      events: events.slice(),
      totalEvents,
      componentChanges: getComponentChangesRecord(),
      entityEventCounts: getEntityCountsRecord(),
      systemRuns: getSystemStatsRecord(),
    };
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const clear = () => {
    events.length = 0;
    componentStats.clear();
    entityCounts.clear();
    systemStats.clear();
    totalEvents = 0;
    notify();
  };

  const dispose = () => {
    unsubscribe();
    listeners.clear();
    clear();
  };

  const getComponentChangesRecord = () => {
    const result: Record<string, ComponentChangeStats> = {};
    for (const [key, value] of componentStats.entries()) {
      result[key] = { ...value };
    }
    return result;
  };

  const getEntityCountsRecord = () => {
    const result: Record<string, number> = {};
    for (const [key, value] of entityCounts.entries()) {
      result[String(key)] = value;
    }
    return result;
  };

  const getSystemStatsRecord = () => {
    const result: Record<string, SystemRunStats> = {};
    for (const [key, value] of systemStats.entries()) {
      result[key] = { ...value };
    }
    return result;
  };

  return {
    getSnapshot,
    subscribe,
    clear,
    dispose,
  };
};
