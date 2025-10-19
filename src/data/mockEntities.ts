import type { WorldEntity } from '../types/entity';

export const mockEntities: WorldEntity[] = [
  {
    id: 'alpha',
    name: 'Alpha Runner',
    position: { x: 20, y: 35 },
    status: 'moving',
  },
  {
    id: 'bravo',
    name: 'Bravo Scout',
    position: { x: 55, y: 64 },
    status: 'idle',
  },
  {
    id: 'charlie',
    name: 'Charlie Worker',
    position: { x: 78, y: 28 },
    status: 'error',
  },
];
