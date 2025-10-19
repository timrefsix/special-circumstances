import { ScriptRuntimeError } from './errors';
import { parseProgram } from './parser';
import { compileProgramNode } from './compiler';
import type { Command, ModuleFunctionParameter, RuntimeValue, ScriptValueType } from './types';
import type { SourceLocation } from './errors';

type ParameterTypeMap = {
  number: number;
  boolean: boolean;
  hexcolor: string;
};

export interface ModuleInvocationMeta {
  module: string;
  method: string;
  location: SourceLocation;
}

export interface ModuleFunctionResolvedArgumentBase<T extends ScriptValueType> {
  parameter: ModuleFunctionParameter & { type: T };
  value: ParameterTypeMap[T];
  raw: RuntimeValue & { kind: T };
}

export type ModuleFunctionResolvedArgument =
  | ModuleFunctionResolvedArgumentBase<'number'>
  | ModuleFunctionResolvedArgumentBase<'boolean'>
  | ModuleFunctionResolvedArgumentBase<'hexcolor'>;

export interface ScriptModuleFunction {
  readonly name: string;
  readonly parameters: ModuleFunctionParameter[];
  invoke(args: ModuleFunctionResolvedArgument[], meta: ModuleInvocationMeta): void;
}

export interface ScriptModule {
  readonly name: string;
  getFunction(name: string): ScriptModuleFunction | null;
  listFunctions(): ScriptModuleFunction[];
}

export abstract class BaseScriptModule implements ScriptModule {
  private readonly functions = new Map<string, ScriptModuleFunction>();

  protected constructor(readonly name: string) {}

  protected registerFunction(definition: ScriptModuleFunction) {
    if (this.functions.has(definition.name)) {
      throw new Error(`Duplicate function '${definition.name}' in module '${this.name}'.`);
    }
    this.functions.set(definition.name, definition);
  }

  getFunction(name: string): ScriptModuleFunction | null {
    return this.functions.get(name) ?? null;
  }

  listFunctions(): ScriptModuleFunction[] {
    return Array.from(this.functions.values());
  }
}

const resolveArgument = (
  parameter: ModuleFunctionParameter,
  value: RuntimeValue,
  meta: { module: string; method: string },
): ModuleFunctionResolvedArgument => {
  if (value.kind !== parameter.type) {
    throw new ScriptRuntimeError(
      `Expected ${parameter.type} for parameter '${parameter.name}' when calling ${meta.module}.${meta.method}`,
      value.location,
    );
  }

  if (value.kind === 'number') {
    if (!Number.isFinite(value.value)) {
      throw new ScriptRuntimeError(
        `Non-finite number argument for parameter '${parameter.name}' when calling ${meta.module}.${meta.method}`,
        value.location,
      );
    }
    return {
      parameter: { ...parameter, type: 'number' },
      value: value.value,
      raw: value,
    };
  }

  if (value.kind === 'boolean') {
    return {
      parameter: { ...parameter, type: 'boolean' },
      value: value.value,
      raw: value,
    };
  }

  return {
    parameter: { ...parameter, type: 'hexcolor' },
    value: value.value,
    raw: value,
  };
};

export class ScriptEngine {
  private readonly modules = new Map<string, ScriptModule>();

  constructor(modules: ScriptModule[] = []) {
    for (const module of modules) {
      this.registerModule(module);
    }
  }

  registerModule(module: ScriptModule) {
    if (this.modules.has(module.name)) {
      throw new Error(`Module '${module.name}' is already registered.`);
    }
    this.modules.set(module.name, module);
  }

  unregisterModule(name: string) {
    this.modules.delete(name);
  }

  getModule(name: string): ScriptModule | null {
    return this.modules.get(name) ?? null;
  }

  compile(source: string): Command[] {
    const program = parseProgram(source);
    return compileProgramNode(program);
  }

  execute(source: string) {
    const commands = this.compile(source);
    this.executeCommands(commands);
  }

  executeCommands(commands: Command[]) {
    for (const command of commands) {
      this.executeCommand(command);
    }
  }

  private executeCommand(command: Command) {
    const module = this.modules.get(command.module);
    if (!module) {
      throw new ScriptRuntimeError(
        `Unknown module '${command.module}'`,
        command.location,
      );
    }

    const fn = module.getFunction(command.method);
    if (!fn) {
      throw new ScriptRuntimeError(
        `Module '${module.name}' does not provide function '${command.method}'`,
        command.location,
      );
    }

    const expected = fn.parameters.length;
    const received = command.args.length;

    if (received < expected) {
      const missingParam = fn.parameters[received]!;
      throw new ScriptRuntimeError(
        `Function ${module.name}.${fn.name} is missing argument '${missingParam.name}'`,
        command.location,
      );
    }

    if (received > expected) {
      const extra = command.args[expected]!;
      throw new ScriptRuntimeError(
        `Function ${module.name}.${fn.name} received unexpected argument`,
        extra.location,
      );
    }

    const resolvedArgs = command.args.map((arg, index) =>
      resolveArgument(fn.parameters[index]!, arg, { module: module.name, method: fn.name }),
    );

    fn.invoke(resolvedArgs, {
      module: module.name,
      method: fn.name,
      location: command.location,
    });
  }
}
