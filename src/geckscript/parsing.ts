import { DiagnosticSeverity } from "vscode-languageserver";
import { Lexer } from "./lexer.js";
import { AnyEvent, EventDiagnostic, EventKind, EventStart } from "./parser/event.js";
import { Input, parse } from "./parser/parser.js";
import { NodeSyntaxKind, SyntaxKind } from "./syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "./types/syntax_node.js";

import assert = require("assert");

export function parse_str(str: string): [Node, Diagnostic[]] {
    const l = new Lexer(str);
    const tokens_full = Array.from(l.lex());
    const tokens = tokens_full.filter(
        (t) => t.kind != SyntaxKind.WHITESPACE && t.kind != SyntaxKind.COMMENT
    );
    const input = new Input(tokens.map((t) => t.kind));

    return output_to_tree(process_events(parse(input)), tokens_full);
}

export function output_to_tree(output: AnyEvent[], tokens: Token[]): [Node, Diagnostic[]] {
    const builder = new TriviaBuilder(tokens, output);
    return builder.process();
}

export function process_events(events: AnyEvent[]): AnyEvent[] {
    const output: AnyEvent[] = [];
    const forward_parents: EventStart[] = [];

    for (let i = 0; i < events.length; ++i) {
        const e = events[i];
        if (e.kind !== EventKind.Start) {
            output.push(e);
        } else {
            let idx = i;
            let fp: EventStart = e as EventStart;
            while (true) {
                forward_parents.unshift(new EventStart(fp.syntax_kind));
                fp.syntax_kind = SyntaxKind.TOMBSTONE;
                if (fp.forward_parent == undefined) {
                    break;
                }
                idx += fp.forward_parent;
                fp = events[idx] as EventStart;
            }

            output.push(...forward_parents.filter((e) => e.syntax_kind !== SyntaxKind.TOMBSTONE));
            forward_parents.splice(0);
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

    start_node(kind: NodeSyntaxKind) {
        const node = Node(kind);
        node.offset = this.children.at(-1)?.end() ?? this.parents.at(-1)?.[0].end() ?? 0;
        this.parents.push([node, this.children.length]);
    }

    finish_node() {
        const [node, first_child] = this.parents.pop()!;
        const n = this.children.length - first_child;
        for (let _ = 0; _ < n; ++_) {
            const child = this.children.pop()!;
            child.parent = node;
            node.children.unshift(child);
        }
        node.text_len = (node.children.at(-1)?.end() ?? node.offset) - node.offset;
        this.children.push(node);
    }

    finish(): Node {
        const root = this.children.pop();
        assert(root != undefined && root.is_node());

        return root;
    }
}

export class TriviaBuilder {
    tokens: Token[];
    token_pos = 0;
    events: AnyEvent[];
    diagnostics: Diagnostic[] = [];
    tree_builder: TreeBuilder;

    constructor(tokens: Token[], parsed_output: AnyEvent[]) {
        this.tokens = tokens;
        this.events = parsed_output;
        this.tree_builder = new TreeBuilder();
    }

    process(): [Node, Diagnostic[]] {
        for (const e of this.events) {
            switch (e.kind) {
                case EventKind.Token:
                    this.token();
                    break;
                case EventKind.Start:
                    this.start_node(e.syntax_kind);
                    break;
                case EventKind.Finish:
                    this.finish_node();
                    break;
                case EventKind.Error:
                    this.error(e);
            }
        }
        this.attach_trivia();

        return this.finish();
    }

    token() {
        this.attach_trivia();
        this.do_token();
    }

    start_node(kind: NodeSyntaxKind) {
        if (this.tree_builder.parents.length !== 0 /* && kind !== SyntaxKind.STMT_LIST*/) {
            this.attach_trivia();
        }
        this.tree_builder.start_node(kind);
        // if (kind === SyntaxKind.STMT_LIST) {
        //     this.attach_trivia();
        // }
    }

    finish_node(is_last = false) {
        if (this.tree_builder.parents.length !== 1 || is_last) {
            this.tree_builder.finish_node();
        }
    }

    error(event: EventDiagnostic) {
        const last_token: Token | undefined = this.tokens[this.token_pos] ?? this.tokens.at(-1);
        this.diagnostics.push(new Diagnostic(event.msg, event.severity, last_token?.offset, 0));
    }

    attach_trivia() {
        while (this.token_pos < this.tokens.length) {
            const kind = this.tokens[this.token_pos].kind;
            if (kind !== SyntaxKind.WHITESPACE && kind !== SyntaxKind.COMMENT) {
                break;
            }
            this.do_token();
        }
    }

    do_token() {
        this.tree_builder.token(this.tokens[this.token_pos++]);
    }

    finish(): [Node, Diagnostic[]] {
        this.finish_node(true);

        return [this.tree_builder.finish(), this.diagnostics];
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
