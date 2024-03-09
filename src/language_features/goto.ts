import { Location } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { tokenAtOffset } from "../geckscript/ast.js";
import * as ast from "../geckscript/ast.js";
import { findDefinitionFromToken, findReferences } from "../geckscript/hir/api.js";
import { FileDatabase, ParsedString } from "../geckscript/hir/hir.js";

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

    const script = ast.root(def.decl.green)?.name()?.name()?.text;
    if (script === undefined) {
        return null;
    }

    const defParsed = db.scriptToUri(script);
    if (defParsed === undefined) {
        return null;
    }

    return { uri: defParsed.doc.uri, range: defParsed.rangeOf(def.decl.green) };
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

    const locs: Location[] = [];
    for (const ref of findReferences(def, db)) {
        const script = ast.root(ref.green)?.name()?.name()?.text;
        if (script === undefined) {
            continue;
        }

        const defParsed = db.scriptToUri(script);
        if (defParsed === undefined) {
            continue;
        }

        locs.push({ uri: defParsed.doc.uri, range: defParsed.rangeOf(ref.green) });
    }

    return locs;
}
