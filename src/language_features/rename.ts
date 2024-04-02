import { ErrorCodes, ResponseError, WorkspaceEdit } from "vscode-languageserver";
import { Position, Range, TextEdit } from "vscode-languageserver-textdocument";

import { SyntaxKind, ast, hir } from "../geckscript.js";

export function prepareRename(
    file: hir.File,
    pos: Position
): Range | { range: Range; placeholder: string } | ResponseError | null {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token?.kind !== SyntaxKind.IDENT) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    return file.rangeOf(token);
}

export function rename(
    db: hir.FileDatabase,
    file: hir.File,
    newName: string,
    pos: Position
): WorkspaceEdit | ResponseError | undefined {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token == undefined) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const def = hir.defFromToken(token, db);
    // TODO: add script renaming
    if (def === undefined || def instanceof hir.Script) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const defScript = ast.root(def.node.green);
    if (defScript === undefined) {
        return;
    }
    const defFile = db.script(defScript.green);
    if (defFile === undefined) {
        return;
    }
    const changes: { [key: string]: TextEdit[] } = {
        [defFile.doc.uri]: [{ range: defFile.rangeOf(def.node.green), newText: newName }],
    };

    const refs = hir.references(db, def.symbol);
    for (const ref of refs) {
        const script = ast.root(ref.node.green);
        if (script === undefined) {
            continue;
        }
        const refFile = db.script(script.green);
        if (refFile === undefined) {
            continue;
        }
        const change = { range: refFile.rangeOf(ref.node.green), newText: newName };
        if (changes[refFile.doc.uri] !== undefined) {
            changes[refFile.doc.uri].push(change);
        } else {
            changes[refFile.doc.uri] = [change];
        }
    }

    return { changes };
}
