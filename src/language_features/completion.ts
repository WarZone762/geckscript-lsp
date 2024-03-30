import { CompletionItem, CompletionItemKind, MarkupKind } from "vscode-languageserver";
import { Position, TextDocument } from "vscode-languageserver-textdocument";

import { SyntaxKind, TokenData, ast, hir, isKeyword, isOp, isType } from "../geckscript.js";

export function completionItems(
    db: hir.FileDatabase,
    file: hir.File,
    pos: Position,
    triggerChar?: string
): CompletionItem[] | null {
    const token = ast.nearestToken(file.root.green, file.offsetAt(pos));

    if (
        token === undefined ||
        token.kind === SyntaxKind.COMMENT ||
        token.kind === SyntaxKind.BLOCK_COMMENT ||
        token.kind === SyntaxKind.STRING
    ) {
        return null;
    }

    triggerChar ??= token.text;

    const completionItems: CompletionItem[] = [];

    if (triggerChar === ".") {
        const text =
            file.doc.getText().substring(0, token.offset + 1) +
            "GECKSCRIPTLSPCOMPLETION" +
            file.doc.getText().substring(token.offset + 1);
        const fakeFile = db.loadFile(
            TextDocument.create("GECKSCRIPT-LSP-COMPLETION", "geckscript", 0, text)
        );
        const fakeFieldExpr = ast.nearestToken(fakeFile.root.green, token.offset + 2)?.parent
            ?.parent;
        if (fakeFieldExpr !== undefined) {
            const hirFieldExpr = hir.syntaxToHir(db, fakeFieldExpr);
            if (
                hirFieldExpr instanceof hir.FieldExpr &&
                hirFieldExpr.type instanceof hir.ExprTypeSimple
            ) {
                for (const field of hirFieldExpr.type.members) {
                    completionItems.push({
                        label: field.name,
                        sortText: "!" + field.name,
                        detail: field.type.toStringWithName(field.name),
                        kind: CompletionItemKind.Field,
                    });
                }
            }
        }
        db.deleteFile("GECKSCRIPT-LSP-COMPLETION");

        for (const fn of db.builtinFunctions.values()) {
            if (fn.reqRef) {
                completionItems.push({
                    label: fn.name,
                    labelDetails:
                        fn.alias !== undefined ? { detail: `(alias ${fn.alias})` } : undefined,

                    detail: fn.signature(),
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `${fn.desc ?? ""}\n\n\n*From: ${fn.origin}*`,
                    },

                    kind: CompletionItemKind.Method,
                });
            }
        }
    } else {
        for (const symbol of Object.values(hir.visibleSymbols(db, token))) {
            completionItems.push({
                label: symbol.name,
                data: symbol.name,
                detail: symbol.type.toStringWithName(symbol.name),
                kind:
                    symbol.type.kind === "ScriptVar"
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

        // FIXME: too many completion items
        // for (const item of db.globalSymbols.values()) {
        //     completionItems.push({
        //         label: item.name,
        //         detail: item.type.toStringWithName(item.name),
        //         kind:
        //             item.type.kind === "Function"
        //                 ? CompletionItemKind.Function
        //                 : CompletionItemKind.Variable,
        //     });
        // }

        for (const fn of db.builtinFunctions.values()) {
            completionItems.push({
                label: fn.name,
                labelDetails:
                    fn.alias !== undefined ? { detail: `(alias ${fn.alias})` } : undefined,

                detail: fn.signature(),
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: `${fn.desc ?? ""}\n\n\n*From: ${fn.origin}*`,
                },

                kind: fn.reqRef ? CompletionItemKind.Method : CompletionItemKind.Function,
            });
        }
    }

    return completionItems;
}
