import { BaseScriptModule, type ModuleFunctionResolvedArgument, type ModuleInvocationMeta } from '../runtime';
import { ScriptRuntimeError } from '../errors';

export interface DebugSnapshot {
  penDown: boolean;
  color: string;
  history: string[];
}

export class DebugScriptModule extends BaseScriptModule {
  private penDown = false;
  private color = '#ffffff';
  private readonly history: string[] = [];

  constructor() {
    super('debug');

    this.registerFunction({
      name: 'pen',
      parameters: [{ name: 'enabled', type: 'boolean' }],
      invoke: (args, meta) => {
        const enabled = this.readBooleanArgument(args, 0, meta);
        this.penDown = enabled;
        this.recordHistory(`pen(${String(enabled)})`);
      },
    });

    this.registerFunction({
      name: 'color',
      parameters: [{ name: 'hex', type: 'hexcolor' }],
      invoke: (args, meta) => {
        const nextColor = this.readHexArgument(args, 0, meta);
        this.validateColor(nextColor, meta);
        this.color = nextColor;
        this.recordHistory(`color(${nextColor})`);
      },
    });
  }

  isPenDown() {
    return this.penDown;
  }

  getColor() {
    return this.color;
  }

  getHistory() {
    return [...this.history];
  }

  snapshot(): DebugSnapshot {
    return {
      penDown: this.penDown,
      color: this.color,
      history: this.getHistory(),
    };
  }

  private readBooleanArgument(
    args: ModuleFunctionResolvedArgument[],
    index: number,
    meta: ModuleInvocationMeta,
  ) {
    const argument = args[index];
    if (!argument || argument.parameter.type !== 'boolean') {
      throw new ScriptRuntimeError(
        `Expected boolean argument when calling ${meta.module}.${meta.method}`,
        argument?.raw.location ?? meta.location,
      );
    }
    return argument.value;
  }

  private readHexArgument(
    args: ModuleFunctionResolvedArgument[],
    index: number,
    meta: ModuleInvocationMeta,
  ) {
    const argument = args[index];
    if (!argument || argument.parameter.type !== 'hexcolor') {
      throw new ScriptRuntimeError(
        `Expected color argument when calling ${meta.module}.${meta.method}`,
        argument?.raw.location ?? meta.location,
      );
    }
    return argument.value;
  }

  private validateColor(color: string, meta: ModuleInvocationMeta) {
    if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) {
      throw new ScriptRuntimeError(
        `Invalid hex color '${color}' provided to ${meta.module}.${meta.method}`,
        meta.location,
      );
    }
  }

  private recordHistory(entry: string) {
    this.history.push(entry);
    if (this.history.length > 50) {
      this.history.shift();
    }
  }
}
