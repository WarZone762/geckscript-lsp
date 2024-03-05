#!/bin/env -S node --loader ts-node/esm

type SyntaxKindData = [string[], string];

function syntax_kinds(data: SyntaxKindData): string {
    return data[0].map((e) => e + data[1]).join(",\n    ");
}

function syntax_kind_names(data: SyntaxKindData): string {
    return data[0]
        .map((e) => {
            const name = e + data[1];
            return `[SyntaxKind.${name}]: "${name}"`;
        })
        .join(",\n    ");
}

function syntax_kind_type_union(
    data: SyntaxKindData,
    type_name: string,
    func_name: string
): string {
    return `export type ${type_name}SyntaxKind =
    | ${data[0].map((e) => `SyntaxKind.${e + data[1]}`).join("\n    | ")}
    ;

export function is_${func_name}(kind: SyntaxKind): kind is ${type_name}SyntaxKind {
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
    ${syntax_kinds(OTHER)},
    ${syntax_kinds(TYPE)},
    ${syntax_kinds(KEYWORD)},
    ${syntax_kinds(OP)},
    ${syntax_kinds(LIST)},
    ${syntax_kinds(EXPR)},
    ${syntax_kinds(STMT)},
}

export const syntax_kind_names = {
    ${syntax_kind_names(OTHER)},
    ${syntax_kind_names(TYPE)},
    ${syntax_kind_names(KEYWORD)},
    ${syntax_kind_names(OP)},
    ${syntax_kind_names(LIST)},
    ${syntax_kind_names(EXPR)},
    ${syntax_kind_names(STMT)},
};

export function syntax_kind_name(kind: SyntaxKind): string {
    return syntax_kind_names[kind] ?? "UNKNOWN";
}

${syntax_kind_type_union(TYPE, "Type", "type")}
${syntax_kind_type_union(KEYWORD, "Keyword", "keyword")}
${syntax_kind_type_union(SIMPLE_ASSIGNMENT_OP, "SimpleAssignmentOp", "simple_assignment_op")}
${syntax_kind_type_union(ASSIGNMENT_OP, "AssignmentOp", "assignment_op")}
${syntax_kind_type_union(UNARY_OP, "UnaryOp", "unary_op")}
${syntax_kind_type_union(OP, "Op", "op")}
${syntax_kind_type_union(PRIMARY_EXPR, "PrimaryExpr", "primary_expr")}

${syntax_kind_type_union(VAR_OR_VAR_DECL, "VarOrVarDecl", "var_or_var_decl")}
${syntax_kind_type_union(LIST, "List", "list")}
${syntax_kind_type_union(EXPR, "Expr", "expr")}
${syntax_kind_type_union(STMT, "Stmt", "stmt")}

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
