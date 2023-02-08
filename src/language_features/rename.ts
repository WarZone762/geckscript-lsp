import { token_at_offset } from "../geckscript/ast";
import { ParsedString } from "../geckscript/hir";
import { find_def_from_token, find_refs } from "../geckscript/hir/api";
import { SyntaxKind } from "../geckscript/syntax_kind/generated";
import { ErrorCodes, ResponseError, WorkspaceEdit } from "vscode-languageserver";
import { Position, Range, TextEdit } from "vscode-languageserver-textdocument";

export function prepare_rename(
    parsed: ParsedString,
    pos: Position
): Range | { range: Range; placeholder: string } | ResponseError | null {
    const token = token_at_offset(parsed.root.green, parsed.offset_at(pos));
    if (token?.kind !== SyntaxKind.IDENT) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    return parsed.range_of(token);
}

export function rename(
    parsed: ParsedString,
    new_name: string,
    pos: Position
): WorkspaceEdit | ResponseError | null {
    const token = token_at_offset(parsed.root.green, parsed.offset_at(pos));
    if (token == undefined) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const def = find_def_from_token(token);
    if (def == undefined) {
        return new ResponseError(ErrorCodes.InvalidRequest, "Cannont rename this");
    }

    const refs = find_refs(def);
    const changes: TextEdit[] = [{ range: parsed.range_of(def.green), newText: new_name }];
    for (const ref of refs) {
        changes.push({ range: parsed.range_of(ref.green), newText: new_name });
    }

    return { changes: { [parsed.doc.uri]: changes } };
}
