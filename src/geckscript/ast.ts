import { is_expr, is_stmt, SyntaxKind, syntax_kind_name } from "./syntax_kind/generated";
import { TreeData } from "./types/hir";
import { Node, Token, NodeOrToken } from "./types/syntax_node";


export function for_each_child(node: Node, func: (node: NodeOrToken) => any): void {
    for (const child of node.children) {
        func(child);
    }
}

export async function for_each_child_async(
    node: Node,
    func: (node: NodeOrToken) => any
): Promise<void> {
    for await (const child of node.children) {
        await func(child);
    }
}

export function for_each_child_recursive(
    root: Node,
    pre_func: (node: NodeOrToken) => any = () => undefined,
    post_func: (node: NodeOrToken) => any = () => undefined,
): void {
    for_each_child(root, node => {
        pre_func(node);
        if (node.is_node()) {
            for_each_child_recursive(node, pre_func, post_func);
        }
        post_func(node);
    });
}

export async function for_each_child_recuresive_async(
    root: Node,
    pre_func: (node: NodeOrToken) => any = () => undefined,
    post_func: (node: NodeOrToken) => any = () => undefined,
): Promise<void> {
    await for_each_child_async(root, async node => {
        await pre_func(node);
        if (node.is_node()) {
            await for_each_child_recuresive_async(node, pre_func, post_func);
        }
        await post_func(node);
    });
}

export function* descendants_df(node: NodeOrToken): Generator<NodeOrToken, void, void> {
    if (node.is_node()) {
        yield node;
        for (const child of node.children) {
            yield* descendants_df(child);
        }
    } else {
        yield node;
    }
}

export function* leafs(node: NodeOrToken): Generator<Token, void, void> {
    if (node.is_node()) {
        for (const child of node.children) {
            yield* leafs(child);
        }
    } else {
        yield node;
    }
}

export function* siblings(node: NodeOrToken): Generator<NodeOrToken, void, void> {
    if (node.parent != undefined) {
        for (const sibling of node.parent.children) {
            yield sibling;
        }
    } else {
        yield node;
    }
}

