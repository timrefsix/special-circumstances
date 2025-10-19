import { describe, expect, it } from 'vitest';
import { World } from '../../ecs/world';
import { Position } from '../../ecs/components';
import { MotorScriptModule } from '../modules/motor';
import { ScriptEngine } from '../runtime';
import { ScriptRuntimeError } from '../errors';

describe('MotorScriptModule', () => {
  const setup = (initialHeading = 0) => {
    const world = new World({ instrumentation: false });
    const entity = world.createEntity();
    world.addComponent(entity, Position, { x: 50, y: 50 });
    const module = new MotorScriptModule(world, entity, { initialHeading });
    const engine = new ScriptEngine([module]);
    return { world, entity, module, engine };
  };

  it('moves entities forward relative to heading', () => {
    const { world, entity, engine } = setup();

    engine.execute('motor.forward(10)');

    const position = world.getComponent(entity, Position);
    expect(position).not.toBeNull();
    expect(position?.y).toBeCloseTo(40);
    expect(position?.x).toBeCloseTo(50);
  });

  it('rotates heading to the left and updates position accordingly', () => {
    const { world, entity, module, engine } = setup();

    engine.execute('motor.left(90); motor.forward(5)');

    expect(module.getHeading()).toBe(90);
    const position = world.getComponent(entity, Position);
    expect(position?.x).toBeCloseTo(55);
    expect(position?.y).toBeCloseTo(50);
  });

  it('rotates heading to the right and supports backwards movement', () => {
    const { world, entity, module, engine } = setup();

    engine.execute('motor.right(45); motor.backwards(10)');

    expect(module.getHeading()).toBe(315);
    const position = world.getComponent(entity, Position);
    expect(position?.x).toBeCloseTo(57.0711, 3);
    expect(position?.y).toBeCloseTo(57.0711, 3);
  });

  it('normalizes headings beyond full rotations', () => {
    const { module, engine } = setup(10);
    engine.execute('motor.left(720)');
    expect(module.getHeading()).toBe(10);
    engine.execute('motor.right(370)');
    expect(module.getHeading()).toBe(0);
  });

  it('throws if the entity has no position component', () => {
    const { world, entity, engine } = setup();
    world.removeComponent(entity, Position);
    expect(() => engine.execute('motor.forward(5)')).toThrow(ScriptRuntimeError);
  });
});
