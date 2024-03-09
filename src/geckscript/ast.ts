import { Script } from "./ast/generated.js";
import { SyntaxKind, syntaxKindName } from "./syntax_kind/generated.js";
import { Node, NodeOrToken, Token } from "./types/syntax_node.js";

export function forEachChild(node: Node, func: (node: NodeOrToken) => unknown): void {
    for (const child of node.children) {
        func(child);
    }
}

export function forEachChildRecursive(
    root: Node,
    preFunc: (node: NodeOrToken) => unknown = () => undefined,
    postFunc: (node: NodeOrToken) => unknown = () => undefined
): void {
    forEachChild(root, (node) => {
        preFunc(node);
        if (node.isNode()) {
            forEachChildRecursive(node, preFunc, postFunc);
        }
        postFunc(node);
    });
}

export function* descendantsDf(node: NodeOrToken): Generator<NodeOrToken> {
    if (node.isNode()) {
        yield node;
        for (const child of node.children) {
            yield* descendantsDf(child);
        }
    } else {
        yield node;
    }
}

export function* leafs(node: NodeOrToken): Generator<Token> {
    if (node.isNode()) {
        for (const child of node.children) {
            yield* leafs(child);
        }
    } else {
        yield node;
    }
}

export function* siblings(node: NodeOrToken): Generator<NodeOrToken> {
    if (node.parent != undefined) {
        for (const sibling of node.parent.children) {
            yield sibling;
        }
    } else {
        yield node;
    }
}

export function indexInParent(node: NodeOrToken): number | undefined {
    if (node.parent == undefined) {
        return undefined;
    }

    for (let i = 0; i < node.parent.children.length; ++i) {
        if (node.parent.children[i] === node) {
            return i;
        }
    }
}

export function prevSibling(node: NodeOrToken): NodeOrToken | undefined {
    const i = indexInParent(node);
    if (i == undefined) {
        return undefined;
    }

    return node.parent?.children[i - 1];
}

export function nextSibling(node: NodeOrToken): NodeOrToken | undefined {
    const i = indexInParent(node);
    if (i == undefined) {
        return undefined;
    }

    return node.parent?.children[i + 1];
}

export function prevNodeDf(node: NodeOrToken): NodeOrToken | undefined {
    let child = prevSibling(node);
    if (child == undefined) {
        return node.parent;
    }

    while (true) {
        if (!child.isNode() || child.children.at(-1) == undefined) {
            return child;
        }
        child = child.children.at(-1)!;
    }
}

export function nextNodeDf(node: NodeOrToken): NodeOrToken | undefined {
    if (node.isNode() && node.children[0] != undefined) {
        return node.children[0];
    }

    let parent: NodeOrToken | undefined = node;
    let ns = nextSibling(node);
    while (true) {
        if (ns != undefined) {
            return ns;
        }
        parent = parent.parent;
        if (parent == undefined) {
            return undefined;
        }
        ns = nextSibling(parent);
    }
}

export function prevToken(token: Token): Token | undefined {
    let prev = prevNodeDf(token);
    while (prev != undefined) {
        if (!prev.isNode()) {
            return prev;
        }
        prev = prevNodeDf(prev);
    }
}

export function nextToken(token: Token): Token | undefined {
    let next = nextNodeDf(token);
    while (next != undefined) {
        if (!next.isNode()) {
            return next;
        }
        next = nextNodeDf(next);
    }
}

export function root(node: NodeOrToken): Script | undefined {
    const root = findAncestor(node, (n) => n.kind === SyntaxKind.SCRIPT && n.parent === undefined);
    if (root !== undefined) {
        return new Script(root as Node<SyntaxKind.SCRIPT>);
    }
}

export function* ancestors(node: NodeOrToken): Generator<NodeOrToken> {
    yield node;
    while (node.parent != undefined) {
        yield node.parent;
        node = node.parent;
    }
}

export function findAncestor(
    node: NodeOrToken,
    predicate: (node: NodeOrToken) => boolean
): NodeOrToken | undefined {
    for (const ancestor of ancestors(node)) {
        if (predicate(ancestor)) {
            return ancestor;
        }
    }

    return undefined;
}

export function nearestToken(root: Node, offset: number): Token | undefined {
    const leafs_ = leafs(root);

    let lastLeaf = leafs_.next().value;
    for (const leaf of leafs_) {
        if (leaf.offset > offset) {
            return lastLeaf;
        } else {
            lastLeaf = leaf;
        }
    }

    return lastLeaf;
}

export function tokenAtOffset(root: Node, offset: number): Token | undefined {
    for (const leaf of leafs(root)) {
        if (leaf.offset <= offset && offset < leaf.end()) {
            return leaf;
        }
    }

    return undefined;
}

export function* strOccurences(node: Node, str: string): Generator<Token> {
    for (const leaf of leafs(node)) {
        if (leaf.text === str) {
            yield leaf;
        }
    }
}

export function toString(node: Node): string {
    let text = "";

    for (const leaf of leafs(node)) {
        text += leaf.text;
    }

    return text;
}

export class TreeData {
    name: string;
    children: TreeData[];

    constructor(name: string, children: TreeData[] = []) {
        this.name = name;
        this.children = children;
    }

    append(child: TreeData) {
        this.children.push(child);
    }

    concat(children: TreeData[]) {
        this.children = this.children.concat(children);
    }

    setRange(start: number, end: number) {
        this.children.unshift(new TreeData("Range", [new TreeData(`${start}..${end}`)]));
    }
}

export function toDebug(node: Node, filter: Set<SyntaxKind> = new Set()): string {
    let indent = 0;

    return toDebugRecursive(node, filter);

    function toDebugRecursive(node: Node, filter: Set<SyntaxKind>): string {
        let text = `${"  ".repeat(indent)}${syntaxKindName(node.kind)} ${
            node.offset
        }..${node.end()}\n`;
        ++indent;
        for (const child of node.children) {
            if (filter.has(child.kind)) {
                continue;
            }

            if (child.isNode()) {
                text += toDebugRecursive(child, filter);
            } else {
                text += `${"  ".repeat(indent)}${syntaxKindName(child.kind)} ${
                    child.offset
                }..${child.end()} ${JSON.stringify(child.text)}\n`;
            }
        }
        --indent;

        return text;
    }
}

export function toTreeData(node: NodeOrToken): TreeData {
    // TODO: add drawing data to the TreeData
    const treeData: TreeData = new TreeData(
        node.isNode() ? syntaxKindName(node.kind) : JSON.stringify(node.text)
    );
    treeData.setRange(node.offset, node.end());

    if (node.isNode()) {
        forEachChild(node, (node) => {
            treeData.append(toTreeData(node));
        });
    }

    return treeData;
}
