import { StringBuffer } from "../common";
import * as Constructs from "./tokens";

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

export class Lexer {
  data: string[];
  cur_line: number;
  cur_col: number;
  cur_char: string | undefined;

  prev_token: Token | undefined;

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

  determineTokenType(data: string): TokenType {
    data = data.toLowerCase();
    if (data in Constructs.TypesLower) {
      return TokenType.type;
    } else if (data in Constructs.KeywordsLower) {
      return TokenType.keyword;
    } else if (
      data in Constructs.BlockTypesLower &&
      this.prev_token?.type === TokenType.keyword &&
      this.prev_token.content.toLocaleLowerCase() === "begin"
    ) {
      return TokenType.keyword;
    } else if (data in Constructs.Operators) {
      return TokenType.operator;
    } else if (data in Constructs.FunctionsLower) {
      return TokenType.function;
    } else {
      return TokenType.variable;
    }
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
        return this.constructCurrentToken(TokenType.number);
      }
    }

    while (this.cur_char !== undefined && /\d/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(TokenType.number);
  }

  consumeWord(): Token {
    if (/\w/.test(this.cur_char as string)) {
      while (this.cur_char !== undefined) {
        if (/\W/.test(this.cur_char)) break;
        this.nextCharToBuf();
      }
    } else {
      while (this.cur_char !== undefined) {
        if (/\w|\s/.test(this.cur_char)) break;
        this.nextCharToBuf();
      }
    }

    const content = this.buf.flush();

    return this.constructCurrentToken(this.determineTokenType(content), content);
  }

  lexLine(): Token[] | undefined {
    if (this.data[this.cur_line] === undefined) return undefined;

    const tokens: Token[] = [];
    let token: Token;

    this.consumeWhitespace();
    while (this.cur_char !== undefined) {
      if (this.cur_char === ";") {
        token = this.consumeComment();
      } else if (/["']/.test(this.cur_char)) {
        token = this.consumeString();
      } else if (/\d|\./.test(this.cur_char)) {
        token = this.consumeNumber();
      } else {
        token = this.consumeWord();
      }

      tokens.push(token);
      this.prev_token = token;

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
}