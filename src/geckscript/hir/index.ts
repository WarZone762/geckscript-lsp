import { AstNode, Name, NameRef, Script } from "../ast/generated";
import * as parsing from "../parsing";
import { SyntaxKind } from "../syntax_kind/generated";
import { Node, NodeOrToken } from "../types/syntax_node";
import { Diagnostic } from "vscode-languageserver";
import { Position, TextDocument } from "vscode-languageserver-textdocument";

import assert = require("assert");

export const enum ExprType {
    Unknown,
    Ambiguous,
    Integer,
    Float,
    Form,
    Reference,
    String,
    Array,
}

const EXPR_TYPE_NAME_MAP: { [key in ExprType]?: string } = {
    [ExprType.Unknown]: "unknown",
    [ExprType.Ambiguous]: "ambiguous",
    [ExprType.Integer]: "integer",
    [ExprType.Float]: "float",
    [ExprType.Form]: "form",
    [ExprType.Reference]: "reference",
    [ExprType.String]: "string",
    [ExprType.Array]: "array",
};

export function expr_type_name(type: ExprType): string {
    return EXPR_TYPE_NAME_MAP[type] ?? "unable to find Type name";
}

export const enum SymbolKind {
    Unknown,

    Variable,
    Function,
    Script,
}

export interface Symbol {
    name: string;
    kind: SymbolKind;
    // declaration?: AnyNode;
    declaration?: AstNode;
    type: ExprType;
}

export type SymbolTable = { [key: string]: Symbol };

export class ParsedString {
    doc: TextDocument;
    root: Script;
    diagnostics: Diagnostic[];

    constructor(doc: TextDocument, root: Script, diagnostics: Diagnostic[]) {
        this.doc = doc;
        this.root = root;
        this.diagnostics = diagnostics;
    }

    pos_at(offset: number): Position {
        return this.doc.positionAt(offset);
    }

    offset_at(pos: Position): number {
        return this.doc.offsetAt(pos);
    }
}

export class FileDatabase {
    files: Map<string, ParsedString> = new Map();

    parse_doc(doc: TextDocument): ParsedString {
        const [node, errors] = parsing.parse_str(doc.getText());
        const diagnostics: Diagnostic[] = [];
        for (const e of errors) {
            const start = doc.positionAt(e.offset);
            const end = doc.positionAt(e.offset + e.len);

            diagnostics.push({
                message: e.msg,
                range: {
                    start: start,
                    end: end,
                },
            });
        }

        assert(node.kind === SyntaxKind.SCRIPT);
        const parsed = new ParsedString(doc, new Script(node), diagnostics);
        this.files.set(doc.uri, parsed);

        return parsed;
    }
}

export class ScopeNode {
    node: Node;
    decls: Name[] = [];
    refs: NameRef[] = [];
    children: ScopeNode[] = [];

    constructor(node: Node) {
        this.node = node;
    }

    traverse(callback: (s: ScopeNode) => unknown) {
        callback(this);
        for (const s of this.children) {
            s.traverse(callback);
        }
    }

    static build(node: Node): ScopeNode {
        const stack = [new ScopeNode(node)];

        function build_recursive(node: Node) {
            for (const child of node.children) {
                if (!child.is_node()) {
                    continue;
                }

                switch (child.kind) {
                    case SyntaxKind.NAME:
                        stack.at(-1)!.decls.push(new Name(child));
                        break;
                    case SyntaxKind.NAME_REF:
                        stack.at(-1)!.refs.push(new NameRef(child));
                        break;
                    case SyntaxKind.STMT_LIST:
                        stack.push(new ScopeNode(child));
                        build_recursive(child);
                        stack.at(-2)!.children.push(stack.pop()!);
                        break;
                    default: {
                        build_recursive(child);
                        break;
                    }
                }
            }
        }

        build_recursive(node);
        return stack.pop()!;
    }
}
