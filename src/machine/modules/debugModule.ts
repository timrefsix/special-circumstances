import { BaseMachineModule } from '../module';
import type { MachineModuleMetadata } from '../types';
import type { ScriptEngine } from '../../scripting/runtime';
import { DebugScriptModule } from '../../scripting/modules/debug';

const metadata: MachineModuleMetadata = {
  id: 'debug',
  name: 'Diagnostics Console',
  category: 'utility',
  description: 'Provides instrumentation helpers such as pen toggles and color selection.',
};

export class DebugMachineModule extends BaseMachineModule {
  private scriptModule: DebugScriptModule | null = null;

  constructor() {
    super(metadata);
  }

  override onRemove() {
    super.onRemove();
    this.scriptModule = null;
  }

  registerApi(engine: ScriptEngine) {
    this.getContext();
    const scriptModule = new DebugScriptModule();
    this.scriptModule = scriptModule;
    engine.registerModule(scriptModule);
  }

  getScriptModule() {
    if (!this.scriptModule) {
      throw new Error('Debug script module has not been registered yet.');
    }
    return this.scriptModule;
  }

  isPenDown() {
    return this.getScriptModule().isPenDown();
  }

  getColor() {
    return this.getScriptModule().getColor();
  }

  getHistory() {
    return this.getScriptModule().getHistory();
  }

}
