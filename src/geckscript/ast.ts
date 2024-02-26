import { SyntaxKind, syntax_kind_name } from "./syntax_kind/generated.js";
import { Node, Token, NodeOrToken } from "./types/syntax_node.js";

export function for_each_child(node: Node, func: (node: NodeOrToken) => unknown): void {
    for (const child of node.children) {
        func(child);
    }
}

export function for_each_child_recursive(
    root: Node,
    pre_func: (node: NodeOrToken) => unknown = () => undefined,
    post_func: (node: NodeOrToken) => unknown = () => undefined
): void {
    for_each_child(root, (node) => {
        pre_func(node);
        if (node.is_node()) {
            for_each_child_recursive(node, pre_func, post_func);
        }
        post_func(node);
    });
}

export function* descendants_df(node: NodeOrToken): Generator<NodeOrToken> {
    if (node.is_node()) {
        yield node;
        for (const child of node.children) {
            yield* descendants_df(child);
        }
    } else {
        yield node;
    }
}

export function* leafs(node: NodeOrToken): Generator<Token> {
    if (node.is_node()) {
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

export function index_in_parent(node: NodeOrToken): number | undefined {
    if (node.parent == undefined) {
        return undefined;
    }

    for (let i = 0; i < node.parent.children.length; ++i) {
        if (node.parent.children[i] === node) {
            return i;
        }
    }
}

export function prev_sibling(node: NodeOrToken): NodeOrToken | undefined {
    const i = index_in_parent(node);
    if (i == undefined) {
        return undefined;
    }

    return node.parent?.children[i - 1];
}

export function next_sibling(node: NodeOrToken): NodeOrToken | undefined {
    const i = index_in_parent(node);
    if (i == undefined) {
        return undefined;
    }

    return node.parent?.children[i + 1];
}

export function prev_node_df(node: NodeOrToken): NodeOrToken | undefined {
    let child = prev_sibling(node);
    if (child == undefined) {
        return node.parent;
    }

    while (true) {
        if (!child.is_node() || child.children.at(-1) == undefined) {
            return child;
        }
        child = child.children.at(-1)!;
    }
}

export function next_node_df(node: NodeOrToken): NodeOrToken | undefined {
    if (node.is_node() && node.children[0] != undefined) {
        return node.children[0];
    }

    let parent: NodeOrToken | undefined = node;
    let ns = next_sibling(node);
    while (true) {
        if (ns != undefined) {
            return ns;
        }
        parent = parent.parent;
        if (parent == undefined) {
            return undefined;
        }
        ns = next_sibling(parent);
    }
}

export function prev_token(token: Token): Token | undefined {
    let prev = prev_node_df(token);
    while (prev != undefined) {
        if (!prev.is_node()) {
            return prev;
        }
        prev = prev_node_df(prev);
    }
}

export function next_token(token: Token): Token | undefined {
    let next = next_node_df(token);
    while (next != undefined) {
        if (!next.is_node()) {
            return next;
        }
        next = next_node_df(next);
    }
}

export function* ancestors(node: NodeOrToken): Generator<NodeOrToken> {
    yield node;
    while (node.parent != undefined) {
        yield node.parent;
        node = node.parent;
    }
}

export function find_ancestor(
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

export function nearest_token(root: Node, offset: number): Token | undefined {
    const leafs_ = leafs(root);

    let last_leaf = leafs_.next().value;
    for (const leaf of leafs_) {
        if (leaf.offset > offset) {
            return last_leaf;
        } else {
            last_leaf = leaf;
        }
    }

    return last_leaf;
}

export function token_at_offset(root: Node, offset: number): Token | undefined {
    for (const leaf of leafs(root)) {
        if (leaf.offset <= offset && offset < leaf.end()) {
            return leaf;
        }
    }

    return undefined;
}

export function* str_occurences(node: Node, str: string): Generator<Token> {
    for (const leaf of leafs(node)) {
        if (leaf.text === str) {
            yield leaf;
        }
    }
}

export function to_string(node: Node): string {
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

    set_range(start: number, end: number) {
        this.children.unshift(new TreeData("Range", [new TreeData(`${start}..${end}`)]));
    }
}

export function to_debug(node: Node, filter: Set<SyntaxKind> = new Set()): string {
    let indent = 0;

    return to_debug_recursive(node, filter);

    function to_debug_recursive(node: Node, filter: Set<SyntaxKind>): string {
        let text = `${"  ".repeat(indent)}${syntax_kind_name(node.kind)} ${
            node.offset
        }..${node.end()}\n`;
        ++indent;
        for (const child of node.children) {
            if (filter.has(child.kind)) {
                continue;
            }

            if (child.is_node()) {
                text += to_debug_recursive(child, filter);
            } else {
                text += `${"  ".repeat(indent)}${syntax_kind_name(child.kind)} ${
                    child.offset
                }..${child.end()} ${JSON.stringify(child.text)}\n`;
            }
        }
        --indent;

        return text;
    }
}

export function to_tree_data(node: NodeOrToken): TreeData {
    // TODO: add drawing data to the TreeData
    const tree_data: TreeData = new TreeData(
        node.is_node() ? syntax_kind_name(node.kind) : JSON.stringify(node.text)
    );
    tree_data.set_range(node.offset, node.end());

    if (node.is_node()) {
        for_each_child(node, (node) => {
            tree_data.append(to_tree_data(node));
        });
    }

    return tree_data;
}
