import { ErrorCodes, ResponseError, WorkspaceEdit } from "vscode-languageserver";
import { Position, Range, TextEdit } from "vscode-languageserver-textdocument";

import { tokenAtOffset } from "../geckscript/ast.js";
import {
    FileDatabase,
    GlobalSymbol,
    ParsedString,
    findDefinitionFromToken,
    findReferences,
} from "../geckscript/hir.js";
import { SyntaxKind } from "../geckscript/syntax.js";

export function prepareRename(
    parsed: ParsedString,
    pos: Position
): Range | { range: Range; placeholder: string } | ResponseError | null {
    const token = tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token?.kind !== SyntaxKind.IDENT) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    return parsed.rangeOf(token);
}

export function rename(
    db: FileDatabase,
    parsed: ParsedString,
    newName: string,
    pos: Position
): WorkspaceEdit | ResponseError | null {
    const token = tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token == undefined) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const def = findDefinitionFromToken(token, db);
    if (def === undefined || def instanceof GlobalSymbol) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const refs = findReferences(db, def);
    const changes: TextEdit[] = [{ range: parsed.rangeOf(def.decl.node.green), newText: newName }];
    for (const ref of refs) {
        changes.push({ range: parsed.rangeOf(ref.node.green), newText: newName });
    }

    return { changes: { [parsed.doc.uri]: changes } };
}
