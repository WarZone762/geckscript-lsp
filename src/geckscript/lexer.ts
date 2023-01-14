import { StringBuffer } from "../common";
import { is_op, OpSyntaxKind, SyntaxKind, TokenSyntaxKind } from "./syntax_kind/generated";
import { Token } from "./types/syntax_node";
import { GetTokenKind } from "./types/token_data";

export class Lexer {
    data: string;
    pos = 0;
    char: string;
    last_token: Token | undefined;
    buf: StringBuffer;

    constructor(text: string) {
        this.data = text;
        this.char = text[0];
        this.buf = new StringBuffer(512);
    }

    next(): void {
        this.char = this.data[++this.pos];
    }

    next_to_buf(): void {
        this.buf.append(this.char);
        this.next();
    }

    nth(offset: number): string | undefined {
        return this.data[this.pos + offset];
    }

    more_data(): boolean {
        return this.pos < this.data.length;
    }

    start<T extends TokenSyntaxKind = TokenSyntaxKind>(kind?: T): Token<T> {
        const token = Token(kind ?? SyntaxKind.UNKNOWN);
        token.offset = this.pos;

        return token as Token<T>;
    }

    finish<T extends Token>(token: T): T {
        token.text = this.buf.flush();

        return token;
    }

    whitespace(): Token<SyntaxKind.WHITESPACE> {
        const token = this.start(SyntaxKind.WHITESPACE);

        this.next_to_buf();
        while (this.more_data() && /[^\S\n]/.test(this.char)) {
            this.next_to_buf();
        }

        this.finish(token);

        return token;
    }

    newline(): Token<SyntaxKind.NEWLINE> {
        let token = this.start(SyntaxKind.NEWLINE);

        this.next_to_buf();
        while (this.more_data() && this.char === "\n") {
            this.next_to_buf();
        }
        token = this.finish(token);

        return token;
    }

    comment(): Token<SyntaxKind.COMMENT> {
        const token = this.start(SyntaxKind.COMMENT);

        while (this.more_data() && this.char !== "\n") {
            if (this.char === "\r" && this.nth(1) === "\n") {
                break;
            }
            this.next_to_buf();
        }

        this.finish(token);

        return token;
    }

    str(): Token<SyntaxKind.STRING> {
        const token = this.start(SyntaxKind.STRING);

        const quote: string = this.char;

        this.next_to_buf();

        while (this.more_data()) {
            if (this.char === quote) {
                this.next_to_buf();
                break;
            }
            this.next_to_buf();
        }

        return this.finish(token);
    }

    number_int(): Token<SyntaxKind.NUMBER_INT> {
        const token = this.start(SyntaxKind.NUMBER_INT);

        if (this.char === "0" && this.nth(1)?.toLowerCase() === "x") {
            this.next_to_buf();
            this.next_to_buf();

            while (this.more_data()) {
                if (/[0-9a-fA-F]/.test(this.char)) {
                    this.next_to_buf();
                } else {
                    break;
                }
            }

            return this.finish(token);
        }

        this.next_to_buf();

        while (this.more_data()) {
            if (/\d/.test(this.char)) {
                this.next_to_buf();
            } else if (this.char === ".") {
                this.next_to_buf();
                break;
            } else {
                return this.finish(token);
            }
        }

        while (this.more_data() && /\d/.test(this.char)) {
            this.next_to_buf();
        }

        return this.finish(token);
    }

    op(): Token<OpSyntaxKind | SyntaxKind.UNKNOWN> {
        const next_char = this.nth(1);
        if (next_char != undefined) {
            const operator = this.char + next_char;
            if (is_op(GetTokenKind(operator))) {
                const token = this.start(GetTokenKind(operator));

                this.next_to_buf();
                this.next_to_buf();

                return this.finish(token) as Token<OpSyntaxKind>;
            }
        }

        if (is_op(GetTokenKind(this.char))) {
            const token = this.start(GetTokenKind(this.char));
            this.next_to_buf();

            return this.finish(token) as Token<OpSyntaxKind>;
        }

        const token = this.start(SyntaxKind.UNKNOWN);

        this.next_to_buf();

        return this.finish(token);
    }

    word(): Token {
        const token = this.start();

        while (this.more_data() && /[0-9a-zA-Z_]/.test(this.char)) {
            this.next_to_buf();
        }

        const kind = GetTokenKind(this.buf.toString().toLowerCase());

        token.kind = kind !== SyntaxKind.UNKNOWN ? kind : SyntaxKind.IDENT;

        return this.finish(token);
    }

    lex_token(): Token {
        let token: Token;

        if (this.more_data()) {
            if (/[^\S\n]/.test(this.char)) {
                token = this.whitespace();
            } else if (this.char === "\n") {
                token = this.newline();
            } else if (this.char === ";") {
                token = this.comment();
            } else if (/["']/.test(this.char)) {
                token = this.str();
            } else if (/\d/.test(this.char)) {
                token = this.number_int();
            } else if (
                /\./.test(this.char) &&
                ((char) => char != undefined && /\d/.test(char))(this.nth(1))
            ) {
                token = this.number_int();
            } else if (/[a-zA-Z_]/.test(this.char)) {
                token = this.word();
            } else if (/\S/.test(this.char)) {
                token = this.op();
            } else {
                throw new Error(`Unknown character "${this.char}" at offset ${this.pos}`);
            }

            this.last_token = token;

            return token;
        } else {
            const eof = Token(SyntaxKind.EOF);
            eof.offset = this.pos;

            return eof;
        }
    }

    *lex(): Generator<Token> {
        while (this.more_data()) {
            yield this.lex_token();
        }
        yield this.lex_token();
    }
}
