import * as ast from "../geckscript/ast.js";
import { findDefFromToken, findRefs } from "../geckscript/hir/api.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

export function getHighlight(parsed: ParsedString, pos: Position): DocumentHighlight[] | null {
    const highlights: DocumentHighlight[] = [];

    const token = ast.tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token == undefined) {
        return null;
    }

    const def = findDefFromToken(token);

    if (def != undefined) {
        highlights.push({ range: parsed.rangeOf(def.name()!), kind: DocumentHighlightKind.Text });
        for (const ref of findRefs(def)) {
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
