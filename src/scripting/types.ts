import type { SourceLocation } from './errors';

export type ScriptValueType = 'number' | 'boolean' | 'hexcolor';

export interface RuntimeNumberValue {
  kind: 'number';
  value: number;
  raw: string;
  location: SourceLocation;
}

export interface RuntimeBooleanValue {
  kind: 'boolean';
  value: boolean;
  location: SourceLocation;
}

export interface RuntimeHexColorValue {
  kind: 'hexcolor';
  value: string;
  location: SourceLocation;
}

export type RuntimeValue = RuntimeNumberValue | RuntimeBooleanValue | RuntimeHexColorValue;

export interface Command {
  module: string;
  method: string;
  args: RuntimeValue[];
  location: SourceLocation;
}

export interface ModuleFunctionParameter {
  name: string;
  type: ScriptValueType;
}
