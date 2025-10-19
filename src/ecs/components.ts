import { defineComponent } from './world';
import type { EntityStatus } from '../types/entity';

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

export const Identity = defineComponent<IdentityComponent>('identity');
export const Position = defineComponent<PositionComponent>('position');
export const Status = defineComponent<StatusComponent>('status');
