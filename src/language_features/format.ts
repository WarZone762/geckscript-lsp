import { for_each_child_recursive, to_string } from "../geckscript/ast.js";
import { ParsedString } from "../geckscript/hir/hir.js";
import { SyntaxKind, is_keyword } from "../geckscript/syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "../geckscript/types/syntax_node.js";
import { FormattingOptions, TextEdit } from "vscode-languageserver";

export function format_doc(parsed: ParsedString, opts: FormattingOptions): TextEdit[] | null {
    const b = new Builder(parsed, new Options(opts, KeywordCase.UPPER));

    return [b.format()];
}

class Builder {
    parsed: ParsedString;
    pos: number = 0;
    opts: Options;
    indent: number = 0;
    indent_str: string;
    last_whitespace: Token<SyntaxKind.WHITESPACE> | undefined;

    constructor(parsed: ParsedString, opts?: Options) {
        this.parsed = parsed;
        this.opts = opts ?? new Options();

        this.indent_str = this.opts.server_opts.insertSpaces
            ? " ".repeat(this.opts.server_opts.tabSize)
            : "\t";
    }

    format(): TextEdit {
        for_each_child_recursive(
            this.parsed.root.green,
            (n) => {
                if (n.is_node()) {
                    if (n.kind === SyntaxKind.STMT_LIST) {
                        this.format_stmt_list(n);
                        ++this.indent;
                    } else {
                        this.format_node(n);
                    }
                } else {
                    if (n.kind === SyntaxKind.WHITESPACE) {
                        this.last_whitespace = n;
                    }
                    this.format_token(n);
                }
            },
            (n) => {
                if (n.kind === SyntaxKind.STMT_LIST) {
                    --this.indent;
                }
            }
        );

        return TextEdit.replace(
            this.parsed.range_of(this.parsed.root.green),
            to_string(this.parsed.root.green)
        );
    }

    format_node(n: Node) {
        const new_children: NodeOrToken[] = [];

        for (let i = 0; i < n.children.length - 1; ++i) {
            const child = n.children[i];
            const next = n.children[i + 1];

            if (child.kind !== SyntaxKind.WHITESPACE) {
                new_children.push(child);
                if (
                    !is_any(
                        child,
                        next,
                        (n) =>
                            n.kind === SyntaxKind.NEWLINE ||
                            n.kind === SyntaxKind.STMT_LIST ||
                            n.kind === SyntaxKind.BRANCH ||
                            n.kind === SyntaxKind.LPAREN ||
                            n.kind === SyntaxKind.RPAREN ||
                            n.kind === SyntaxKind.LBRACK ||
                            n.kind === SyntaxKind.RBRACK ||
                            n.kind === SyntaxKind.LSQBRACK ||
                            n.kind === SyntaxKind.RSQBRACK ||
                            n.kind === SyntaxKind.COLON2 ||
                            n.kind === SyntaxKind.DOT ||
                            n.kind === SyntaxKind.RARROW
                    )
                ) {
                    const t = Token(SyntaxKind.WHITESPACE);
                    t.text = " ";
                    new_children.push(t);
                } else if (
                    child.kind === SyntaxKind.STMT_LIST ||
                    child.kind === SyntaxKind.BRANCH
                ) {
                    const t = Token(SyntaxKind.WHITESPACE);
                    t.text = this.indent_str.repeat(this.indent - 1);
                    new_children.push(t);
                }
            }
        }

        if (n.children.length > 0) {
            new_children.push(n.children.at(-1)!);
        }

        n.children = new_children;

        function is_any(
            n1: NodeOrToken,
            n2: NodeOrToken,
            predicate: (n: NodeOrToken) => boolean
        ): boolean {
            return predicate(n1) || predicate(n2);
        }
    }

    format_stmt_list(n: Node<SyntaxKind.STMT_LIST>) {
        const new_children: NodeOrToken[] = [];

        for (const [i, child] of n.children.entries()) {
            if (child.kind === SyntaxKind.COMMENT) {
                if (i !== 0 && n.children[i - 1].kind === SyntaxKind.WHITESPACE) {
                    new_children.push(n.children[i - 1]);
                } else {
                    const t = Token(SyntaxKind.WHITESPACE);
                    t.text = " ";
                    new_children.push(t);
                }
                new_children.push(child);
            } else if (child.kind !== SyntaxKind.WHITESPACE) {
                if (child.kind !== SyntaxKind.NEWLINE) {
                    const t = Token(SyntaxKind.WHITESPACE);
                    t.text = this.indent_str.repeat(this.indent);
                    new_children.push(t);
                }
                new_children.push(child);
            }
        }

        n.children = new_children;
    }

    format_token(t: Token) {
        if (is_keyword(t.kind)) {
            switch (this.opts.keyword_case) {
                case KeywordCase.LOWER:
                    t.text = t.text.toLowerCase();
                    break;
                case KeywordCase.UPPER:
                    t.text = t.text.toUpperCase();
                    break;
                case KeywordCase.CAPITAL:
                    t.text = t.text.toLowerCase();
                    t.text = t.text[0].toUpperCase() + t.text.substring(1);
                    break;
            }
        }
    }

    next() {
        this.pos++;
    }
}

class Options {
    server_opts: FormattingOptions;
    keyword_case: KeywordCase;

    constructor(server_opts?: FormattingOptions, keyword_case?: KeywordCase) {
        this.server_opts = server_opts ?? FormattingOptions.create(4, true);
        this.keyword_case = keyword_case ?? KeywordCase.LOWER;
    }
}

const enum KeywordCase {
    LOWER,
    UPPER,
    CAPITAL,
}

// export function format_doc(parsed: ParsedString, opts: FormattingOptions): TextEdit[] | null {
//     const edits: TextEdit[] = [];
//     const indent_str = opts.insertSpaces ? " ".repeat(opts.tabSize) : "\t";
//
//     let indent_level = -1;
//
//     format_recursive(parsed.root.green);
//
//     edits.push(TextEdit.replace(parsed.range_of(parsed.root.green), to_string(parsed.root.green)));
//
//     return edits;
//
//     function format_recursive(n: NodeOrToken) {
//         if (!n.is_node()) {
//             return;
//         }
//
//         switch (n.kind) {
//             case SyntaxKind.STMT_LIST:
//                 format_stmt_list(n, indent_level, indent_str);
//                 break;
//             default:
//                 format_inline(n, indent_level, indent_str);
//         }
//         for (const child of n.children) {
//             if (child.kind === SyntaxKind.STMT_LIST) {
//                 ++indent_level;
//             }
//             format_recursive(child);
//             if (child.kind === SyntaxKind.STMT_LIST) {
//                 --indent_level;
//             }
//         }
//     }
// }

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
