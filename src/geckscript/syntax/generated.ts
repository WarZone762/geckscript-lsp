export const enum SyntaxKind {
    UNKNOWN,
    WHITESPACE,
    COMMENT,
    BLOCK_COMMENT,
    EOF,
    NEWLINE,
    NUMBER_INT,
    STRING,
    NAME,
    TOMBSTONE,
    ERROR,
    IDENT,
    VAR_DECL,
    BLOCKTYPE_DESIG,
    BRANCH,
    SCRIPT,
    SHORT_TYPE,
    INT_TYPE,
    LONG_TYPE,
    FLOAT_TYPE,
    REFERENCE_TYPE,
    STRING_VAR_TYPE,
    ARRAY_VAR_TYPE,
    SCRIPTNAME_KW,
    BEGIN_KW,
    END_KW,
    IF_KW,
    ELSEIF_KW,
    ELSE_KW,
    ENDIF_KW,
    WHILE_KW,
    FOREACH_KW,
    LOOP_KW,
    CONTINUE_KW,
    BREAK_KW,
    RETURN_KW,
    SET_KW,
    TO_KW,
    LET_KW,
    FUNCTION_KW,
    EQ,
    COLONEQ,
    PLUSEQ,
    MINUSEQ,
    ASTERISKEQ,
    SLASHEQ,
    PERCENTEQ,
    CIRCUMFLEXEQ,
    VBAREQ,
    AMPERSANDEQ,
    CIRCUMFLEX,
    PLUS,
    EXCLAMATION,
    MINUS,
    DOLLAR,
    HASH,
    AMPERSAND,
    ASTERISK,
    SLASH,
    PERCENT,
    LT2,
    GT2,
    VBAR,
    GT,
    LT,
    GTEQ,
    LTEQ,
    EQ2,
    EXCLAMATIONEQ,
    COLON,
    COLON2,
    AMPERSAND2,
    VBAR2,
    LPAREN,
    RPAREN,
    LSQBRACK,
    RSQBRACK,
    LBRACK,
    RBRACK,
    LARROW,
    RARROW,
    DOT,
    COMMA,
    EQGT,
    VAR_OR_VAR_DECL_LIST,
    EXPR_LIST,
    STMT_LIST,
    VAR_DECL_STMT,
    SET_STMT,
    BEGIN_STMT,
    IF_STMT,
    WHILE_STMT,
    FOREACH_STMT,
    LAMBDA_EXPR,
    LAMBDA_INLINE_EXPR,
    UNARY_EXPR,
    BIN_EXPR,
    FIELD_EXPR,
    INDEX_EXPR,
    FUNC_EXPR,
    LET_EXPR,
    LITERAL,
    NAME_REF,
}

