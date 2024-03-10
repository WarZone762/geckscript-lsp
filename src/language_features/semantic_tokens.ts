import {
    SemanticTokenModifiers,
    SemanticTokenTypes,
    SemanticTokens,
    SemanticTokensBuilder,
    SemanticTokensLegend,
} from "vscode-languageserver/node.js";

import * as ast from "../geckscript/ast.js";
import { FuncExpr } from "../geckscript/ast/generated.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { SyntaxKind, isKeyword, isOp, isType } from "../geckscript/syntax_kind/generated.js";

export const LEGEND: SemanticTokensLegend = {
    tokenTypes: [
        SemanticTokenTypes.type,
        SemanticTokenTypes.variable,
        SemanticTokenTypes.function,
        SemanticTokenTypes.keyword,
        SemanticTokenTypes.comment,
        SemanticTokenTypes.string,
        SemanticTokenTypes.number,
        SemanticTokenTypes.operator,
    ],
    tokenModifiers: [SemanticTokenModifiers.definition, SemanticTokenModifiers.readonly],
};

const enum TokenType {
    TYPE,
    VAR,
    FUNC,
    KEYWORD,
    COMMENT,
    STRING,
    NUMBER,
    OP,
}

const enum TokenModifier {
    NONE = 0,
    DEF = 1 << 0,
    READONLY = 1 << 1,
}

export function buildSemanticTokens(parsed: ParsedString): SemanticTokens {
    const builder = new SemanticTokensBuilder();

    for (const node of ast.descendantsDf(parsed.root.green)) {
        const pos = parsed.posAt(node.offset);
        if (node.kind === SyntaxKind.IDENT) {
            if (
                node.parent?.parent?.kind === SyntaxKind.FUNC_EXPR &&
                new FuncExpr(node.parent.parent).name()?.nameRef() === node
            ) {
                push(TokenType.FUNC, TokenModifier.NONE);
            } else if (node.parent?.kind === SyntaxKind.BLOCKTYPE_DESIG) {
                push(TokenType.VAR, TokenModifier.READONLY);
            } else {
                if (node.parent?.kind === SyntaxKind.NAME) {
                    push(TokenType.VAR, TokenModifier.DEF);
                } else {
                    push(TokenType.VAR, TokenModifier.NONE);
                }
            }
        } else if (isType(node.kind)) {
            push(TokenType.TYPE, TokenModifier.NONE);
        } else if (isKeyword(node.kind)) {
            push(TokenType.KEYWORD, TokenModifier.NONE);
        } else if (node.kind === SyntaxKind.COMMENT) {
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
