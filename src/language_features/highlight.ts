import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";

export function getHighlight(
    db: hir.FileDatabase,
    parsed: hir.ParsedString,
    pos: Position
): DocumentHighlight[] | null {
    const highlights: DocumentHighlight[] = [];

    const token = ast.tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token === undefined) {
        return null;
    }

    const def = hir.findDefinitionFromToken(token, db);

    if (def instanceof hir.Symbol) {
        highlights.push({
            range: parsed.rangeOf(def.decl.node.green),
            kind: DocumentHighlightKind.Text,
        });
        for (const ref of hir.findReferences(db, def)) {
            highlights.push({
                range: parsed.rangeOf(ref.node.green),
                kind: DocumentHighlightKind.Text,
            });
        }
    }

    return highlights;
}
