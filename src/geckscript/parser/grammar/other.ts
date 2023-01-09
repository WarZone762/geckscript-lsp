import { is_type, SyntaxKind } from "../../syntax_kind/generated";
import { Parser, TokenSet } from "../parser";
import { expr_primary } from "./expressions";
import { stmt_list_root } from "./statements";

export function name_r(p: Parser, recovery: TokenSet) {
    if (p.at(SyntaxKind.IDENT)) {
        const m = p.start();
        p.next(SyntaxKind.IDENT);
        m.complete(p, SyntaxKind.NAME);
    } else {
        p.err_recover("expected an identifier", recovery);
    }

}

export function name(p: Parser) {
    name_r(p, new Set());
}

export function name_ref_r(p: Parser, recovery: TokenSet) {
    if (p.at(SyntaxKind.IDENT)) {
        const m = p.start();
        p.next(SyntaxKind.IDENT);
        m.complete(p, SyntaxKind.NAME_REF);
    } else {
        p.err_recover("expected an identifier", recovery);
    }
}

export function name_ref(p: Parser) {
    name_ref_r(p, new Set());
}

export function var_decl_r(p: Parser, recovery: TokenSet) {
    const m = p.start();

    if (!is_type(p.cur())) {
        p.err_recover("expected typename", recovery);
    } else {
        p.next_any();
    }
    name_r(p, recovery);

    m.complete(p, SyntaxKind.VAR_DECL);
}

export function var_decl(p: Parser) {
    var_decl_r(p, new Set());
}

export function var_or_var_decl_r(p: Parser, recovery: TokenSet) {
    if (is_type(p.cur())) {
        var_decl_r(p, recovery);
    } else {
        name_ref_r(p, recovery);
    }
}

export function var_or_var_decl(p: Parser) {
    var_or_var_decl_r(p, new Set());
}

export function block_type(p: Parser) {
    const m = p.start();

    p.expect(SyntaxKind.BLOCKTYPE);
    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.NEWLINE)) {
        expr_primary(p);
    }

    m.complete(p, SyntaxKind.BLOCKTYPE_DESIG);
}

export function script(p: Parser) {
    const m = p.start();

    while (p.opt(SyntaxKind.NEWLINE)) {
        continue;
    }

    if (!p.expect(SyntaxKind.SCRIPTNAME_KW)) {
        p.err_and_next("expected 'scn' or 'ScriptName'");
    }
    name(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list_root(p);

    m.complete(p, SyntaxKind.SCRIPT);
}
