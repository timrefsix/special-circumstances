import { ScriptSyntaxError } from './errors';
import type { ProgramNode, CallStatementNode, ExpressionNode } from './ast';
import { tokenize } from './tokenizer';
import type { Token, TokenType } from './tokens';

class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): ProgramNode {
    const statements: CallStatementNode[] = [];

    while (!this.isAtEnd()) {
      if (this.match('statementEnd')) {
        continue;
      }
      const statement = this.parseCallStatement();
      statements.push(statement);
      this.consumeStatementTerminators();
    }

    return {
      type: 'Program',
      statements,
    };
  }

  private parseCallStatement(): CallStatementNode {
    const moduleToken = this.consume('identifier', 'Expected module name');
    const moduleNode = {
      type: 'Identifier',
      name: moduleToken.lexeme,
      location: moduleToken.location,
    } as const;

    this.consume('dot', "Expected '.' after module name");

    const methodToken = this.consume('identifier', 'Expected method name');
    const methodNode = {
      type: 'Identifier',
      name: methodToken.lexeme,
      location: methodToken.location,
    } as const;

    this.consume('leftParen', "Expected '(' after method name");

    const args = this.parseArguments();

    this.consume('rightParen', "Expected ')' after arguments");

    return {
      type: 'CallStatement',
      module: moduleNode,
      method: methodNode,
      args,
      location: moduleToken.location,
    };
  }

  private parseArguments() {
    const args: CallStatementNode['args'] = [];

    if (this.check('rightParen')) {
      return args;
    }

    do {
      const expression = this.parseExpression();
      args.push({
        expression,
        location: expression.location,
      });
    } while (this.match('comma'));

    if (!this.check('rightParen')) {
      const token = this.peek();
      throw new ScriptSyntaxError('Expected comma or closing parenthesis', token.location);
    }

    return args;
  }

  private parseExpression(): ExpressionNode {
    const token = this.peek();

    if (this.match('number')) {
      const value = Number(token.lexeme);
      if (!Number.isFinite(value)) {
        throw new ScriptSyntaxError('Invalid number literal', token.location);
      }
      return {
        type: 'NumberLiteral',
        value,
        raw: token.lexeme,
        location: token.location,
      };
    }

    if (this.match('boolean')) {
      return {
        type: 'BooleanLiteral',
        value: token.lexeme === 'true',
        location: token.location,
      };
    }

    if (this.match('hexcolor')) {
      return {
        type: 'HexColorLiteral',
        value: token.lexeme,
        location: token.location,
      };
    }

    throw new ScriptSyntaxError('Unexpected expression', token.location);
  }

  private consumeStatementTerminators() {
    while (this.match('statementEnd')) {
      // continue consuming consecutive terminators
    }
  }

  private consume(type: TokenType, message: string) {
    if (this.check(type)) {
      return this.advance();
    }

    const token = this.peek();
    throw new ScriptSyntaxError(message, token.location);
  }

  private match(type: TokenType) {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType) {
    if (this.isAtEnd()) {
      return false;
    }
    return this.peek().type === type;
  }

  private advance() {
    if (!this.isAtEnd()) {
      this.current += 1;
    }
    return this.previous();
  }

  private isAtEnd() {
    return this.peek().type === 'eof';
  }

  private peek() {
    return this.tokens[this.current]!;
  }

  private previous() {
    return this.tokens[this.current - 1]!;
  }
}

export const parseProgram = (source: string): ProgramNode => {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parseProgram();
};
