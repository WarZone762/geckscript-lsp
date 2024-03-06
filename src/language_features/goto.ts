import { tokenAtOffset } from "../geckscript/ast.js";
import { findDefFromToken, findRefs } from "../geckscript/hir/api.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { Location } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

export function gotoDef(parsed: ParsedString, pos: Position): Location | null {
    const token = tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token == undefined) {
        return null;
    }

    const def = findDefFromToken(token);
    if (def == undefined) {
        return null;
    }

    return { uri: parsed.doc.uri, range: parsed.rangeOf(def.green) };
}

export function refs(parsed: ParsedString, pos: Position) {
    const token = tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token == undefined) {
        return null;
    }

    const def = findDefFromToken(token);
    if (def == undefined) {
        return null;
    }

    return findRefs(def).map((r) => ({ uri: parsed.doc.uri, range: parsed.rangeOf(r.green) }));
}
