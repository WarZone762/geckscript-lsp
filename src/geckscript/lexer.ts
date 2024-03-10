import { StringBuffer } from "../common.js";
import { OpSyntaxKind, SyntaxKind, TokenSyntaxKind, isOp } from "./syntax_kind/generated.js";
import { Token } from "./types/syntax_node.js";
import { getTokenKind } from "./types/token_data.js";

export class Lexer {
    data: string;
    pos = 0;
    char: string;
    lastToken: Token | undefined;
    buf: StringBuffer;

    constructor(text: string) {
        this.data = text;
        this.char = text[0];
        this.buf = new StringBuffer(512);
    }

    next(): void {
        this.char = this.data[++this.pos];
    }

    nextToBuf(): void {
        this.buf.append(this.char);
        this.next();
    }

    nth(offset: number): string | undefined {
        return this.data[this.pos + offset];
    }

    moreData(): boolean {
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

        this.nextToBuf();
        while (this.moreData() && /[^\S\n]/.test(this.char)) {
            this.nextToBuf();
        }

        this.finish(token);

        return token;
    }

    newline(): Token<SyntaxKind.NEWLINE> {
        let token = this.start(SyntaxKind.NEWLINE);

        this.nextToBuf();
        while (this.moreData() && this.char === "\n") {
            this.nextToBuf();
        }
        token = this.finish(token);

        return token;
    }

    comment(): Token<SyntaxKind.COMMENT> {
        const token = this.start(SyntaxKind.COMMENT);

        while (this.moreData() && this.char !== "\n") {
            if (this.char === "\r" && this.nth(1) === "\n") {
                break;
            }
            this.nextToBuf();
        }

        this.finish(token);

        return token;
    }

    blockComment(): Token<SyntaxKind.BLOCK_COMMENT> {
        const token = this.start(SyntaxKind.BLOCK_COMMENT);

        while (this.moreData() && (this.char !== "*" || this.nth(1) !== "/")) {
            this.nextToBuf();
        }

        this.nextToBuf();
        this.nextToBuf();

        this.finish(token);

        return token;
    }

    str(): Token<SyntaxKind.STRING> {
        const token = this.start(SyntaxKind.STRING);

        const quote: string = this.char;

        this.nextToBuf();

        while (this.moreData()) {
            if (this.char === quote) {
                this.nextToBuf();
                break;
            }
            this.nextToBuf();
        }

        return this.finish(token);
    }

    numberOrWord(): Token {
        // try parsing as a hex number
        if (this.char === "0" && this.nth(1)?.toLowerCase() === "x") {
            const token = this.start(SyntaxKind.NUMBER_INT) as Token;

            this.nextToBuf();
            this.nextToBuf();

            while (this.moreData()) {
                if (/[0-9a-fA-F]/.test(this.char)) {
                    this.nextToBuf();
                } else {
                    break;
                }
            }

            return this.finish(token);
        }

        // try parsing as a number
        const [token, finished] = this.tryNumber();
        if (finished) {
            return token;
        }

        // parse as a word
        while (this.moreData() && /[0-9a-zA-Z_]/.test(this.char)) {
            this.nextToBuf();
        }

        const kind = getTokenKind(this.buf.toString().toLowerCase());
        token.kind = kind !== SyntaxKind.UNKNOWN ? kind : SyntaxKind.IDENT;

        return this.finish(token);
    }

    tryNumber(): [Token<SyntaxKind.NUMBER_INT>, true] | [Token, false] {
        const token = this.start(SyntaxKind.NUMBER_INT);

        if (this.char === "0" && this.nth(1)?.toLowerCase() === "x") {
            this.nextToBuf();
            this.nextToBuf();

            while (this.moreData()) {
                if (/[0-9a-fA-F]/.test(this.char)) {
                    this.nextToBuf();
                } else {
                    break;
                }
            }

            return [this.finish(token), true];
        }

        while (this.moreData()) {
            if (/\d/.test(this.char)) {
                this.nextToBuf();
            } else if (this.char === ".") {
                this.nextToBuf();
                break;
            } else if (/[0-9a-zA-Z_]/.test(this.char)) {
                return [token, false];
            } else {
                return [this.finish(token), true];
            }
        }

        while (this.moreData() && /\d/.test(this.char)) {
            this.nextToBuf();
        }

        return [this.finish(token), true];
    }

    op(): Token<OpSyntaxKind | SyntaxKind.UNKNOWN> {
        const nextChar = this.nth(1);
        if (nextChar != undefined) {
            const operator = this.char + nextChar;
            if (isOp(getTokenKind(operator))) {
                const token = this.start(getTokenKind(operator));

                this.nextToBuf();
                this.nextToBuf();

                return this.finish(token) as Token<OpSyntaxKind>;
            }
        }

        if (isOp(getTokenKind(this.char))) {
            const token = this.start(getTokenKind(this.char));
            this.nextToBuf();

            return this.finish(token) as Token<OpSyntaxKind>;
        }

        const token = this.start(SyntaxKind.UNKNOWN);

        this.nextToBuf();

        return this.finish(token);
    }

    lexToken(): Token {
        let token: Token;

        if (this.moreData()) {
            if (/[^\S\n]/.test(this.char)) {
                token = this.whitespace();
            } else if (this.char === "\n") {
                token = this.newline();
            } else if (this.char === ";") {
                token = this.comment();
            } else if (this.char === "/" && this.nth(1) === "*") {
                token = this.blockComment();
            } else if (/["']/.test(this.char)) {
                token = this.str();
            } else if (this.char === "." && this.isNumber(1)) {
                token = this.tryNumber()[0];
            } else if (/[a-zA-Z0-9_]/.test(this.char)) {
                token = this.numberOrWord();
            } else if (/\S/.test(this.char)) {
                token = this.op();
            } else {
                throw new Error(`Unknown character "${this.char}" at offset ${this.pos}`);
            }

            this.lastToken = token;

            return token;
        } else {
            const eof = Token(SyntaxKind.EOF);
            eof.offset = this.pos;

            return eof;
        }
    }

    isNumber(offset: number): boolean {
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
        while (this.moreData()) {
            yield this.lexToken();
        }
        yield this.lexToken();
    }
}
