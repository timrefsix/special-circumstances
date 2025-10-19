import { expect, test } from '@playwright/test';
import { createWorldWithMockEntities, Identity, Position, Status, World } from '../src/ecs';

test.describe('ECS world', () => {
  test('adds components and queries entities', () => {
    const world = new World();
    const entity = world.createEntity();

    world.addComponent(entity, Identity, { id: 'entity-1', name: 'Entity One' });
    world.addComponent(entity, Position, { x: 10, y: 20 });
    world.addComponent(entity, Status, { value: 'idle' });

    const results = world.query([Identity, Position, Status] as const);
    expect(results).toHaveLength(1);

    const [queriedEntity, identity, position, status] = results[0]!;
    expect(queriedEntity).toBe(entity);
    expect(identity).toEqual({ id: 'entity-1', name: 'Entity One' });
    expect(position).toEqual({ x: 10, y: 20 });
    expect(status).toEqual({ value: 'idle' });
  });

  test('notifies subscribers when the world changes', () => {
    const world = createWorldWithMockEntities();
    const notifications: number[] = [];

    const unsubscribe = world.subscribe(() => {
      notifications.push(1);
    });

    const entity = world.createEntity();
    world.addComponent(entity, Identity, { id: 'entity-2', name: 'Entity Two' });
    world.addComponent(entity, Status, { value: 'moving' });
    world.removeComponent(entity, Status);
    world.destroyEntity(entity);

    unsubscribe();

    expect(notifications.length).toBe(5);
  });
});
