import { var_decl, name_ref } from "./other";
import { CompletedMarker, Marker, Parser, TokenSet } from "../parser";
import { stmt } from "./statements";
import { SyntaxKind, is_op, syntax_kind_name, is_unary_op, is_primary_expr } from "../../syntax_kind/generated";

export const LITERAL_FIRST: TokenSet = new Set([
    SyntaxKind.NUMBER_INT,
    SyntaxKind.STRING,
]);

export function literal(p: Parser): CompletedMarker | undefined {
    if (!p.at_ts(LITERAL_FIRST)) {
        return undefined;
    }

    const m = p.start();
    p.next_any();
    return m.complete(p, SyntaxKind.LITERAL);
}

export function expr(p: Parser): boolean {
    return expr_bp(p, 1) != undefined ? true : false;
}

export function expr_lambda_inline(p: Parser): CompletedMarker {
    const m = p.start();

    p.next(SyntaxKind.LBRACK);

    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.RBRACK)) {
        var_decl(p);
        if (p.at(SyntaxKind.COMMA)) {
            p.expect(SyntaxKind.COMMA);
        }
    }

    p.expect(SyntaxKind.RBRACK);
    p.expect(SyntaxKind.EQGT);
    expr(p);

    return m.complete(p, SyntaxKind.LAMBDA_INLINE_EXPR);
}

export function expr_lambda(p: Parser): CompletedMarker {
    const m = p.start();

    p.next(SyntaxKind.BEGIN_KW);
    p.expect(SyntaxKind.BLOCKTYPE_FUNCTION);
    p.expect(SyntaxKind.LBRACK);

    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.RBRACK)) {
        var_decl(p);
        if (p.at(SyntaxKind.COMMA)) {
            p.expect(SyntaxKind.COMMA);
        }
    }
    p.expect(SyntaxKind.RBRACK);
    p.expect(SyntaxKind.NEWLINE);

    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.END_KW)) {
        stmt(p);
    }

    p.expect(SyntaxKind.END_KW);

    return m.complete(p, SyntaxKind.LAMBDA_EXPR);
}

export function expr_func(p: Parser): CompletedMarker {
    const m = p.start();

    name_ref(p);
    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.NEWLINE) && (!is_op(p.nth(0)) || p.at(SyntaxKind.LPAREN))) {
        if (p.at(SyntaxKind.IDENT)) {
            name_ref(p);
        } else {
            expr_bp(p, 7);
        }
        p.opt(SyntaxKind.COMMA);
    }

    return m.complete(p, SyntaxKind.FUNC_EXPR);
}

export function expr_primary(p: Parser): CompletedMarker | undefined {
    const lit = literal(p);

    if (lit != undefined) {
        return lit;
    }

    switch (p.cur()) {
        case SyntaxKind.IDENT:
            // if (GetFunctionInfo(p.current().text.toLocaleLowerCase()) != undefined) {
            if (p.nth_at(1, SyntaxKind.LPAREN) || is_primary_expr(p.nth(1)) || p.nth_at(1, SyntaxKind.IDENT)) {
                return expr_func(p);
            } else {
                return name_ref(p);
            }
        case SyntaxKind.LPAREN: {
            p.next(SyntaxKind.LPAREN);
            const m = p.at(SyntaxKind.BEGIN_KW) ? expr_lambda(p) : expr_bp(p, 1);
            p.expect(SyntaxKind.RPAREN);

            return m;
        }
        case SyntaxKind.LBRACK:
            return expr_lambda_inline(p);
        default:
            p.err_and_next(`expected string, number, identifier or parenthesis, got '${syntax_kind_name(p.cur())}'`);
    }
}

export function unary_op_bp(p: Parser): number {
    switch (p.cur()) {
        case SyntaxKind.EXCLAMATION:
            return 14;
        case SyntaxKind.MINUS:
        case SyntaxKind.DOLLAR:
        case SyntaxKind.HASH:
        case SyntaxKind.ASTERISK:
        case SyntaxKind.AMPERSAND:
            return 13;
        default:
            return 0;
    }
}

export function bin_op_bp(p: Parser): number {
    switch (p.cur()) {
        case SyntaxKind.CIRCUMFLEX:
            return 12;
        case SyntaxKind.ASTERISK:
        case SyntaxKind.SLASH:
        case SyntaxKind.PERCENT:
            return 11;
        case SyntaxKind.PLUS:
        case SyntaxKind.MINUS:
            return 10;
        case SyntaxKind.LT2:
        case SyntaxKind.GT2:
            return 9;
        case SyntaxKind.AMPERSAND:
            return 8;
        case SyntaxKind.VBAR:
            return 7;
        case SyntaxKind.GT:
        case SyntaxKind.LT:
        case SyntaxKind.GTEQ:
        case SyntaxKind.LTEQ:
            return 6;
        case SyntaxKind.EQ2:
        case SyntaxKind.EXCLAMATIONEQ:
            return 5;
        case SyntaxKind.COLON:
        case SyntaxKind.COLON2:
            return 4;
        case SyntaxKind.AMPERSAND2:
        case SyntaxKind.PLUSEQ:
        case SyntaxKind.MINUSEQ:
        case SyntaxKind.ASTERISKEQ:
        case SyntaxKind.SLASHEQ:
        case SyntaxKind.PERCENTEQ:
        case SyntaxKind.CIRCUMFLEXEQ:
        case SyntaxKind.VBAREQ:
        case SyntaxKind.AMPERSANDEQ:
            return 3;
        case SyntaxKind.VBAR2:
            return 2;
        case SyntaxKind.COLONEQ:
        case SyntaxKind.EQ:
            return 1;
        default:
            return 0;
    }
}

export function expr_bp(p: Parser, min_bp: number): CompletedMarker | undefined {
    let lhs = expr_lhs(p);
    if (lhs == undefined) {
        return undefined;
    }

    while (true) {
        const bp = bin_op_bp(p) * 2;
        if (bp < min_bp) {
            break;
        }

        const m: Marker = lhs.precede(p);
        p.next_any();
        expr_bp(p, bp + 1);

        lhs = m.complete(p, SyntaxKind.BIN_EXPR);
    }

    return lhs;
}

export function expr_lhs(p: Parser): CompletedMarker | undefined {
    if (is_unary_op(p.cur())) {
        const m = p.start();

        const bp = unary_op_bp(p) * 2;
        p.next_any();
        expr_bp(p, bp);

        return m.complete(p, SyntaxKind.UNARY_EXPR);
    } else {
        const lhs = expr_primary(p);
        if (lhs == undefined) {
            return undefined;
        }

        return expr_member_access(p, lhs);
    }
}

export function expr_member_access(p: Parser, lhs: CompletedMarker): CompletedMarker {
    while (true) {
        switch (p.cur()) {
            case SyntaxKind.LSQBRACK: {
                const m: Marker = lhs.precede(p);
                p.next(SyntaxKind.LSQBRACK);
                expr_bp(p, 0);
                p.expect(SyntaxKind.RSQBRACK);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            case SyntaxKind.RARROW: {
                const m: Marker = lhs.precede(p);
                p.next(SyntaxKind.RARROW);
                expr_primary(p);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            case SyntaxKind.DOT: {
                const m = lhs.precede(p);
                p.next(SyntaxKind.DOT);
                expr_primary(p);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            default:
                return lhs;
        }
    }
}
