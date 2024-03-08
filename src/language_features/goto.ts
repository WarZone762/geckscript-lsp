import { tokenAtOffset } from "../geckscript/ast.js";
import { findDefinitionFromToken, findReferences } from "../geckscript/hir/api.js";
import { FileDatabase, ParsedString } from "../geckscript/hir/hir.js";
import { Location } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

export function gotoDef(db: FileDatabase, parsed: ParsedString, pos: Position): Location | null {
    const token = tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token === undefined) {
        return null;
    }

    const def = findDefinitionFromToken(token, db);
    if (def === undefined) {
        return null;
    }

    if (def.decl === undefined) {
        return null;
    }

    return { uri: parsed.doc.uri, range: parsed.rangeOf(def.decl.green) };
}

export function refs(db: FileDatabase, parsed: ParsedString, pos: Position): Location[] | null {
    const token = tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token == undefined) {
        return null;
    }

    const def = findDefinitionFromToken(token, db);
    if (def === undefined) {
        return null;
    }

    const refs = findReferences(def);
    return refs.map((r) => ({ uri: parsed.doc.uri, range: parsed.rangeOf(r.green) }));
}
