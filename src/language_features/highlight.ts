import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import * as ast from "../geckscript/ast.js";
import { findDefinitionFromToken, findReferences } from "../geckscript/hir/api.js";
import { FileDatabase, ParsedString } from "../geckscript/hir/hir.js";

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

    if (def !== undefined) {
        highlights.push({
            range: parsed.rangeOf(def.decl.green),
            kind: DocumentHighlightKind.Text,
        });
        for (const ref of findReferences(def)) {
            highlights.push({
                range: parsed.rangeOf(ref.nameRef()!),
                kind: DocumentHighlightKind.Text,
            });
        }
    } else {
        for (const e of ast.strOccurences(parsed.root.green, token.text)) {
            highlights.push({ range: parsed.rangeOf(e), kind: DocumentHighlightKind.Text });
        }
    }

    return highlights;
}
