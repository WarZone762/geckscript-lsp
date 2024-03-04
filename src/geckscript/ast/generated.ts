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

export type VarOrVarDecl =
    | Name
    | NameRef
    | VarDecl
    ;

export function VarOrVarDecl(green: Node<VarOrVarDeclSyntaxKind> | undefined): VarOrVarDecl | undefined {
    if (green == undefined) {
        return undefined;
    }

    switch (green.kind) {
        case SyntaxKind.NAME:
            return new Name(green as Node<SyntaxKind.NAME>);
        case SyntaxKind.NAME_REF:
            return new NameRef(green as Node<SyntaxKind.NAME_REF>);
        case SyntaxKind.VAR_DECL:
            return new VarDecl(green as Node<SyntaxKind.VAR_DECL>);
    }
}
export type Expr =
    | UnaryExpr
    | BinExpr
    | MemberExpr
    | FuncExpr
    | LambdaInlineExpr
    | LambdaExpr
    ;

export function Expr(green: Node<ExprSyntaxKind> | undefined): Expr | undefined {
    if (green == undefined) {
        return undefined;
    }

    switch (green.kind) {
        case SyntaxKind.UNARY_EXPR:
            return new UnaryExpr(green as Node<SyntaxKind.UNARY_EXPR>);
        case SyntaxKind.BIN_EXPR:
            return new BinExpr(green as Node<SyntaxKind.BIN_EXPR>);
        case SyntaxKind.MEMBER_EXPR:
            return new MemberExpr(green as Node<SyntaxKind.MEMBER_EXPR>);
        case SyntaxKind.FUNC_EXPR:
            return new FuncExpr(green as Node<SyntaxKind.FUNC_EXPR>);
        case SyntaxKind.LAMBDA_INLINE_EXPR:
            return new LambdaInlineExpr(green as Node<SyntaxKind.LAMBDA_INLINE_EXPR>);
        case SyntaxKind.LAMBDA_EXPR:
            return new LambdaExpr(green as Node<SyntaxKind.LAMBDA_EXPR>);
    }
}
export type Stmt =
    | VarDeclStmt
    | SetStmt
    | LetStmt
    | BeginStmt
    | ForeachStmt
    | WhileStmt
    | IfStmt
    ;

export function Stmt(green: Node<StmtSyntaxKind> | undefined): Stmt | undefined {
    if (green == undefined) {
        return undefined;
    }

    switch (green.kind) {
        case SyntaxKind.VAR_DECL_STMT:
            return new VarDeclStmt(green as Node<SyntaxKind.VAR_DECL_STMT>);
        case SyntaxKind.SET_STMT:
            return new SetStmt(green as Node<SyntaxKind.SET_STMT>);
        case SyntaxKind.LET_STMT:
            return new LetStmt(green as Node<SyntaxKind.LET_STMT>);
        case SyntaxKind.BEGIN_STMT:
            return new BeginStmt(green as Node<SyntaxKind.BEGIN_STMT>);
        case SyntaxKind.FOREACH_STMT:
            return new ForeachStmt(green as Node<SyntaxKind.FOREACH_STMT>);
        case SyntaxKind.WHILE_STMT:
            return new WhileStmt(green as Node<SyntaxKind.WHILE_STMT>);
        case SyntaxKind.IF_STMT:
            return new IfStmt(green as Node<SyntaxKind.IF_STMT>);
    }
}

export class PrimaryExprList extends AstNode<SyntaxKind.PRIMARY_EXPR_LIST> {
    *iter() {
        for (const child of children(this, is_primary_expr)) {
            yield PrimaryExpr(child);
        }
    }
}
export class VarOrVarDeclList extends AstNode<SyntaxKind.VAR_OR_VAR_DECL_LIST> {
    *iter() {
        for (const child of children(this, is_var_or_var_decl)) {
            yield VarOrVarDecl(child);
        }
    }
}
export class ExprList extends AstNode<SyntaxKind.EXPR_LIST> {
    *iter() {
        for (const child of children(this, is_expr)) {
            yield Expr(child);
        }
    }
}
export class StmtList extends AstNode<SyntaxKind.STMT_LIST> {
    *iter() {
        for (const child of children(this, is_stmt)) {
            yield Stmt(child);
        }
    }
}

