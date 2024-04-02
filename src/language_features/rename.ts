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
): WorkspaceEdit | ResponseError | null {
    const token = ast.tokenAtOffset(file.root.green, file.offsetAt(pos));
    if (token == undefined) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const def = hir.defFromToken(token, db);
    if (!(def instanceof hir.LocalSymbol)) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const refs = hir.references(db, def);
    const changes: TextEdit[] = [{ range: file.rangeOf(def.def.node.green), newText: newName }];
    for (const ref of refs) {
        changes.push({ range: file.rangeOf(ref.node.green), newText: newName });
    }

    return { changes: { [file.doc.uri]: changes } };
}
