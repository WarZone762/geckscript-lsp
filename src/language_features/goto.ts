import { token_at_offset } from "../geckscript/ast";
import { ParsedString } from "../geckscript/hir";
import { find_def_from_token, find_refs } from "../geckscript/hir/api";
import { Location } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

export function goto_def(parsed: ParsedString, pos: Position): Location | null {
    const token = token_at_offset(parsed.root.green, parsed.offset_at(pos));
    if (token == undefined) {
        return null;
    }

    const def = find_def_from_token(token);
    if (def == undefined) {
        return null;
    }

    return { uri: parsed.doc.uri, range: parsed.range_of(def.green) };
}

export function goto_refs(parsed: ParsedString, pos: Position) {
    const token = token_at_offset(parsed.root.green, parsed.offset_at(pos));
    if (token == undefined) {
        return null;
    }

    const def = find_def_from_token(token);
    if (def == undefined) {
        return null;
    }

    return find_refs(def).map((r) => ({ uri: parsed.doc.uri, range: parsed.range_of(r.green) }));
}
