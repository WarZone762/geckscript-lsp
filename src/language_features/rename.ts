import { tokenAtOffset } from "../geckscript/ast.js";
import { findDefFromToken, findRefs } from "../geckscript/hir/api.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { SyntaxKind } from "../geckscript/syntax_kind/generated.js";
import { ErrorCodes, ResponseError, WorkspaceEdit } from "vscode-languageserver";
import { Position, Range, TextEdit } from "vscode-languageserver-textdocument";

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
    parsed: ParsedString,
    newName: string,
    pos: Position
): WorkspaceEdit | ResponseError | null {
    const token = tokenAtOffset(parsed.root.green, parsed.offsetAt(pos));
    if (token == undefined) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const def = findDefFromToken(token);
    if (def == undefined) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const refs = findRefs(def);
    const changes: TextEdit[] = [{ range: parsed.rangeOf(def.green), newText: newName }];
    for (const ref of refs) {
        changes.push({ range: parsed.rangeOf(ref.green), newText: newName });
    }

    return { changes: { [parsed.doc.uri]: changes } };
}
