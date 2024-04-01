import { CompletionItem, CompletionItemKind, MarkupKind } from "vscode-languageserver";
import { Position, TextDocument } from "vscode-languageserver-textdocument";

import { SyntaxKind, TokenData, ast, hir, isKeyword, isOp, isType } from "../geckscript.js";
import { GlobalFunction } from "../geckscript/function_data.js";

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

        for (const globalSymbol of db.globalSymbols.values()) {
            if (globalSymbol instanceof GlobalFunction) {
                if (globalSymbol.reqRef) {
                    completionItems.push({
                        label: globalSymbol.name,
                        labelDetails:
                            globalSymbol.alias !== undefined
                                ? { detail: `(alias ${globalSymbol.alias})` }
                                : undefined,

                        detail: globalSymbol.signature(),
                        documentation: {
                            kind: MarkupKind.Markdown,
                            value: `${globalSymbol.desc ?? ""}\n\n\n*From: ${globalSymbol.origin}*`,
                        },

                        kind: CompletionItemKind.Method,
                    });
                }
            } else if (globalSymbol instanceof hir.GlobalSymbol) {
                completionItems.push({
                    label: globalSymbol.name,
                    detail: globalSymbol.type.toStringWithName(globalSymbol.name),
                    kind: CompletionItemKind.Constant,
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

        for (const globalSymbol of db.globalSymbols.values()) {
            if (globalSymbol instanceof GlobalFunction) {
                completionItems.push({
                    label: globalSymbol.name,
                    labelDetails:
                        globalSymbol.alias !== undefined
                            ? { detail: `(alias ${globalSymbol.alias})` }
                            : undefined,

                    detail: globalSymbol.signature(),
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `${globalSymbol.desc ?? ""}\n\n\n*From: ${globalSymbol.origin}*`,
                    },

                    kind: globalSymbol.reqRef
                        ? CompletionItemKind.Method
                        : CompletionItemKind.Function,
                });
            } else if (globalSymbol instanceof hir.GlobalSymbol) {
                completionItems.push({
                    label: globalSymbol.name,
                    detail: globalSymbol.type.toStringWithName(globalSymbol.name),
                    documentation: globalSymbol.desc,
                    kind: CompletionItemKind.Constant,
                });
            }
        }
    }

    return completionItems;
}
