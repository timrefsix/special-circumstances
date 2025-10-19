import { BaseMachineModule } from '../module';
import type { MachineModuleMetadata } from '../types';
import type { ScriptEngine } from '../../scripting/runtime';
import { MotorScriptModule, type MotorModuleOptions } from '../../scripting/modules/motor';

const metadata: MachineModuleMetadata = {
  id: 'motor',
  name: 'Vector Drive Motor',
  category: 'actuator',
  description: 'Provides directional control for frame translation.',
};

export class MotorMachineModule extends BaseMachineModule {
  private scriptModule: MotorScriptModule | null = null;

  constructor(private readonly options: MotorModuleOptions = {}) {
    super(metadata);
  }

  override onRemove() {
    super.onRemove();
    this.scriptModule = null;
  }

  registerApi(engine: ScriptEngine) {
    const context = this.getContext();
    const scriptModule = new MotorScriptModule(context.world, context.entity, this.options);
    this.scriptModule = scriptModule;
    engine.registerModule(scriptModule);
  }

  getHeading() {
    return this.getScriptModule().getHeading();
  }

  getScriptModule() {
    if (!this.scriptModule) {
      throw new Error('Motor script module has not been registered yet.');
    }
    return this.scriptModule;
  }
}