export const syntaxKindNames = {
    [SyntaxKind.UNKNOWN]: "UNKNOWN",
    [SyntaxKind.WHITESPACE]: "WHITESPACE",
    [SyntaxKind.COMMENT]: "COMMENT",
    [SyntaxKind.BLOCK_COMMENT]: "BLOCK_COMMENT",
    [SyntaxKind.EOF]: "EOF",
    [SyntaxKind.NEWLINE]: "NEWLINE",
    [SyntaxKind.NUMBER_INT]: "NUMBER_INT",
    [SyntaxKind.STRING]: "STRING",
    [SyntaxKind.NAME]: "NAME",
    [SyntaxKind.TOMBSTONE]: "TOMBSTONE",
    [SyntaxKind.ERROR]: "ERROR",
    [SyntaxKind.IDENT]: "IDENT",
    [SyntaxKind.VAR_DECL]: "VAR_DECL",
    [SyntaxKind.BLOCKTYPE_DESIG]: "BLOCKTYPE_DESIG",
    [SyntaxKind.BRANCH]: "BRANCH",
    [SyntaxKind.SCRIPT]: "SCRIPT",
    [SyntaxKind.SHORT_TYPE]: "SHORT_TYPE",
    [SyntaxKind.INT_TYPE]: "INT_TYPE",
    [SyntaxKind.LONG_TYPE]: "LONG_TYPE",
    [SyntaxKind.FLOAT_TYPE]: "FLOAT_TYPE",
    [SyntaxKind.REFERENCE_TYPE]: "REFERENCE_TYPE",
    [SyntaxKind.STRING_VAR_TYPE]: "STRING_VAR_TYPE",
    [SyntaxKind.ARRAY_VAR_TYPE]: "ARRAY_VAR_TYPE",
    [SyntaxKind.SCRIPTNAME_KW]: "SCRIPTNAME_KW",
    [SyntaxKind.BEGIN_KW]: "BEGIN_KW",
    [SyntaxKind.END_KW]: "END_KW",
    [SyntaxKind.IF_KW]: "IF_KW",
    [SyntaxKind.ELSEIF_KW]: "ELSEIF_KW",
    [SyntaxKind.ELSE_KW]: "ELSE_KW",
    [SyntaxKind.ENDIF_KW]: "ENDIF_KW",
    [SyntaxKind.WHILE_KW]: "WHILE_KW",
    [SyntaxKind.FOREACH_KW]: "FOREACH_KW",
    [SyntaxKind.LOOP_KW]: "LOOP_KW",
    [SyntaxKind.CONTINUE_KW]: "CONTINUE_KW",
    [SyntaxKind.BREAK_KW]: "BREAK_KW",
    [SyntaxKind.RETURN_KW]: "RETURN_KW",
    [SyntaxKind.SET_KW]: "SET_KW",
    [SyntaxKind.TO_KW]: "TO_KW",
    [SyntaxKind.LET_KW]: "LET_KW",
    [SyntaxKind.FUNCTION_KW]: "FUNCTION_KW",
    [SyntaxKind.EQ]: "EQ",
    [SyntaxKind.COLONEQ]: "COLONEQ",
    [SyntaxKind.PLUSEQ]: "PLUSEQ",
    [SyntaxKind.MINUSEQ]: "MINUSEQ",
    [SyntaxKind.ASTERISKEQ]: "ASTERISKEQ",
    [SyntaxKind.SLASHEQ]: "SLASHEQ",
    [SyntaxKind.PERCENTEQ]: "PERCENTEQ",
    [SyntaxKind.CIRCUMFLEXEQ]: "CIRCUMFLEXEQ",
    [SyntaxKind.VBAREQ]: "VBAREQ",
    [SyntaxKind.AMPERSANDEQ]: "AMPERSANDEQ",
    [SyntaxKind.CIRCUMFLEX]: "CIRCUMFLEX",
    [SyntaxKind.PLUS]: "PLUS",
    [SyntaxKind.EXCLAMATION]: "EXCLAMATION",
    [SyntaxKind.MINUS]: "MINUS",
    [SyntaxKind.DOLLAR]: "DOLLAR",
    [SyntaxKind.HASH]: "HASH",
    [SyntaxKind.AMPERSAND]: "AMPERSAND",
    [SyntaxKind.ASTERISK]: "ASTERISK",
    [SyntaxKind.SLASH]: "SLASH",
    [SyntaxKind.PERCENT]: "PERCENT",
    [SyntaxKind.LT2]: "LT2",
    [SyntaxKind.GT2]: "GT2",
    [SyntaxKind.VBAR]: "VBAR",
    [SyntaxKind.GT]: "GT",
    [SyntaxKind.LT]: "LT",
    [SyntaxKind.GTEQ]: "GTEQ",
    [SyntaxKind.LTEQ]: "LTEQ",
    [SyntaxKind.EQ2]: "EQ2",
    [SyntaxKind.EXCLAMATIONEQ]: "EXCLAMATIONEQ",
    [SyntaxKind.COLON]: "COLON",
    [SyntaxKind.COLON2]: "COLON2",
    [SyntaxKind.AMPERSAND2]: "AMPERSAND2",
    [SyntaxKind.VBAR2]: "VBAR2",
    [SyntaxKind.LPAREN]: "LPAREN",
    [SyntaxKind.RPAREN]: "RPAREN",
    [SyntaxKind.LSQBRACK]: "LSQBRACK",
    [SyntaxKind.RSQBRACK]: "RSQBRACK",
    [SyntaxKind.LBRACK]: "LBRACK",
    [SyntaxKind.RBRACK]: "RBRACK",
    [SyntaxKind.LARROW]: "LARROW",
    [SyntaxKind.RARROW]: "RARROW",
    [SyntaxKind.DOT]: "DOT",
    [SyntaxKind.COMMA]: "COMMA",
    [SyntaxKind.EQGT]: "EQGT",
    [SyntaxKind.VAR_OR_VAR_DECL_LIST]: "VAR_OR_VAR_DECL_LIST",
    [SyntaxKind.EXPR_LIST]: "EXPR_LIST",
    [SyntaxKind.STMT_LIST]: "STMT_LIST",
    [SyntaxKind.VAR_DECL_STMT]: "VAR_DECL_STMT",
    [SyntaxKind.SET_STMT]: "SET_STMT",
    [SyntaxKind.BEGIN_STMT]: "BEGIN_STMT",
    [SyntaxKind.IF_STMT]: "IF_STMT",
    [SyntaxKind.WHILE_STMT]: "WHILE_STMT",
    [SyntaxKind.FOREACH_STMT]: "FOREACH_STMT",
    [SyntaxKind.LAMBDA_EXPR]: "LAMBDA_EXPR",
    [SyntaxKind.LAMBDA_INLINE_EXPR]: "LAMBDA_INLINE_EXPR",
    [SyntaxKind.UNARY_EXPR]: "UNARY_EXPR",
    [SyntaxKind.BIN_EXPR]: "BIN_EXPR",
    [SyntaxKind.FIELD_EXPR]: "FIELD_EXPR",
    [SyntaxKind.INDEX_EXPR]: "INDEX_EXPR",
    [SyntaxKind.FUNC_EXPR]: "FUNC_EXPR",
    [SyntaxKind.LET_EXPR]: "LET_EXPR",
    [SyntaxKind.LITERAL]: "LITERAL",
    [SyntaxKind.NAME_REF]: "NAME_REF",
};

