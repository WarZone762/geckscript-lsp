#!/bin/env -S node --loader ts-node/esm

import assert from "assert";

class NodeInfo {
    syntax_kind: string;

    members: { [key: string]: MemberInfo } = {};

    constructor(syntax_kind: string) {
        this.syntax_kind = syntax_kind;
    }

    funcs(): string {
        return `${Object.entries(this.members)
            .map((m) =>
                `
    ${m[0]}(): ${m[1].ret_type()} {
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
                const pred_body = this.args
                    .slice(1)
                    .map((d) => `k === SyntaxKind.${d}`)
                    .join(" || ");
                const pred_type_ret = this.args
                    .slice(1)
                    .map((d) => `SyntaxKind.${d}`)
                    .join(" | ");

                return `token(this, (k => ${pred_body}) as (k: SyntaxKind) => k is ${pred_type_ret})`;
            }
            case "Type":
                return "token(this, is_type)";
            case "Op":
                return "token(this, is_op)";
            case "VarOrVarDecl":
                return "VarOrVarDecl(child(this, is_var_or_var_decl))";
            case "Expr":
                return "Expr(child(this, is_expr))";
            case "Stmt":
                return "Stmt(child(this, is_stmt))";
            default: {
                const syntax_kind =
                    NODE_INFO_MAP[this.args[0]]?.syntax_kind ??
                    LIST_INFO_MAP[this.args[0]]?.syntax_kind;
                return `${this.args[0]}.from_green(child(this, (k => k === SyntaxKind.${syntax_kind}) as (k: SyntaxKind) => k is SyntaxKind.${syntax_kind}))`;
            }
        }
    }

    ret_type(): string {
        switch (this.args[0]) {
            case "Token": {
                const pred_type_ret = this.args
                    .slice(1)
                    .map((d) => `SyntaxKind.${d}`)
                    .join(" | ");

                return `Token<${pred_type_ret}> | undefined`;
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

function parse_data(data: string) {
    let pos = 0;
    const ts = tokens();

    const infos: InfoMap = {};

    while (pos < ts.length) {
        const [name, info] = parse_node();
        infos[name] = info;
    }

    return infos;

    function tokens(): string[] {
        return data
            .trim()
            .split(/\s+/)
            .flatMap((e) => e.split(/\b/));
    }

    function parse_node(): [string, NodeInfo] {
        const name = next();
        next(":");
        const syntax_kind = next();
        const info = new NodeInfo(syntax_kind);
        next("{");

        while (cur() !== "}") {
            const mem_name = next();
            const mem_info = new MemberInfo();
            next(":");

            while (cur() !== ",") {
                mem_info.args.push(next());
            }
            next(",");

            info.members[mem_name] = mem_info;
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

function list_type(name: string, syntax_kind: string, predicate: string): string {
    return `
export class ${name}List extends AstNode<SyntaxKind.${syntax_kind}_LIST> {
    *iter() {
        for (const child of children(this, ${predicate})) {
            yield ${name}(child);
        }
    }
}
`.trim();
}

function enum_type(name: string, info_map: InfoMap): string {
    return `
export type ${name} =
    | ${Object.keys(info_map).join("\n    | ")}
    ;

export function ${name}(green: Node<${name}SyntaxKind> | undefined): ${name} | undefined {
    if (green == undefined) {
        return undefined;
    }

    switch (green.kind) {
        ${Object.entries(info_map)
            .map((n) =>
                `
        case SyntaxKind.${n[1].syntax_kind}:
            return new ${n[0]}(green as Node<SyntaxKind.${n[1].syntax_kind}>);
        `.trim()
            )
            .join("\n        ")}
    }
}
`.trim();
}

function generate(): string {
    Object.assign(VAR_OR_VAR_DECL_INFO_MAP, parse_data(VAR_OR_VAR_DECL_DATA));
    Object.assign(EXPR_INFO_MAP, parse_data(EXPR_DATA));
    Object.assign(STMT_INFO_MAP, parse_data(STMT_DATA));
    Object.assign(NODE_INFO_MAP, parse_data(NODE_DATA));
    return `
import { ExprSyntaxKind, is_expr, is_op, is_primary_expr, is_stmt, is_type, is_var_or_var_decl, NodeSyntaxKind, OpSyntaxKind, PrimaryExprSyntaxKind, StmtSyntaxKind, SyntaxKind, TokenSyntaxKind, TypeSyntaxKind, VarOrVarDeclSyntaxKind } from "../syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "../types/syntax_node.js";

export class AstNode<T extends NodeSyntaxKind = NodeSyntaxKind> {
    green: Node<T>;
    constructor(green: Node<T>) {
        this.green = green;
    }

    static from_green<C, T extends NodeSyntaxKind>(this: { new(green: Node<T>): C; }, green: Node<T> | undefined): C | undefined {
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

${enum_type("VarOrVarDecl", VAR_OR_VAR_DECL_INFO_MAP)}
${enum_type("Expr", EXPR_INFO_MAP)}
${enum_type("Stmt", STMT_INFO_MAP)}

${list_type("PrimaryExpr", "PRIMARY_EXPR", "is_primary_expr")}
${list_type("VarOrVarDecl", "VAR_OR_VAR_DECL", "is_var_or_var_decl")}
${list_type("Expr", "EXPR", "is_expr")}
${list_type("Stmt", "STMT", "is_stmt")}

${Object.entries(NODE_INFO_MAP)
    .map((n) =>
        `
export class ${n[0]} extends AstNode<SyntaxKind.${n[1].syntax_kind}> {
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
    name_ref: Token IDENT,
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
    left_op: Token LSQBRACK RARROW DOT,
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
    func_kw: NameRef,
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
    true_branch: StmtList,
    false_branch: Branch,
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
    true_branch: StmtList,
    false_branch: Branch,
}

Script: SCRIPT {
    scriptname: Token SCRIPTNAME_KW,
    name: Name,
    body: StmtList,
}
`;

console.log(generate());
