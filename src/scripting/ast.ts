import type { SourceLocation } from './errors';

export interface ProgramNode {
  type: 'Program';
  statements: CallStatementNode[];
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
  location: SourceLocation;
}

export type ExpressionNode = NumberLiteralNode | BooleanLiteralNode | HexColorLiteralNode;

export interface NumberLiteralNode {
  type: 'NumberLiteral';
  value: number;
  raw: string;
  location: SourceLocation;
}

export interface BooleanLiteralNode {
  type: 'BooleanLiteral';
  value: boolean;
  location: SourceLocation;
}

export interface HexColorLiteralNode {
  type: 'HexColorLiteral';
  value: string;
  location: SourceLocation;
}

export interface CallArgumentNode {
  expression: ExpressionNode;
  location: SourceLocation;
}

export interface CallStatementNode {
  type: 'CallStatement';
  module: IdentifierNode;
  method: IdentifierNode;
  args: CallArgumentNode[];
  location: SourceLocation;
}