export function syntaxKindName(kind: SyntaxKind): string {
    return syntaxKindNames[kind] ?? "UNKNOWN";
}

export type TypeSyntaxKind =
    | SyntaxKind.SHORT_TYPE
    | SyntaxKind.INT_TYPE
    | SyntaxKind.LONG_TYPE
    | SyntaxKind.FLOAT_TYPE
    | SyntaxKind.REFERENCE_TYPE
    | SyntaxKind.STRING_VAR_TYPE
    | SyntaxKind.ARRAY_VAR_TYPE;

export function isType(kind: SyntaxKind): kind is TypeSyntaxKind {
    return (
        kind == SyntaxKind.SHORT_TYPE ||
        kind == SyntaxKind.INT_TYPE ||
        kind == SyntaxKind.LONG_TYPE ||
        kind == SyntaxKind.FLOAT_TYPE ||
        kind == SyntaxKind.REFERENCE_TYPE ||
        kind == SyntaxKind.STRING_VAR_TYPE ||
        kind == SyntaxKind.ARRAY_VAR_TYPE
    );
}
export type KeywordSyntaxKind =
    | SyntaxKind.SCRIPTNAME_KW
    | SyntaxKind.BEGIN_KW
    | SyntaxKind.END_KW
    | SyntaxKind.IF_KW
    | SyntaxKind.ELSEIF_KW
    | SyntaxKind.ELSE_KW
    | SyntaxKind.ENDIF_KW
    | SyntaxKind.WHILE_KW
    | SyntaxKind.FOREACH_KW
    | SyntaxKind.LOOP_KW
    | SyntaxKind.CONTINUE_KW
    | SyntaxKind.BREAK_KW
    | SyntaxKind.RETURN_KW
    | SyntaxKind.SET_KW
    | SyntaxKind.TO_KW
    | SyntaxKind.LET_KW
    | SyntaxKind.FUNCTION_KW;

