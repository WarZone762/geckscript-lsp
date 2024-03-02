import { SyntaxKind, TokenSyntaxKind } from "../syntax_kind/generated.js";

export interface TokenInfo {
    name: string;
    canonical_name: string;
    kind: TokenSyntaxKind;
    wiki_page_name?: string;
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
        string_var: SyntaxKind.STRING_VAR_TYPE,
        array_var: SyntaxKind.ARRAY_VAR_TYPE,

        // Keywords
        scn: SyntaxKind.SCRIPTNAME_KW,
        scriptname: SyntaxKind.SCRIPTNAME_KW,
        begin: SyntaxKind.BEGIN_KW,
        end: SyntaxKind.END_KW,
        if: SyntaxKind.IF_KW,
        elseif: SyntaxKind.ELSEIF_KW,
        else: SyntaxKind.ELSE_KW,
        endif: SyntaxKind.ENDIF_KW,
        while: SyntaxKind.WHILE_KW,
        foreach: SyntaxKind.FOREACH_KW,
        loop: SyntaxKind.LOOP_KW,
        continue: SyntaxKind.CONTINUE_KW,
        break: SyntaxKind.BREAK_KW,
        return: SyntaxKind.RETURN_KW,
        set: SyntaxKind.SET_KW,
        to: SyntaxKind.TO_KW,
        let: SyntaxKind.LET_KW,

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
            canonical_name: k,
            kind: v,
        };
    }

    return map;
})();

export function GetTokenKind(token_name: string): TokenSyntaxKind {
    return TokenData[token_name]?.kind ?? SyntaxKind.UNKNOWN;
}
