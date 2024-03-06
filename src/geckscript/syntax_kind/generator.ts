#!/bin/env -S node --loader ts-node/esm

type SyntaxKindData = [string[], string];

function syntaxKinds(data: SyntaxKindData): string {
    return data[0].map((e) => e + data[1]).join(",\n    ");
}

function syntaxKindNames(data: SyntaxKindData): string {
    return data[0]
        .map((e) => {
            const name = e + data[1];
            return `[SyntaxKind.${name}]: "${name}"`;
        })
        .join(",\n    ");
}

function syntaxKindTypeUnion(data: SyntaxKindData, typeName: string, funcName: string): string {
    return `export type ${typeName}SyntaxKind =
    | ${data[0].map((e) => `SyntaxKind.${e + data[1]}`).join("\n    | ")}
    ;

export function is_${funcName}(kind: SyntaxKind): kind is ${typeName}SyntaxKind {
    return (
        ${data[0].map((e) => `kind == SyntaxKind.${e + data[1]}`).join(" ||\n        ")}
    );
}`;
}

export const PRIMARY_EXPR: SyntaxKindData = [["NUMBER_INT", "STRING", "NAME", "NAME_REF"], ""];

export const VAR_OR_VAR_DECL: SyntaxKindData = [["NAME", "NAME_REF", "VAR_DECL"], ""];

export const OTHER: SyntaxKindData = [
    [
        ...new Set([
            "UNKNOWN",

            "WHITESPACE",
            "COMMENT",

            "EOF",
            "NEWLINE",

            ...PRIMARY_EXPR[0],

            "TOMBSTONE",
            "ERROR",
            "LITERAL",
            "IDENT",
            ...VAR_OR_VAR_DECL[0],
            "BLOCKTYPE_DESIG",
            "BRANCH",
            "SCRIPT",
        ]),
    ],
    "",
];

export const TYPE: SyntaxKindData = [
    ["SHORT", "INT", "LONG", "FLOAT", "REFERENCE", "STRING_VAR", "ARRAY_VAR"],
    "_TYPE",
];

export const KEYWORD: SyntaxKindData = [
    [
        "SCRIPTNAME",
        "BEGIN",
        "END",
        "IF",
        "ELSEIF",
        "ELSE",
        "ENDIF",
        "WHILE",
        "FOREACH",
        "LOOP",
        "CONTINUE",
        "BREAK",
        "RETURN",
        "SET",
        "TO",
        "LET",
    ],
    "_KW",
];

export const SIMPLE_ASSIGNMENT_OP: SyntaxKindData = [["EQ", "COLONEQ"], ""];

export const ASSIGNMENT_OP: SyntaxKindData = [
    [
        ...SIMPLE_ASSIGNMENT_OP[0],
        "PLUSEQ",
        "MINUSEQ",
        "ASTERISKEQ",
        "SLASHEQ",
        "PERCENTEQ",
        "CIRCUMFLEXEQ",
        "VBAREQ",
        "AMPERSANDEQ",
    ],
    "",
];

export const UNARY_OP: SyntaxKindData = [
    ["EXCLAMATION", "MINUS", "DOLLAR", "HASH", "AMPERSAND", "ASTERISK"],
    "",
];

export const OP: SyntaxKindData = [
    [
        ...ASSIGNMENT_OP[0],
        "CIRCUMFLEX",
        "PLUS",
        ...UNARY_OP[0],
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
    ],
    "",
];

export const LIST: SyntaxKindData = [["VAR_OR_VAR_DECL", "PRIMARY_EXPR", "EXPR", "STMT"], "_LIST"];

export const EXPR: SyntaxKindData = [
    ["LAMBDA", "LAMBDA_INLINE", "UNARY", "BIN", "MEMBER", "FUNC"],
    "_EXPR",
];

export const STMT: SyntaxKindData = [
    ["VAR_DECL", "SET", "LET", "BEGIN", "IF", "WHILE", "FOREACH"],
    "_STMT",
];

export function generate(): string {
    return `export const enum SyntaxKind {
    ${syntaxKinds(OTHER)},
    ${syntaxKinds(TYPE)},
    ${syntaxKinds(KEYWORD)},
    ${syntaxKinds(OP)},
    ${syntaxKinds(LIST)},
    ${syntaxKinds(EXPR)},
    ${syntaxKinds(STMT)},
}

export const syntax_kindNames = {
    ${syntaxKindNames(OTHER)},
    ${syntaxKindNames(TYPE)},
    ${syntaxKindNames(KEYWORD)},
    ${syntaxKindNames(OP)},
    ${syntaxKindNames(LIST)},
    ${syntaxKindNames(EXPR)},
    ${syntaxKindNames(STMT)},
};

export function syntax_kindName(kind: SyntaxKind): string {
    return syntax_kindNames[kind] ?? "UNKNOWN";
}

${syntaxKindTypeUnion(TYPE, "Type", "type")}
${syntaxKindTypeUnion(KEYWORD, "Keyword", "keyword")}
${syntaxKindTypeUnion(SIMPLE_ASSIGNMENT_OP, "SimpleAssignmentOp", "simpleAssignmentOp")}
${syntaxKindTypeUnion(ASSIGNMENT_OP, "AssignmentOp", "assignmentOp")}
${syntaxKindTypeUnion(UNARY_OP, "UnaryOp", "unaryOp")}
${syntaxKindTypeUnion(OP, "Op", "op")}
${syntaxKindTypeUnion(PRIMARY_EXPR, "PrimaryExpr", "primaryExpr")}

${syntaxKindTypeUnion(VAR_OR_VAR_DECL, "VarOrVarDecl", "varOrVarDecl")}
${syntaxKindTypeUnion(LIST, "List", "list")}
${syntaxKindTypeUnion(EXPR, "Expr", "expr")}
${syntaxKindTypeUnion(STMT, "Stmt", "stmt")}

export type TokenSyntaxKind =
    | SyntaxKind.UNKNOWN
    | SyntaxKind.WHITESPACE
    | SyntaxKind.COMMENT
    | SyntaxKind.EOF
    | SyntaxKind.NEWLINE
    | SyntaxKind.NUMBER_INT
    | SyntaxKind.STRING
    | SyntaxKind.IDENT
    | TypeSyntaxKind
    | KeywordSyntaxKind
    | OpSyntaxKind
    ;

export type NodeSyntaxKind =
    | SyntaxKind.TOMBSTONE
    | SyntaxKind.ERROR
    | SyntaxKind.LITERAL
    | SyntaxKind.NAME
    | SyntaxKind.NAME_REF
    | SyntaxKind.VAR_DECL
    | SyntaxKind.BLOCKTYPE_DESIG
    | SyntaxKind.BRANCH
    | SyntaxKind.SCRIPT
    | ListSyntaxKind
    | ExprSyntaxKind
    | StmtSyntaxKind
    ;`;
}

console.log(generate());
