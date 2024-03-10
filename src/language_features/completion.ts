import { CompletionItem, CompletionItemKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import * as ast from "../geckscript/ast.js";
import { visibleSymbols } from "../geckscript/hir/api.js";
import { FileDatabase, ParsedString, SymbolKind } from "../geckscript/hir/hir.js";
import { SyntaxKind, isKeyword, isOp, isType } from "../geckscript/syntax_kind/generated.js";
import { TokenData } from "../geckscript/types/token_data.js";

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

    for (const symbol of Object.values(visibleSymbols(token, db))) {
        completionItems.push({
            label: symbol.name,
            data: symbol.name,
            detail: symbol.completionDetail(),
            kind:
                symbol.kind === SymbolKind.Script
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
                item.kind === SymbolKind.Variable
                    ? CompletionItemKind.Variable
                    : CompletionItemKind.Function,
        });
    }

    return completionItems;
}
