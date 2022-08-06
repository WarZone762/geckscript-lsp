import { Position } from "vscode-languageserver-textdocument";
import { StringBuffer } from "../common";
import { TokenType, TokenSubtype, TokenData } from "./token_data";

export type TokenPosition = {
  line: number;
  column: number;
}

export class Token {
  type: TokenType;
  subtype?: TokenSubtype;
  position: TokenPosition;
  content: string;
  length: number;

  constructor(type: TokenType, subtype: TokenSubtype | undefined, position: TokenPosition, content: string) {
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
  cur_ln: number;
  cur_col: number;
  cur_char: string | undefined;

  prev_token: Token | undefined;

  buf: StringBuffer;

  constructor(data: string) {
    this.data = data.split(/\r?\n/);
    this.cur_ln = 0;
    this.cur_col = 0;
    this.cur_char = data[0][0];
    this.buf = new StringBuffer(512);
  }

  nextChar(): void {
    this.cur_char = this.data[this.cur_ln][++this.cur_col];
  }

  nextCharToBuf(): void {
    this.buf.append(this.cur_char as string);
    this.nextChar();
  }

  peekCharOnLine(offset: number): string | undefined {
    return this.data[this.cur_ln][this.cur_col + offset];
  }

  determineTokenType(data: string): [TokenType, TokenSubtype | undefined] {
    data = data.toLowerCase();

    if (TokenData.typename.containsToken(data)) {
      return [TokenType.TYPENAME, TokenData.typename.getTokenSubtype(data)];
    } else if (TokenData.keyword.containsToken(data)) {
      return [TokenType.KEYWORD, TokenData.keyword.getTokenSubtype(data)];
    } else if (
      TokenData.block_type.containsToken(data) &&
      this.prev_token?.subtype === TokenSubtype.BEGIN
    ) {
      return [TokenType.BLOCK_TYPE, TokenData.block_type.getTokenSubtype(data)];
    } else if (TokenData.operator.containsToken(data)) {
      return [TokenType.OPERATOR, TokenData.operator.getTokenSubtype(data)];
    } else if (TokenData.function.containsToken(data)) {
      return [TokenType.FUNCTION, undefined];
    } else {
      return [TokenType.ID, undefined];
    }
  }

  constructCurrentToken(type: TokenType, subtype?: TokenSubtype): Token {
    const content = this.buf.flush();

    return new Token(type, subtype, { line: this.cur_ln, column: this.cur_col - content.length }, content);
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

    return this.constructCurrentToken(TokenType.COMMENT);
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

    return this.constructCurrentToken(TokenType.STRING);
  }

  consumeNumber(): Token {
    if (
      this.cur_char === "0" &&
      this.data[this.cur_ln][this.cur_col + 1]?.toLowerCase() === "x"
    ) {
      this.nextCharToBuf();
      this.nextCharToBuf();

      while (this.cur_char !== undefined) {
        if (/[0-9a-fA-F]/.test(this.cur_char))
          this.nextCharToBuf();
        else
          return this.constructCurrentToken(TokenType.NUMBER, TokenSubtype.HEX);
      }

      return this.constructCurrentToken(TokenType.NUMBER, TokenSubtype.HEX);
    }
    this.nextCharToBuf();

    while (this.cur_char !== undefined) {
      if (/\d/.test(this.cur_char)) {
        this.nextCharToBuf();
      } else if (this.cur_char === ".") {
        this.nextCharToBuf();
        break;
      } else {
        return this.constructCurrentToken(TokenType.NUMBER, TokenSubtype.DECIMAL);
      }
    }

    while (this.cur_char !== undefined && /\d/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(TokenType.NUMBER, TokenSubtype.DECIMAL);
  }

  consumeOperator(): Token {
    const next_char = this.peekCharOnLine(1);
    if (next_char != undefined) {
      const operator = this.cur_char + next_char;
      if (TokenData.operator.containsToken(operator)) {
        this.nextCharToBuf();
        this.nextCharToBuf();

        return this.constructCurrentToken(TokenType.OPERATOR, TokenData.operator.getTokenSubtype(operator));
      }
    }

    if (TokenData.operator.containsToken(this.cur_char!)) {
      this.nextCharToBuf();

      return this.constructCurrentToken(TokenType.OPERATOR, TokenData.operator.getTokenSubtype(this.buf.toString()));
    }

    this.nextCharToBuf();

    return this.constructCurrentToken(TokenType.UNKNOWN, TokenSubtype.UNKNOWN);
  }

  consumeWord(): Token {
    while (this.cur_char !== undefined) {
      if (/\W/.test(this.cur_char)) break;
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(...this.determineTokenType(this.buf.toString()));
  }

  lexLine(): Token[] | undefined {
    if (this.data[this.cur_ln] === undefined) return undefined;

    const tokens: Token[] = [];
    let token: Token;

    this.consumeWhitespace();
    while (this.cur_char !== undefined) {
      if (this.cur_char === ";") {
        token = this.consumeComment();
      } else if (/["']/.test(this.cur_char)) {
        token = this.consumeString();
      } else if (/\d/.test(this.cur_char)) {
        token = this.consumeNumber();
      } else if (
        /\./.test(this.cur_char) &&
        (char => char != undefined && /\d/.test(char))(this.peekCharOnLine(1))
      ) {
        token = this.consumeNumber();
      } else if (/\w/.test(this.cur_char)) {
        token = this.consumeWord();
      } else if (/\S/.test(this.cur_char)) {
        token = this.consumeOperator();
      } else {
        throw new Error(`
          Unknown character "${this.cur_char}"\n
          ${this.data[this.cur_ln]}\n
          ${" ".repeat(this.cur_col)}^
        `);
      }

      tokens.push(token);
      this.prev_token = token;

      this.consumeWhitespace();
    }

    this.cur_char = this.data[++this.cur_ln]?.[0];
    this.cur_col = 0;

    return tokens;
  }

  static Lex(text: string): Token[][] {
    const lexer = new Lexer(text);
    const tokens: Token[][] = [];
    let line_tokens: Token[] | undefined;

    while ((line_tokens = lexer.lexLine()) !== undefined) {
      if (line_tokens.length === 0) continue;
      tokens.push(line_tokens);
    }

    return tokens;
  }
}