export function isKeyword(kind: SyntaxKind): kind is KeywordSyntaxKind {
    return (
        kind == SyntaxKind.SCRIPTNAME_KW ||
        kind == SyntaxKind.BEGIN_KW ||
        kind == SyntaxKind.END_KW ||
        kind == SyntaxKind.IF_KW ||
        kind == SyntaxKind.ELSEIF_KW ||
        kind == SyntaxKind.ELSE_KW ||
        kind == SyntaxKind.ENDIF_KW ||
        kind == SyntaxKind.WHILE_KW ||
        kind == SyntaxKind.FOREACH_KW ||
        kind == SyntaxKind.LOOP_KW ||
        kind == SyntaxKind.CONTINUE_KW ||
        kind == SyntaxKind.BREAK_KW ||
        kind == SyntaxKind.RETURN_KW ||
        kind == SyntaxKind.SET_KW ||
        kind == SyntaxKind.TO_KW ||
        kind == SyntaxKind.LET_KW ||
        kind == SyntaxKind.FUNCTION_KW
    );
}
export type SimpleAssignmentOpSyntaxKind =
    | SyntaxKind.EQ
    | SyntaxKind.COLONEQ;

export function isSimpleAssignmentOp(kind: SyntaxKind): kind is SimpleAssignmentOpSyntaxKind {
    return (
        kind == SyntaxKind.EQ ||
        kind == SyntaxKind.COLONEQ
    );
}
export type AssignmentOpSyntaxKind =
    | SyntaxKind.EQ
    | SyntaxKind.COLONEQ
    | SyntaxKind.PLUSEQ
    | SyntaxKind.MINUSEQ
    | SyntaxKind.ASTERISKEQ
    | SyntaxKind.SLASHEQ
    | SyntaxKind.PERCENTEQ
    | SyntaxKind.CIRCUMFLEXEQ
    | SyntaxKind.VBAREQ
    | SyntaxKind.AMPERSANDEQ;

export function isAssignmentOp(kind: SyntaxKind): kind is AssignmentOpSyntaxKind {
    return (
        kind == SyntaxKind.EQ ||
        kind == SyntaxKind.COLONEQ ||
        kind == SyntaxKind.PLUSEQ ||
        kind == SyntaxKind.MINUSEQ ||
        kind == SyntaxKind.ASTERISKEQ ||
        kind == SyntaxKind.SLASHEQ ||
        kind == SyntaxKind.PERCENTEQ ||
        kind == SyntaxKind.CIRCUMFLEXEQ ||
        kind == SyntaxKind.VBAREQ ||
        kind == SyntaxKind.AMPERSANDEQ
    );
}
export type UnaryOpSyntaxKind =
    | SyntaxKind.EXCLAMATION
    | SyntaxKind.MINUS
    | SyntaxKind.DOLLAR
    | SyntaxKind.HASH
    | SyntaxKind.AMPERSAND
    | SyntaxKind.ASTERISK;

