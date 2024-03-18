import { SyntaxKind, isType } from "../../syntax.js";
import { CompletedMarker, Parser } from "../parser.js";
import { EXPR_FIRST, TokenSet } from "../token_set.js";
import { exprNoFunc, exprPrimary } from "./expressions.js";
import { stmtListRoot } from "./statements.js";

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

export function blockType(p: Parser) {
    const m = p.start();

    if (p.at(SyntaxKind.IDENT)) {
        p.nextAny();
    } else {
        p.errRecover("expected blocktype name", EXPR_FIRST);
    }
    while (!p.at(SyntaxKind.EOF) && !p.at(SyntaxKind.NEWLINE)) {
        exprPrimary(p, true);
    }

    m.complete(p, SyntaxKind.BLOCKTYPE_DESIG);
}

export function script(p: Parser) {
    const m = p.start();

    while (p.opt(SyntaxKind.NEWLINE)) {
        continue;
    }

    if (!p.opt(SyntaxKind.SCRIPTNAME_KW)) {
        p.errRecover("expected 'scn' or 'ScriptName'", new TokenSet([SyntaxKind.IDENT]));
    }
    name(p);
    restOfLine(p);
    p.expect(SyntaxKind.NEWLINE);

    stmtListRoot(p);

    m.complete(p, SyntaxKind.SCRIPT);
}

export function restOfLine(p: Parser) {
    while (!p.at(SyntaxKind.NEWLINE) && !p.at(SyntaxKind.EOF)) {
        p.warnAndNext("unexpected token");
    }
}
