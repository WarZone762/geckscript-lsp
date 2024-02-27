import { is_op, is_unary_op, SyntaxKind } from "../../syntax_kind/generated.js";
import { CompletedMarker, Marker, Parser } from "../parser.js";
import { TokenSet } from "../token_set.js";
import { name_ref, var_or_var_decl_r } from "./other.js";
import { stmt_list } from "./statements.js";

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

export function literal(p: Parser): CompletedMarker | undefined {
    if (!p.at_ts(LITERAL)) {
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

    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.NEWLINE) && !p.at(SyntaxKind.RBRACK)) {
        var_or_var_decl_r(p, TYPE.union(new TokenSet([SyntaxKind.IDENT, SyntaxKind.RBRACK])));
        p.opt(SyntaxKind.COMMA);
    }

    p.expect(SyntaxKind.RBRACK);
    if (!p.opt(SyntaxKind.EQGT)) {
        p.err_recover("expected '=>'", new TokenSet()); // TODO: recovery EXPR_FIRST
    }
    expr(p);

    return m.complete(p, SyntaxKind.LAMBDA_INLINE_EXPR);
}

export function expr_lambda(p: Parser): CompletedMarker {
    const m = p.start();

    p.next(SyntaxKind.BEGIN_KW);
    if (!p.opt(SyntaxKind.BLOCKTYPE_FUNCTION)) {
        p.err_recover("expected 'Function'", new TokenSet([SyntaxKind.LBRACK, SyntaxKind.RPAREN]));
    }
    if (!p.opt(SyntaxKind.LBRACK)) {
        p.err_recover(
            "expected '{'",
            TYPE.union(new TokenSet([SyntaxKind.IDENT, SyntaxKind.RPAREN]))
        );
    }

    while (
        !p.at(SyntaxKind.EOF) &&
        !p.at(SyntaxKind.NEWLINE) &&
        !p.at(SyntaxKind.RBRACK) &&
        !p.at(SyntaxKind.RPAREN)
    ) {
        var_or_var_decl_r(
            p,
            TYPE.union(new TokenSet([SyntaxKind.IDENT, SyntaxKind.RBRACK, SyntaxKind.RPAREN]))
        );
        p.opt(SyntaxKind.COMMA);
    }
    p.expect(SyntaxKind.RBRACK);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p, new TokenSet([SyntaxKind.RPAREN]));

    p.expect(SyntaxKind.END_KW);

    return m.complete(p, SyntaxKind.LAMBDA_EXPR);
}

export function expr_name_ref_or_func(p: Parser): CompletedMarker | undefined {
    const m = p.start();

    const ident = name_ref(p);

    const cond = () => !p.at(SyntaxKind.EOF) &&
        !p.at(SyntaxKind.NEWLINE) &&
        (!is_op(p.cur()) || p.at(SyntaxKind.LPAREN));

    if (cond()) {
        do {
            expr_bp_impl(p, 7, true);
            p.opt(SyntaxKind.COMMA);
        } while (cond())
    } else {
        m.abandon(p);
        return ident;
    }

    return m.complete(p, SyntaxKind.FUNC_EXPR);
}

export function expr_primary(p: Parser, no_func: boolean): CompletedMarker | undefined {
    const lit = literal(p);

    if (lit != undefined) {
        return lit;
    }

    switch (p.cur()) {
        case SyntaxKind.IDENT:
            if (no_func) {
                const m = p.start();
                p.next_any();
                return m.complete(p, SyntaxKind.NAME_REF);
            } else {
                return expr_name_ref_or_func(p);
            }
        case SyntaxKind.LPAREN: {
            p.next(SyntaxKind.LPAREN);
            if (p.opt(SyntaxKind.RPAREN)) {
                return undefined;
            }
            const m = p.at(SyntaxKind.BEGIN_KW) ? expr_lambda(p) : expr_bp(p, 1);
            p.expect(SyntaxKind.RPAREN);

            return m;
        }
        case SyntaxKind.LBRACK:
            return expr_lambda_inline(p);
        default:
            p.err_and_next("expected expression");
    }
}

export function expr_bp(p: Parser, min_bp: number): CompletedMarker | undefined {
    return expr_bp_impl(p, min_bp, false);
}

function expr_bp_impl(p: Parser, min_bp: number, no_func: boolean): CompletedMarker | undefined {
    let lhs = expr_lhs(p, no_func);
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

export function expr_lhs(p: Parser, no_func: boolean): CompletedMarker | undefined {
    if (is_unary_op(p.cur())) {
        const m = p.start();

        const bp = unary_op_bp(p) * 2;
        p.next_any();
        expr_bp(p, bp);

        return m.complete(p, SyntaxKind.UNARY_EXPR);
    } else {
        const lhs = expr_primary(p, no_func);
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
                expr_bp(p, 0); // TODO: add ']' as recovery
                p.expect(SyntaxKind.RSQBRACK);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            case SyntaxKind.RARROW: {
                const m: Marker = lhs.precede(p);
                p.next(SyntaxKind.RARROW);
                expr_primary(p, true);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            case SyntaxKind.DOT: {
                const m = lhs.precede(p);
                p.next(SyntaxKind.DOT);
                expr_primary(p, true);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            default:
                return lhs;
        }
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