export function isUnaryOp(kind: SyntaxKind): kind is UnaryOpSyntaxKind {
    return (
        kind == SyntaxKind.EXCLAMATION ||
        kind == SyntaxKind.MINUS ||
        kind == SyntaxKind.DOLLAR ||
        kind == SyntaxKind.HASH ||
        kind == SyntaxKind.AMPERSAND ||
        kind == SyntaxKind.ASTERISK
    );
}
export type OpSyntaxKind =
    | SyntaxKind.EQ
    | SyntaxKind.COLONEQ
    | SyntaxKind.PLUSEQ
    | SyntaxKind.MINUSEQ
    | SyntaxKind.ASTERISKEQ
    | SyntaxKind.SLASHEQ
    | SyntaxKind.PERCENTEQ
    | SyntaxKind.CIRCUMFLEXEQ
    | SyntaxKind.VBAREQ
    | SyntaxKind.AMPERSANDEQ
    | SyntaxKind.CIRCUMFLEX
    | SyntaxKind.PLUS
    | SyntaxKind.EXCLAMATION
    | SyntaxKind.MINUS
    | SyntaxKind.DOLLAR
    | SyntaxKind.HASH
    | SyntaxKind.AMPERSAND
    | SyntaxKind.ASTERISK
    | SyntaxKind.SLASH
    | SyntaxKind.PERCENT
    | SyntaxKind.LT2
    | SyntaxKind.GT2
    | SyntaxKind.VBAR
    | SyntaxKind.GT
    | SyntaxKind.LT
    | SyntaxKind.GTEQ
    | SyntaxKind.LTEQ
    | SyntaxKind.EQ2
    | SyntaxKind.EXCLAMATIONEQ
    | SyntaxKind.COLON
    | SyntaxKind.COLON2
    | SyntaxKind.AMPERSAND2
    | SyntaxKind.VBAR2
    | SyntaxKind.LPAREN
    | SyntaxKind.RPAREN
    | SyntaxKind.LSQBRACK
    | SyntaxKind.RSQBRACK
    | SyntaxKind.LBRACK
    | SyntaxKind.RBRACK
    | SyntaxKind.LARROW
    | SyntaxKind.RARROW
    | SyntaxKind.DOT
    | SyntaxKind.COMMA
    | SyntaxKind.EQGT;

export function isOp(kind: SyntaxKind): kind is OpSyntaxKind {
    return (
        kind == SyntaxKind.EQ ||
        kind == SyntaxKind.COLONEQ ||
        kind == SyntaxKind.PLUSEQ ||
        kind == SyntaxKind.MINUSEQ ||
        kind == SyntaxKind.ASTERISKEQ ||
        kind == SyntaxKind.SLASHEQ ||
        kind == SyntaxKind.PERCENTEQ ||
        kind == SyntaxKind.CIRCUMFLEXEQ ||
        kind == SyntaxKind.VBAREQ ||
        kind == SyntaxKind.AMPERSANDEQ ||
        kind == SyntaxKind.CIRCUMFLEX ||
        kind == SyntaxKind.PLUS ||
        kind == SyntaxKind.EXCLAMATION ||
        kind == SyntaxKind.MINUS ||
        kind == SyntaxKind.DOLLAR ||
        kind == SyntaxKind.HASH ||
        kind == SyntaxKind.AMPERSAND ||
        kind == SyntaxKind.ASTERISK ||
        kind == SyntaxKind.SLASH ||
        kind == SyntaxKind.PERCENT ||
        kind == SyntaxKind.LT2 ||
        kind == SyntaxKind.GT2 ||
        kind == SyntaxKind.VBAR ||
        kind == SyntaxKind.GT ||
        kind == SyntaxKind.LT ||
        kind == SyntaxKind.GTEQ ||
        kind == SyntaxKind.LTEQ ||
        kind == SyntaxKind.EQ2 ||
        kind == SyntaxKind.EXCLAMATIONEQ ||
        kind == SyntaxKind.COLON ||
        kind == SyntaxKind.COLON2 ||
        kind == SyntaxKind.AMPERSAND2 ||
        kind == SyntaxKind.VBAR2 ||
        kind == SyntaxKind.LPAREN ||
        kind == SyntaxKind.RPAREN ||
        kind == SyntaxKind.LSQBRACK ||
        kind == SyntaxKind.RSQBRACK ||
        kind == SyntaxKind.LBRACK ||
        kind == SyntaxKind.RBRACK ||
        kind == SyntaxKind.LARROW ||
        kind == SyntaxKind.RARROW ||
        kind == SyntaxKind.DOT ||
        kind == SyntaxKind.COMMA ||
        kind == SyntaxKind.EQGT
    );
}

export type VarOrVarDeclSyntaxKind =
    | SyntaxKind.NAME
    | SyntaxKind.NAME_REF
    | SyntaxKind.VAR_DECL;

