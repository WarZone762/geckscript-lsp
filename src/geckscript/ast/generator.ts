#!/bin/env -S node --loader ts-node/esm
import assert from "assert";

class NodeInfo {
    syntaxKind: string;

    members: { [key: string]: MemberInfo } = {};

    constructor(syntaxKind: string) {
        this.syntaxKind = syntaxKind;
    }

    funcs(): string {
        return `${Object.entries(this.members)
            .map((m) =>
                `
    ${m[0]}(): ${m[1].retType()} {
        return ${m[1].ret()};
    }
    `.trim()
            )
            .join("\n    ")}`;
    }
}

type InfoMap = { [key: string]: NodeInfo };

const VAR_OR_VAR_DECL_INFO_MAP: InfoMap = {};
const EXPR_INFO_MAP: InfoMap = {};
const STMT_INFO_MAP: InfoMap = {};
const LIST_INFO_MAP: InfoMap = {
    VarOrVarDeclList: new NodeInfo("VAR_OR_VAR_DECL_LIST"),
    PrimaryExprList: new NodeInfo("PRIMARY_EXPR_LIST"),
    ExprList: new NodeInfo("EXPR_LIST"),
    StmtList: new NodeInfo("STMT_LIST"),
};
const NODE_INFO_MAP: InfoMap = {};

class MemberInfo {
    args: string[] = [];

    ret(): string {
        switch (this.args[0]) {
            case "Token": {
                const predBody = this.args
                    .slice(1)
                    .map((d) => `k === SyntaxKind.${d}`)
                    .join(" || ");
                const predTypeRet = this.args
                    .slice(1)
                    .map((d) => `SyntaxKind.${d}`)
                    .join(" | ");

                return `token(this, (k => ${predBody}) as (k: SyntaxKind) => k is ${predTypeRet})`;
            }
            case "Type":
                return "token(this, isType)";
            case "Op":
                return "token(this, isOp)";
            case "VarOrVarDecl":
                return "VarOrVarDecl(child(this, isVarOrVarDecl))";
            case "Expr":
                return "Expr(child(this, isExpr))";
            case "Stmt":
                return "Stmt(child(this, isStmt))";
            default: {
                const syntaxKind =
                    NODE_INFO_MAP[this.args[0]]?.syntaxKind ??
                    LIST_INFO_MAP[this.args[0]]?.syntaxKind;
                return `${this.args[0]}.fromGreen(child(this, (k => k === SyntaxKind.${syntaxKind}) as (k: SyntaxKind) => k is SyntaxKind.${syntaxKind}))`;
            }
        }
    }

    retType(): string {
        switch (this.args[0]) {
            case "Token": {
                const predTypeRet = this.args
                    .slice(1)
                    .map((d) => `SyntaxKind.${d}`)
                    .join(" | ");

                return `Token<${predTypeRet}> | undefined`;
            }
            case "Type":
                return "Token<TypeSyntaxKind> | undefined";
            case "Op":
                return "Token<OpSyntaxKind> | undefined";
            case "VarOrVarDecl":
                return "VarOrVarDecl | undefined";
            case "Expr":
                return "Expr | undefined";
            case "Stmt":
                return "Stmt | undefined";
            default: {
                return `${this.args[0]} | undefined`;
            }
        }
    }
}

function parseData(data: string) {
    let pos = 0;
    const ts = tokens();

    const infos: InfoMap = {};

    while (pos < ts.length) {
        const [name, info] = parseNode();
        infos[name] = info;
    }

    return infos;

    function tokens(): string[] {
        return data
            .trim()
            .split(/\s+/)
            .flatMap((e) => e.split(/\b/));
    }

    function parseNode(): [string, NodeInfo] {
        const name = next();
        next(":");
        const syntaxKind = next();
        const info = new NodeInfo(syntaxKind);
        next("{");

        while (cur() !== "}") {
            const memName = next();
            const memInfo = new MemberInfo();
            next(":");

            while (cur() !== ",") {
                memInfo.args.push(next());
            }
            next(",");

            info.members[memName] = memInfo;
        }
        next("}");

        return [name, info];

        function cur(): string {
            return ts[pos];
        }

        function next(s?: string): string {
            const t = ts[pos++];
            if (s != undefined) {
                assert.strictEqual(t, s);
            }

            return t;
        }
    }
}

