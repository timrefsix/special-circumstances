import { describe, expect, it } from 'vitest';
import { World } from '../../ecs/world';
import { Position } from '../../ecs/components';
import { ScriptEngine } from '../../scripting/runtime';
import { MachineFrame } from '../frame';
import { MotorMachineModule } from '../modules/motorModule';
import { DebugMachineModule } from '../modules/debugModule';

const setupFrame = () => {
  const world = new World({ instrumentation: false });
  const entity = world.createEntity();
  world.addComponent(entity, Position, { x: 10, y: 10 });
  const frame = new MachineFrame(world, entity);
  return { world, entity, frame };
};

describe('MachineFrame', () => {
  it('installs machine modules and registers their script APIs', () => {
    const { world, entity, frame } = setupFrame();
    const motor = new MotorMachineModule();
    const debug = new DebugMachineModule();

    frame.installModule(motor);
    frame.installModule(debug);

    const engine = new ScriptEngine();
    frame.registerApis(engine);

    engine.execute('motor.forward(5); debug.pen(true); debug.color(#00ff00)');

    const position = world.getComponent(entity, Position);
    expect(position?.y).toBeCloseTo(5);
    expect(motor.getHeading()).toBe(0);
    expect(debug.isPenDown()).toBe(true);
    expect(debug.getColor()).toBe('#00ff00');
  });

  it('removes modules cleanly', () => {
    const { frame } = setupFrame();
    const motor = new MotorMachineModule();
    frame.installModule(motor);
    expect(frame.listModules()).toHaveLength(1);
    frame.removeModule(motor);
    expect(frame.listModules()).toHaveLength(0);
  });
});
