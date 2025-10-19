import { Identity, Position, Status } from './components';
import { World } from './world';
import { mockEntities } from '../data/mockEntities';

export const createWorldWithMockEntities = () => {
  const world = new World();

  for (const entity of mockEntities) {
    const worldEntity = world.createEntity();
    world.addComponent(worldEntity, Identity, {
      id: entity.id,
      name: entity.name,
    });
    world.addComponent(worldEntity, Position, {
      x: entity.position.x,
      y: entity.position.y,
    });
    world.addComponent(worldEntity, Status, {
      value: entity.status,
    });
  }

  return world;
};
