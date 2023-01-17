import { syntax_kind_name } from "./syntax_kind/generated";
import { Node, Token, NodeOrToken } from "./types/syntax_node";

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

export function to_tree_data(node: NodeOrToken): TreeData {
    // TODO: add drawing data to the TreeData
    const tree_data: TreeData = new TreeData(
        node.is_node() ? syntax_kind_name(node.kind) : `'${node.text}'`
    );
    tree_data.set_range(node.offset, node.end());

    if (node.is_node()) {
        for_each_child(node, (node) => {
            tree_data.append(to_tree_data(node));
        });
    }

    return tree_data;
}
