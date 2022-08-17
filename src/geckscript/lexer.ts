import { StringBuffer } from "../common";
import { TokenData } from "./token_data";

import { SyntaxType, SyntaxSubtype, Token } from "./types";


/*
TODO: separate out wiki page name from TokenData, implement better parsing error reporting,
get rid of tokens in nodes, make parser continue parsing current rule on an unexpected token
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

  skipWhitespace(): void {
    while (this.moreData() && /[^\S\n]/.test(this.cur_char)) {
      this.nextChar();
    }
  }

  createToken<
    T extends SyntaxType = SyntaxType,
    ST extends SyntaxSubtype = SyntaxSubtype
  >(type?: T, subtype?: ST): Token<T, ST> {
    const token = new Token(type, subtype);
    token.range = {
      start: { line: this.cur_ln, character: this.cur_col },
      end: { line: this.cur_ln, character: this.cur_col }
    };

    return token;
  }

  finishToken<T extends Token>(token: T): T {
    token.content = this.buf.flush();

    token.range.end.character = this.cur_col;

    return token;
  }

  consumeNewline(): Token<SyntaxType.Newline> {
    let token = this.createToken(SyntaxType.Newline);

    this.nextCharToBuf();
    token = this.finishToken(token);
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

  consumeComment(): Token<SyntaxType.Comment> {
    const token = this.createToken(SyntaxType.Comment);

    while (this.moreData() && this.cur_char !== "\n") {
      if (this.cur_char === "\r" && this.lookAhead(1) === "\n") break;
      this.nextCharToBuf();
    }

    this.finishToken(token);

    return token;
  }

  consumeString(): Token<SyntaxType.Literal, SyntaxSubtype.String> {
    const token = this.createToken(SyntaxType.Literal, SyntaxSubtype.String);

    const quote: string = this.cur_char;

    this.nextCharToBuf();

    while (this.moreData()) {
      if (this.cur_char === quote) {
        this.nextCharToBuf();
        break;
      }
      this.nextCharToBuf();
    }

    return this.finishToken(token);
  }

  consumeNumber(): Token<SyntaxType.Literal, SyntaxSubtype.Number> {
    const token = this.createToken(SyntaxType.Literal, SyntaxSubtype.Number);

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
          break;
      }

      return this.finishToken(token);
    }

    this.nextCharToBuf();

    while (this.moreData()) {
      if (/\d/.test(this.cur_char)) {
        this.nextCharToBuf();
      } else if (this.cur_char === ".") {
        this.nextCharToBuf();
        break;
      } else {

        return this.finishToken(token);
      }
    }

    while (this.moreData() && /\d/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    return this.finishToken(token);
  }

  consumeOperator(): Token<SyntaxType.Operator | SyntaxType.Unknown> {
    const next_char = this.lookAhead(1);
    if (next_char != undefined) {
      const operator = this.cur_char + next_char;
      if (operator in TokenData.Operators) {
        const token = this.createToken(SyntaxType.Operator, TokenData.Operators[operator]);

        this.nextCharToBuf();
        this.nextCharToBuf();

        return this.finishToken(token);
      }
    }

    if (this.cur_char in TokenData.Operators) {
      const token = this.createToken(SyntaxType.Operator, TokenData.Operators[this.cur_char]);
      this.nextCharToBuf();

      return this.finishToken(token);
    }

    const token = this.createToken(SyntaxType.Unknown);

    this.nextCharToBuf();

    return this.finishToken(token);
  }

  consumeWord(): Token {
    const token = this.createToken();

    while (this.moreData() && /[0-9a-zA-Z_]/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    const word = this.buf.toString().toLowerCase();

    if (word in TokenData.Typenames) {
      token.type = SyntaxType.Typename;
      token.subtype = TokenData.Typenames[word];
    } else if (word in TokenData.Keywords) {
      token.type = SyntaxType.Keyword;
      token.subtype = TokenData.Keywords[word];
    } else if (
      word in TokenData.Blocktypes &&
      this.prev_token?.subtype === SyntaxSubtype.Begin
    ) {
      token.type = SyntaxType.BlockTypeIdentifier;
      token.subtype = TokenData.Blocktypes[word];
    } else if (word in TokenData.Operators) {
      token.type = SyntaxType.Operator;
      token.subtype = TokenData.Operators[word];
    } else {
      token.type = SyntaxType.Identifier;
    }

    return this.finishToken(token);
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

    const eof = new Token(SyntaxType.EOF);
    eof.range = {
      start: { line: this.cur_ln + 1, character: 0 },
      end: { line: this.cur_ln + 1, character: 1 }
    };
    tokens.push(eof);

    return tokens;
  }

  static Lex(text: string): Token[] {
    const lexer = new Lexer(text);

    return lexer.lex();
  }
}
