import { is_assignment_op, is_keyword, is_type, SyntaxKind } from "../../syntax_kind/generated";
import { Parser, TokenSet } from "../parser";
import { expr, expr_bp } from "./expressions";
import { block_type, name_ref_r, var_decl_r, var_or_var_decl_r } from "./other";

export const STMT_LIST_TERMINATORS: TokenSet = new Set([
    SyntaxKind.END_KW,
    SyntaxKind.LOOP_KW,
    SyntaxKind.ELSEIF_KW,
    SyntaxKind.ELSE_KW,
    SyntaxKind.ENDIF_KW,
]);

export const ASSIGNMENT_OP: TokenSet = new Set([
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

export function stmt(p: Parser) {
    switch (p.cur()) {
        case SyntaxKind.SET_KW:
            stmt_set(p);
            break;
        case SyntaxKind.LET_KW:
            stmt_let(p);
            break;
        case SyntaxKind.IF_KW:
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
                if (p.at_ts(new Set([SyntaxKind.CONTINUE_KW, SyntaxKind.BREAK_KW, SyntaxKind.RETURN_KW]))) {
                    p.next_any();
                } else {
                    p.err_and_next("unexpected keyword");
                }
            } else if (is_type(p.cur())) {
                stmt_var_decl(p);
            } else {
                expr(p);
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
                p.err_and_next("illegal statement outside of begin block");
                return;
            }
    }

    if (!p.at(SyntaxKind.EOF)) {
        p.expect(SyntaxKind.NEWLINE);
    }
}

export function stmt_list(p: Parser) {
    const m = p.start();

    while (!p.at(SyntaxKind.EOF) && !p.at_ts(STMT_LIST_TERMINATORS)) {
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
    name_ref_r(p, new Set([SyntaxKind.TO_KW]));
    p.expect(SyntaxKind.TO_KW, "expected 'to'");
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
        p.err_recover("expected assignment operator", new Set());  // TODO: recovery = EXPR_FIRST
    }
    expr(p);

    m.complete(p, SyntaxKind.LET_STMT);
}

export function stmt_begin(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.BEGIN_KW);
    block_type(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p);
    p.expect(SyntaxKind.END_KW);

    m.complete(p, SyntaxKind.BEGIN_STMT);
}

export function stmt_foreach(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.FOREACH_KW);
    var_or_var_decl_r(p, new Set([SyntaxKind.LARROW]));
    if (p.at(SyntaxKind.LARROW)) {
        p.next(SyntaxKind.LARROW);
    } else {
        p.err_recover("expected '<-'", new Set());  // TODO: recovery = EXPR_FIRST
    }
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p);
    p.expect(SyntaxKind.LOOP_KW);

    m.complete(p, SyntaxKind.FOREACH_STMT);
}

export function stmt_while(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.WHILE_KW);
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p);
    p.expect(SyntaxKind.LOOP_KW);

    m.complete(p, SyntaxKind.WHILE_STMT);
}

export function stmt_if(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.IF_KW);
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p);

    if (p.at(SyntaxKind.ELSEIF_KW)) {
        stmt_elseif(p);
    } else if (p.at(SyntaxKind.ELSE_KW)) {
        stmt_else(p);
    }

    p.expect(SyntaxKind.ENDIF_KW);

    m.complete(p, SyntaxKind.IF_STMT);
}

export function stmt_else(p: Parser) {
    p.next(SyntaxKind.ELSE_KW);
    p.expect(SyntaxKind.NEWLINE);
    stmt_list(p);
}

export function stmt_elseif(p: Parser) {
    const m = p.start();
    p.next(SyntaxKind.ELSEIF_KW);
    expr(p);
    p.expect(SyntaxKind.NEWLINE);
    stmt_list(p);

    if (p.at(SyntaxKind.ELSEIF_KW)) {
        stmt_elseif(p);
    } else if (p.at(SyntaxKind.ELSE_KW)) {
        stmt_else(p);
    }

    m.complete(p, SyntaxKind.ELSEIF_STMT);
}
