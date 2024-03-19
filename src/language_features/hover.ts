import { Hover, MarkupKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";

export function hover(db: hir.FileDatabase, parsed: hir.ParsedString, pos: Position): Hover | null {
    const token = ast.tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token?.parent === undefined) {
        return null;
    }

    const hirNode = hir.syntaxToHir(db, token.parent);

    if (hirNode !== undefined && "symbol" in hirNode) {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value:
                    "```geckscript\n" +
                    hirNode.symbol.type.toStringWithName(hirNode.symbol.name) +
                    "\n```",
            },
        };
    } else {
        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: "```geckscript\n" + token.text + "\n```",
            },
        };
    }
}
