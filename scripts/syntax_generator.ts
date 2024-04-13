#!/bin/env -S node --loader ts-node/esm

function syntaxKinds(data: string[]): string {
    return data.join(",\n    ");
}

function syntaxKindNames(data: string[]): string {
    return data
        .map((e) => {
            return `[SyntaxKind.${e}]: "${e}"`;
        })
        .join(",\n    ");
}

function syntaxKindTypeUnion(data: string[], typeName: string): string {
    return `export type ${typeName}SyntaxKind =
    | ${data.map((e) => `SyntaxKind.${e}`).join("\n    | ")};

export function is${typeName}(kind: SyntaxKind): kind is ${typeName}SyntaxKind {
    return (
        ${data.map((e) => `kind == SyntaxKind.${e}`).join(" ||\n        ")}
    );
}`;
}

export const VAR_OR_VAR_DECL = ["NAME", "NAME_REF", "VAR_DECL"];

export const OTHER = [
    "UNKNOWN",

    "WHITESPACE",
    "COMMENT",
    "BLOCK_COMMENT",

    "EOF",
    "NEWLINE",

    "NUMBER_INT",
    "STRING",
    "NAME",

    "TOMBSTONE",
    "ERROR",
    "IDENT",
    "VAR_DECL",
    "BLOCKTYPE_DESIG",
    "BRANCH",
    "SCRIPT",
];

export const TYPE = [
    "SHORT_TYPE",
    "INT_TYPE",
    "LONG_TYPE",
    "FLOAT_TYPE",
    "REFERENCE_TYPE",
    "STRING_VAR_TYPE",
    "ARRAY_VAR_TYPE",
];

export const KEYWORD = [
    "SCRIPTNAME_KW",
    "BEGIN_KW",
    "END_KW",
    "IF_KW",
    "ELSEIF_KW",
    "ELSE_KW",
    "ENDIF_KW",
    "WHILE_KW",
    "FOREACH_KW",
    "LOOP_KW",
    "CONTINUE_KW",
    "BREAK_KW",
    "RETURN_KW",
    "SET_KW",
    "TO_KW",
    "LET_KW",
    "FUNCTION_KW",
];

export const SIMPLE_ASSIGNMENT_OP = ["EQ", "COLONEQ"];

export const ASSIGNMENT_OP = [
    ...SIMPLE_ASSIGNMENT_OP,
    "PLUSEQ",
    "MINUSEQ",
    "ASTERISKEQ",
    "SLASHEQ",
    "PERCENTEQ",
    "CIRCUMFLEXEQ",
    "VBAREQ",
    "AMPERSANDEQ",
];

export const UNARY_OP = ["EXCLAMATION", "MINUS", "DOLLAR", "HASH", "AMPERSAND", "ASTERISK"];

export const OP = [
    ...ASSIGNMENT_OP,
    "CIRCUMFLEX",
    "PLUS",
    ...UNARY_OP,
    "SLASH",
    "PERCENT",
    "LT2",
    "GT2",
    "VBAR",
    "GT",
    "LT",
    "GTEQ",
    "LTEQ",
    "EQ2",
    "EXCLAMATIONEQ",
    "COLON",
    "COLON2",
    "AMPERSAND2",
    "VBAR2",
    "LPAREN",
    "RPAREN",
    "LSQBRACK",
    "RSQBRACK",
    "LBRACK",
    "RBRACK",
    "LARROW",
    "RARROW",
    "DOT",
    "COMMA",
    "EQGT",
];

export const LIST = ["VAR_OR_VAR_DECL_LIST", "EXPR_LIST", "STMT_LIST"];

export const EXPR = [
    "LAMBDA_EXPR",
    "LAMBDA_INLINE_EXPR",
    "UNARY_EXPR",
    "BIN_EXPR",
    "FIELD_EXPR",
    "INDEX_EXPR",
    "FUNC_EXPR",
    "LET_EXPR",
    "LITERAL",
    "NAME_REF",
];

export const STMT = [
    "VAR_DECL_STMT",
    "SET_STMT",
    "BEGIN_STMT",
    "IF_STMT",
    "WHILE_STMT",
    "FOREACH_STMT",
    ...EXPR,
];

export function generate(): string {
    return `export const enum SyntaxKind {
    ${syntaxKinds(OTHER)},
    ${syntaxKinds(TYPE)},
    ${syntaxKinds(KEYWORD)},
    ${syntaxKinds(OP)},
    ${syntaxKinds(LIST)},
    ${syntaxKinds(STMT)},
}

export const syntaxKindNames = {
    ${syntaxKindNames(OTHER)},
    ${syntaxKindNames(TYPE)},
    ${syntaxKindNames(KEYWORD)},
    ${syntaxKindNames(OP)},
    ${syntaxKindNames(LIST)},
    ${syntaxKindNames(STMT)},
};

export function syntaxKindName(kind: SyntaxKind): string {
    return syntaxKindNames[kind] ?? "UNKNOWN";
}

${syntaxKindTypeUnion(TYPE, "Type")}
${syntaxKindTypeUnion(KEYWORD, "Keyword")}
${syntaxKindTypeUnion(SIMPLE_ASSIGNMENT_OP, "SimpleAssignmentOp")}
${syntaxKindTypeUnion(ASSIGNMENT_OP, "AssignmentOp")}
${syntaxKindTypeUnion(UNARY_OP, "UnaryOp")}
${syntaxKindTypeUnion(OP, "Op")}

export type VarDeclOrExprSyntaxKind = SyntaxKind.VAR_DECL | ExprSyntaxKind;

export function isVarDeclOrExpr(kind: SyntaxKind): kind is VarDeclOrExprSyntaxKind {
    return kind === SyntaxKind.VAR_DECL || isExpr(kind);
}

${syntaxKindTypeUnion(VAR_OR_VAR_DECL, "VarOrVarDecl")}
${syntaxKindTypeUnion(LIST, "List")}
${syntaxKindTypeUnion(EXPR, "Expr")}
${syntaxKindTypeUnion(STMT, "Stmt")}

export type TokenSyntaxKind =
    | SyntaxKind.UNKNOWN
    | SyntaxKind.WHITESPACE
    | SyntaxKind.COMMENT
    | SyntaxKind.BLOCK_COMMENT
    | SyntaxKind.EOF
    | SyntaxKind.NEWLINE
    | SyntaxKind.NUMBER_INT
    | SyntaxKind.STRING
    | SyntaxKind.IDENT
    | TypeSyntaxKind
    | KeywordSyntaxKind
    | OpSyntaxKind;

export type NodeSyntaxKind =
    | SyntaxKind.TOMBSTONE
    | SyntaxKind.ERROR
    | SyntaxKind.NAME
    | SyntaxKind.VAR_DECL
    | SyntaxKind.BLOCKTYPE_DESIG
    | SyntaxKind.BRANCH
    | SyntaxKind.SCRIPT
    | ListSyntaxKind
    | ExprSyntaxKind
    | StmtSyntaxKind;`;
}

console.log(generate());
