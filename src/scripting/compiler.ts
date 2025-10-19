import type {
  CallStatementNode,
  ExpressionNode,
  ProgramNode,
  HexColorLiteralNode,
  NumberLiteralNode,
  BooleanLiteralNode,
} from './ast';
import type { Command, RuntimeValue } from './types';

const compileNumberLiteral = (node: NumberLiteralNode) => {
  return {
    kind: 'number',
    value: node.value,
    raw: node.raw,
    location: node.location,
  } as const;
};

const compileBooleanLiteral = (node: BooleanLiteralNode) => {
  return {
    kind: 'boolean',
    value: node.value,
    location: node.location,
  } as const;
};

const compileHexColorLiteral = (node: HexColorLiteralNode) => {
  return {
    kind: 'hexcolor',
    value: node.value,
    location: node.location,
  } as const;
};

const compileExpression = (expression: ExpressionNode): RuntimeValue => {
  switch (expression.type) {
    case 'NumberLiteral':
      return compileNumberLiteral(expression);
    case 'BooleanLiteral':
      return compileBooleanLiteral(expression);
    case 'HexColorLiteral':
      return compileHexColorLiteral(expression);
    default:
      return (() => {
        const exhaustive: never = expression;
        return exhaustive;
      })();
  }
};

const compileCallStatement = (statement: CallStatementNode): Command => {
  return {
    module: statement.module.name,
    method: statement.method.name,
    args: statement.args.map((arg) => compileExpression(arg.expression)),
    location: statement.location,
  };
};

export const compileProgramNode = (program: ProgramNode): Command[] => {
  return program.statements.map(compileCallStatement);
};
