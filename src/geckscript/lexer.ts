import { StringBuffer } from "../common";
import { is_op, OpSyntaxKind, SyntaxKind, TokenSyntaxKind } from "./syntax_kind/generated";
import { Token } from "./types/syntax_node";
import { GetTokenKind } from "./types/token_data";


export class Lexer {
    data: string;
    cur_pos = 0;
    cur_char: string;
    prev_token: Token | undefined;
    buf: StringBuffer;

    constructor(text: string) {
        this.data = text;
        this.cur_char = text[0];
        this.buf = new StringBuffer(512);
    }

    nextChar(): void {
        this.cur_char = this.data[++this.cur_pos];
    }

    nextCharToBuf(): void {
        this.buf.append(this.cur_char);
        this.nextChar();
    }

    lookAhead(offset: number): string | undefined {
        return this.data[this.cur_pos + offset];
    }

    moreData(): boolean {
        return this.cur_pos < this.data.length;
    }

    startToken<T extends TokenSyntaxKind = TokenSyntaxKind>(kind?: T): Token<T> {
        const token = Token(kind ?? SyntaxKind.UNKNOWN);
        token.offset = this.cur_pos;

        return token as Token<T>;
    }

    finishToken<T extends Token>(token: T): T {
        token.text = this.buf.flush();

        return token;
    }

    consumeWhitespace(): Token<SyntaxKind.WHITESPACE> {
        const token = this.startToken(SyntaxKind.WHITESPACE);

        this.nextCharToBuf();
        while (this.moreData() && /[^\S\n]/.test(this.cur_char)) {
            this.nextCharToBuf();
        }

        this.finishToken(token);

        return token;
    }

    consumeNewline(): Token<SyntaxKind.NEWLINE> {
        let token = this.startToken(SyntaxKind.NEWLINE);

        this.nextCharToBuf();
        token = this.finishToken(token);

        return token;
    }

    consumeComment(): Token<SyntaxKind.COMMENT> {
        const token = this.startToken(SyntaxKind.COMMENT);

        while (this.moreData() && this.cur_char !== "\n") {
            if (this.cur_char === "\r" && this.lookAhead(1) === "\n") {
                break;
            }
            this.nextCharToBuf();
        }

        this.finishToken(token);

        return token;
    }

    consumeString(): Token<SyntaxKind.STRING> {
        const token = this.startToken(SyntaxKind.STRING);

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

    consumeNumber(): Token<SyntaxKind.NUMBER_INT> {
        const token = this.startToken(SyntaxKind.NUMBER_INT);

        if (
            this.cur_char === "0" &&
            this.lookAhead(1)?.toLowerCase() === "x"
        ) {
            this.nextCharToBuf();
            this.nextCharToBuf();

            while (this.moreData()) {
                if (/[0-9a-fA-F]/.test(this.cur_char)) {
                    this.nextCharToBuf();
                } else {
                    break;
                }
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

    consumeOperator(): Token<OpSyntaxKind | SyntaxKind.UNKNOWN> {
        const next_char = this.lookAhead(1);
        if (next_char != undefined) {
            const operator = this.cur_char + next_char;
            if (is_op(GetTokenKind(operator))) {
                const token = this.startToken(GetTokenKind(operator));

                this.nextCharToBuf();
                this.nextCharToBuf();

                return this.finishToken(token) as Token<OpSyntaxKind>;
            }
        }

        if (is_op(GetTokenKind(this.cur_char))) {
            const token = this.startToken(GetTokenKind(this.cur_char));
            this.nextCharToBuf();

            return this.finishToken(token) as Token<OpSyntaxKind>;
        }

        const token = this.startToken(SyntaxKind.UNKNOWN);

        this.nextCharToBuf();

        return this.finishToken(token);
    }

    consumeWord(): Token {
        const token = this.startToken();

        while (this.moreData() && /[0-9a-zA-Z_]/.test(this.cur_char)) {
            this.nextCharToBuf();
        }

        const kind = GetTokenKind(this.buf.toString().toLowerCase());

        token.kind = kind !== SyntaxKind.UNKNOWN ? kind : SyntaxKind.NAME;

        return this.finishToken(token);
    }

    lexToken(): Token {
        let token: Token;

        if (this.moreData()) {
            if (/[^\S\n]/.test(this.cur_char)) {
                token = this.consumeWhitespace();
            } else if (this.cur_char === "\n") {
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
                    `Unknown character "${this.cur_char}" at offset ${this.cur_pos}`
                );
            }

            this.prev_token = token;

            return token;
        } else {
            const eof = Token(SyntaxKind.EOF);
            eof.offset = this.cur_pos;

            return eof;
        }
    }

    *lex(): Generator<Token> {
        while (this.moreData()) {
            yield this.lexToken();
        }
        yield this.lexToken();
    }
}
