import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import * as ast from "../geckscript/ast.js";
import { ExprKind, FileDatabase, ParsedString, visibleSymbols } from "../geckscript/hir.js";
import { SyntaxKind, TokenData, isKeyword, isOp, isType } from "../geckscript/syntax.js";

export function completionItems(
    db: FileDatabase,
    parsed: ParsedString,
    pos: Position
): CompletionItem[] | null {
    const token = ast.nearestToken(parsed.root.green, parsed.offsetAt(pos));

    if (
        token === undefined ||
        token.kind === SyntaxKind.COMMENT ||
        token.kind === SyntaxKind.BLOCK_COMMENT ||
        token.kind === SyntaxKind.STRING
    ) {
        return null;
    }

    const completionItems: CompletionItem[] = [];

    for (const symbol of Object.values(visibleSymbols(db, token))) {
        completionItems.push({
            label: symbol.name,
            data: symbol.name,
            detail: symbol.type.toString(),
            kind:
                symbol.type.kind === ExprKind.Script
                    ? CompletionItemKind.File
                    : CompletionItemKind.Variable,
        });
    }

    for (const v of Object.values(TokenData)) {
        if (isOp(v.kind)) {
            continue;
        }

        completionItems.push({
            label: v.canonicalName,
            data: v.wikiPageName ?? v.canonicalName,
            detail: v.canonicalName,
            kind: isType(v.kind)
                ? CompletionItemKind.TypeParameter
                : isKeyword(v.kind)
                  ? CompletionItemKind.Keyword
                  : CompletionItemKind.Constant,
        });
    }

    for (const item of db.globalSymbols.values()) {
        completionItems.push({
            label: item.name,
            detail: item.name,
            kind:
                item.type.kind === ExprKind.Function
                    ? CompletionItemKind.Function
                    : CompletionItemKind.Variable,
        });
    }

    return completionItems;
}
