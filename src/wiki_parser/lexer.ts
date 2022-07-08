import { StringBuffer } from "common";
import * as Constructs from "../geckscript_constructs";

export enum TokenType {
  unknown,
  TOTAL
}

export class Token {
  type: TokenType;
  content: string;
  length: number;

  constructor(type: TokenType, content: string) {
    this.type = type;
    this.content = content;
    this.length = content.length;
  }
}

export class Lexer {
  data: string;
  cur_pos: number;
  cur_char: string | undefined;

  prev_token: Token | undefined;

  buf: StringBuffer;

  constructor(data: string) {
    this.data = data;
    this.cur_pos = 0;
    this.cur_char = data[0][0];
    this.buf = new StringBuffer(512);
  }

  nextChar(): void {
    this.cur_char = this.data[++this.cur_pos];
  }

  nextCharToBuf(): void {
    this.buf.append(this.cur_char as string);
    this.nextChar();
  }

  // determineTokenType(data: string): TokenType {
  //   data = data.toLowerCase();
  //   if (data in Constructs.TypesLower) {
  //     return TokenType.type;
  //   } else if (data in Constructs.KeywordsLower) {
  //     return TokenType.keyword;
  //   } else if (
  //     data in Constructs.BlockTypesLower &&
  //     this.prev_token?.type === TokenType.keyword &&
  //     this.prev_token.content.toLocaleLowerCase() === "begin"
  //   ) {
  //     return TokenType.keyword;
  //   } else if (data in Constructs.Operators) {
  //     return TokenType.operator;
  //   } else if (data in Constructs.FunctionsLower) {
  //     return TokenType.function;
  //   } else {
  //     return TokenType.variable;
  //   }
  // }

  constructCurrentToken(type: TokenType, content?: string): Token {
    content = content ?? this.buf.flush();
    return new Token(type, content);
  }

  consumeWhitespace(): void {
    while (this.cur_char !== undefined && /\s/.test(this.cur_char)) {
      this.nextChar();
    }
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

    return this.constructCurrentToken(TokenType.unknown, content);
  }


  lexLine(): Token[] | undefined {
    if (this.data[this.cur_pos] === undefined) return undefined;

    const tokens: Token[] = [];
    let token: Token;

    this.consumeWhitespace();
    while (this.cur_char !== undefined) {
      token = this.consumeWord();

      tokens.push(token);
      this.prev_token = token;

      this.consumeWhitespace();
    }


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
