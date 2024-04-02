import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";

export function getHighlight(
    db: hir.FileDatabase,
    file: hir.File,
    pos: Position
): DocumentHighlight[] | null {
    const highlights: DocumentHighlight[] = [];

    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token === undefined) {
        return null;
    }

    const def = hir.defFromToken(token, db);

    if (def instanceof hir.LocalSymbol) {
        highlights.push({
            range: file.rangeOf(def.def.node.green),
            kind: DocumentHighlightKind.Text,
        });
        for (const ref of hir.references(db, def)) {
            highlights.push({
                range: file.rangeOf(ref.node.green),
                kind: DocumentHighlightKind.Text,
            });
        }
    }

    return highlights;
}
