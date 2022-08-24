import { StringBuffer } from "../common";
import { TokenData } from "./token_data";
import { SyntaxKind, Token, Operator, IsOperator } from "./types";


// TODO: separate out wiki page name from TokenData, implement better parsing error reporting
export class Lexer {
  data: string;
  data_last_idx: number;

  cur_pos = 0;
  cur_ln = 0;
  cur_col = 0;

  cur_char: string;

  prev_token: Token | undefined;

  buf: StringBuffer;

  constructor(text: string) {
    this.data = text;
    this.data_last_idx = text.length - 1;
    this.cur_char = text[0];
    this.buf = new StringBuffer(512);

    this.skipWhitespace();
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
    T extends SyntaxKind = SyntaxKind
  >(kind?: T): Token<T> {
    const token = new Token(kind);
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

  consumeNewline(): Token<SyntaxKind.Newline> {
    let token = this.createToken(SyntaxKind.Newline);

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

  consumeComment(): Token<SyntaxKind.Comment> {
    const token = this.createToken(SyntaxKind.Comment);

    while (this.moreData() && this.cur_char !== "\n") {
      if (this.cur_char === "\r" && this.lookAhead(1) === "\n") break;
      this.nextCharToBuf();
    }

    this.finishToken(token);

    return token;
  }

  consumeString(): Token<SyntaxKind.String> {
    const token = this.createToken(SyntaxKind.String);

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

  consumeNumber(): Token<SyntaxKind.Number> {
    const token = this.createToken(SyntaxKind.Number);

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

  consumeOperator(): Operator | Token<SyntaxKind.Unknown> {
    const next_char = this.lookAhead(1);
    if (next_char != undefined) {
      const operator = this.cur_char + next_char;
      if (IsOperator(TokenData.All[operator])) {
        const token = this.createToken(TokenData.All[operator]);

        this.nextCharToBuf();
        this.nextCharToBuf();

        return this.finishToken(token) as Operator;
      }
    }

    if (IsOperator(TokenData.All[this.cur_char])) {
      const token = this.createToken(TokenData.All[this.cur_char]);
      this.nextCharToBuf();

      return this.finishToken(token) as Operator;
    }

    const token = this.createToken(SyntaxKind.Unknown);

    this.nextCharToBuf();

    return this.finishToken(token);
  }

  consumeWord(): Token {
    const token = this.createToken();

    while (this.moreData() && /[0-9a-zA-Z_]/.test(this.cur_char)) {
      this.nextCharToBuf();
    }

    const kind = TokenData.All[this.buf.toString().toLowerCase()];

    token.kind = kind ?? SyntaxKind.Identifier;

    return this.finishToken(token);
  }

  lexToken(): Token {
    let token: Token;

    if (this.moreData()) {
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

      this.prev_token = token;
      this.skipWhitespace();

      return token;
    } else {
      const eof = new Token(SyntaxKind.EOF);
      eof.range = {
        start: { line: this.cur_ln + 1, character: 0 },
        end: { line: this.cur_ln + 1, character: 1 }
      };

      return eof;
    }
  }
}
