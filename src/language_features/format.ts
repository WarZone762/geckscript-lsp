import { for_each_child_recursive, prev_token } from "../geckscript/ast";
import { ParsedString } from "../geckscript/hir";
import { SyntaxKind } from "../geckscript/syntax_kind/generated";
import { FormattingOptions, TextEdit } from "vscode-languageserver";

export function format_doc(parsed: ParsedString, opts: FormattingOptions): TextEdit[] | null {
    const edits: TextEdit[] = [];
    const indent_str = opts.insertSpaces ? " ".repeat(opts.tabSize) : "\t";

    let indent_level = 0;

    for_each_child_recursive(
        parsed.root.green,
        (n) => {
            if (n.kind === SyntaxKind.STMT_LIST) {
                ++indent_level;
            } else if (n.kind === SyntaxKind.WHITESPACE) {
                const prev = prev_token(n);
                if (prev == undefined || prev.kind === SyntaxKind.NEWLINE) {
                    edits.push(
                        TextEdit.replace(
                            { start: parsed.pos_at(n.offset), end: parsed.pos_at(n.end()) },
                            indent_str.repeat(indent_level - 1)
                        )
                    );
                }
            }
        },
        (n) => {
            if (n.kind === SyntaxKind.STMT_LIST) {
                --indent_level;
            }
        }
    );

    return edits;
}
