import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import * as ast from "../geckscript/ast.js";
import {
    FileDatabase,
    ParsedString,
    Symbol,
    findDefinitionFromToken,
    findReferences,
} from "../geckscript/hir.js";

export function getHighlight(
    db: FileDatabase,
    parsed: ParsedString,
    pos: Position
): DocumentHighlight[] | null {
    const highlights: DocumentHighlight[] = [];

    const token = ast.tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token === undefined) {
        return null;
    }

    const def = findDefinitionFromToken(token, db);

    if (def instanceof Symbol) {
        highlights.push({
            range: parsed.rangeOf(def.decl.node.green),
            kind: DocumentHighlightKind.Text,
        });
        for (const ref of findReferences(db, def)) {
            highlights.push({
                range: parsed.rangeOf(ref.node.green),
                kind: DocumentHighlightKind.Text,
            });
        }
    }

    return highlights;
}
