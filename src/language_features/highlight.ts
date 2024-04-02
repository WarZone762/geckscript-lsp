import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";

export function getHighlight(
    db: hir.FileDatabase,
    file: hir.File,
    pos: Position
): DocumentHighlight[] | undefined {
    const highlights: DocumentHighlight[] = [];

    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token === undefined) {
        return;
    }

    const def = hir.defFromToken(token, db);
    if (def === undefined || def instanceof hir.Script) {
        return;
    }

    const defFile = hir.containingFile(db, def);
    if (defFile !== undefined && defFile.doc.uri === file.doc.uri) {
        highlights.push({
            range: defFile.rangeOf(def.node.green),
            kind: DocumentHighlightKind.Text,
        });
    }

    const refs = hir.references(db, def.symbol);

    for (const ref of refs) {
        const refFile = hir.containingFile(db, ref);
        if (refFile === undefined || refFile.doc.uri !== file.doc.uri) {
            continue;
        }
        highlights.push({
            range: refFile.rangeOf(ref.node.green),
            kind: DocumentHighlightKind.Text,
        });
    }
    return highlights;
}