export function isVarOrVarDecl(kind: SyntaxKind): kind is VarOrVarDeclSyntaxKind {
    return (
        kind == SyntaxKind.NAME ||
        kind == SyntaxKind.NAME_REF ||
        kind == SyntaxKind.VAR_DECL
    );
}
export type ListSyntaxKind =
    | SyntaxKind.VAR_OR_VAR_DECL_LIST
    | SyntaxKind.EXPR_LIST
    | SyntaxKind.STMT_LIST;

export function isList(kind: SyntaxKind): kind is ListSyntaxKind {
    return (
        kind == SyntaxKind.VAR_OR_VAR_DECL_LIST ||
        kind == SyntaxKind.EXPR_LIST ||
        kind == SyntaxKind.STMT_LIST
    );
}
export type ExprSyntaxKind =
    | SyntaxKind.LAMBDA_EXPR
    | SyntaxKind.LAMBDA_INLINE_EXPR
    | SyntaxKind.UNARY_EXPR
    | SyntaxKind.BIN_EXPR
    | SyntaxKind.FIELD_EXPR
    | SyntaxKind.INDEX_EXPR
    | SyntaxKind.FUNC_EXPR
    | SyntaxKind.LET_EXPR
    | SyntaxKind.LITERAL
    | SyntaxKind.NAME_REF;

export function isExpr(kind: SyntaxKind): kind is ExprSyntaxKind {
    return (
        kind == SyntaxKind.LAMBDA_EXPR ||
        kind == SyntaxKind.LAMBDA_INLINE_EXPR ||
        kind == SyntaxKind.UNARY_EXPR ||
        kind == SyntaxKind.BIN_EXPR ||
        kind == SyntaxKind.FIELD_EXPR ||
        kind == SyntaxKind.INDEX_EXPR ||
        kind == SyntaxKind.FUNC_EXPR ||
        kind == SyntaxKind.LET_EXPR ||
        kind == SyntaxKind.LITERAL ||
        kind == SyntaxKind.NAME_REF
    );
}
export type StmtSyntaxKind =
    | SyntaxKind.VAR_DECL_STMT
    | SyntaxKind.SET_STMT
    | SyntaxKind.BEGIN_STMT
    | SyntaxKind.IF_STMT
    | SyntaxKind.WHILE_STMT
    | SyntaxKind.FOREACH_STMT
    | SyntaxKind.LAMBDA_EXPR
    | SyntaxKind.LAMBDA_INLINE_EXPR
    | SyntaxKind.UNARY_EXPR
    | SyntaxKind.BIN_EXPR
    | SyntaxKind.FIELD_EXPR
    | SyntaxKind.INDEX_EXPR
    | SyntaxKind.FUNC_EXPR
    | SyntaxKind.LET_EXPR
    | SyntaxKind.LITERAL
    | SyntaxKind.NAME_REF;

export function isStmt(kind: SyntaxKind): kind is StmtSyntaxKind {
    return (
        kind == SyntaxKind.VAR_DECL_STMT ||
        kind == SyntaxKind.SET_STMT ||
        kind == SyntaxKind.BEGIN_STMT ||
        kind == SyntaxKind.IF_STMT ||
        kind == SyntaxKind.WHILE_STMT ||
        kind == SyntaxKind.FOREACH_STMT ||
        kind == SyntaxKind.LAMBDA_EXPR ||
        kind == SyntaxKind.LAMBDA_INLINE_EXPR ||
        kind == SyntaxKind.UNARY_EXPR ||
        kind == SyntaxKind.BIN_EXPR ||
        kind == SyntaxKind.FIELD_EXPR ||
        kind == SyntaxKind.INDEX_EXPR ||
        kind == SyntaxKind.FUNC_EXPR ||
        kind == SyntaxKind.LET_EXPR ||
        kind == SyntaxKind.LITERAL ||
        kind == SyntaxKind.NAME_REF
    );
}

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
    | StmtSyntaxKind;