function listType(name: string, syntaxKind: string, predicate: string): string {
    return `
export class ${name}List extends AstNode<SyntaxKind.${syntaxKind}_LIST> {
    *iter() {
        for (const child of children(this, ${predicate})) {
            yield ${name}(child);
        }
    }
}
`.trim();
}

function enumType(name: string, infoMap: InfoMap): string {
    return `
export type ${name} =
    | ${Object.keys(infoMap).join("\n    | ")}
    ;

export function ${name}(green: Node<${name}SyntaxKind> | undefined): ${name} | undefined {
    if (green == undefined) {
        return undefined;
    }

    switch (green.kind) {
        ${Object.entries(infoMap)
            .map((n) =>
                `
        case SyntaxKind.${n[1].syntaxKind}:
            return new ${n[0]}(green as Node<SyntaxKind.${n[1].syntaxKind}>);
        `.trim()
            )
            .join("\n        ")}
    }
}
`.trim();
}

function generate(): string {
    Object.assign(VAR_OR_VAR_DECL_INFO_MAP, parseData(VAR_OR_VAR_DECL_DATA));
    Object.assign(EXPR_INFO_MAP, parseData(EXPR_DATA));
    Object.assign(STMT_INFO_MAP, parseData(STMT_DATA));
    Object.assign(NODE_INFO_MAP, parseData(NODE_DATA));
    return `
import { ExprSyntaxKind, isExpr, isOp, isPrimaryExpr, isStmt, isType, isVarOrVarDecl, NodeSyntaxKind, OpSyntaxKind, PrimaryExprSyntaxKind, StmtSyntaxKind, SyntaxKind, TokenSyntaxKind, TypeSyntaxKind, VarOrVarDeclSyntaxKind } from "../syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "../types/syntax_node.js";

export class AstNode<T extends NodeSyntaxKind = NodeSyntaxKind> {
    green: Node<T>;
    constructor(green: Node<T>) {
        this.green = green;
    }

    static fromGreen<C, T extends NodeSyntaxKind>(this: { new(green: Node<T>): C; }, green: Node<T> | undefined): C | undefined {
        if (green != undefined) {
            return new this(green);
        }
    }
}

function token<T extends TokenSyntaxKind>(node: AstNode, predicate: (kind: SyntaxKind) => kind is T, idx = 0): Token<T> | undefined {
    for (const child of node.green.children) {
        if (predicate(child.kind)) {
            if (idx > 0) {
                --idx;
            } else {
                return child as Token<T>;
            }
        }
    }
}

function child<T extends NodeSyntaxKind>(node: AstNode, predicate: (kind: SyntaxKind) => kind is T, idx = 0): Node<T> | undefined {
    for (const child of node.green.children) {
        if (predicate(child.kind)) {
            if (idx > 0) {
                --idx;
            } else {
                return child as Node<T>;
            }
        }
    }
}

function* children<T extends SyntaxKind>(node: AstNode, predicate: (kind: SyntaxKind) => kind is T): Generator<NodeOrToken<T>, void, undefined> {
    for (const child of node.green.children) {
        if (predicate(child.kind)) {
            yield child as NodeOrToken<T>;
        }
    }
}

export type Type = Token<TypeSyntaxKind>;
export type Op = Token<OpSyntaxKind>;

export type PrimaryExpr =
    | Token<SyntaxKind.NUMBER_INT>
    | Token<SyntaxKind.STRING>
    | NameRef
    ;

export function PrimaryExpr(green: NodeOrToken<PrimaryExprSyntaxKind> | undefined): PrimaryExpr | undefined {
    if (green == undefined) {
        return undefined;
    }

    switch (green.kind) {
        case SyntaxKind.NUMBER_INT:
            return green as Token<SyntaxKind.NUMBER_INT>;
        case SyntaxKind.STRING:
            return green as Token<SyntaxKind.STRING>;
        case SyntaxKind.NAME_REF:
            return new NameRef(green as Node<SyntaxKind.NAME_REF>);
    }
}

${enumType("VarOrVarDecl", VAR_OR_VAR_DECL_INFO_MAP)}
${enumType("Expr", EXPR_INFO_MAP)}
${enumType("Stmt", STMT_INFO_MAP)}

${listType("PrimaryExpr", "PRIMARY_EXPR", "isPrimaryExpr")}
${listType("VarOrVarDecl", "VAR_OR_VAR_DECL", "isVarOrVarDecl")}
${listType("Expr", "EXPR", "isExpr")}
${listType("Stmt", "STMT", "isStmt")}

${Object.entries(NODE_INFO_MAP)
    .map((n) =>
        `
export class ${n[0]} extends AstNode<SyntaxKind.${n[1].syntaxKind}> {
    ${n[1].funcs()}
}
`.trim()
    )
    .join("\n\n")}
`.trim();
}

