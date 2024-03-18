import { SyntaxKind, isAssignmentOp, isType, isUnaryOp } from "../../syntax.js";
import { CompletedMarker, Marker, Parser } from "../parser.js";
import { ASSIGNMENT_OP, EXPR_FIRST, LITERAL, TYPE, TokenSet } from "../token_set.js";
import { nameRef, nameRefR, varDeclR, varOrVarDeclR } from "./other.js";
import { stmtList } from "./statements.js";

export function literal(p: Parser): CompletedMarker | undefined {
    if (!p.atTs(LITERAL)) {
        return undefined;
    }

    const m = p.start();
    p.nextAny();
    return m.complete(p, SyntaxKind.LITERAL);
}

export function expr(p: Parser): boolean {
    return exprBp(p, 1) != undefined ? true : false;
}

export function exprNoFunc(p: Parser): boolean {
    return exprBpImpl(p, 1, true) != undefined ? true : false;
}

export function exprLambdaInline(p: Parser): CompletedMarker {
    const m = p.start();

    p.next(SyntaxKind.LBRACK);

    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.NEWLINE) && !p.at(SyntaxKind.RBRACK)) {
        varOrVarDeclR(p, TYPE.union(new TokenSet([SyntaxKind.IDENT, SyntaxKind.RBRACK])));
        p.opt(SyntaxKind.COMMA);
    }

    p.expect(SyntaxKind.RBRACK);
    if (!p.opt(SyntaxKind.EQGT)) {
        p.errRecover("expected '=>'", EXPR_FIRST);
    }
    expr(p);

    return m.complete(p, SyntaxKind.LAMBDA_INLINE_EXPR);
}

export function exprLambda(p: Parser): CompletedMarker {
    const m = p.start();

    p.next(SyntaxKind.BEGIN_KW);
    if (!p.opt(SyntaxKind.FUNCTION_KW)) {
        p.errRecover("expected 'function'", new TokenSet([SyntaxKind.LBRACK, SyntaxKind.RPAREN]));
    }
    if (!p.opt(SyntaxKind.LBRACK)) {
        p.errRecover(
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
        varOrVarDeclR(
            p,
            TYPE.union(new TokenSet([SyntaxKind.IDENT, SyntaxKind.RBRACK, SyntaxKind.RPAREN]))
        );
        p.opt(SyntaxKind.COMMA);
    }
    p.expect(SyntaxKind.RBRACK);
    p.expect(SyntaxKind.NEWLINE);

    stmtList(p, new TokenSet([SyntaxKind.END_KW, SyntaxKind.RPAREN]));

    p.expect(SyntaxKind.END_KW);

    return m.complete(p, SyntaxKind.LAMBDA_EXPR);
}

export function exprLet(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.LET_KW);

    if (isType(p.cur())) {
        varDeclR(p, ASSIGNMENT_OP);
    } else {
        nameRefR(p, ASSIGNMENT_OP);
    }

    if (isAssignmentOp(p.cur())) {
        p.nextAny();
    } else {
        p.errRecover("expected assignment operator", EXPR_FIRST);
    }

    expr(p);

    return m.complete(p, SyntaxKind.LET_EXPR);
}

export function exprNameRefOrFunc(p: Parser, noFunc: boolean): CompletedMarker | undefined {
    const m = p.start();

    const ident = nameRef(p);
    if (!noFunc) {
        p.opt(SyntaxKind.COMMA);
    }

    const cond = () => p.atTs(EXPR_FIRST);

    if (cond() && !noFunc) {
        const exprList = p.start();
        do {
            exprBpImpl(p, 7, true);
            p.opt(SyntaxKind.COMMA);
        } while (cond());
        exprList.complete(p, SyntaxKind.EXPR_LIST);
    } else {
        m.abandon(p);
        return ident;
    }

    return m.complete(p, SyntaxKind.FUNC_EXPR);
}

export function exprPrimary(p: Parser, noFunc: boolean): CompletedMarker | undefined {
    const lit = literal(p);

    if (lit != undefined) {
        return lit;
    }

    switch (p.cur()) {
        case SyntaxKind.IDENT:
            return exprNameRefOrFunc(p, noFunc);
        case SyntaxKind.LPAREN: {
            p.next(SyntaxKind.LPAREN);
            while (p.opt(SyntaxKind.NEWLINE)) {
                continue;
            }
            const m = p.at(SyntaxKind.BEGIN_KW) ? exprLambda(p) : exprBp(p, 1);
            while (p.opt(SyntaxKind.NEWLINE)) {
                continue;
            }
            p.expect(SyntaxKind.RPAREN);

            return m;
        }
        case SyntaxKind.LBRACK:
            return exprLambdaInline(p);
        default:
            p.errAndNext("expected expression");
    }
}

export function exprBp(p: Parser, minBp: number): CompletedMarker | undefined {
    return exprBpImpl(p, minBp, false);
}

function exprBpImpl(p: Parser, minBp: number, noFunc: boolean): CompletedMarker | undefined {
    if (!p.atTs(EXPR_FIRST)) {
        p.errRecover(
            "expected expression",
            new TokenSet([SyntaxKind.RPAREN, SyntaxKind.RBRACK, SyntaxKind.TO_KW])
        );
        return undefined;
    }

    if (p.at(SyntaxKind.LET_KW)) {
        return exprLet(p);
    }

    let lhs = exprLhs(p, noFunc);
    if (lhs == undefined) {
        return undefined;
    }

    while (true) {
        const bp = binOpBp(p) * 2;
        if (bp < minBp) {
            break;
        }

        const m: Marker = lhs.precede(p);
        p.nextAny();
        exprBp(p, bp + 1);

        lhs = m.complete(p, SyntaxKind.BIN_EXPR);
    }

    return lhs;
}

export function exprLhs(p: Parser, noFunc: boolean): CompletedMarker | undefined {
    if (isUnaryOp(p.cur())) {
        const m = p.start();

        const bp = unaryOpBp(p) * 2;
        p.nextAny();
        exprBp(p, bp);

        return m.complete(p, SyntaxKind.UNARY_EXPR);
    } else {
        const lhs = exprPrimary(p, noFunc);
        if (lhs == undefined) {
            return undefined;
        }

        return exprPostfix(p, lhs, noFunc);
    }
}

export function exprPostfix(p: Parser, lhs: CompletedMarker, noFunc: boolean): CompletedMarker {
    while (true) {
        switch (p.cur()) {
            case SyntaxKind.LSQBRACK: {
                const m: Marker = lhs.precede(p);
                p.next(SyntaxKind.LSQBRACK);
                expr(p);
                p.expect(SyntaxKind.RSQBRACK);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            case SyntaxKind.RARROW: {
                const m: Marker = lhs.precede(p);
                p.next(SyntaxKind.RARROW);
                exprPrimary(p, true);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            case SyntaxKind.DOT: {
                const m = lhs.precede(p);
                p.next(SyntaxKind.DOT);
                exprNameRefOrFunc(p, noFunc);

                lhs = m.complete(p, SyntaxKind.MEMBER_EXPR);
                break;
            }
            default:
                return lhs;
        }
    }
}

export function unaryOpBp(p: Parser): number {
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

export function binOpBp(p: Parser): number {
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
