import assert from "assert";
import * as fsSync from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic } from "vscode-languageserver";
import { Position, Range, TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";

import { KeywordStyle } from "../../language_features/format.js";
import * as ast from "../ast/generated.js";
import * as parsing from "../parsing.js";
import { SyntaxKind } from "../syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "../types/syntax_node.js";
import { Analyzer } from "./api.js";
import { LowerContext } from "./lower.js";

export class FileDatabase {
    files: Map<string, ParsedString> = new Map();
    globalSymbols: Map<string, GlobalSymbol> = new Map();
    config: ServerConfig = { keywordStyle: KeywordStyle.LOWER };
    scriptCache: Map<Node<SyntaxKind.SCRIPT>, ParsedString> = new Map();

    async loadFolder(dirPath: string) {
        const files = await fs.readdir(dirPath, { recursive: true });
        for (const file of files) {
            const fullPath = path.resolve(path.join(dirPath, file));
            const stat = await fs.stat(fullPath);

            if (!stat.isDirectory() && file.endsWith("geckrc.json")) {
                this.loadConfig(file);
                fsSync.watch(file, undefined, (eventType) => {
                    if (eventType === "change") {
                        this.loadConfig(file);
                    }
                });

                continue;
            }

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

    parseDoc(doc: TextDocument): ParsedString {
        const [node, errors] = parsing.parseStr(doc.getText());
        assert.strictEqual(node.kind, SyntaxKind.SCRIPT);

        const diagnostics: Diagnostic[] = [];
        for (const e of errors) {
            const start = doc.positionAt(e.offset);
            const end = doc.positionAt(e.offset + e.len);

            diagnostics.push({ message: e.msg, severity: e.severity, range: { start, end } });
        }

        const script = new ast.Script(node);

        // remove old file from global symbols it references
        const oldParsed = this.files.get(doc.uri);
        if (oldParsed !== undefined) {
            for (const symbolName of oldParsed.unresolvedSymbols) {
                const symbol = this.globalSymbols.get(symbolName);
                symbol?.referencingFiles.delete(doc.uri);
                if (symbol?.referencingFiles.size === 0) {
                    this.globalSymbols.delete(symbolName);
                }
            }
        }

        const parsed = new ParsedString(doc, script, diagnostics);
        this.files.set(doc.uri, parsed);
        this.scriptCache.set(node, parsed);

        if (parsed.hir !== undefined) {
            const analyzer = new Analyzer(this, parsed);
            analyzer.analyze(parsed.hir);
        }

        return parsed;
    }

    findScript(script: Node<SyntaxKind.SCRIPT>): ParsedString | undefined {
        return this.scriptCache.get(script);
    }

    scriptToUri(name: string): ParsedString | undefined {
        for (const parsed of this.files.values()) {
            if (parsed.root.name()?.name()?.text === name) {
                return parsed;
            }
        }
    }

    async loadConfig(configPath: string) {
        const config = JSON.parse((await fs.readFile(configPath)).toString());
        switch (config.keywordStyle) {
            case "lower":
                this.config.keywordStyle = KeywordStyle.LOWER;
                break;
            case "upper":
                this.config.keywordStyle = KeywordStyle.UPPER;
                break;
            case "capital":
                this.config.keywordStyle = KeywordStyle.CAPITAL;
                break;
        }
    }
}

export class ParsedString {
    doc: TextDocument;
    root: ast.Script;
    hir?: Script;
    unresolvedSymbols: Set<string> = new Set();
    diagnostics: Diagnostic[];

    constructor(doc: TextDocument, root: ast.Script, diagnostics: Diagnostic[]) {
        this.doc = doc;
        this.root = root;
        const lower = new LowerContext();
        this.hir = lower.script(root);
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

export interface ServerConfig {
    keywordStyle: KeywordStyle;
}

export type HirNode =
    | Script
    | StmtList
    | Stmt
    | Expr
    | VarOrVarDeclList
    | VarOrVarDecl
    | Blocktype
    | String
    | Number;

export class Script {
    constructor(
        public name: string,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.Script
    ) {}
}

export class StmtList {
    constructor(
        public stmts: Stmt[],
        public node: ast.StmtList
    ) {}
}

export type Stmt = IfStmt | WhileStmt | BeginStmt | ForeachStmt | SetStmt | VarDeclStmt | Expr;

export class IfStmt {
    constructor(
        public cond: Expr,
        public trueBranch: StmtList,
        public falseBranch: IfStmt | undefined,
        public symbolTable: Map<string, Symbol>,
        public node: ast.IfStmt | ast.Branch
    ) {}
}

export class WhileStmt {
    constructor(
        public cond: Expr,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.WhileStmt
    ) {}
}

export class BeginStmt {
    constructor(
        public blocktype: Blocktype,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.BeginStmt
    ) {}
}

export class Blocktype {
    constructor(
        public name: string,
        public args: Expr[],
        public node: ast.BlocktypeDesig
    ) {}
}

export class ForeachStmt {
    constructor(
        public nameRef: NameRef,
        public iter: Expr,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.ForeachStmt
    ) {}
}

export class SetStmt {
    constructor(
        public var_: Expr,
        public value: Expr,
        public node: ast.SetStmt
    ) {}
}

export class VarDeclStmt {
    constructor(
        public name: Name,
        public value: Expr | undefined,
        public node: ast.VarDeclStmt
    ) {}
}

export type Expr =
    | UnaryExpr
    | BinExpr
    | MemberExpr
    | FuncExpr
    | LetExpr
    | LambdaInlineExpr
    | LambdaExpr
    | Literal
    | NameRef;

export class UnaryExpr {
    constructor(
        public type: ExprType,
        public op: UnaryExprOp,
        public operand: Expr,
        public node: ast.UnaryExpr
    ) {}
}

export const enum UnaryExprOp {
    Not,
}

export class BinExpr {
    constructor(
        public type: ExprType,
        public op: BinExprOp,
        public lhs: Expr,
        public rhs: Expr,
        public node: ast.BinExpr
    ) {}
}

export const enum BinExprOp {
    Plus,
    Minus,
    Asterisk,
    Slash,
    Percent,
    Eq,
}

export class MemberExpr {
    constructor(
        public type: ExprType,
        public op: MemberExprOp,
        public lhs: Expr,
        public rhs: Expr,
        public node: ast.MemberExpr
    ) {}
}

export const enum MemberExprOp {
    Dot,
    RArrow,
    SQBracket,
}

export class FuncExpr {
    constructor(
        public type: ExprType,
        public func: Expr,
        public args: Expr[],
        public node: ast.FuncExpr
    ) {}
}

export class LetExpr {
    constructor(
        public type: ExprType,
        public varOrVarDecl: VarOrVarDecl,
        public op: BinExprOp,
        public expr: Expr,
        public node: ast.LetExpr
    ) {}
}

export class LambdaInlineExpr {
    constructor(
        public type: ExprType,
        public params: VarOrVarDeclList,
        public expr: Expr,
        public symbolTable: Map<string, Symbol>,
        public node: ast.LambdaInlineExpr
    ) {}
}

export class LambdaExpr {
    constructor(
        public type: ExprType,
        public params: VarOrVarDeclList,
        public stmtList: StmtList,
        public symbolTable: Map<string, Symbol>,
        public node: ast.LambdaExpr
    ) {}
}

export class VarOrVarDeclList {
    constructor(
        public list: VarOrVarDecl[],
        public node: ast.VarOrVarDeclList
    ) {}
}

export type VarOrVarDecl = Name | NameRef;

export class Name {
    symbol: Symbol;

    constructor(
        name: string,
        type: ExprType,
        public node: ast.Name
    ) {
        this.symbol = new Symbol(name, type, this);
    }
}

export class NameRef {
    constructor(
        public symbol: Symbol | GlobalSymbol,
        public node: ast.NameRef
    ) {}
}

export class Literal {
    constructor(
        public literal: String | Number,
        public type: ExprType,
        public node: ast.Literal
    ) {}
}

export class String {
    constructor(
        public value: string,
        public node: Token<SyntaxKind.STRING>
    ) {}
}

export class Number {
    constructor(
        public value: number,
        public node: Token<SyntaxKind.NUMBER_INT>
    ) {}
}

export class ExprTypeSimple {
    kind: Exclude<ExprKind, ExprKind.Function>;

    constructor(kind: Exclude<ExprKind, ExprKind.Function>) {
        this.kind = kind;
    }

    toString(): string {
        switch (this.kind) {
            case ExprKind.Unknown:
                return "unknown";
            case ExprKind.Ambiguous:
                return "Ambiguous";
            case ExprKind.Void:
                return "void";
            case ExprKind.Form:
                return "form";
            case ExprKind.Script:
                return "script";
            case ExprKind.Integer:
                return "int";
            case ExprKind.Float:
                return "float";
            case ExprKind.Reference:
                return "reference";
            case ExprKind.String:
                return "string";
            case ExprKind.Array:
                return "array";
        }
    }
}

export class ExprTypeFunction {
    kind = ExprKind.Function as const;
    signature: Signature;

    constructor(signature: Signature) {
        this.signature = signature;
    }

    toString(): string {
        return "A";
    }
}

export type ExprType = ExprTypeSimple | ExprTypeFunction;

export const enum ExprKind {
    Unknown,
    Ambiguous,
    Void,
    Function,
    Form,
    Script,

    Integer,
    Float,
    Reference,
    String,
    Array,
}

const EXPR_TYPE_NAME_MAP: { [key in ExprKind]?: string } = {
    [ExprKind.Unknown]: "unknown",
    [ExprKind.Ambiguous]: "ambiguous",
    [ExprKind.Void]: "void",
    [ExprKind.Function]: "function",
    [ExprKind.Integer]: "integer",
    [ExprKind.Float]: "float",
    [ExprKind.Form]: "form",
    [ExprKind.Reference]: "reference",
    [ExprKind.String]: "string",
    [ExprKind.Array]: "array",
};

export function exprTypeName(type: ExprKind): string {
    return EXPR_TYPE_NAME_MAP[type] ?? "unable to find Type name";
}

export class GlobalSymbol {
    referencingFiles: Set<string> = new Set();

    constructor(
        public name: string,
        public type: ExprType
    ) {}
}

export class Symbol {
    constructor(
        public name: string,
        public type: ExprType,
        public decl: Name
    ) {}
}

export class Signature {
    ret: ExprType;
    args: ExprType[];

    constructor(ret: ExprType, args?: ExprType[]) {
        this.ret = ret;
        this.args = args ?? [];
    }

    toString(): string {
        if (this.args.length !== 0) {
            return this.ret.toString();
        } else {
            return `${this.ret} ${this.args.join(", ")}`;
        }
    }
}
