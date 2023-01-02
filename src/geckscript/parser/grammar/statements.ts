import { expr, expr_bp } from "./expressions";
import { Parser } from "../parser";
import { block_type, name_ref, var_decl, var_or_var_decl } from "./other";
import { is_assignment_op, is_keyword, is_type, SyntaxKind, TokenSyntaxKind } from "../../syntax_kind/generated";

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
            // report parsing error (nested begin blocks not allowed)

            stmt_begin(p);
            break;

        default:
            if (is_keyword(p.cur())) {
                if (p.at(SyntaxKind.CONTINUE_KW) || p.at(SyntaxKind.BREAK_KW) || p.at(SyntaxKind.RETURN_KW)) {
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

    if (!p.at(SyntaxKind.EOF)) {
        p.expect(SyntaxKind.NEWLINE);
    }
}

export function stmt_list(p: Parser, terms: TokenSyntaxKind[]) {
    const m = p.start();

    while (!p.at(SyntaxKind.EOF) && !p.at_ts(terms)) {
        stmt(p);
    }

    m.complete(p, SyntaxKind.STMT_LIST);
}

export function stmt_root(p: Parser) {
    if (!p.at_ts([SyntaxKind.SET_KW, SyntaxKind.LET_KW, SyntaxKind.BEGIN_KW, SyntaxKind.NEWLINE]) && !is_type(p.cur())) {
        p.err_and_next("illegal statement outside of begin block");
    }

    stmt(p);
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

    var_decl(p);
    if (is_assignment_op(p.cur())) {
        p.next_any();
        expr(p);
    }

    m.complete(p, SyntaxKind.VAR_DECL_STMT);
}

export function stmt_set(p: Parser) {
    const m = p.start();

    p.expect(SyntaxKind.SET_KW);
    name_ref(p);
    p.expect(SyntaxKind.TO_KW);
    expr_bp(p, 2);

    m.complete(p, SyntaxKind.SET_STMT);
}

export function stmt_let(p: Parser) {
    const m = p.start();

    p.expect(SyntaxKind.LET_KW);
    var_or_var_decl(p);
    if (is_assignment_op(p.cur())) {
        p.next_any();
    } else {
        p.err_and_next("expected assignment operator");
    }
    expr(p);

    m.complete(p, SyntaxKind.LET_STMT);
}

export function stmt_begin(p: Parser) {
    const m = p.start();

    p.expect(SyntaxKind.BEGIN_KW);
    block_type(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p, [SyntaxKind.END_KW]);
    p.expect(SyntaxKind.END_KW);

    m.complete(p, SyntaxKind.BEGIN_STMT);
}

export function stmt_foreach(p: Parser) {
    const m = p.start();

    p.expect(SyntaxKind.FOREACH_KW);
    var_or_var_decl(p);
    p.expect(SyntaxKind.LARROW);
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p, [SyntaxKind.LOOP_KW]);
    p.expect(SyntaxKind.LOOP_KW);

    m.complete(p, SyntaxKind.FOREACH_STMT);
}

export function stmt_while(p: Parser) {
    const m = p.start();

    p.expect(SyntaxKind.WHILE_KW);
    expr(p);

    stmt_list(p, [SyntaxKind.LOOP_KW]);
    p.expect(SyntaxKind.LOOP_KW);

    m.complete(p, SyntaxKind.WHILE_STMT);
}

const IF_TERMINATORS: TokenSyntaxKind[] = [
    SyntaxKind.ELSEIF_KW,
    SyntaxKind.ELSE_KW,
    SyntaxKind.ENDIF_KW,
];

export function stmt_if(p: Parser) {
    const m = p.start();

    p.expect(SyntaxKind.IF_KW);
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list(p, IF_TERMINATORS);

    while (p.at(SyntaxKind.ELSEIF_KW)) {
        p.expect(SyntaxKind.ELSEIF_KW);
        expr(p);
        p.expect(SyntaxKind.NEWLINE);
        stmt_list(p, IF_TERMINATORS);
    }

    if (p.at(SyntaxKind.ELSE_KW)) {
        p.expect(SyntaxKind.ELSE_KW);
        p.expect(SyntaxKind.NEWLINE);
        stmt_list(p, [SyntaxKind.ENDIF_KW]);
    }

    p.expect(SyntaxKind.ENDIF_KW);

    m.complete(p, SyntaxKind.IF_STMT);
}
