export type EntityStatus = 'idle' | 'moving' | 'error';

export interface WorldEntity {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  status: EntityStatus;
}
