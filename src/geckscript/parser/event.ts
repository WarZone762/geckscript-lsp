import { DiagnosticSeverity } from "vscode-languageserver";

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

    syntaxKind: NodeSyntaxKind;
    forwardParent?: number;

    constructor(kind: NodeSyntaxKind) {
        this.syntaxKind = kind;
    }
}

export class EventFinish implements Event {
    kind = EventKind.Finish as const;
}

export class EventToken implements Event {
    kind = EventKind.Token as const;

    syntaxKind: TokenSyntaxKind;
    nRawTokens: number;

    constructor(syntaxKind: TokenSyntaxKind, nRawTokens: number) {
        this.syntaxKind = syntaxKind;
        this.nRawTokens = nRawTokens;
    }
}

export class EventDiagnostic {
    kind = EventKind.Error as const;

    msg: string;
    severity: DiagnosticSeverity;

    constructor(msg: string, severity: DiagnosticSeverity) {
        this.msg = msg;
        this.severity = severity;
    }
}

export type AnyEvent = EventTombstone | EventStart | EventFinish | EventToken | EventDiagnostic;
