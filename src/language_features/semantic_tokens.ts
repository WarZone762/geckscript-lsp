import {
    SemanticTokenModifiers,
    SemanticTokenTypes,
    SemanticTokens,
    SemanticTokensBuilder,
    SemanticTokensLegend,
} from "vscode-languageserver/node.js";

import { SyntaxKind, ast, hir, isKeyword, isOp, isType } from "../geckscript.js";

export const LEGEND: SemanticTokensLegend = {
    tokenTypes: [
        SemanticTokenTypes.type,
        SemanticTokenTypes.variable,
        SemanticTokenTypes.property,
        SemanticTokenTypes.enumMember,
        SemanticTokenTypes.function,
        SemanticTokenTypes.method,
        SemanticTokenTypes.keyword,
        SemanticTokenTypes.comment,
        SemanticTokenTypes.string,
        SemanticTokenTypes.number,
        SemanticTokenTypes.operator,
    ],
    tokenModifiers: [
        SemanticTokenModifiers.definition,
        SemanticTokenModifiers.declaration,
        SemanticTokenModifiers.readonly,
    ],
};

const enum TokenType {
    TYPE,
    VAR,
    PROP,
    ENUM_MEMBER,
    FUNC,
    METHOD,
    KEYWORD,
    COMMENT,
    STRING,
    NUMBER,
    OP,
}

const enum TokenModifier {
    NONE = 0,
    DEF = 1 << 0,
    DECL = 1 << 1,
    READONLY = 1 << 2,
}

export function buildSemanticTokens(db: hir.FileDatabase, file: hir.File): SemanticTokens {
    const builder = new SemanticTokensBuilder();

    for (const node of ast.descendantsDf(file.root.green)) {
        const pos = file.posAt(node.offset);
        if (node.kind === SyntaxKind.NAME_REF) {
            const hirNode = hir.syntaxToHir(db, node);
            if (hirNode === undefined) {
                continue;
            }
            if (hirNode instanceof hir.NameRef) {
                if (hirNode.type instanceof hir.ExprTypeFunction) {
                    if (node.parent !== undefined) {
                        const parent = hir.syntaxToHir(db, node.parent);
                        if (parent instanceof hir.FieldExpr) {
                            push(TokenType.METHOD, TokenModifier.NONE);
                        } else {
                            push(TokenType.FUNC, TokenModifier.NONE);
                        }
                    } else {
                        push(TokenType.FUNC, TokenModifier.NONE);
                    }
                } else if (hirNode.symbol instanceof hir.GlobalSymbol) {
                    push(TokenType.ENUM_MEMBER, TokenModifier.READONLY);
                } else if (hirNode.symbol instanceof hir.QuestVar) {
                    push(TokenType.PROP, TokenModifier.NONE);
                } else {
                    push(TokenType.VAR, TokenModifier.NONE);
                }
            }
        } else if (node.kind === SyntaxKind.NAME) {
            push(TokenType.VAR, TokenModifier.DECL);
        } else if (isType(node.kind)) {
            push(TokenType.TYPE, TokenModifier.NONE);
        } else if (isKeyword(node.kind)) {
            push(TokenType.KEYWORD, TokenModifier.NONE);
        } else if (node.kind === SyntaxKind.COMMENT || node.kind === SyntaxKind.BLOCK_COMMENT) {
            push(TokenType.COMMENT, TokenModifier.NONE);
        } else if (node.kind === SyntaxKind.STRING) {
            push(TokenType.STRING, TokenModifier.NONE);
        } else if (node.kind === SyntaxKind.NUMBER_INT) {
            push(TokenType.NUMBER, TokenModifier.NONE);
        } else if (
            isOp(node.kind) &&
            node.kind !== SyntaxKind.LPAREN &&
            node.kind !== SyntaxKind.RPAREN &&
            node.kind !== SyntaxKind.LBRACK &&
            node.kind !== SyntaxKind.RBRACK &&
            node.kind !== SyntaxKind.LSQBRACK &&
            node.kind !== SyntaxKind.RSQBRACK
        ) {
            push(TokenType.OP, TokenModifier.NONE);
        }

        function push(type: TokenType, mod: TokenModifier) {
            builder.push(pos.line, pos.character, node.len(), type, mod);
        }
    }

    return builder.build();
}
