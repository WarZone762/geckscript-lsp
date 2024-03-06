import { isAssignmentOp, isKeyword, isType, SyntaxKind } from "../../syntax_kind/generated.js";
import { Parser } from "../parser.js";
import { ASSIGNMENT_OP, EXPR_FIRST, TokenSet } from "../token_set.js";
import { expr, exprBp, exprNoFunc } from "./expressions.js";
import { blockType, restOfLine, varDeclR, varOrVarDeclR } from "./other.js";

export function stmt(p: Parser) {
    switch (p.cur()) {
        case SyntaxKind.SET_KW:
            stmtSet(p);
            break;
        case SyntaxKind.LET_KW:
            stmtLet(p);
            break;
        case SyntaxKind.IF_KW:
        case SyntaxKind.ELSEIF_KW:
            stmtIf(p);
            break;
        case SyntaxKind.WHILE_KW:
            stmtWhile(p);
            break;
        case SyntaxKind.FOREACH_KW:
            stmtForeach(p);
            break;
        case SyntaxKind.NEWLINE:
            p.nextAny();
            return;
        case SyntaxKind.BEGIN_KW:
            p.errAndNext("nested begin blocks not allowed");
            return;
        default:
            if (isKeyword(p.cur())) {
                if (
                    p.atTs(
                        new TokenSet([
                            SyntaxKind.CONTINUE_KW,
                            SyntaxKind.BREAK_KW,
                            SyntaxKind.RETURN_KW,
                        ])
                    )
                ) {
                    p.nextAny();
                } else {
                    p.warnAndNext("unexpected keyword");
                }
            } else if (isType(p.cur())) {
                stmtVarDecl(p);
            } else if (p.atTs(EXPR_FIRST)) {
                expr(p);
            } else {
                p.errAndNext("expected expression or statement");
                return;
            }
    }

    p.expect(SyntaxKind.NEWLINE);
}

export function stmtRoot(p: Parser) {
    switch (p.cur()) {
        case SyntaxKind.SET_KW:
            stmtSet(p);
            break;
        case SyntaxKind.LET_KW:
            stmtLet(p);
            break;
        case SyntaxKind.BEGIN_KW:
            stmtBegin(p);
            break;
        case SyntaxKind.NEWLINE:
            p.nextAny();
            return;
        default:
            if (isType(p.cur())) {
                stmtVarDecl(p);
            } else {
                p.warnAndNext("statement outside of begin block");
                return;
            }
    }

    if (!p.at(SyntaxKind.EOF)) {
        p.expect(SyntaxKind.NEWLINE);
    }
}

export function stmtList(p: Parser, terminators: TokenSet) {
    const m = p.start();

    while (!p.at(SyntaxKind.EOF) && !p.atTs(terminators)) {
        stmt(p);
    }

    m.complete(p, SyntaxKind.STMT_LIST);
}

export function stmtListRoot(p: Parser) {
    const m = p.start();

    while (!p.at(SyntaxKind.EOF)) {
        stmtRoot(p);
    }

    m.complete(p, SyntaxKind.STMT_LIST);
}

export function stmtVarDecl(p: Parser) {
    const m = p.start();

    varDeclR(p, ASSIGNMENT_OP);
    if (isAssignmentOp(p.cur())) {
        p.nextAny();
        expr(p);
    }

    m.complete(p, SyntaxKind.VAR_DECL_STMT);
}

export function stmtSet(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.SET_KW);
    exprNoFunc(p);
    if (!p.opt(SyntaxKind.TO_KW)) {
        p.errRecover("expected 'to'", EXPR_FIRST);
    }
    exprBp(p, 2);

    m.complete(p, SyntaxKind.SET_STMT);
}

export function stmtLet(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.LET_KW);
    varOrVarDeclR(p, ASSIGNMENT_OP);
    if (isAssignmentOp(p.cur())) {
        p.nextAny();
    } else {
        p.errRecover("expected assignment operator", EXPR_FIRST);
    }
    expr(p);

    m.complete(p, SyntaxKind.LET_STMT);
}

export function stmtBegin(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.BEGIN_KW);
    blockType(p);
    p.expect(SyntaxKind.NEWLINE);

    stmtList(p, new TokenSet([SyntaxKind.END_KW]));
    p.expect(SyntaxKind.END_KW);
    restOfLine(p);

    m.complete(p, SyntaxKind.BEGIN_STMT);
}

export function stmtForeach(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.FOREACH_KW);
    varOrVarDeclR(p, new TokenSet([SyntaxKind.LARROW]));
    if (!p.opt(SyntaxKind.LARROW)) {
        p.errRecover("expected '<-'", EXPR_FIRST);
    }
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmtList(p, new TokenSet([SyntaxKind.LOOP_KW]));
    p.expect(SyntaxKind.LOOP_KW);

    m.complete(p, SyntaxKind.FOREACH_STMT);
}

export function stmtWhile(p: Parser) {
    const m = p.start();

    p.next(SyntaxKind.WHILE_KW);
    expr(p);
    p.expect(SyntaxKind.NEWLINE);

    stmtList(p, new TokenSet([SyntaxKind.LOOP_KW]));
    p.expect(SyntaxKind.LOOP_KW);

    m.complete(p, SyntaxKind.WHILE_STMT);
}

export function stmtIf(p: Parser) {
    const m = p.start();

    if (p.at(SyntaxKind.IF_KW)) {
        p.nextAny();
    } else if (p.at(SyntaxKind.ELSEIF_KW)) {
        p.warnAndNext("replace this 'elseif' with 'if'");
    } else {
        p.expect(SyntaxKind.IF_KW);
    }
    expr(p);
    p.expect(SyntaxKind.NEWLINE);
    stmtList(p, new TokenSet([SyntaxKind.ELSEIF_KW, SyntaxKind.ELSE_KW, SyntaxKind.ENDIF_KW]));
    elseifElse(p);

    p.expect(SyntaxKind.ENDIF_KW);

    m.complete(p, SyntaxKind.IF_STMT);
}

export function elseifElse(p: Parser) {
    if (p.at(SyntaxKind.ELSEIF_KW) || (p.at(SyntaxKind.ELSE_KW) && p.nth(1) === SyntaxKind.IF_KW)) {
        const m = p.start();

        p.nextAny();
        if (p.at(SyntaxKind.IF_KW)) {
            p.nextAny();
        }
        expr(p);
        p.expect(SyntaxKind.NEWLINE);
        stmtList(p, new TokenSet([SyntaxKind.ELSEIF_KW, SyntaxKind.ELSE_KW, SyntaxKind.ENDIF_KW]));
        elseifElse(p);

        m.complete(p, SyntaxKind.BRANCH);
    } else if (p.at(SyntaxKind.ELSE_KW)) {
        const m = p.start();

        p.nextAny();
        restOfLine(p);
        p.expect(SyntaxKind.NEWLINE);
        stmtList(p, new TokenSet([SyntaxKind.ENDIF_KW]));

        m.complete(p, SyntaxKind.BRANCH);
    }
}
