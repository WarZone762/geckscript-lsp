import { DiagnosticSeverity } from "vscode-languageserver";
import { Lexer } from "./lexer.js";
import { AnyEvent, EventDiagnostic, EventKind, EventStart } from "./parser/event.js";
import { Input, parse } from "./parser/parser.js";
import { NodeSyntaxKind, SyntaxKind } from "./syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "./types/syntax_node.js";
import assert from "assert";

export function parseStr(str: string): [Node, Diagnostic[]] {
    const l = new Lexer(str);
    const tokensFull = Array.from(l.lex());
    const tokens = tokensFull.filter(
        (t) => t.kind != SyntaxKind.WHITESPACE && t.kind != SyntaxKind.COMMENT
    );
    const input = new Input(tokens.map((t) => t.kind));

    return outputToTree(processEvents(parse(input)), tokensFull);
}

export function outputToTree(output: AnyEvent[], tokens: Token[]): [Node, Diagnostic[]] {
    const builder = new TriviaBuilder(tokens, output);
    return builder.process();
}

export function processEvents(events: AnyEvent[]): AnyEvent[] {
    const output: AnyEvent[] = [];
    const forwardParents: EventStart[] = [];

    for (let i = 0; i < events.length; ++i) {
        const e = events[i];
        if (e.kind !== EventKind.Start) {
            output.push(e);
        } else {
            let idx = i;
            let fp: EventStart = e as EventStart;
            while (true) {
                forwardParents.unshift(new EventStart(fp.syntaxKind));
                fp.syntaxKind = SyntaxKind.TOMBSTONE;
                if (fp.forwardParent == undefined) {
                    break;
                }
                idx += fp.forwardParent;
                fp = events[idx] as EventStart;
            }

            output.push(...forwardParents.filter((e) => e.syntaxKind !== SyntaxKind.TOMBSTONE));
            forwardParents.splice(0);
        }
    }

    return output;
}

export class TreeBuilder {
    parents: [Node, number][] = [];
    children: NodeOrToken[] = [];

    token(token: Token) {
        this.children.push(token);
    }

    startNode(kind: NodeSyntaxKind) {
        const node = Node(kind);
        node.offset = this.children.at(-1)?.end() ?? this.parents.at(-1)?.[0].end() ?? 0;
        this.parents.push([node, this.children.length]);
    }

    finishNode() {
        const [node, firstChild] = this.parents.pop()!;
        const n = this.children.length - firstChild;
        for (let _ = 0; _ < n; ++_) {
            const child = this.children.pop()!;
            child.parent = node;
            node.children.unshift(child);
        }
        node.textLen = (node.children.at(-1)?.end() ?? node.offset) - node.offset;
        this.children.push(node);
    }

    finish(): Node {
        const root = this.children.pop();
        assert.strict(root != undefined && root.isNode());

        return root;
    }
}

export class TriviaBuilder {
    tokens: Token[];
    tokenPos = 0;
    events: AnyEvent[];
    diagnostics: Diagnostic[] = [];
    treeBuilder: TreeBuilder;

    constructor(tokens: Token[], parsedOutput: AnyEvent[]) {
        this.tokens = tokens;
        this.events = parsedOutput;
        this.treeBuilder = new TreeBuilder();
    }

    process(): [Node, Diagnostic[]] {
        for (const e of this.events) {
            switch (e.kind) {
                case EventKind.Token:
                    this.token();
                    break;
                case EventKind.Start:
                    this.startNode(e.syntaxKind);
                    break;
                case EventKind.Finish:
                    this.finishNode();
                    break;
                case EventKind.Error:
                    this.error(e);
            }
        }
        this.attachTrivia();

        return this.finish();
    }

    token() {
        this.attachTrivia();
        this.doToken();
    }

    startNode(kind: NodeSyntaxKind) {
        if (this.treeBuilder.parents.length !== 0 /* && kind !== SyntaxKind.STMT_LIST*/) {
            this.attachTrivia();
        }
        this.treeBuilder.startNode(kind);
        // if (kind === SyntaxKind.STMT_LIST) {
        //     this.attachTrivia();
        // }
    }

    finishNode(isLast = false) {
        if (this.treeBuilder.parents.length !== 1 || isLast) {
            this.treeBuilder.finishNode();
        }
    }

    error(event: EventDiagnostic) {
        const lastToken: Token | undefined = this.tokens[this.tokenPos] ?? this.tokens.at(-1);
        this.diagnostics.push(new Diagnostic(event.msg, event.severity, lastToken?.offset, 0));
    }

    attachTrivia() {
        while (this.tokenPos < this.tokens.length) {
            const kind = this.tokens[this.tokenPos].kind;
            if (kind !== SyntaxKind.WHITESPACE && kind !== SyntaxKind.COMMENT) {
                break;
            }
            this.doToken();
        }
    }

    doToken() {
        this.treeBuilder.token(this.tokens[this.tokenPos++]);
    }

    finish(): [Node, Diagnostic[]] {
        this.finishNode(true);

        return [this.treeBuilder.finish(), this.diagnostics];
    }
}

export class Diagnostic {
    msg: string;
    severity: DiagnosticSeverity;
    offset: number;
    len: number;

    constructor(msg: string, severity: DiagnosticSeverity, offset = 0, len = 0) {
        this.msg = msg;
        this.severity = severity;
        this.offset = offset;
        this.len = len;
    }
}
