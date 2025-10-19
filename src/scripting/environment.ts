import type { World, Entity } from '../ecs/world';
import { ScriptEngine } from './runtime';
import { MachineFrame } from '../machine/frame';
import { MotorMachineModule } from '../machine/modules/motorModule';
import { DebugMachineModule } from '../machine/modules/debugModule';
import type { MotorModuleOptions } from './modules/motor';

export interface BotScriptEnvironment {
  engine: ScriptEngine;
  frame: MachineFrame;
  modules: {
    motor: MotorMachineModule;
    debug: DebugMachineModule;
  };
}

export type BotScriptEnvironmentOptions = MotorModuleOptions;

export const createBotScriptEnvironment = (
  world: World,
  entity: Entity,
  options: BotScriptEnvironmentOptions = {},
): BotScriptEnvironment => {
  const frame = new MachineFrame(world, entity);
  const motorModule = new MotorMachineModule(options);
  const debugModule = new DebugMachineModule();

  frame.installModule(motorModule);
  frame.installModule(debugModule);

  const engine = new ScriptEngine();
  frame.registerApis(engine);

  return {
    engine,
    frame,
    modules: {
      motor: motorModule,
      debug: debugModule,
    },
  };
};
