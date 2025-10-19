import type { SourceLocation } from './errors';

export type TokenType =
  | 'identifier'
  | 'number'
  | 'boolean'
  | 'hexcolor'
  | 'dot'
  | 'comma'
  | 'leftParen'
  | 'rightParen'
  | 'statementEnd'
  | 'eof';

export interface Token {
  type: TokenType;
  lexeme: string;
  location: SourceLocation;
}
