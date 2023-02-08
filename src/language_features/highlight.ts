import * as ast from "../geckscript/ast";
import { Name, NameRef } from "../geckscript/ast/generated";
import { ParsedString } from "../geckscript/hir";
import { find_def, find_refs } from "../geckscript/hir/api";
import { SyntaxKind } from "../geckscript/syntax_kind/generated";
import { Token } from "../geckscript/types/syntax_node";
import { DocumentHighlight, DocumentHighlightKind } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";

function highlight(
    parsed: ParsedString,
    token: Token,
    kind: DocumentHighlightKind
): DocumentHighlight {
    return {
        range: {
            start: parsed.pos_at(token.offset),
            end: parsed.pos_at(token.end()),
        },
        kind: kind,
    };
}

export function get_highlight(parsed: ParsedString, pos: Position): DocumentHighlight[] | null {
    const highlights: DocumentHighlight[] = [];

    const token = ast.token_at_offset(parsed.root.green, parsed.offset_at(pos));
    if (token == undefined) {
        return null;
    }

    let def: Name | undefined;
    if (token.parent?.kind === SyntaxKind.NAME_REF) {
        def = find_def(new NameRef(token.parent));
    } else if (token.parent?.kind === SyntaxKind.NAME) {
        def = new Name(token.parent);
    }

    if (def != undefined) {
        highlights.push(highlight(parsed, def.name()!, DocumentHighlightKind.Text));
        for (const ref of find_refs(def)) {
            highlights.push(highlight(parsed, ref.name_ref()!, DocumentHighlightKind.Text));
        }
    } else {
        for (const e of ast.str_occurences(parsed.root.green, token.text)) {
            highlights.push(highlight(parsed, e, DocumentHighlightKind.Text));
        }
    }

    return highlights;
}
