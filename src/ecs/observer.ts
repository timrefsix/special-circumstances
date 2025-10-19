import type { ComponentType, Entity } from './world';

export type ComponentChangeType = 'added' | 'updated' | 'removed';

export interface EntityCreatedEvent {
  type: 'entity-created';
  entity: Entity;
  timestamp: number;
}

export interface EntityDestroyedEvent {
  type: 'entity-destroyed';
  entity: Entity;
  components: ComponentSnapshot[];
  timestamp: number;
}

export interface ComponentSnapshot {
  component: ComponentType<unknown>;
  value: unknown;
}

export interface ComponentChangedEvent {
  type: 'component-changed';
  changeType: ComponentChangeType;
  entity: Entity;
  component: ComponentType<unknown>;
  previousValue: unknown;
  value: unknown;
  timestamp: number;
}

export type SystemRunPhase = 'start' | 'end';

export interface SystemRunEvent {
  type: 'system-run';
  system: string;
  phase: SystemRunPhase;
  durationMs?: number;
  tick?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type WorldEvent =
  | EntityCreatedEvent
  | EntityDestroyedEvent
  | ComponentChangedEvent
  | SystemRunEvent;

export interface WorldObserver {
  onEntityCreated?(event: EntityCreatedEvent): void;
  onEntityDestroyed?(event: EntityDestroyedEvent): void;
  onComponentChanged?(event: ComponentChangedEvent): void;
  onSystemRun?(event: SystemRunEvent): void;
}
