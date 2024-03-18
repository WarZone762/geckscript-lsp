import { Location } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { tokenAtOffset } from "../geckscript/ast.js";
import * as ast from "../geckscript/ast.js";
import {
    FileDatabase,
    ParsedString,
    Symbol,
    findDefinitionFromToken,
    findReferences,
} from "../geckscript/hir.js";

export function gotoDef(db: FileDatabase, parsed: ParsedString, pos: Position): Location | null {
    const token = tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token === undefined) {
        return null;
    }

    const def = findDefinitionFromToken(token, db);

    if (!(def instanceof Symbol)) {
        return null;
    }

    const script = ast.root(def.decl.node.green)?.green;
    if (script === undefined) {
        return null;
    }

    const defParsed = db.findScript(script);
    if (defParsed === undefined) {
        return null;
    }

    return { uri: defParsed.doc.uri, range: defParsed.rangeOf(def.decl.node.green) };
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
    for (const ref of findReferences(db, def)) {
        const script = ast.root(ref.node.green)?.green;
        if (script === undefined) {
            continue;
        }

        const defParsed = db.findScript(script);
        if (defParsed === undefined) {
            continue;
        }

        locs.push({ uri: defParsed.doc.uri, range: defParsed.rangeOf(ref.node.green) });
    }

    return locs;
}