const VAR_OR_VAR_DECL_DATA = `
Name: NAME {
    name: Token IDENT,
}

NameRef: NAME_REF {
    nameRef: Token IDENT,
}

VarDecl: VAR_DECL {
    type: Type,
    ident: Name,
}
`.trim();

const EXPR_DATA = `
UnaryExpr: UNARY_EXPR {
    op: Op,
    operand: Expr,
}

BinExpr: BIN_EXPR {
    lhs: Expr,
    op: Op,
    rhs: Expr 1,
}

MemberExpr: MEMBER_EXPR {
    lhs: Expr,
    leftOp: Token LSQBRACK RARROW DOT,
    rhs: Expr 1,
}

FuncExpr: FUNC_EXPR {
    name: NameRef,
    args: ExprList,
}

LambdaInlineExpr: LAMBDA_INLINE_EXPR {
    lbrack: Token LBRACK,
    params: VarOrVarDeclList,
    rbrack: Token RBRACK,
    arrow: Token EQGT,
    expr: Expr,
}

LambdaExpr: LAMBDA_EXPR {
    begin: Token BEGIN_KW,
    funcKw: NameRef,
    lbrack: Token LBRACK,
    params: VarOrVarDeclList,
    rbrack: Token RBRACK,
    body: StmtList,
    end: Token END_KW,
}
`.trim();

const STMT_DATA = `
VarDeclStmt: VAR_DECL_STMT {
    var: VarDecl,
    op: Op,
    expr: Expr,
}

SetStmt: SET_STMT {
    set: Token SET_KW,
    var: NameRef,
    expr: Expr,
}

LetStmt: LET_STMT {
    let: Token LET_KW,
    var: VarOrVarDecl,
    op: Op,
    expr: Expr,
}

BeginStmt: BEGIN_STMT {
    begin: Token BEGIN_KW,
    blocktype: BlocktypeDesig,
    body: StmtList,
    end: Token END_KW,
}

ForeachStmt: FOREACH_STMT {
    foreach: Token FOREACH_KW,
    ident: Name,
    larrow: Token LARROW,
    iterable: Expr,
    body: StmtList,
    loop: Token LOOP_KW,
}

WhileStmt: WHILE_STMT {
    while: Token WHILE_KW,
    cond: Expr,
    body: StmtList,
    loop: Token LOOP_KW,
}

IfStmt: IF_STMT {
    if: Token IF_KW,
    cond: Expr,
    trueBranch: StmtList,
    falseBranch: Branch,
    endif: Token ENDIF_KW,
}
`.trim();

const NODE_DATA = `

${VAR_OR_VAR_DECL_DATA}

${EXPR_DATA}

BlocktypeDesig: BLOCKTYPE_DESIG {
    blocktype: Name,
    args: PrimaryExprList,
}

${STMT_DATA}

Branch: BRANCH {
    elseif: Token ELSEIF_KW ELSE_KW,
    cond: Expr,
    trueBranch: StmtList,
    falseBranch: Branch,
}

Script: SCRIPT {
    scriptname: Token SCRIPTNAME_KW,
    name: Name,
    body: StmtList,
}
`;

console.log(generate());
