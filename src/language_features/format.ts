import { FormattingOptions, TextEdit } from "vscode-languageserver";

import { forEachChildRecursive, toString } from "../geckscript/ast.js";
import { ParsedString, ServerConfig } from "../geckscript/hir/hir.js";
import { SyntaxKind, isKeyword } from "../geckscript/syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "../geckscript/types/syntax_node.js";

export function formatDoc(
    parsed: ParsedString,
    opts: FormattingOptions,
    config: ServerConfig
): TextEdit[] | null {
    const f = new Formatter(parsed, { serverOpts: opts, keywordStyle: config.keywordStyle });

    return [f.format()];
}

class Formatter {
    parsed: ParsedString;
    pos: number = 0;
    opts: Options;
    indent: number = 0;
    indentStr: string;

    constructor(parsed: ParsedString, opts: Options) {
        this.parsed = parsed;
        this.opts = opts;

        this.indentStr = this.opts.serverOpts.insertSpaces
            ? " ".repeat(this.opts.serverOpts.tabSize)
            : "\t";
    }

    format(): TextEdit {
        forEachChildRecursive(
            this.parsed.root.green,
            (n) => {
                if (n.isNode()) {
                    if (n.kind === SyntaxKind.STMT_LIST) {
                        this.formatStmtList(n);
                        ++this.indent;
                    } else {
                        this.formatNode(n);
                    }
                } else {
                    this.formatToken(n);
                }
            },
            (n) => {
                if (n.kind === SyntaxKind.STMT_LIST) {
                    --this.indent;
                }
            }
        );

        return TextEdit.replace(
            this.parsed.rangeOf(this.parsed.root.green),
            toString(this.parsed.root.green)
        );
    }

    formatNode(n: Node) {
        const newChildren: NodeOrToken[] = [];

        for (let i = 0; i < n.children.length - 1; ++i) {
            const child = n.children[i];
            const next = n.children[i + 1];

            if (child.kind !== SyntaxKind.WHITESPACE) {
                newChildren.push(child);
                if (
                    !isAny(
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
                    newChildren.push(t);
                } else if (
                    child.kind === SyntaxKind.STMT_LIST ||
                    child.kind === SyntaxKind.BRANCH
                ) {
                    const t = Token(SyntaxKind.WHITESPACE);
                    t.text = this.indentStr.repeat(this.indent - 1);
                    newChildren.push(t);
                }
            }
        }

        if (n.children.length > 0) {
            newChildren.push(n.children.at(-1)!);
        }

        n.children = newChildren;

        function isAny(
            n1: NodeOrToken,
            n2: NodeOrToken,
            predicate: (n: NodeOrToken) => boolean
        ): boolean {
            return predicate(n1) || predicate(n2);
        }
    }

    formatStmtList(n: Node<SyntaxKind.STMT_LIST>) {
        const newChildren: NodeOrToken[] = [];

        for (const [i, child] of n.children.entries()) {
            if (child.kind === SyntaxKind.COMMENT) {
                if (i !== 0 && n.children[i - 1].kind === SyntaxKind.WHITESPACE) {
                    newChildren.push(n.children[i - 1]);
                } else {
                    const t = Token(SyntaxKind.WHITESPACE);
                    t.text = " ";
                    newChildren.push(t);
                }
                newChildren.push(child);
            } else if (child.kind !== SyntaxKind.WHITESPACE) {
                if (child.kind !== SyntaxKind.NEWLINE) {
                    const t = Token(SyntaxKind.WHITESPACE);
                    t.text = this.indentStr.repeat(this.indent);
                    newChildren.push(t);
                }
                newChildren.push(child);
            }
        }

        n.children = newChildren;
    }

    formatToken(t: Token) {
        if (isKeyword(t.kind)) {
            switch (this.opts.keywordStyle) {
                case KeywordStyle.LOWER:
                    t.text = t.text.toLowerCase();
                    break;
                case KeywordStyle.UPPER:
                    t.text = t.text.toUpperCase();
                    break;
                case KeywordStyle.CAPITAL:
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

interface Options {
    serverOpts: FormattingOptions;
    keywordStyle: KeywordStyle;
}

export const enum KeywordStyle {
    LOWER,
    UPPER,
    CAPITAL,
}
