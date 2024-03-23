import { Location } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";

export function gotoDef(db: hir.FileDatabase, file: hir.File, pos: Position): Location | null {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token === undefined) {
        return null;
    }

    const def = hir.findDefinitionFromToken(token, db);

    if (!(def instanceof hir.Symbol)) {
        return null;
    }

    const script = ast.root(def.decl.node.green)?.green;
    if (script === undefined) {
        return null;
    }

    const defFile = db.findScript(script);
    if (defFile === undefined) {
        return null;
    }

    return { uri: defFile.doc.uri, range: defFile.rangeOf(def.decl.node.green) };
}

export function refs(db: hir.FileDatabase, file: hir.File, pos: Position): Location[] | null {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token == undefined) {
        return null;
    }

    const def = hir.findDefinitionFromToken(token, db);
    if (def === undefined) {
        return null;
    }

    const locs: Location[] = [];
    for (const ref of hir.findReferences(db, def)) {
        const script = ast.root(ref.node.green)?.green;
        if (script === undefined) {
            continue;
        }

        const defFile = db.findScript(script);
        if (defFile === undefined) {
            continue;
        }

        locs.push({ uri: defFile.doc.uri, range: defFile.rangeOf(ref.node.green) });
    }

    return locs;
}
