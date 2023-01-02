import { SyntaxKind, TokenSyntaxKind, NodeSyntaxKind } from "../syntax_kind/generated";

export abstract class NodeCommon<T extends SyntaxKind> {
    kind: T;
    offset = 0;
    parent?: Node;

    constructor(kind: T) {
        this.kind = kind;
    }

    abstract is_node(): this is Node;
    abstract len(): number;
    abstract end(): number;
}

class TokenImpl<T extends TokenSyntaxKind = TokenSyntaxKind> extends NodeCommon<T> {
    text = "";

    is_node(): this is Node {
        return false;
    }

    len(): number {
        return this.text.length;
    }

    end(): number {
        return this.offset + this.text.length;
    }
}

class NodeImpl<T extends NodeSyntaxKind = NodeSyntaxKind> extends NodeCommon<T> {
    text_len = 0;
    children: NodeOrToken[] = [];

    is_node(): this is Node {
        return true;
    }

    len(): number {
        return this.text_len;
    }

    end(): number {
        return this.offset + this.text_len;
    }

    token<T extends TokenSyntaxKind>(kind: T, idx = 0): TokenImpl<T> | undefined {
        for (const child of this.children) {
            if (child.kind === kind) {
                if (idx > 0) {
                    --idx;
                } else {
                    return child as TokenImpl<T>;
                }
            }
        }
    }

    token_pred<T extends TokenSyntaxKind>(predicate: (kind: SyntaxKind) => kind is T, idx = 0): TokenImpl<T> | undefined {
        for (const child of this.children) {
            if (predicate(child.kind)) {
                if (idx > 0) {
                    --idx;
                } else {
                    return child as TokenImpl<T>;
                }
            }
        }
    }

    child<T extends NodeSyntaxKind>(kind: T, idx = 0): NodeImpl<T> | undefined {
        for (const child of this.children) {
            if (child.kind == kind) {
                if (idx > 0) {
                    --idx;
                } else {
                    return child as NodeImpl<T>;
                }
            }
        }
    }


    child_pred<T extends NodeSyntaxKind>(predicate: (kind: SyntaxKind) => kind is T, idx = 0): NodeImpl<T> | undefined {
        for (const child of this.children) {
            if (predicate(child.kind)) {
                if (idx > 0) {
                    --idx;
                } else {
                    return child as NodeImpl<T>;
                }
            }
        }
    }
}

export type NodeOrToken<T extends SyntaxKind = SyntaxKind> = T extends TokenSyntaxKind ? TokenImpl<T> : T extends NodeSyntaxKind ? NodeImpl<T> : never;
export type Token<T extends TokenSyntaxKind = TokenSyntaxKind> = NodeOrToken<T>;
export function Token<T extends TokenSyntaxKind>(kind: T): Token<T> {
    return new TokenImpl(kind) as Token<T>;
}
export type Node<T extends NodeSyntaxKind = NodeSyntaxKind> = NodeOrToken<T>;
export function Node<T extends NodeSyntaxKind>(kind: T): Node<T> {
    return new NodeImpl(kind) as Node<T>;
}
