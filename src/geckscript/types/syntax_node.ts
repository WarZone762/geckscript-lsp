import { SyntaxKind, TokenSyntaxKind, NodeSyntaxKind } from "../syntax_kind/generated.js";

export abstract class NodeCommon<T extends SyntaxKind> {
    kind: T;
    offset = 0;
    parent?: Node;

    constructor(kind: T) {
        this.kind = kind;
    }

    abstract isNode(): this is Node;
    abstract len(): number;
    abstract end(): number;
}

class TokenImpl<T extends TokenSyntaxKind = TokenSyntaxKind> extends NodeCommon<T> {
    text = "";

    isNode(): this is Node {
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
    textLen = 0;
    children: NodeOrToken[] = [];

    isNode(): this is Node {
        return true;
    }

    len(): number {
        return this.textLen;
    }

    end(): number {
        return this.offset + this.textLen;
    }
}

export type NodeOrToken<T extends SyntaxKind = SyntaxKind> = T extends TokenSyntaxKind
    ? TokenImpl<T>
    : T extends NodeSyntaxKind
    ? NodeImpl<T>
    : never;
export type Token<T extends TokenSyntaxKind = TokenSyntaxKind> = NodeOrToken<T>;
export function Token<T extends TokenSyntaxKind>(kind: T): Token<T> {
    return new TokenImpl(kind) as Token<T>;
}
export type Node<T extends NodeSyntaxKind = NodeSyntaxKind> = NodeOrToken<T>;
export function Node<T extends NodeSyntaxKind>(kind: T): Node<T> {
    return new NodeImpl(kind) as Node<T>;
}
