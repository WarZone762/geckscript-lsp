import { Position } from "vscode-languageserver-textdocument";
import { StringBuffer } from "../common";
import { TokenType, TokenSubtype, TokenData } from "./token_data";

export class Token {
  type: TokenType;
  subtype?: TokenSubtype;
  position: Position;
  content: string;
  length: number;

  constructor(type: TokenType, subtype: TokenSubtype | undefined, position: Position, content: string) {
    this.type = type;
    this.subtype = subtype;
    this.position = position;
    this.content = content;
    this.length = content.length;
  }

  getLastPos(): Position {
    const pos: Position = {
      character: this.position.character + this.length - 1,
      line: this.position.line
    };

    return pos;
  }
}

/*
TODO: separate out wiki page name from TokenData, implement better parsing error reporting,
get rid of tokens in nodes
*/
export class Lexer {
  data: string;
  data_last_idx: number;

  cur_pos = 0;
  cur_ln = 0;
  cur_col = 0;

  cur_char: string;

  prev_token: Token | undefined;

  buf: StringBuffer;

  constructor(data: string) {
    this.data = data;
    this.data_last_idx = data.length - 1;
    this.cur_char = data[0];
    this.buf = new StringBuffer(512);
  }

  nextChar(): void {
    this.cur_char = this.data[++this.cur_pos];
    ++this.cur_col;
  }

  nextCharToBuf(): void {
    this.buf.append(this.cur_char);
    this.nextChar();
  }

  lookAhead(offset: number): string | undefined {
    return this.data[this.cur_pos + offset];
  }

  moreData(): boolean {
    return this.cur_pos < this.data_last_idx;
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

    return new Token(type, subtype, { line: this.cur_ln, character: this.cur_col - content.length }, content);
  }

  skipWhitespace(): void {
    while (this.moreData() && /[^\S\n]/.test(this.cur_char)) {
      this.nextChar();
    }
  }

  consumeNewline(): Token {
    this.nextCharToBuf();
    const token = this.constructCurrentToken(TokenType.NEWLINE);
    this.cur_col = 0;
    ++this.cur_ln;
    this.skipWhitespace();

    while (this.moreData() && this.cur_char === "\n") {
      this.nextChar();
      this.cur_col = 0;
      ++this.cur_ln;
      this.skipWhitespace();
    }

    return token;
  }

  consumeComment(): Token {
    while (this.moreData() && this.cur_char !== "\n") {
      if (this.cur_char === "\r" && this.lookAhead(1) === "\n") break;
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(TokenType.COMMENT);
  }

  consumeString(): Token {
    const quote: string = this.cur_char;

    this.nextCharToBuf();

    while (this.moreData()) {
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
      this.lookAhead(1)?.toLowerCase() === "x"
    ) {
      this.nextCharToBuf();
      this.nextCharToBuf();

      while (this.moreData()) {
        if (/[0-9a-fA-F]/.test(this.cur_char))
          this.nextCharToBuf();
        else
          return this.constructCurrentToken(TokenType.NUMBER, TokenSubtype.HEX);
      }

      return this.constructCurrentToken(TokenType.NUMBER, TokenSubtype.HEX);
    }

    this.nextCharToBuf();

    while (this.moreData()) {
      if (/\d/.test(this.cur_char)) {
        this.nextCharToBuf();
      } else if (this.cur_char === ".") {
        this.nextCharToBuf();
        break;
      } else {
        return this.constructCurrentToken(TokenType.NUMBER, TokenSubtype.DECIMAL);
      }
    }

    while (this.moreData() && /\d/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(TokenType.NUMBER, TokenSubtype.DECIMAL);
  }

  consumeOperator(): Token {
    const next_char = this.lookAhead(1);
    if (next_char != undefined) {
      const operator = this.cur_char + next_char;
      if (TokenData.operator.containsToken(operator)) {
        this.nextCharToBuf();
        this.nextCharToBuf();

        return this.constructCurrentToken(TokenType.OPERATOR, TokenData.operator.getTokenSubtype(operator));
      }
    }

    if (TokenData.operator.containsToken(this.cur_char)) {
      this.nextCharToBuf();

      return this.constructCurrentToken(TokenType.OPERATOR, TokenData.operator.getTokenSubtype(this.buf.toString()));
    }

    this.nextCharToBuf();

    return this.constructCurrentToken(TokenType.UNKNOWN, TokenSubtype.UNKNOWN);
  }

  consumeWord(): Token {
    while (this.moreData() && /[0-9a-zA-Z_]/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    return this.constructCurrentToken(...this.determineTokenType(this.buf.toString()));
  }

  lex(): Token[] {
    const tokens: Token[] = [];
    let token: Token;

    this.skipWhitespace();
    while (this.moreData()) {
      if (this.cur_char === "\n") {
        token = this.consumeNewline();
      } else if (this.cur_char === ";") {
        token = this.consumeComment();
      } else if (/["']/.test(this.cur_char)) {
        token = this.consumeString();
      } else if (/\d/.test(this.cur_char)) {
        token = this.consumeNumber();
      } else if (
        /\./.test(this.cur_char) &&
        (char => char != undefined && /\d/.test(char))(this.lookAhead(1))
      ) {
        token = this.consumeNumber();
      } else if (/[a-zA-Z_]/.test(this.cur_char)) {
        token = this.consumeWord();
      } else if (/\S/.test(this.cur_char)) {
        token = this.consumeOperator();
      } else {
        throw new Error(
          `Unknown character "${this.cur_char}"\n` +
          `${this.data[this.cur_ln]}\n` +
          `${" ".repeat(this.cur_col)}^`
        );
      }

      tokens.push(token);
      this.prev_token = token;

      this.skipWhitespace();
    }

    tokens.push(new Token(
      TokenType.EOF, undefined, { line: this.cur_ln + 1, character: 0 }, ""
    ));

    return tokens;
  }

  static Lex(text: string): Token[] {
    const lexer = new Lexer(text);

    return lexer.lex();
  }
}
