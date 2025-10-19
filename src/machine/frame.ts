import type { World, Entity } from '../ecs/world';
import type { ScriptEngine } from '../scripting/runtime';
import type { MachineModule, MachineModuleContext } from './module';

export class MachineFrame {
  private readonly modules: MachineModule[] = [];

  constructor(private readonly world: World, private readonly entity: Entity) {}

  installModule(module: MachineModule) {
    if (this.modules.includes(module)) {
      return;
    }

    const context: MachineModuleContext = {
      world: this.world,
      entity: this.entity,
      frame: this,
    };

    module.onInstall(context);
    this.modules.push(module);
  }

  removeModule(module: MachineModule) {
    const index = this.modules.indexOf(module);
    if (index === -1) {
      return;
    }

    module.onRemove();
    this.modules.splice(index, 1);
  }

  listModules() {
    return [...this.modules];
  }

  registerApis(engine: ScriptEngine) {
    for (const module of this.modules) {
      module.registerApi(engine);
    }
  }

  tick(deltaMs: number) {
    for (const module of this.modules) {
      module.onTick(deltaMs);
    }
  }

  getWorld() {
    return this.world;
  }

  getEntity() {
    return this.entity;
  }
}
