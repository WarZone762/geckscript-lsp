import { Position } from "vscode-languageserver-textdocument";
import { StringBuffer } from "../common";
import * as Tokens from "./tokens";

export type TokenPosition = {
  line: number;
  column: number;
}

export class Token {
  type: Tokens.TokenType;
  subtype?: Tokens.TokenSubtype;
  position: TokenPosition;
  content: string;
  length: number;

  constructor(type: Tokens.TokenType, subtype: Tokens.TokenSubtype | undefined, position: TokenPosition, content: string) {
    this.type = type;
    this.subtype = subtype;
    this.position = position;
    this.content = content;
    this.length = content.length;
  }

  getLastPos(): TokenPosition {
    const pos: TokenPosition = {
      column: this.position.column + this.length - 1,
      line: this.position.line
    };

    return pos;
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

  determineTokenType(data: string): [Tokens.TokenType, Tokens.TokenSubtype | undefined] {
    if (Tokens.Typenames.containsToken(data)) {
      return [Tokens.TokenType.TYPENAME, Tokens.Typenames.getTokenSubtype(data)!];
    } else if (Tokens.Keywords.containsToken(data)) {
      return [Tokens.TokenType.KEYWORD, Tokens.Keywords.getTokenSubtype(data)!];
    } else if (
      Tokens.BlockTypes.containsToken(data) &&
      this.prev_token?.subtype === Tokens.TokenSubtype.BEGIN
    ) {
      return [Tokens.TokenType.BLOCK_TYPE, undefined];
    } else if (Tokens.Operators.containsToken(data)) {
      return [Tokens.TokenType.OPERATOR, Tokens.Operators.getTokenSubtype(data)!];
    } else if (Tokens.Functions.containsToken(data)) {
      return [Tokens.TokenType.FUNCTION, undefined];
    } else {
      return [Tokens.TokenType.ID, undefined];
    }
  }

  constructCurrentToken(type: Tokens.TokenType, subtype?: Tokens.TokenSubtype): Token {
    const content = this.buf.flush();

    return new Token(type, subtype, { line: this.cur_line, column: this.cur_col - content.length }, content);
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

    return this.constructCurrentToken(Tokens.TokenType.COMMENT);
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

    return this.constructCurrentToken(Tokens.TokenType.STRING);
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
        return this.constructCurrentToken(Tokens.TokenType.NUMBER);
      }
    }

    while (this.cur_char !== undefined && /\d/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(Tokens.TokenType.NUMBER);
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

    return this.constructCurrentToken(...this.determineTokenType(this.buf.toString()));
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

  getTokens(): TokensStorage {
    const tokens: Token[][] = [];
    let line_tokens: Token[] | undefined;

    while ((line_tokens = this.lexLine()) !== undefined) {
      tokens.push(line_tokens as Token[]);
    }

    return new TokensStorage(tokens);
  }
}

export class TokensStorage {
  data: Token[][];

  constructor(data: Token[][]) {
    this.data = data;
  }

  getTokenAtPos(pos: Position): Token | null {
    for (const token of this.data[pos.line]) {
      if (
        token.position.column <= pos.character &&
        pos.character <= token.position.column + token.length
      ) {
        return token;
      }
    }

    return null;
  }
}

export function GetTokens(text: string): TokensStorage {
  const lexer = new Lexer(text);
  return lexer.getTokens();
}
