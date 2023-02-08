import * as ast from "../geckscript/ast";
import { ParsedString } from "../geckscript/hir";
import { find_def_from_token, find_refs } from "../geckscript/hir/api";
import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

export function get_highlight(parsed: ParsedString, pos: Position): DocumentHighlight[] | null {
    const highlights: DocumentHighlight[] = [];

    const token = ast.token_at_offset(parsed.root.green, parsed.offset_at(pos));
    if (token == undefined) {
        return null;
    }

    const def = find_def_from_token(token);

    if (def != undefined) {
        highlights.push({ range: parsed.range_of(def.name()!), kind: DocumentHighlightKind.Text });
        for (const ref of find_refs(def)) {
            highlights.push({
                range: parsed.range_of(ref.name_ref()!),
                kind: DocumentHighlightKind.Text,
            });
        }
    } else {
        for (const e of ast.str_occurences(parsed.root.green, token.text)) {
            highlights.push({ range: parsed.range_of(e), kind: DocumentHighlightKind.Text });
        }
    }

    return highlights;
}
