import type { ScriptEngine } from '../scripting/runtime';
import type { MachineModuleMetadata } from './types';
import type { World, Entity } from '../ecs/world';
import type { MachineFrame } from './frame';

export interface MachineModuleContext {
  world: World;
  entity: Entity;
  frame: MachineFrame;
}

export interface MachineModule {
  readonly metadata: MachineModuleMetadata;
  onInstall(context: MachineModuleContext): void;
  onRemove(): void;
  onTick(deltaMs: number): void;
  registerApi(engine: ScriptEngine): void;
}

export abstract class BaseMachineModule implements MachineModule {
  protected context: MachineModuleContext | null = null;

  protected constructor(public readonly metadata: MachineModuleMetadata) {}

  onInstall(context: MachineModuleContext) {
    this.context = context;
  }

  onRemove() {
    this.context = null;
  }

  onTick(deltaMs: number) {
    void deltaMs;
  }

  protected getContext(): MachineModuleContext {
    if (!this.context) {
      throw new Error(`${this.metadata.name} is not installed on a frame.`);
    }
    return this.context;
  }

  abstract registerApi(engine: ScriptEngine): void;
}
