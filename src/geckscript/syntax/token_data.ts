import { SyntaxKind, TokenSyntaxKind } from "../syntax.js";

export interface TokenInfo {
    name: string;
    canonicalName: string;
    kind: TokenSyntaxKind;
    wikiPageName?: string;
}

export const TokenData = (() => {
    const map: { [key: string]: TokenInfo } = {};

    for (const [k, v] of Object.entries({
        // Typenames
        short: SyntaxKind.SHORT_TYPE,
        int: SyntaxKind.INT_TYPE,
        long: SyntaxKind.LONG_TYPE,
        float: SyntaxKind.FLOAT_TYPE,
        ref: SyntaxKind.REFERENCE_TYPE,
        reference: SyntaxKind.REFERENCE_TYPE,
        // eslint-disable-next-line camelcase
        string_var: SyntaxKind.STRING_VAR_TYPE,
        // eslint-disable-next-line camelcase
        array_var: SyntaxKind.ARRAY_VAR_TYPE,

        // Keywords
        Scn: SyntaxKind.SCRIPTNAME_KW,
        ScriptName: SyntaxKind.SCRIPTNAME_KW,
        Begin: SyntaxKind.BEGIN_KW,
        End: SyntaxKind.END_KW,
        If: SyntaxKind.IF_KW,
        ElseIf: SyntaxKind.ELSEIF_KW,
        Else: SyntaxKind.ELSE_KW,
        EndIf: SyntaxKind.ENDIF_KW,
        While: SyntaxKind.WHILE_KW,
        ForEach: SyntaxKind.FOREACH_KW,
        Loop: SyntaxKind.LOOP_KW,
        Continue: SyntaxKind.CONTINUE_KW,
        Break: SyntaxKind.BREAK_KW,
        Return: SyntaxKind.RETURN_KW,
        Set: SyntaxKind.SET_KW,
        To: SyntaxKind.TO_KW,
        Let: SyntaxKind.LET_KW,
        Function: SyntaxKind.FUNCTION_KW,
        _Function: SyntaxKind.FUNCTION_KW,

        // Operators
        "=": SyntaxKind.EQ,
        ":=": SyntaxKind.COLONEQ,
        "+=": SyntaxKind.PLUSEQ,
        "-=": SyntaxKind.MINUSEQ,
        "*=": SyntaxKind.ASTERISKEQ,
        "/=": SyntaxKind.SLASHEQ,
        "%=": SyntaxKind.PERCENTEQ,
        "^=": SyntaxKind.CIRCUMFLEXEQ,
        "|=": SyntaxKind.VBAREQ,
        "&=": SyntaxKind.AMPERSANDEQ,
        "!": SyntaxKind.EXCLAMATION,
        "||": SyntaxKind.VBAR2,
        "&&": SyntaxKind.AMPERSAND2,
        "==": SyntaxKind.EQ2,
        "!=": SyntaxKind.EXCLAMATIONEQ,
        ">": SyntaxKind.GT,
        "<": SyntaxKind.LT,
        ">=": SyntaxKind.GTEQ,
        "<=": SyntaxKind.LTEQ,
        "+": SyntaxKind.PLUS,
        "-": SyntaxKind.MINUS,
        "*": SyntaxKind.ASTERISK,
        "/": SyntaxKind.SLASH,
        "%": SyntaxKind.PERCENT,
        "^": SyntaxKind.CIRCUMFLEX,
        "|": SyntaxKind.VBAR,
        "&": SyntaxKind.AMPERSAND,
        "<<": SyntaxKind.LT2,
        ">>": SyntaxKind.GT2,
        $: SyntaxKind.DOLLAR,
        "#": SyntaxKind.HASH,
        "(": SyntaxKind.LPAREN,
        ")": SyntaxKind.RPAREN,
        "[": SyntaxKind.LSQBRACK,
        "]": SyntaxKind.RSQBRACK,
        "{": SyntaxKind.LBRACK,
        "}": SyntaxKind.RBRACK,
        ":": SyntaxKind.COLON,
        "<-": SyntaxKind.LARROW,
        "->": SyntaxKind.RARROW,
        ".": SyntaxKind.DOT,
        "::": SyntaxKind.COLON2,
        ",": SyntaxKind.COMMA,
        "=>": SyntaxKind.EQGT,
    } as { [key: string]: TokenSyntaxKind })) {
        map[k.toLowerCase()] = {
            name: k.toLowerCase(),
            canonicalName: k,
            kind: v,
        };
    }

    return map;
})();

export function getTokenKind(tokenName: string): TokenSyntaxKind {
    return TokenData[tokenName]?.kind ?? SyntaxKind.UNKNOWN;
}
