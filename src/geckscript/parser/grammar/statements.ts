import { is_assignment_op, is_keyword, is_type, SyntaxKind } from "../../syntax_kind/generated.js";
import { Parser } from "../parser.js";
import { ASSIGNMENT_OP, EXPR_FIRST, TokenSet } from "../token_set.js";
import { expr, expr_bp, expr_no_func } from "./expressions.js";
import { block_type, rest_of_line, var_decl_r, var_or_var_decl_r } from "./other.js";

export function stmt(p: Parser) {
    switch (p.cur()) {
        case SyntaxKind.SET_KW:
            stmt_set(p);
            break;
        case SyntaxKind.LET_KW:
            stmt_let(p);
            break;
        case SyntaxKind.IF_KW:
        case SyntaxKind.ELSEIF_KW:
            stmt_if(p);
            break;
        case SyntaxKind.WHILE_KW:
            stmt_while(p);
            break;
        case SyntaxKind.FOREACH_KW:
            stmt_foreach(p);
            break;
        case SyntaxKind.NEWLINE:
            p.next_any();
            return;
        case SyntaxKind.BEGIN_KW:
            p.err_and_next("nested begin blocks not allowed");
            return;
        default:
            if (is_keyword(p.cur())) {
                if (
                    p.at_ts(
                        new TokenSet([
                            SyntaxKind.CONTINUE_KW,
                            SyntaxKind.BREAK_KW,
                            SyntaxKind.RETURN_KW,
                        ])
                    )
                ) {
                    p.next_any();
                } else {
                    p.warn_and_next("unexpected keyword");
                }
            } else if (is_type(p.cur())) {
                stmt_var_decl(p);
            } else if (p.at_ts(EXPR_FIRST)) {
                expr(p);
            } else {
                p.err_and_next("expected expression or statement");
                return;
            }
    }

    p.expect(SyntaxKind.NEWLINE);
}

export function stmt_root(p: Parser) {
    switch (p.cur()) {
        case SyntaxKind.SET_KW:
            stmt_set(p);
            break;
        case SyntaxKind.LET_KW:
            stmt_let(p);
            break;
        case SyntaxKind.BEGIN_KW:
            stmt_begin(p);
            break;
        case SyntaxKind.NEWLINE:
            p.next_any();
            return;
        default:
            if (is_type(p.cur())) {
                stmt_var_decl(p);
            } else {
                p.warn_and_next("statement outside of begin block");
                return;
            }
    }

    if (!p.at(SyntaxKind.EOF)) {
        p.expect(SyntaxKind.NEWLINE);
    }
}

export function stmt_list(p: Parser, terminators: TokenSet) {
    const m = p.start();

    while (!p.at(SyntaxKind.EOF) && !p.at_ts(terminators)) {
        stmt(p);
    }

    m.complete(p, SyntaxKind.STMT_LIST);
}

export function stmt_list_root(p: Parser) {
    const m = p.start();

    while (!p.at(SyntaxKind.EOF)) {
        stmt_root(p);
    }

    m.complete(p, SyntaxKind.STMT_LIST);
}

export function stmt_var_decl(p: Parser) {
    const m = p.start();

    var_decl_r(p, ASSIGNMENT_OP);
    if (is_assignment_op(p.cur())) {
        p.next_any();
        expr(p);
    }

    m.complete(p, SyntaxKind.VAR_DECL_STMT);
}

export function stmt_set(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.SET_KW);
    expr_no_func(p);
    if (!p.opt(SyntaxKind.TO_KW)) {
        p.err_recover("expected 'to'", EXPR_FIRST);
    }
    expr_bp(p, 2);

    m.complete(p, SyntaxKind.SET_STMT);
}

export function stmt_let(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.LET_KW);
    var_or_var_decl_r(p, ASSIGNMENT_OP);
    if (is_assignment_op(p.cur())) {
        p.next_any();
    } else {
        p.err_recover("expected assignment operator", EXPR_FIRST);
    }
    expr(p);

    m.complete(p, SyntaxKind.LET_STMT);
}

export function stmt_begin(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.BEGIN_KW);
    block_type(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p, new TokenSet([SyntaxKind.END_KW]));
    p.expect(SyntaxKind.END_KW);
    rest_of_line(p);

    m.complete(p, SyntaxKind.BEGIN_STMT);
}

export function stmt_foreach(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.FOREACH_KW);
    var_or_var_decl_r(p, new TokenSet([SyntaxKind.LARROW]));
    if (!p.opt(SyntaxKind.LARROW)) {
        p.err_recover("expected '<-'", EXPR_FIRST);
    }
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p, new TokenSet([SyntaxKind.LOOP_KW]));
    p.expect(SyntaxKind.LOOP_KW);

    m.complete(p, SyntaxKind.FOREACH_STMT);
}

export function stmt_while(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.WHILE_KW);
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p, new TokenSet([SyntaxKind.LOOP_KW]));
    p.expect(SyntaxKind.LOOP_KW);

    m.complete(p, SyntaxKind.WHILE_STMT);
}

export function stmt_if(p: Parser) {
    const m = p.start();

    if (p.at(SyntaxKind.IF_KW)) {
        p.next_any();
    } else if (p.at(SyntaxKind.ELSEIF_KW)) {
        p.warn_and_next("replace this 'elseif' with 'if'");
    } else {
        p.expect(SyntaxKind.IF_KW);
    }
    expr(p);
    p.expect(SyntaxKind.NEWLINE);
    stmt_list(p, new TokenSet([SyntaxKind.ELSEIF_KW, SyntaxKind.ELSE_KW, SyntaxKind.ENDIF_KW]));
    elseif_else(p);

    p.expect(SyntaxKind.ENDIF_KW);

    m.complete(p, SyntaxKind.IF_STMT);
}

export function elseif_else(p: Parser) {
    if (p.at(SyntaxKind.ELSEIF_KW) || (p.at(SyntaxKind.ELSE_KW) && p.nth(1) === SyntaxKind.IF_KW)) {
        const m = p.start();

        p.next_any();
        if (p.at(SyntaxKind.IF_KW)) {
            p.next_any();
        }
        expr(p);
        p.expect(SyntaxKind.NEWLINE);
        stmt_list(p, new TokenSet([SyntaxKind.ELSEIF_KW, SyntaxKind.ELSE_KW, SyntaxKind.ENDIF_KW]));
        elseif_else(p);

        m.complete(p, SyntaxKind.BRANCH);
    } else if (p.at(SyntaxKind.ELSE_KW)) {
        const m = p.start();

        p.next_any();
        rest_of_line(p);
        p.expect(SyntaxKind.NEWLINE);
        stmt_list(p, new TokenSet([SyntaxKind.ENDIF_KW]));

        m.complete(p, SyntaxKind.BRANCH);
    }
}