export function* ancestors(node: NodeOrToken): Generator<NodeOrToken, void, void> {
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

export function nearest_token(root: Node, offset: number): Token {
    const leafs_ = leafs(root);

    let last_leaf = leafs_.next().value!;
    for (const leaf of leafs_) {
        if (leaf.offset > offset) {
            return last_leaf;
        } else {
            last_leaf = leaf;
        }
    }

    return last_leaf;
}

export function token_at_pos(root: Node, offset: number): Token | undefined {
    for (const leaf of leafs(root)) {
        if (leaf.offset <= offset && offset < leaf.end()) {
            return leaf;
        }
    }

    return undefined;
}

export function* str_occurences(
    node: Node,
    str: string
): Generator<Token, void, void> {
    for (const leaf of leafs(node)) {
        if (leaf.text === str) {
            yield leaf;
        }
    }
}

export function get_text(node: Node): string {
    let text = "";

    for (const leaf of leafs(node)) {
        text += leaf.text;
    }

    return text;
}

// export function FindSymbolDeclarationBlock(
//   node: NodeOrToken,
//   name: string
// ): StatementList | undefined {
//   while (true) {
//     const parent = FindAncestor(node, node => node.kind === SyntaxKind.StatementList) as StatementList | undefined;

//     if (parent == undefined) {
//       break;
//     }

//     if (parent.symbol_table[name] != undefined) {
//       return parent;
//     }

//     if ("parent" in parent.parent) {
//       node = parent.parent;
//     } else {
//       break;
//     }
//   }

//   return undefined;
// }

// export async function ResolveSymbol(
//   node: AnyNodeWithParent,
//   name: string
// ): Promise<Symbol | undefined> {
//   const block = FindSymbolDeclarationBlock(node, name);

//   if (block != undefined) {
//     return block.symbol_table[name];
//   } else {
//     const script = FindAncestor(node, node => node.kind === SyntaxKind.Script)! as Script;
//     return script.environment.global_symbol_table[name] ??
//       await CreateGlobalFunctionSymbol(name.toLowerCase());
//   }
// }

// export function FindAllReferences(
//   scope: AnyNodeWithParent,
//   name: string
// ): Identifier[] {
//   const block = FindSymbolDeclarationBlock(scope, name);

//   if (block == undefined) {
//     return [];
//   }

//   const refs: Identifier[] = [];
//   const symbol = block.symbol_table[name];
//   const leafs = GetNodeLeafs(block);

//   for (const leaf of leafs) {
//     if (leaf.kind === SyntaxKind.Identifier && leaf.symbol === symbol) {
//       refs.push(leaf);
//     }
//   }

//   return refs;
// }

// export function GetVisibleSymbols(node: AnyNodeWithParent): SymbolTable {
//   const symbol_table: SymbolTable = {};

//   let last_node: AnyNode = node;

//   while (true) {
//     const parent = FindAncestor(last_node, node => node.kind === SyntaxKind.StatementList) as StatementList | undefined;
//     if (parent == undefined) {
//       break;
//     }
//     Object.assign(symbol_table, parent.symbol_table);
//     last_node = parent.parent;
//     if (!("parent" in last_node)) {
//       break;
//     }
//   }

//   Object.assign(
//     symbol_table,
//     (last_node as Script).environment.global_symbol_table
//   );

//   return symbol_table;
// }

// export function GetExpressionType(node: AnyNode): Type {
//   if (node.expression_type != undefined) {
//     return node.expression_type;
//   }

//   switch (node.kind) {
//     case SyntaxKind.Number:
//       if (node.content.includes(".")) {
//         node.expression_type = Type.Float;
//       } else {
//         node.expression_type = Type.Integer;
//       }

//       return node.expression_type!;

//     case SyntaxKind.String:
//       node.expression_type = Type.String;
//       return Type.String;

//     case SyntaxKind.BinaryExpresison: {
//       const lhs = GetExpressionType(node.children.lhs);
//       const rhs = GetExpressionType(node.children.rhs);

//       node.expression_type =
//         lhs === Type.Ambiguous ? rhs :
//           rhs === Type.Ambiguous ? lhs :
//             lhs === rhs ? lhs :
//               Type.Unknown;

//       return node.expression_type!;
//     }

//     case SyntaxKind.Identifier:
//     case SyntaxKind.FunctionExpression:
//       node.expression_type = Type.Ambiguous;
//       return Type.Ambiguous;

//     default: return Type.Unknown;
//   }
// }

// export function AssignNodeSymbol(
//   node: AnyNode,
//   symbol_table: SymbolTable,
//   global_symbol_table: SymbolTable,
// ): void {
//   switch (node.kind) {
//     case SyntaxKind.VariableDeclaration:
//       symbol_table[node.children.variable.content] = {
//         name: node.children.variable.content,
//         kind: SymbolKind.Variable,
//         declaration: node,
//         type: Type.Ambiguous,
//       };
//       break;

//     case SyntaxKind.Script:
//       symbol_table[node.children.name.content] = {
//         name: node.children.name.content,
//         kind: SymbolKind.Script,
//         declaration: node,
//         type: Type.Ambiguous,
//       };
//       break;

//     case SyntaxKind.BlockTypeFunction: {
//       const parent = node.parent;
//       if (parent.kind === SyntaxKind.BlockTypeExpression) {
//         const script = parent.parent.parent;
//         if (script.kind === SyntaxKind.Script) {
//           global_symbol_table[script.children.name.content] = {
//             name: script.children.name.content,
//             kind: SymbolKind.Function,
//             declaration: script,
//             type: Type.Ambiguous,
//           };
//         }
//       }
//       break;
//     }

//     default:
//       break;
//   }
// }

// export function BuildScriptSymbolTables(script: Script) {
//   let last_symbol_table: SymbolTable = script.environment.global_symbol_table;
//   let last_symbol_table_saved: SymbolTable;

//   ForEachChildRecursive(
//     script,
//     node => {
//       last_symbol_table_saved = last_symbol_table;

//       if (node.kind === SyntaxKind.StatementList) {
//         last_symbol_table = node.symbol_table;
//       } else {
//         AssignNodeSymbol(
//           node,
//           last_symbol_table,
//           script.environment.global_symbol_table
//         );
//       }
//     },
//     () => {
//       last_symbol_table = last_symbol_table_saved;
//     }
//   );
// }

// export async function ValidateNode(node: AnyNode, script: Script): Promise<void> {
//   switch (node.kind) {
//     case SyntaxKind.BinaryExpresison: {
//       const lhs = GetExpressionType(node.children.lhs);
//       const rhs = GetExpressionType(node.children.rhs);

//       if (
//         (lhs === rhs || lhs === Type.Ambiguous || rhs === Type.Ambiguous) &&
//         lhs !== Type.Unknown &&
//         rhs !== Type.Unknown
//       ) {
//         return;
//       } else {
//         script.diagnostics.push({
//           message: `Unexpected operand types: "${GetTypeName(lhs)}" and "${GetTypeName(rhs)}"`,
//           range: node.range
//         });
//       }

//       break;
//     }

//     case SyntaxKind.Identifier:
//       node.symbol = await ResolveSymbol(
//         node,
//         node.content
//       );

//       if (node.symbol == undefined) {
//         script.semantic_tokens.push(node);
//       }
//   }
// }

// export async function ValidateScript(script: Script): Promise<void> {
//   ForEachChildRecursiveAsync(
//     script,
//     async node => await ValidateNode(node, script)
//   );
// }

// debug TreeData stuff
export function to_tree_data(node: NodeOrToken): TreeData {  // TODO: add drawing data to the TreeData
    const tree_data: TreeData = new TreeData(
        (node.is_node() ? syntax_kind_name(node.kind) : `'${node.text}'`),
        [new TreeData("Range", [new TreeData(
            `${node.offset} - ${node.end()}`
        )])]
    );

    if (node.is_node()) {
        for_each_child(
            node,
            node => {
                tree_data.append(to_tree_data(node));
            }
        );
    }

    return tree_data;
}

export function to_html(  // TODO: Integrate this to tree-view
    root: NodeOrToken,
): string {
    function node_to_html(node: NodeOrToken): string {
        if (!node.is_node()) {
            return node.text;
        }

        let html = "";

        for (const child of node.children) {
            if (child.kind === SyntaxKind.NEWLINE) {
                html += "\n";
                continue;
            }

            const content = node_to_html(child);

            if (
                child.kind === SyntaxKind.STMT_LIST &&
                child.parent?.kind !== SyntaxKind.SCRIPT
            ) {
                html += "\t";
            }

            let class_ = syntax_kind_name(child.kind).replaceAll(" ", "-");

            if (is_stmt(child.kind)) {
                class_ = "statement";
            } else if (is_expr(child.kind)) {
                class_ = "expression";
            }

            html += `<span class="${class_}">${content}</span>`;
        }

        return html;
    }

    const style = "span { display: inline-block; border: black solid; } span.Statement { border: blue solid; } span.Expression { border: green solid; } span.Block { border: purple solid; } span.Branch { border: orange solid; } span.VariableDeclaration { border: brown solid; }";

    return `<style>${style}</style><pre><div>${node_to_html(root)}</div></pre>`;
}
