import assert from "assert";
import { DiagnosticSeverity } from "vscode-languageserver";

import { NodeSyntaxKind, SyntaxKind, TokenSyntaxKind, syntaxKindName } from "../syntax.js";
import {
    AnyEvent,
    EventDiagnostic,
    EventFinish,
    EventKind,
    EventStart,
    EventToken,
} from "./event.js";
import { script } from "./grammar/other.js";
import { TokenSet } from "./token_set.js";

export class Input {
    tokens: TokenSyntaxKind[];

    kind(n: number): TokenSyntaxKind {
        return this.tokens[n];
    }

    constructor(tokens: TokenSyntaxKind[]) {
        this.tokens = tokens;
    }
}

export class Marker {
    pos: number;

    constructor(pos: number) {
        this.pos = pos;
    }

    complete(p: Parser, kind: NodeSyntaxKind): CompletedMarker {
        const event = p.events[this.pos];
        assert.strictEqual(event.kind, EventKind.Start);

        event.syntaxKind = kind;
        p.pushEvent(new EventFinish());

        return new CompletedMarker(this.pos, kind);
    }

    abandon(p: Parser) {
        if (this.pos == p.events.length - 1) {
            const event = p.events.pop()!;
            if (
                event.kind != EventKind.Start ||
                event.syntaxKind != SyntaxKind.TOMBSTONE ||
                event.forwardParent != undefined
            ) {
                assert(false);
            }
        }
    }
}

export class CompletedMarker {
    pos: number;
    kind: NodeSyntaxKind;

    constructor(pos: number, kind: NodeSyntaxKind) {
        this.pos = pos;
        this.kind = kind;
    }

    /** Crate a marker before this marker */
    precede(p: Parser): Marker {
        const newPos = p.start();
        const event = p.events[this.pos];
        if (event.kind != EventKind.Start) {
            assert(false);
        }

        event.forwardParent = newPos.pos - this.pos;

        return newPos;
    }

    /** Extend this marker to the left until the specified marker */
    extendTo(p: Parser, m: Marker): CompletedMarker {
        const event = p.events[m.pos];
        if (event.kind != EventKind.Start) {
            assert(false);
        }

        event.forwardParent = this.pos - m.pos;

        return this;
    }
}

export class Parser {
    static PARSER_STEP_LIMIT = 15_000_000;

    inp: Input;
    pos = 0;
    events: AnyEvent[] = [];
    steps = 0;

    constructor(inp: Input) {
        this.inp = inp;
    }

    finish(): AnyEvent[] {
        return this.events;
    }

    /** Get the current token */
    cur(): TokenSyntaxKind {
        return this.nth(0);
    }

    /** Get the token `n` tokens after the current one */
    nth(n: number): TokenSyntaxKind {
        assert(this.steps < Parser.PARSER_STEP_LIMIT, "the parser seems to be stuck");

        ++this.steps;

        return this.inp.kind(this.pos + n);
    }

    /** Check if the current token is `kind` */
    at(kind: TokenSyntaxKind): boolean {
        return this.nthAt(0, kind);
    }

    /** Check if the current token is in `kinds` */
    atTs(kinds: TokenSet): boolean {
        return kinds.has(this.cur());
    }

    /** Check if the token `n` tokens after the current one is `kind` */
    nthAt(n: number, kind: TokenSyntaxKind): boolean {
        return this.inp.kind(this.pos + n) == kind;
    }

    /**
     * Advance the parser if the next token is `kind`, otherwise do nothing
     * @returns boolean indicating whether the parser was advanced
     */
    opt(kind: TokenSyntaxKind): boolean {
        if (!this.at(kind)) {
            return false;
        }

        this.doNext(kind, 1);
        return true;
    }

    start(): Marker {
        const pos = this.events.length;
        this.pushEvent(new EventStart(SyntaxKind.TOMBSTONE));
        return new Marker(pos);
    }

    /** Assert the next token is `kind` and advance */
    next(kind: TokenSyntaxKind) {
        if (!this.opt(kind)) {
            throw new Error("called 'next' with an incorrect SyntaxKind");
        }
    }

    /** Advance the parser if there are more tokens */
    nextAny() {
        const kind = this.cur();
        if (this.cur() == SyntaxKind.EOF) {
            return;
        }
        this.doNext(kind, 1);
    }

    warnAndNext(msg: string) {
        this.warn(msg);
        this.nextAny();
    }

    warn(msg: string) {
        this.pushEvent(new EventDiagnostic(msg, DiagnosticSeverity.Warning));
    }

    err(msg: string) {
        this.pushEvent(new EventDiagnostic(`parsing error: ${msg}`, DiagnosticSeverity.Error));
    }

    /**
     * Advance the parser if the current token is `kind`, otherwise emit an error
     * @returns boolean indicating whether the parser was advanced
     */
    expect(kind: TokenSyntaxKind): boolean {
        if (this.opt(kind)) {
            return true;
        }
        this.err(`expected ${syntaxKindName(kind)}`);
        return false;
    }

    errAndNext(msg: string) {
        this.errRecover(msg, new TokenSet());
    }

    errRecover(msg: string, recovery: TokenSet) {
        if (this.at(SyntaxKind.NEWLINE) || this.atTs(recovery)) {
            this.err(msg);
            return;
        }

        const m = this.start();
        this.err(msg);
        this.nextAny();
        m.complete(this, SyntaxKind.ERROR);
    }

    doNext(kind: TokenSyntaxKind, nRawTokens: number) {
        this.pos += nRawTokens;
        this.steps = 0;
        this.pushEvent(new EventToken(kind, nRawTokens));
    }

    pushEvent(event: AnyEvent) {
        this.events.push(event);
    }
}

export function parse(input: Input): AnyEvent[] {
    const p = new Parser(input);
    script(p);

    return p.finish();
}
