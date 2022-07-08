import * as Constructs from "../geckscript_constructs";

export enum TokenType {
  unknown,
  comment,
  function,
  number,
  keyword,
  operator,
  string,
  type,
  variable,
  TOTAL
}

export type TokenPosition = {
  line: number;
  column: number;
}

export class Token {
  type: TokenType;
  position: TokenPosition;
  content: string;
  length: number;

  constructor(type: TokenType, position: TokenPosition, content: string) {
    this.type = type;
    this.position = position;
    this.content = content;
    this.length = content.length;
  }
}

export class StringBuffer {
  buf: Buffer;
  pos: number;

  constructor(size: number) {
    this.buf = Buffer.allocUnsafe(size * 4);
    this.pos = 0;
  }

  append(char: string): void {
    this.pos += this.buf.write(char, this.pos);
  }

  flush(): string {
    const str = this.buf.toString(undefined, 0, this.pos);
    this.pos = 0;

    return str;
  }
}

export class Lexer {
  data: string[];
  cur_line: number;
  cur_col: number;
  cur_char: string | undefined;

  buf: StringBuffer;

  constructor(data: string) {
    this.data = data.split(/\r?\n/);
    this.cur_line = 0;
    this.cur_col = 0;
    this.cur_char = data[0][0];
    this.buf = new StringBuffer(512);
  }

  nextChar(): void {
    this.cur_char = this.data[this.cur_line][++this.cur_col];
  }

  nextCharToBuf(): void {
    this.buf.append(this.cur_char as string);
    this.nextChar();
  }

  constructCurrentToken(type: TokenType, content?: string): Token {
    content = content ?? this.buf.flush();
    return new Token(type, { line: this.cur_line, column: this.cur_col - content.length }, content);
  }

  consumeWhitespace(): void {
    while (this.cur_char !== undefined && /\s/.test(this.cur_char)) {
      this.nextChar();
    }
  }

  consumeComment(): Token {
    while (this.cur_char !== undefined) {
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(TokenType.comment);
  }

  consumeString(): Token {
    const quote: string = this.cur_char as string;

    this.nextCharToBuf();

    while (this.cur_char !== undefined) {
      if (this.cur_char === quote) {
        this.nextCharToBuf();
        break;
      }
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(TokenType.string);
  }

  consumeNumber(): Token {
    this.nextCharToBuf();

    while (this.cur_char !== undefined) {
      if (/\d/.test(this.cur_char)) {
        this.nextCharToBuf();
      } else if (this.cur_char === ".") {
        this.nextCharToBuf();
        break;
      } else {
        const token = this.constructCurrentToken(TokenType.number);
        this.nextChar();
        return token;
      }
    }

    while (this.cur_char !== undefined && /\d/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    const token = this.constructCurrentToken(TokenType.number);
    this.nextChar();
    return token;
  }

  consumeWord(): Token {
    while (this.cur_char !== undefined) {
      if (/\s/.test(this.cur_char)) break;
      this.nextCharToBuf();
    }

    const content = this.buf.flush();

    return this.constructCurrentToken(Lexer.DetermineTokenType(content), content);
  }

  lexLine(): Token[] | undefined {
    if (this.data[this.cur_line] === undefined) return undefined;

    const tokens: Token[] = [];

    this.consumeWhitespace();
    while (this.cur_char !== undefined) {
      if (this.cur_char === ";") {
        tokens.push(this.consumeComment());
      } else if (/["']/.test(this.cur_char)) {
        tokens.push(this.consumeString());
      } else if (/\d|\./.test(this.cur_char)) {
        tokens.push(this.consumeNumber());
      } else {
        tokens.push(this.consumeWord());
      }

      this.consumeWhitespace();
    }

    this.cur_char = this.data[++this.cur_line]?.[0];
    this.cur_col = 0;

    return tokens;
  }

  getTokens(): Token[][] {
    const tokens: Token[][] = [];
    let line_tokens: Token[] | undefined;

    while ((line_tokens = this.lexLine()) !== undefined) {
      tokens.push(line_tokens as Token[]);
    }

    return tokens;
  }

  static DetermineTokenType(data: string): TokenType {
    data = data.toLowerCase();
    if (data in Constructs.TypesLower) {
      return TokenType.type;
    } else if (data in Constructs.KeywordsLower) {
      return TokenType.keyword;
    } else if (data in Constructs.Operators) {
      return TokenType.operator;
    } else if (data in Constructs.FunctionsLower) {
      return TokenType.function;
    } else {
      return TokenType.unknown;
    }
  }
}
