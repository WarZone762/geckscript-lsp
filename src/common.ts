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
