import { AstNode, Script } from "../ast/generated.js";
import * as parsing from "../parsing.js";
import { SyntaxKind } from "../syntax_kind/generated.js";
import { NodeOrToken } from "../types/syntax_node.js";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic } from "vscode-languageserver";
import { Position, Range, TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

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
                severity: e.severity,
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

    async load_folder(dir_path: string) {
        const files = await fs.readdir(dir_path, { recursive: true });
        for (const file of files) {
            const full_path = path.resolve(path.join(dir_path, file));
            const stat = await fs.stat(full_path);

            if (stat.isDirectory() || (!file.endsWith(".gek") && !file.endsWith(".geck"))) {
                continue;
            }

            const content = await fs.readFile(full_path);
            const doc = TextDocument.create(
                URI.file(full_path).toString(),
                "geckscript",
                0,
                content.toString()
            );
            this.parse_doc(doc);
        }
    }
}
