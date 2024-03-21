import { ErrorCodes, ResponseError, WorkspaceEdit } from "vscode-languageserver";
import { Position, Range, TextEdit } from "vscode-languageserver-textdocument";

import { SyntaxKind, ast, hir } from "../geckscript.js";
import { FunctionData } from "../geckscript/function_data.js";

export function prepareRename(
    parsed: hir.ParsedString,
    pos: Position
): Range | { range: Range; placeholder: string } | ResponseError | null {
    const token = ast.tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token?.kind !== SyntaxKind.IDENT) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    return parsed.rangeOf(token);
}

export function rename(
    db: hir.FileDatabase,
    parsed: hir.ParsedString,
    newName: string,
    pos: Position
): WorkspaceEdit | ResponseError | null {
    const token = ast.tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token == undefined) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const def = hir.findDefinitionFromToken(token, db);
    if (def === undefined || def instanceof hir.GlobalSymbol || def instanceof FunctionData) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const refs = hir.findReferences(db, def);
    const changes: TextEdit[] = [{ range: parsed.rangeOf(def.decl.node.green), newText: newName }];
    for (const ref of refs) {
        changes.push({ range: parsed.rangeOf(ref.node.green), newText: newName });
    }

    return { changes: { [parsed.doc.uri]: changes } };
}
