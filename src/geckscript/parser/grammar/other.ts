import { SyntaxKind, isType } from "../../syntax.js";
import { CompletedMarker, Parser } from "../parser.js";
import { EXPR_FIRST, TYPE, TokenSet } from "../token_set.js";
import { exprNoFunc, exprPrimary } from "./expressions.js";
import { stmtListRoot } from "./statements.js";

export function script(p: Parser) {
    const m = p.start();

    while (p.opt(SyntaxKind.NEWLINE)) {
        continue;
    }

    if (p.atTs(new TokenSet([SyntaxKind.BEGIN_KW, SyntaxKind.SCRIPTNAME_KW]))) {
        if (!p.at(SyntaxKind.BEGIN_KW)) {
            if (!p.opt(SyntaxKind.SCRIPTNAME_KW)) {
                p.errRecover("expected 'scn' or 'ScriptName'", new TokenSet([SyntaxKind.IDENT]));
            }
            name(p);
            restOfLine(p);
            p.expect(SyntaxKind.NEWLINE);
        }

        stmtListRoot(p);
    }

    m.complete(p, SyntaxKind.SCRIPT);
}

export function nameR(p: Parser, recovery: TokenSet) {
    if (p.at(SyntaxKind.IDENT)) {
        const m = p.start();
        p.next(SyntaxKind.IDENT);
        m.complete(p, SyntaxKind.NAME);
    } else {
        p.errRecover("expected an identifier", recovery);
    }
}

export function name(p: Parser) {
    nameR(p, new TokenSet());
}

export function nameRefR(p: Parser, recovery: TokenSet): CompletedMarker | undefined {
    if (p.at(SyntaxKind.IDENT)) {
        const m = p.start();
        p.next(SyntaxKind.IDENT);
        return m.complete(p, SyntaxKind.NAME_REF);
    } else {
        p.errRecover("expected an identifier", recovery);
    }
}

export function nameRef(p: Parser): CompletedMarker | undefined {
    return nameRefR(p, new TokenSet());
}

export function varDeclR(p: Parser, recovery: TokenSet) {
    const m = p.start();

    if (isType(p.cur())) {
        p.nextAny();
    } else {
        p.errRecover("expected typename", recovery);
    }
    nameR(p, recovery);

    m.complete(p, SyntaxKind.VAR_DECL);
}

export function varDecl(p: Parser) {
    varDeclR(p, new TokenSet());
}

export function varOrVarDeclR(p: Parser, recovery: TokenSet) {
    if (isType(p.cur())) {
        varDeclR(p, recovery);
    } else {
        exprNoFunc(p);
        // nameRefR(p, recovery);
    }
}

export function varOrVarDecl(p: Parser) {
    varOrVarDeclR(p, new TokenSet());
}

export function varOrVarDeclList(p: Parser) {
    const m = p.start();

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

    return m.complete(p, SyntaxKind.VAR_OR_VAR_DECL_LIST);
}

export function blockType(p: Parser) {
    const m = p.start();

    if (p.at(SyntaxKind.IDENT)) {
        p.nextAny();
    } else {
        p.errRecover("expected blocktype name", EXPR_FIRST);
    }
    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.NEWLINE)) {
        exprPrimary(p);
    }

    m.complete(p, SyntaxKind.BLOCKTYPE_DESIG);
}

export function restOfLine(p: Parser) {
    while (!p.at(SyntaxKind.NEWLINE) && !p.at(SyntaxKind.EOF)) {
        p.warnAndNext("unexpected token");
    }
}
