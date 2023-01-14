import { is_type, SyntaxKind } from "../../syntax_kind/generated";
import { Parser } from "../parser";
import { TokenSet } from "../token_set";
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
    name_r(p, new TokenSet());
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
    name_ref_r(p, new TokenSet());
}

export function var_decl_r(p: Parser, recovery: TokenSet) {
    const m = p.start();

    if (is_type(p.cur())) {
        p.next_any();
    } else {
        p.err_recover("expected typename", recovery);
    }
    name_r(p, recovery);

    m.complete(p, SyntaxKind.VAR_DECL);
}

export function var_decl(p: Parser) {
    var_decl_r(p, new TokenSet());
}

export function var_or_var_decl_r(p: Parser, recovery: TokenSet) {
    if (is_type(p.cur())) {
        var_decl_r(p, recovery);
    } else {
        name_ref_r(p, recovery);
    }
}

export function var_or_var_decl(p: Parser) {
    var_or_var_decl_r(p, new TokenSet());
}

export function block_type(p: Parser) {
    const m = p.start();

    if (p.at(SyntaxKind.BLOCKTYPE) || p.at(SyntaxKind.BLOCKTYPE_FUNCTION)) {
        p.next_any();
    } else {
        p.err_recover("expected blocktype name", new TokenSet());  // TODO: recovery = EXPR_FIRST
    }
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

    if (!p.opt(SyntaxKind.SCRIPTNAME_KW)) {
        p.err_recover("expected 'scn' or 'ScriptName'", new TokenSet([SyntaxKind.IDENT]));
    }
    name(p);
    p.expect(SyntaxKind.NEWLINE);

    stmt_list_root(p);

    m.complete(p, SyntaxKind.SCRIPT);
}
