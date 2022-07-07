import { Position } from "vscode-languageserver";

export class Lexer {
  data: string[];
  cur_pos: Position;
  cur_char: string | undefined;

  buf: Buffer;
  buf_pos: number;

  constructor(data: string) {
    this.data = data.split("\n");
    this.cur_pos = {
      line: 0,
      character: 0
    };

    this.buf = Buffer.allocUnsafe(512 * 4);
    this.buf_pos = 0;
  }

  bufferAppend(char: string): void {
    this.buf_pos += this.buf.write(char, this.buf_pos);
  }

  bufferFlush(): string {
    const str = this.buf.toString(undefined, 0, this.buf_pos);
    this.buf_pos = 0;

    return str;
  }

  nextChar(): void {
    this.cur_char = this.data[this.cur_pos.line][this.cur_pos.character++];
  }

  lexLine(): (string | undefined)[] | undefined {
    if (!this.data[this.cur_pos.line]) return undefined;

    const tokens: (string | undefined)[] = [];

    this.nextChar();
    while (this.cur_char) {
      if (/["']/.test(this.cur_char)) {
        tokens.push(this.consumeString());
      } else if (/\s/.test(this.cur_char)) {
        if (this.buf_pos == 0) {
          this.nextChar();
          continue;
        }
        tokens.push(this.bufferFlush());
      } else {
        this.bufferAppend(this.cur_char);
      }

      this.nextChar();
    }

    ++this.cur_pos.line;
    this.cur_pos.character = 0;

    return tokens;
  }

  consumeString(): string | undefined {
    const quote: string = this.cur_char as string;

    this.bufferAppend(quote);
    this.nextChar();

    while (this.cur_char) {
      if (this.cur_char == quote) {
        this.bufferAppend(this.cur_char);
        return this.bufferFlush();
      }
      this.bufferAppend(this.cur_char);

      this.nextChar();
    }

    return undefined;
  }

  // consumeComment(): string | undefined {

  // }
}
