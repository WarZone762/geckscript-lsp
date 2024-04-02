import { Location } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";

export function gotoDef(db: hir.FileDatabase, file: hir.File, pos: Position): Location | null {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token === undefined) {
        return null;
    }

    const def = hir.defFromToken(token, db);

    if (def === undefined) {
        return null;
    }

    let script;
    if (def instanceof hir.Script) {
        script = def.node.green;
    } else if (def instanceof hir.Name) {
        script = ast.root(def.node.green)?.green;
    }

    if (script === undefined) {
        return null;
    }

    const defFile = db.script(script);
    if (defFile === undefined) {
        return null;
    }

    return { uri: defFile.doc.uri, range: defFile.rangeOf(def.node.green) };
}

export function refs(db: hir.FileDatabase, file: hir.File, pos: Position): Location[] | null {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token == undefined) {
        return null;
    }

    let symbol = hir.symbolFromToken(token, db);
    if (symbol instanceof hir.ScriptVar) {
        symbol = symbol.def(db)?.symbol;
    }
    if (symbol === undefined) {
        return [];
    }

    const locs: Location[] = [];
    for (const ref of hir.references(db, symbol)) {
        const script = ast.root(ref.node.green)?.green;
        if (script === undefined) {
            continue;
        }

        const defFile = db.script(script);
        if (defFile === undefined) {
            continue;
        }

        locs.push({ uri: defFile.doc.uri, range: defFile.rangeOf(ref.node.green) });
    }

    return locs;
}
