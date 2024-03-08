import assert from "assert";
import { LambdaExpr, LambdaInlineExpr, Name, Script, StmtList, VarDecl } from "../ast/generated.js";
import * as parsing from "../parsing.js";
import { SyntaxKind } from "../syntax_kind/generated.js";
import { Node, NodeOrToken } from "../types/syntax_node.js";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic } from "vscode-languageserver";
import { Position, Range, TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

export class FileDatabase {
    files: Map<string, ParsedString> = new Map();
    scripts: Map<string, SymbolTable> = new Map();

    parseDoc(doc: TextDocument): ParsedString {
        const [node, errors] = parsing.parseStr(doc.getText());
        assert.strictEqual(node.kind, SyntaxKind.SCRIPT);

        const script = new Script(node);
        const scriptName = script.name()?.name()?.text;
        if (scriptName !== undefined) {
            this.scripts.set(scriptName, new SymbolTable(script));
        }

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

        const parsed = new ParsedString(doc, script, diagnostics);
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

export class SymbolTable {
    node: ScopeNode;
    symbols: Map<string, Symbol> = new Map();
    parent?: SymbolTable;
    children: SymbolTable[] = [];

    constructor(node: ScopeNode) {
        this.node = node;

        if (node instanceof Script) {
            this.lowerScript(node);
        } else if (node instanceof StmtList) {
            this.lowerStmtList(node.green);
        } else if (node instanceof LambdaExpr) {
            this.lowerLambda(node);
        } else if (node instanceof LambdaInlineExpr) {
            this.lowerLambdaInline(node);
        }
    }

    lowerScript(script: Script) {
        this.addSymbol(script);

        const body = script.body();
        if (body !== undefined) {
            const table = new SymbolTable(body);
            this.pushChild(table);
        }
    }

    lowerStmtList(stmtList: Node) {
        for (const child of stmtList.children) {
            if (child.kind === SyntaxKind.VAR_DECL) {
                const name = new VarDecl(child);
                this.addSymbol(name);
            } else if (child.kind === SyntaxKind.STMT_LIST) {
                const table = new SymbolTable(new StmtList(child));
                this.pushChild(table);
            } else if (child.kind === SyntaxKind.LAMBDA_EXPR) {
                const table = new SymbolTable(new LambdaExpr(child));
                this.pushChild(table);
            } else if (child.kind === SyntaxKind.LAMBDA_INLINE_EXPR) {
                const table = new SymbolTable(new LambdaInlineExpr(child));
                this.pushChild(table);
            } else if (child.isNode()) {
                this.lowerStmtList(child);
            }
        }
    }

    lowerLambda(lambda: LambdaExpr) {
        const params = lambda.params();
        if (params !== undefined) {
            for (const param of params.iter()) {
                if (param instanceof VarDecl) {
                    this.addSymbol(param);
                }
            }
        }

        const body = lambda.body();
        if (body !== undefined) {
            this.lowerStmtList(body.green);
        }
    }

    lowerLambdaInline(lambda: LambdaInlineExpr) {
        const params = lambda.params();
        if (params !== undefined) {
            for (const param of params.iter()) {
                if (param instanceof VarDecl) {
                    this.addSymbol(param);
                }
            }
        }
    }

    pushChild(child: SymbolTable) {
        child.parent = this;
        this.children.push(child);
    }

    addSymbol(decl: Script | VarDecl) {
        const symbol = Symbol.new(decl, this);
        if (symbol === undefined) {
            return;
        }

        // TODO: check if already exists, and emit an error
        this.symbols.set(symbol.name, symbol);
    }

    toDebug(indent: number = 0): string {
        let out = "    ".repeat(indent) + "SymbolTable {";
        for (const [k, v] of this.symbols.entries()) {
            out += "\n" + "    ".repeat(indent + 1) + `${k}: ${v.name}`;
        }

        for (const child of this.children) {
            out += "\n";
            out += child.toDebug(indent + 1);
        }

        out += (out.at(-1) === "{" ? "" : "\n" + "    ".repeat(indent)) + "}";

        return out;
    }
}

export class Symbol {
    name: string;
    kind: SymbolKind;
    decl: Script | VarDecl;
    parent: SymbolTable;

    constructor(
        name: string,
        kind: SymbolKind,
        declaration: Script | VarDecl,
        parent: SymbolTable
    ) {
        this.name = name;
        this.kind = kind;
        this.decl = declaration;
        this.parent = parent;
    }

    static new(decl: Script | VarDecl, parent: SymbolTable): Symbol | undefined {
        let name: string | undefined;
        let kind: SymbolKind | undefined;
        if (decl instanceof Script) {
            name = decl.name()?.name()?.text;
            if (name === undefined) {
                return;
            }

            kind = SymbolKind.Script;
        } else {
            name = decl.ident()?.name()?.text;
            if (name === undefined) {
                return;
            }

            kind = SymbolKind.Variable;
        }

        return new Symbol(name, kind, decl, parent);
    }

    nameNode(): Name {
        if (this.decl instanceof Script) {
            return this.decl.name()!;
        } else {
            return this.decl.ident()!;
        }
    }
}

export type ScopeNode = Script | StmtList | LambdaExpr | LambdaInlineExpr;

export const enum SymbolKind {
    Unknown,

    Variable,
    Function,
    Script,
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

export function exprTypeName(type: ExprType): string {
    return EXPR_TYPE_NAME_MAP[type] ?? "unable to find Type name";
}
