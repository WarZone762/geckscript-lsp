import { Hover, MarkupKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";
import { GlobalFunction } from "../geckscript/function_data.js";

export function hover(db: hir.FileDatabase, file: hir.File, pos: Position): Hover | null {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token?.parent === undefined) {
        return null;
    }

    const hirNode = hir.syntaxToHir(db, token.parent);

    if (hirNode !== undefined && "symbol" in hirNode) {
        if (hirNode.symbol instanceof GlobalFunction) {
            return {
                contents: {
                    kind: MarkupKind.Markdown,
                    value:
                        "```geckscript\n" +
                        hirNode.symbol.signature() +
                        "\n```" +
                        "\n" +
                        (hirNode.symbol.desc ??
                            "" +
                                `\n\n[GECKWiki](https://geckwiki.com/index.php?title=${hirNode.symbol.name})`),
                },
            };
        } else if (hirNode.symbol instanceof hir.GlobalSymbol) {
            return {
                contents: {
                    kind: MarkupKind.Markdown,
                    value:
                        "```geckscript\n" +
                            hirNode.symbol.type.toStringWithName(hirNode.symbol.name) +
                            "\n```" +
                            "\n" +
                            hirNode.symbol.desc ?? "",
                },
            };
        } else {
            return {
                contents: {
                    kind: MarkupKind.Markdown,
                    value:
                        "```geckscript\n" +
                        hirNode.symbol.type.toStringWithName(hirNode.symbol.name) +
                        "\n```",
                },
            };
        }
    } else {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: "```geckscript\n" + token.text + "\n```",
            },
        };
    }
}
