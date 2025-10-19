import { describe, expect, it } from 'vitest';
import { createWorldWithMockEntities } from '../../ecs/bootstrap';
import { Identity, Position } from '../../ecs/components';
import { createBotScriptEnvironment } from '../environment';

const pickFirstEntity = (world: ReturnType<typeof createWorldWithMockEntities>) => {
  const result = world.query([Identity] as const);
  if (!result[0]) {
    throw new Error('expected at least one entity');
  }
  return result[0][0];
};

describe('Bot scripting integration', () => {
  it('runs a composite script against a simulated entity', async () => {
    const world = createWorldWithMockEntities({ instrumentation: false });
    const entity = pickFirstEntity(world);
    const env = createBotScriptEnvironment(world, entity, { durationScale: 0 });

    await env.engine.execute(`
      motor.forward(10)
      motor.left(90)
      motor.forward(5)
      debug.pen(true)
      debug.color(#ff00ff)
    `);

    const position = world.getComponent(entity, Position);
    expect(position).not.toBeNull();
    expect(position?.x).toBeCloseTo(25, 3);
    expect(position?.y).toBeCloseTo(25, 3);

    expect(env.modules.motor.getHeading()).toBe(90);
    expect(env.modules.debug.isPenDown()).toBe(true);
    expect(env.modules.debug.getColor()).toBe('#ff00ff');
    expect(env.modules.debug.getHistory()).toEqual(['pen(true)', 'color(#ff00ff)']);
  });
});
