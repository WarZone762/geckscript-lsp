import { SyntaxKind, TokenSyntaxKind } from "../syntax_kind/generated.js";

export class TokenSet extends Set<TokenSyntaxKind> {
    union(other: TokenSet) {
        return new TokenSet([...this, ...other]);
    }
}

export const LITERAL = new TokenSet([SyntaxKind.NUMBER_INT, SyntaxKind.STRING]);

export const TYPE = new TokenSet([
    SyntaxKind.SHORT_TYPE,
    SyntaxKind.INT_TYPE,
    SyntaxKind.LONG_TYPE,
    SyntaxKind.FLOAT_TYPE,
    SyntaxKind.REFERENCE_TYPE,
    SyntaxKind.STRING_VAR_TYPE,
    SyntaxKind.ARRAY_VAR_TYPE,
]);

export const ASSIGNMENT_OP = new TokenSet([
    SyntaxKind.EQ,
    SyntaxKind.COLONEQ,
    SyntaxKind.PLUSEQ,
    SyntaxKind.MINUSEQ,
    SyntaxKind.ASTERISKEQ,
    SyntaxKind.SLASHEQ,
    SyntaxKind.PERCENTEQ,
    SyntaxKind.CIRCUMFLEXEQ,
    SyntaxKind.VBAREQ,
    SyntaxKind.ASTERISKEQ,
]);

export const EXPR_FIRST = new TokenSet([
    SyntaxKind.IDENT,
    // unary ops
    SyntaxKind.EXCLAMATION,
    SyntaxKind.DOLLAR,
    SyntaxKind.HASH,
    SyntaxKind.ASTERISK,
    SyntaxKind.AMPERSAND,
    // SyntaxKind.PLUS,
    SyntaxKind.MINUS,
    // for lambdas
    SyntaxKind.LBRACK,
    SyntaxKind.LPAREN,
    SyntaxKind.BEGIN_KW,
]).union(LITERAL);
