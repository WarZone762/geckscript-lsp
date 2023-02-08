import { AstNode, Script } from "../ast/generated";
import * as parsing from "../parsing";
import { SyntaxKind } from "../syntax_kind/generated";
import { NodeOrToken } from "../types/syntax_node";
import { Diagnostic } from "vscode-languageserver";
import { Position, Range, TextDocument } from "vscode-languageserver-textdocument";

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

    range_of(node: NodeOrToken): Range {
        return { start: this.pos_at(node.offset), end: this.pos_at(node.end()) };
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
