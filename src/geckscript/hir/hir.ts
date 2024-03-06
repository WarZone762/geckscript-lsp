import assert from "assert";
import { AstNode, Script } from "../ast/generated.js";
import * as parsing from "../parsing.js";
import { SyntaxKind } from "../syntax_kind/generated.js";
import { NodeOrToken } from "../types/syntax_node.js";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic } from "vscode-languageserver";
import { Position, Range, TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

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

export function exprTypeName(type: ExprType): string {
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

    rangeOf(node: NodeOrToken): Range {
        return { start: this.posAt(node.offset), end: this.posAt(node.end()) };
    }

    posAt(offset: number): Position {
        return this.doc.positionAt(offset);
    }

    offsetAt(pos: Position): number {
        return this.doc.offsetAt(pos);
    }
}

export class FileDatabase {
    files: Map<string, ParsedString> = new Map();

    parseDoc(doc: TextDocument): ParsedString {
        const [node, errors] = parsing.parseStr(doc.getText());
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

        assert.strictEqual(node.kind, SyntaxKind.SCRIPT);
        const parsed = new ParsedString(doc, new Script(node), diagnostics);
        this.files.set(doc.uri, parsed);

        return parsed;
    }

    async loadFolder(dirPath: string) {
        const files = await fs.readdir(dirPath, { recursive: true });
        for (const file of files) {
            const fullPath = path.resolve(path.join(dirPath, file));
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory() || (!file.endsWith(".gek") && !file.endsWith(".geck"))) {
                continue;
            }

            const content = await fs.readFile(fullPath);
            const doc = TextDocument.create(
                URI.file(fullPath).toString(),
                "geckscript",
                0,
                content.toString()
            );
            this.parseDoc(doc);
        }
    }
}
