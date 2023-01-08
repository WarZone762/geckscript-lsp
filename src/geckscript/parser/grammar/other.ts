import { expr_primary } from "./expressions";
import { Parser, CompletedMarker } from "../parser";
import { stmt_list_root } from "./statements";
import { is_type, SyntaxKind } from "../../syntax_kind/generated";

export function name(p: Parser): CompletedMarker {
    const m = p.start();

    if (p.at(SyntaxKind.IDENT)) {
        p.next(SyntaxKind.IDENT);
    } else {
        p.err_and_next("expected an identifier");
    }

    return m.complete(p, SyntaxKind.NAME);
}

export function name_ref(p: Parser): CompletedMarker {
    const m = p.start();

    if (p.at(SyntaxKind.IDENT)) {
        p.next(SyntaxKind.IDENT);
    } else {
        p.err_and_next("expected an identifier");
    }

    return m.complete(p, SyntaxKind.NAME_REF);
}

export function var_decl(p: Parser) {
    const m = p.start();

    if (!is_type(p.cur())) {
        p.err_and_next("expected typename");
    } else {
        p.next_any();
    }
    name(p);

    m.complete(p, SyntaxKind.VAR_DECL);
}

export function var_or_var_decl(p: Parser) {
    if (is_type(p.cur())) {
        var_decl(p);
    } else {
        name_ref(p);
    }
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
