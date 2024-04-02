import { Location } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

import { ast, hir } from "../geckscript.js";

export function gotoDef(db: hir.FileDatabase, file: hir.File, pos: Position): Location | undefined {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token === undefined) {
        return;
    }

    const def = hir.defFromToken(token, db);

    if (def === undefined) {
        return;
    }

    const defFile = hir.containingFile(db, def);
    if (defFile === undefined) {
        return;
    }

    return { uri: defFile.doc.uri, range: defFile.rangeOf(def.node.green) };
}

export function refs(db: hir.FileDatabase, file: hir.File, pos: Position): Location[] | undefined {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token == undefined) {
        return;
    }

    let symbol = hir.symbolFromToken(token, db);
    if (symbol instanceof hir.QuestVar) {
        symbol = symbol.def(db)?.symbol;
    }
    if (symbol === undefined) {
        return;
    }

    const locs: Location[] = [];
    for (const ref of hir.references(db, symbol)) {
        const defFile = hir.containingFile(db, ref);
        if (defFile === undefined) {
            continue;
        }

        locs.push({ uri: defFile.doc.uri, range: defFile.rangeOf(ref.node.green) });
    }

    return locs;
}
