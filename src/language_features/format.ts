import { to_string } from "../geckscript/ast.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { SyntaxKind } from "../geckscript/syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "../geckscript/types/syntax_node.js";
import { FormattingOptions, TextEdit } from "vscode-languageserver";

function format_inline(node: Node, indent_level: number, indent_str: string) {
    const children: NodeOrToken[] = [];
    for (let i = 1; i < node.children.length; ++i) {
        const child = node.children[i - 1];
        if (child.kind === SyntaxKind.WHITESPACE) {
            continue;
        }

        children.push(child);
        if (
            child.kind === SyntaxKind.STMT_LIST ||
            child.kind === SyntaxKind.BRANCH ||
            node.children[i].kind === SyntaxKind.NEWLINE
        ) {
            continue;
        }

        const t = Token(SyntaxKind.WHITESPACE);
        if (child.kind === SyntaxKind.NEWLINE) {
            t.text = indent_str.repeat(Math.max(0, indent_level + 1));
        } else {
            t.text = " ";
        }
        children.push(t);
    }

    const last_child = node.children.at(-1);
    if (last_child != undefined && last_child.kind !== SyntaxKind.WHITESPACE) {
        children.push(last_child);
    }

    node.children = children;
}

function format_stmt_list(node: Node, indent_level: number, indent_str: string) {
    const children: NodeOrToken[] = [];
    for (let i = 1; i < node.children.length; ++i) {
        const child = node.children[i - 1];

        if (child.kind === SyntaxKind.WHITESPACE) {
            continue;
        } else if (
            child.kind === SyntaxKind.COMMENT &&
            children.at(-1)?.kind !== SyntaxKind.WHITESPACE
        ) {
            const last_child = node.children[i - 2];
            if (last_child?.kind === SyntaxKind.WHITESPACE) {
                children.push(last_child);
            } else {
                const t = Token(SyntaxKind.WHITESPACE);
                t.text = " ";
                children.push(t);
            }
        }

        children.push(child);
        if (child.kind !== SyntaxKind.NEWLINE) {
            continue;
        }

        const t = Token(SyntaxKind.WHITESPACE);
        t.text = indent_str.repeat(Math.max(0, indent_level));
        children.push(t);
    }

    const last_child = node.children.at(-1);
    if (last_child != undefined && last_child.kind !== SyntaxKind.WHITESPACE) {
        children.push(last_child);
        if (last_child.kind === SyntaxKind.NEWLINE) {
            const t = Token(SyntaxKind.WHITESPACE);
            t.text = indent_str.repeat(Math.max(0, indent_level - 1));
            children.push(t);
        }
    }

    node.children = children;
}

export function format_doc(parsed: ParsedString, opts: FormattingOptions): TextEdit[] | null {
    const edits: TextEdit[] = [];
    const indent_str = opts.insertSpaces ? " ".repeat(opts.tabSize) : "\t";

    let indent_level = -1;

    format_recursive(parsed.root.green);

    edits.push(TextEdit.replace(parsed.range_of(parsed.root.green), to_string(parsed.root.green)));

    return edits;

    function format_recursive(n: NodeOrToken) {
        if (!n.is_node()) {
            return;
        }

        switch (n.kind) {
            case SyntaxKind.STMT_LIST:
                format_stmt_list(n, indent_level, indent_str);
                break;
            default:
                format_inline(n, indent_level, indent_str);
        }
        for (const child of n.children) {
            if (child.kind === SyntaxKind.STMT_LIST) {
                ++indent_level;
            }
            format_recursive(child);
            if (child.kind === SyntaxKind.STMT_LIST) {
                --indent_level;
            }
        }
    }
}
