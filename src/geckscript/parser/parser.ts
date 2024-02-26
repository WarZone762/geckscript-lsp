import {
    TokenSyntaxKind,
    NodeSyntaxKind,
    SyntaxKind,
    syntax_kind_name,
} from "../syntax_kind/generated.js";
import { AnyEvent, EventError, EventFinish, EventKind, EventStart, EventToken } from "./event.js";
import { script } from "./grammar/other.js";
import { TokenSet } from "./token_set.js";

import assert = require("assert");

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
        if (event.kind != EventKind.Start) {
            assert(false);
        }

        event.syntax_kind = kind;
        p.push_event(new EventFinish());

        return new CompletedMarker(this.pos, kind);
    }

    abandon(p: Parser) {
        if (this.pos == p.events.length - 1) {
            const event = p.events.pop()!;
            if (
                event.kind != EventKind.Start ||
                event.syntax_kind != SyntaxKind.TOMBSTONE ||
                event.forward_parent != undefined
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
        const new_pos = p.start();
        const event = p.events[this.pos];
        if (event.kind != EventKind.Start) {
            assert(false);
        }

        event.forward_parent = new_pos.pos - this.pos;

        return new_pos;
    }

    /** Extend this marker to the left until the specified marker */
    extend_to(p: Parser, m: Marker): CompletedMarker {
        const event = p.events[m.pos];
        if (event.kind != EventKind.Start) {
            assert(false);
        }

        event.forward_parent = this.pos - m.pos;

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

    cur(): TokenSyntaxKind {
        return this.nth(0);
    }

    nth(n: number): TokenSyntaxKind {
        assert(this.steps < Parser.PARSER_STEP_LIMIT, "the parser seems to be stuck");

        ++this.steps;

        return this.inp.kind(this.pos + n);
    }

    at(kind: TokenSyntaxKind): boolean {
        return this.nth_at(0, kind);
    }

    nth_at(n: number, kind: TokenSyntaxKind): boolean {
        return this.inp.kind(this.pos + n) == kind;
    }

    opt(kind: TokenSyntaxKind): boolean {
        if (!this.at(kind)) {
            return false;
        }

        this.do_next(kind, 1);
        return true;
    }

    at_ts(kinds: TokenSet): boolean {
        return kinds.has(this.cur());
    }

    start(): Marker {
        const pos = this.events.length;
        this.push_event(new EventStart(SyntaxKind.TOMBSTONE));
        return new Marker(pos);
    }

    next(kind: TokenSyntaxKind) {
        if (!this.opt(kind)) {
            throw new Error("called 'next' with an incorrect SyntaxKind");
        }
    }

    next_any() {
        const kind = this.nth(0);
        if (kind == SyntaxKind.EOF) {
            return;
        }
        this.do_next(kind, 1);
    }

    err(msg: string) {
        this.push_event(new EventError(`parsing error: ${msg}`));
    }

    expect(kind: TokenSyntaxKind): boolean {
        if (this.opt(kind)) {
            return true;
        }
        this.err(`expected ${syntax_kind_name(kind)}`);
        return false;
    }

    err_and_next(msg: string) {
        this.err_recover(msg, new TokenSet());
    }

    err_recover(msg: string, recovery: TokenSet) {
        if (this.at(SyntaxKind.NEWLINE) || this.at_ts(recovery)) {
            this.err(msg);
            return;
        }

        const m = this.start();
        this.err(msg);
        this.next_any();
        m.complete(this, SyntaxKind.ERROR);
    }

    do_next(kind: TokenSyntaxKind, n_raw_tokens: number) {
        this.pos += n_raw_tokens;
        this.steps = 0;
        this.push_event(new EventToken(kind, n_raw_tokens));
    }

    push_event(event: AnyEvent) {
        this.events.push(event);
    }
}

export function parse(input: Input): AnyEvent[] {
    const p = new Parser(input);
    script(p);

    return p.finish();
}