export class Name extends AstNode<SyntaxKind.NAME> {
    name(): Token<SyntaxKind.IDENT> | undefined {
        return token(this, (k => k === SyntaxKind.IDENT) as (k: SyntaxKind) => k is SyntaxKind.IDENT);
    }
}

export class NameRef extends AstNode<SyntaxKind.NAME_REF> {
    name_ref(): Token<SyntaxKind.IDENT> | undefined {
        return token(this, (k => k === SyntaxKind.IDENT) as (k: SyntaxKind) => k is SyntaxKind.IDENT);
    }
}

export class VarDecl extends AstNode<SyntaxKind.VAR_DECL> {
    type(): Token<TypeSyntaxKind> | undefined {
        return token(this, is_type);
    }
    ident(): Name | undefined {
        return Name.from_green(child(this, (k => k === SyntaxKind.NAME) as (k: SyntaxKind) => k is SyntaxKind.NAME));
    }
}

export class UnaryExpr extends AstNode<SyntaxKind.UNARY_EXPR> {
    op(): Token<OpSyntaxKind> | undefined {
        return token(this, is_op);
    }
    operand(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
}

export class BinExpr extends AstNode<SyntaxKind.BIN_EXPR> {
    lhs(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
    op(): Token<OpSyntaxKind> | undefined {
        return token(this, is_op);
    }
    rhs(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
}

export class MemberExpr extends AstNode<SyntaxKind.MEMBER_EXPR> {
    lhs(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
    left_op(): Token<SyntaxKind.LSQBRACK | SyntaxKind.RARROW | SyntaxKind.DOT> | undefined {
        return token(this, (k => k === SyntaxKind.LSQBRACK || k === SyntaxKind.RARROW || k === SyntaxKind.DOT) as (k: SyntaxKind) => k is SyntaxKind.LSQBRACK | SyntaxKind.RARROW | SyntaxKind.DOT);
    }
    rhs(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
}

export class FuncExpr extends AstNode<SyntaxKind.FUNC_EXPR> {
    name(): NameRef | undefined {
        return NameRef.from_green(child(this, (k => k === SyntaxKind.NAME_REF) as (k: SyntaxKind) => k is SyntaxKind.NAME_REF));
    }
    args(): ExprList | undefined {
        return ExprList.from_green(child(this, (k => k === SyntaxKind.EXPR_LIST) as (k: SyntaxKind) => k is SyntaxKind.EXPR_LIST));
    }
}

export class LambdaInlineExpr extends AstNode<SyntaxKind.LAMBDA_INLINE_EXPR> {
    lbrack(): Token<SyntaxKind.LBRACK> | undefined {
        return token(this, (k => k === SyntaxKind.LBRACK) as (k: SyntaxKind) => k is SyntaxKind.LBRACK);
    }
    params(): VarOrVarDeclList | undefined {
        return VarOrVarDeclList.from_green(child(this, (k => k === SyntaxKind.VAR_OR_VAR_DECL_LIST) as (k: SyntaxKind) => k is SyntaxKind.VAR_OR_VAR_DECL_LIST));
    }
    rbrack(): Token<SyntaxKind.RBRACK> | undefined {
        return token(this, (k => k === SyntaxKind.RBRACK) as (k: SyntaxKind) => k is SyntaxKind.RBRACK);
    }
    arrow(): Token<SyntaxKind.EQGT> | undefined {
        return token(this, (k => k === SyntaxKind.EQGT) as (k: SyntaxKind) => k is SyntaxKind.EQGT);
    }
    expr(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
}

export class LambdaExpr extends AstNode<SyntaxKind.LAMBDA_EXPR> {
    begin(): Token<SyntaxKind.BEGIN_KW> | undefined {
        return token(this, (k => k === SyntaxKind.BEGIN_KW) as (k: SyntaxKind) => k is SyntaxKind.BEGIN_KW);
    }
    func_kw(): NameRef | undefined {
        return NameRef.from_green(child(this, (k => k === SyntaxKind.NAME_REF) as (k: SyntaxKind) => k is SyntaxKind.NAME_REF));
    }
    lbrack(): Token<SyntaxKind.LBRACK> | undefined {
        return token(this, (k => k === SyntaxKind.LBRACK) as (k: SyntaxKind) => k is SyntaxKind.LBRACK);
    }
    params(): VarOrVarDeclList | undefined {
        return VarOrVarDeclList.from_green(child(this, (k => k === SyntaxKind.VAR_OR_VAR_DECL_LIST) as (k: SyntaxKind) => k is SyntaxKind.VAR_OR_VAR_DECL_LIST));
    }
    rbrack(): Token<SyntaxKind.RBRACK> | undefined {
        return token(this, (k => k === SyntaxKind.RBRACK) as (k: SyntaxKind) => k is SyntaxKind.RBRACK);
    }
    body(): StmtList | undefined {
        return StmtList.from_green(child(this, (k => k === SyntaxKind.STMT_LIST) as (k: SyntaxKind) => k is SyntaxKind.STMT_LIST));
    }
    end(): Token<SyntaxKind.END_KW> | undefined {
        return token(this, (k => k === SyntaxKind.END_KW) as (k: SyntaxKind) => k is SyntaxKind.END_KW);
    }
}

export class BlocktypeDesig extends AstNode<SyntaxKind.BLOCKTYPE_DESIG> {
    blocktype(): Name | undefined {
        return Name.from_green(child(this, (k => k === SyntaxKind.NAME) as (k: SyntaxKind) => k is SyntaxKind.NAME));
    }
    args(): PrimaryExprList | undefined {
        return PrimaryExprList.from_green(child(this, (k => k === SyntaxKind.PRIMARY_EXPR_LIST) as (k: SyntaxKind) => k is SyntaxKind.PRIMARY_EXPR_LIST));
    }
}

export class VarDeclStmt extends AstNode<SyntaxKind.VAR_DECL_STMT> {
    var(): VarDecl | undefined {
        return VarDecl.from_green(child(this, (k => k === SyntaxKind.VAR_DECL) as (k: SyntaxKind) => k is SyntaxKind.VAR_DECL));
    }
    op(): Token<OpSyntaxKind> | undefined {
        return token(this, is_op);
    }
    expr(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
}

export class SetStmt extends AstNode<SyntaxKind.SET_STMT> {
    set(): Token<SyntaxKind.SET_KW> | undefined {
        return token(this, (k => k === SyntaxKind.SET_KW) as (k: SyntaxKind) => k is SyntaxKind.SET_KW);
    }
    var(): NameRef | undefined {
        return NameRef.from_green(child(this, (k => k === SyntaxKind.NAME_REF) as (k: SyntaxKind) => k is SyntaxKind.NAME_REF));
    }
    expr(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
}

export class LetStmt extends AstNode<SyntaxKind.LET_STMT> {
    let(): Token<SyntaxKind.LET_KW> | undefined {
        return token(this, (k => k === SyntaxKind.LET_KW) as (k: SyntaxKind) => k is SyntaxKind.LET_KW);
    }
    var(): VarOrVarDecl | undefined {
        return VarOrVarDecl(child(this, is_var_or_var_decl));
    }
    op(): Token<OpSyntaxKind> | undefined {
        return token(this, is_op);
    }
    expr(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
}

export class BeginStmt extends AstNode<SyntaxKind.BEGIN_STMT> {
    begin(): Token<SyntaxKind.BEGIN_KW> | undefined {
        return token(this, (k => k === SyntaxKind.BEGIN_KW) as (k: SyntaxKind) => k is SyntaxKind.BEGIN_KW);
    }
    blocktype(): BlocktypeDesig | undefined {
        return BlocktypeDesig.from_green(child(this, (k => k === SyntaxKind.BLOCKTYPE_DESIG) as (k: SyntaxKind) => k is SyntaxKind.BLOCKTYPE_DESIG));
    }
    body(): StmtList | undefined {
        return StmtList.from_green(child(this, (k => k === SyntaxKind.STMT_LIST) as (k: SyntaxKind) => k is SyntaxKind.STMT_LIST));
    }
    end(): Token<SyntaxKind.END_KW> | undefined {
        return token(this, (k => k === SyntaxKind.END_KW) as (k: SyntaxKind) => k is SyntaxKind.END_KW);
    }
}

export class ForeachStmt extends AstNode<SyntaxKind.FOREACH_STMT> {
    foreach(): Token<SyntaxKind.FOREACH_KW> | undefined {
        return token(this, (k => k === SyntaxKind.FOREACH_KW) as (k: SyntaxKind) => k is SyntaxKind.FOREACH_KW);
    }
    ident(): Name | undefined {
        return Name.from_green(child(this, (k => k === SyntaxKind.NAME) as (k: SyntaxKind) => k is SyntaxKind.NAME));
    }
    larrow(): Token<SyntaxKind.LARROW> | undefined {
        return token(this, (k => k === SyntaxKind.LARROW) as (k: SyntaxKind) => k is SyntaxKind.LARROW);
    }
    iterable(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
    body(): StmtList | undefined {
        return StmtList.from_green(child(this, (k => k === SyntaxKind.STMT_LIST) as (k: SyntaxKind) => k is SyntaxKind.STMT_LIST));
    }
    loop(): Token<SyntaxKind.LOOP_KW> | undefined {
        return token(this, (k => k === SyntaxKind.LOOP_KW) as (k: SyntaxKind) => k is SyntaxKind.LOOP_KW);
    }
}

export class WhileStmt extends AstNode<SyntaxKind.WHILE_STMT> {
    while(): Token<SyntaxKind.WHILE_KW> | undefined {
        return token(this, (k => k === SyntaxKind.WHILE_KW) as (k: SyntaxKind) => k is SyntaxKind.WHILE_KW);
    }
    cond(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
    body(): StmtList | undefined {
        return StmtList.from_green(child(this, (k => k === SyntaxKind.STMT_LIST) as (k: SyntaxKind) => k is SyntaxKind.STMT_LIST));
    }
    loop(): Token<SyntaxKind.LOOP_KW> | undefined {
        return token(this, (k => k === SyntaxKind.LOOP_KW) as (k: SyntaxKind) => k is SyntaxKind.LOOP_KW);
    }
}

export class IfStmt extends AstNode<SyntaxKind.IF_STMT> {
    if(): Token<SyntaxKind.IF_KW> | undefined {
        return token(this, (k => k === SyntaxKind.IF_KW) as (k: SyntaxKind) => k is SyntaxKind.IF_KW);
    }
    cond(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
    true_branch(): StmtList | undefined {
        return StmtList.from_green(child(this, (k => k === SyntaxKind.STMT_LIST) as (k: SyntaxKind) => k is SyntaxKind.STMT_LIST));
    }
    false_branch(): Branch | undefined {
        return Branch.from_green(child(this, (k => k === SyntaxKind.BRANCH) as (k: SyntaxKind) => k is SyntaxKind.BRANCH));
    }
    endif(): Token<SyntaxKind.ENDIF_KW> | undefined {
        return token(this, (k => k === SyntaxKind.ENDIF_KW) as (k: SyntaxKind) => k is SyntaxKind.ENDIF_KW);
    }
}

export class Branch extends AstNode<SyntaxKind.BRANCH> {
    elseif(): Token<SyntaxKind.ELSEIF_KW | SyntaxKind.ELSE_KW> | undefined {
        return token(this, (k => k === SyntaxKind.ELSEIF_KW || k === SyntaxKind.ELSE_KW) as (k: SyntaxKind) => k is SyntaxKind.ELSEIF_KW | SyntaxKind.ELSE_KW);
    }
    cond(): Expr | undefined {
        return Expr(child(this, is_expr));
    }
    true_branch(): StmtList | undefined {
        return StmtList.from_green(child(this, (k => k === SyntaxKind.STMT_LIST) as (k: SyntaxKind) => k is SyntaxKind.STMT_LIST));
    }
    false_branch(): Branch | undefined {
        return Branch.from_green(child(this, (k => k === SyntaxKind.BRANCH) as (k: SyntaxKind) => k is SyntaxKind.BRANCH));
    }
}

export class Script extends AstNode<SyntaxKind.SCRIPT> {
    scriptname(): Token<SyntaxKind.SCRIPTNAME_KW> | undefined {
        return token(this, (k => k === SyntaxKind.SCRIPTNAME_KW) as (k: SyntaxKind) => k is SyntaxKind.SCRIPTNAME_KW);
    }
    name(): Name | undefined {
        return Name.from_green(child(this, (k => k === SyntaxKind.NAME) as (k: SyntaxKind) => k is SyntaxKind.NAME));
    }
    body(): StmtList | undefined {
        return StmtList.from_green(child(this, (k => k === SyntaxKind.STMT_LIST) as (k: SyntaxKind) => k is SyntaxKind.STMT_LIST));
    }
}
