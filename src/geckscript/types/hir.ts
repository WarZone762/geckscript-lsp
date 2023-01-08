import { Diagnostic } from "vscode-languageserver";
import { AstNode } from "../ast/generated";
import { Node } from "./syntax_node";
import * as parsing from "../parsing";
import { TextDocument } from "vscode-languageserver-textdocument";

export class TreeData {
    name: string;
    children: TreeData[];

    constructor(name: string, children: TreeData[] = []) {
        this.name = name;
        this.children = children;
    }

    append(child: TreeData): void {
        this.children.push(child);
    }

    concat(children: TreeData[]): void {
        this.children = this.children.concat(children);
    }
}

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

export type SymbolTable = { [key: string]: Symbol; };

export class Environment {
    files: Map<string, [Node, Diagnostic[]]> = new Map();

    parse_doc(doc: TextDocument): [Node, Diagnostic[]] {
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
                }
            });
        }

        const output: [Node, Diagnostic[]] = [node, diagnostics];
        this.files.set(doc.uri, output);

        return output;
    }
}
