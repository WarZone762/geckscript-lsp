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

    const def = hir.findDefinitionFromToken(token, db);

    if (def instanceof hir.Symbol) {
        highlights.push({
            range: file.rangeOf(def.decl.node.green),
            kind: DocumentHighlightKind.Text,
        });
        for (const ref of hir.findReferences(db, def)) {
            highlights.push({
                range: file.rangeOf(ref.node.green),
                kind: DocumentHighlightKind.Text,
            });
        }
    }

    return highlights;
}
