import { defineComponent } from './world';
import type {
  EntityLifecycle,
  EntityModule,
  EntityStatus,
  EntityTelemetry,
} from '../types/entity';

export interface IdentityComponent {
  id: string;
  name: string;
}

export interface PositionComponent {
  x: number;
  y: number;
}

export interface StatusComponent {
  value: EntityStatus;
}

export interface ModulesComponent {
  items: EntityModule[];
}

export interface LifecycleComponent {
  value: EntityLifecycle;
}

export interface TelemetryComponent {
  value: EntityTelemetry;
}

export const Identity = defineComponent<IdentityComponent>('identity');
export const Position = defineComponent<PositionComponent>('position');
export const Status = defineComponent<StatusComponent>('status');
export const Modules = defineComponent<ModulesComponent>('modules');
export const Lifecycle = defineComponent<LifecycleComponent>('lifecycle');
export const Telemetry = defineComponent<TelemetryComponent>('telemetry');
