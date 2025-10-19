import { ScriptSyntaxError, type SourceLocation } from './errors';
import type { Token, TokenType } from './tokens';

const isAlpha = (char: string) => {
  return /[A-Za-z_]/.test(char);
};

const isAlphaNumeric = (char: string) => {
  return /[A-Za-z0-9_]/.test(char);
};

const isDigit = (char: string) => {
  return /[0-9]/.test(char);
};

const isHexDigit = (char: string) => {
  return /[0-9a-fA-F]/.test(char);
};

interface CursorState {
  index: number;
  line: number;
  column: number;
}

const createInitialState = (): CursorState => ({
  index: 0,
  line: 1,
  column: 1,
});

export const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  const state = createInitialState();

  const isAtEnd = () => state.index >= source.length;
  const peek = (offset = 0) => {
    const position = state.index + offset;
    return position < source.length ? source[position]! : '';
  };

  const currentLocation = (): SourceLocation => ({
    index: state.index,
    line: state.line,
    column: state.column,
  });

  const advance = () => {
    const char = source[state.index]!;
    state.index += 1;
    if (char === '\n') {
      state.line += 1;
      state.column = 1;
    } else {
      state.column += 1;
    }
    return char;
  };

  const addToken = (type: TokenType, lexeme: string, location: SourceLocation) => {
    tokens.push({ type, lexeme, location });
  };

  const readIdentifier = (initial: string, location: SourceLocation) => {
    let value = initial;
    while (!isAtEnd() && isAlphaNumeric(peek())) {
      value += advance();
    }

    if (value === 'true' || value === 'false') {
      addToken('boolean', value, location);
    } else {
      addToken('identifier', value, location);
    }
  };

  const readNumber = (location: SourceLocation) => {
    let lexeme = '';
    let hasDecimalPoint = false;

    const readDigits = () => {
      while (!isAtEnd() && isDigit(peek())) {
        lexeme += advance();
      }
    };

    readDigits();
    if (!isAtEnd() && peek() === '.') {
      hasDecimalPoint = true;
      lexeme += advance();
      readDigits();
    }

    if (lexeme === '.' || lexeme === '') {
      throw new ScriptSyntaxError('Invalid number literal', location);
    }

    if (hasDecimalPoint && (lexeme.startsWith('.') || lexeme.endsWith('.'))) {
      throw new ScriptSyntaxError('Malformed decimal literal', location);
    }

    addToken('number', lexeme, location);
  };

  const readHexColor = (location: SourceLocation) => {
    let lexeme = '#';
    advance(); // consume '#'
    while (!isAtEnd() && isHexDigit(peek())) {
      lexeme += advance();
    }

    const digits = lexeme.slice(1);
    if (digits.length !== 3 && digits.length !== 6) {
      throw new ScriptSyntaxError('Invalid hex color literal', location);
    }

    addToken('hexcolor', lexeme.toLowerCase(), location);
  };

  const skipComment = () => {
    while (!isAtEnd() && peek() !== '\n') {
      advance();
    }
  };

  while (!isAtEnd()) {
    const char = peek();

    if (char === ' ' || char === '\t' || char === '\r') {
      advance();
      continue;
    }

    if (char === '\n') {
      const location = currentLocation();
      advance();
      addToken('statementEnd', '\n', location);
      continue;
    }

    if (char === ';') {
      const location = currentLocation();
      advance();
      addToken('statementEnd', ';', location);
      continue;
    }

    if (char === '.') {
      const location = currentLocation();
      advance();
      addToken('dot', '.', location);
      continue;
    }

    if (char === ',') {
      const location = currentLocation();
      advance();
      addToken('comma', ',', location);
      continue;
    }

    if (char === '(') {
      const location = currentLocation();
      advance();
      addToken('leftParen', '(', location);
      continue;
    }

    if (char === ')') {
      const location = currentLocation();
      advance();
      addToken('rightParen', ')', location);
      continue;
    }

    if (char === '/') {
      const next = peek(1);
      if (next === '/') {
        advance();
        advance();
        skipComment();
        continue;
      }
    }

    if (char === '#') {
      const next = peek(1);
      if (isHexDigit(next)) {
        const location = currentLocation();
        readHexColor(location);
        continue;
      }

      advance();
      skipComment();
      continue;
    }

    if (isAlpha(char)) {
      const location = currentLocation();
      const first = advance();
      readIdentifier(first, location);
      continue;
    }

    if (char === '-' && isDigit(peek(1))) {
      const location = currentLocation();
      let lexeme = advance(); // consume '-'
      while (!isAtEnd() && isDigit(peek())) {
        lexeme += advance();
      }
      if (!isAtEnd() && peek() === '.') {
        lexeme += advance();
        while (!isAtEnd() && isDigit(peek())) {
          lexeme += advance();
        }
      }
      addToken('number', lexeme, location);
      continue;
    }

    if (isDigit(char)) {
      const location = currentLocation();
      readNumber(location);
      continue;
    }

    throw new ScriptSyntaxError(`Unexpected character '${char}'`, currentLocation());
  }

  addToken('eof', '', {
    index: state.index,
    line: state.line,
    column: state.column,
  });

  return tokens;
};
