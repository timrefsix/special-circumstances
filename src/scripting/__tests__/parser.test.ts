import { describe, expect, it } from 'vitest';
import { parseProgram } from '../parser';
import { ScriptSyntaxError } from '../errors';

describe('parseProgram', () => {
  it('parses statements with mixed arguments', () => {
    const program = parseProgram(`motor.forward(12)\ndebug.pen(true); debug.color(#abc123)`);
    expect(program.statements).toHaveLength(3);

    const [first, second, third] = program.statements;
    expect(first?.module.name).toBe('motor');
    expect(first?.method.name).toBe('forward');
    expect(first?.args[0]?.expression.type).toBe('NumberLiteral');

    expect(second?.module.name).toBe('debug');
    expect(second?.method.name).toBe('pen');
    expect(second?.args[0]?.expression.type).toBe('BooleanLiteral');

    expect(third?.args[0]?.expression.type).toBe('HexColorLiteral');
  });

  it('ignores blank statements', () => {
    const program = parseProgram('\n\n');
    expect(program.statements).toHaveLength(0);
  });

  it('throws when syntax is incomplete', () => {
    expect(() => parseProgram('motor.forward(10')).toThrow(ScriptSyntaxError);
  });

  it('throws when arguments are missing', () => {
    expect(() => parseProgram('motor.forward()')).not.toThrow();
    expect(() => parseProgram('motor.forward(,)')).toThrow(ScriptSyntaxError);
  });
});
