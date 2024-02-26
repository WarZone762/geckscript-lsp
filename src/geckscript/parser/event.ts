import { NodeSyntaxKind, TokenSyntaxKind } from "../syntax_kind/generated.js";

export const enum EventKind {
    Tombstone,
    Start,
    Finish,
    Token,
    Error,
}

interface Event {
    kind: EventKind;
}

export class EventTombstone implements Event {
    kind = EventKind.Tombstone as const;
}

export class EventStart implements Event {
    kind = EventKind.Start as const;

    syntax_kind: NodeSyntaxKind;
    forward_parent?: number;

    constructor(kind: NodeSyntaxKind) {
        this.syntax_kind = kind;
    }
}

export class EventFinish implements Event {
    kind = EventKind.Finish as const;
}

export class EventToken implements Event {
    kind = EventKind.Token as const;

    syntax_kind: TokenSyntaxKind;
    n_raw_tokens: number;

    constructor(syntax_kind: TokenSyntaxKind, n_raw_tokens: number) {
        this.syntax_kind = syntax_kind;
        this.n_raw_tokens = n_raw_tokens;
    }
}

export class EventError {
    kind = EventKind.Error as const;

    msg: string;

    constructor(msg: string) {
        this.msg = msg;
    }
}

export type AnyEvent = EventTombstone | EventStart | EventFinish | EventToken | EventError;
