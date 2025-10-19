export interface SourceLocation {
  line: number;
  column: number;
  index: number;
}

const formatLocation = (location: SourceLocation | null | undefined) => {
  if (!location) {
    return '';
  }
  return ` (line ${location.line}, column ${location.column})`;
};

export class ScriptSyntaxError extends Error {
  constructor(message: string, readonly location: SourceLocation) {
    super(`${message}${formatLocation(location)}`);
    this.name = 'ScriptSyntaxError';
  }
}

export class ScriptRuntimeError extends Error {
  constructor(message: string, readonly location?: SourceLocation | null) {
    super(`${message}${formatLocation(location ?? null)}`);
    this.name = 'ScriptRuntimeError';
  }
}
