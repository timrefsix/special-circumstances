import { describe, expect, it } from 'vitest';
import { tokenize } from '../tokenizer';
import { ScriptSyntaxError } from '../errors';

const tokenTypes = (source: string) => tokenize(source).map((token) => token.type);

describe('tokenize', () => {
  it('tokenizes a simple call', () => {
    const types = tokenTypes('motor.forward(10)');
    expect(types).toStrictEqual(['identifier', 'dot', 'identifier', 'leftParen', 'number', 'rightParen', 'eof']);
  });

  it('emits statement terminators for newlines and semicolons', () => {
    const types = tokenTypes('motor.forward(10)\n\nmotor.left(90);');
    expect(types).toStrictEqual([
      'identifier',
      'dot',
      'identifier',
      'leftParen',
      'number',
      'rightParen',
      'statementEnd',
      'statementEnd',
      'identifier',
      'dot',
      'identifier',
      'leftParen',
      'number',
      'rightParen',
      'statementEnd',
      'eof',
    ]);
  });

  it('supports hex colors and boolean literals', () => {
    const tokens = tokenize('debug.color(#ffaa00) debug.pen(true)');
    const colorToken = tokens.find((token) => token.type === 'hexcolor');
    const penBoolean = tokens.find((token) => token.type === 'boolean');
    expect(colorToken?.lexeme).toBe('#ffaa00');
    expect(penBoolean?.lexeme).toBe('true');
  });

  it('supports negative numbers and decimals', () => {
    const tokens = tokenize('motor.forward(-12.5)');
    const numberToken = tokens.find((token) => token.type === 'number');
    expect(numberToken?.lexeme).toBe('-12.5');
  });

  it('ignores both hash and slash style comments', () => {
    const types = tokenTypes('// heading\nmotor.forward(5) # trailing comment');
    expect(types.filter((type) => type === 'identifier')).toHaveLength(2);
  });

  it('throws on unexpected characters', () => {
    expect(() => tokenize('motor.forward(@)')).toThrow(ScriptSyntaxError);
  });
});
