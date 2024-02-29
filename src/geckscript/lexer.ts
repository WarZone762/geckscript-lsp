import { StringBuffer } from "../common.js";
import { is_op, OpSyntaxKind, SyntaxKind, TokenSyntaxKind } from "./syntax_kind/generated.js";
import { Token } from "./types/syntax_node.js";
import { GetTokenKind } from "./types/token_data.js";

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

    number_or_word(): Token {
        // try parsing as a hex number
        if (this.char === "0" && this.nth(1)?.toLowerCase() === "x") {
            const token = this.start(SyntaxKind.NUMBER_INT) as Token;

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

        // try parsing as a number
        const [token, finished] = this.try_number();
        if (finished) {
            return token;
        }

        // parse as a word
        while (this.more_data() && /[0-9a-zA-Z_]/.test(this.char)) {
            this.next_to_buf();
        }

        const kind = GetTokenKind(this.buf.toString().toLowerCase());
        token.kind = kind !== SyntaxKind.UNKNOWN ? kind : SyntaxKind.IDENT;

        return this.finish(token);
    }

    try_number(): [Token<SyntaxKind.NUMBER_INT>, true] | [Token, false] {
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

            return [this.finish(token), true];
        }

        while (this.more_data()) {
            if (/\d/.test(this.char)) {
                this.next_to_buf();
            } else if (this.char === ".") {
                this.next_to_buf();
                break;
            } else if (/[0-9a-zA-Z_]/.test(this.char)) {
                return [token, false];
            } else {
                return [this.finish(token), true];
            }
        }

        while (this.more_data() && /\d/.test(this.char)) {
            this.next_to_buf();
        }

        return [this.finish(token), true];
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
            } else if (this.char === "." && this.is_number(1)) {
                token = this.try_number()[0];
            } else if (/[a-zA-Z0-9_]/.test(this.char)) {
                token = this.number_or_word();
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

    is_number(offset: number): boolean {
        let nth = this.nth(offset);
        // first character must be a number
        if (nth === undefined || /\D/.test(nth)) {
            return false;
        }
        offset++;
        nth = this.nth(offset);

        while (nth !== undefined) {
            if (/[a-zA-Z_]/.test(nth)) {
                return false;
            } else if (/\D/.test(nth)) {
                return true;
            }
            offset++;
            nth = this.nth(offset);
        }

        return true;
    }

    *lex(): Generator<Token> {
        while (this.more_data()) {
            yield this.lex_token();
        }
        yield this.lex_token();
    }
}
