import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { CreateGlobalFunctionSymbol } from "./function_data";
import {
  SyntaxKind,
  Node,
  Token,
  StatementList,
  Script,
  TreeData,
  Type,
  GetTypeName,
  Symbol,
  SymbolTable,
  SymbolKind,
  NodeWithChildren,
  NodeWithParent,
  Identifier,
} from "./types";


export function ForEachChild(node: NodeWithChildren, func: (node: NodeWithParent) => any): void {
  for (const child of Object.values(node.children)) {
    if (child != undefined) {
      func(child);
    }
  }
}

export async function ForEachChildAsync(
  node: NodeWithChildren,
  func: (node: NodeWithParent) => any
): Promise<void> {
  for await (const child of Object.values(node.children)) {
    if (child != undefined) {
      await func(child);
    }
  }
}

export function ForEachChildRecursive(
  root: NodeWithChildren,
  pre_func: (node: NodeWithParent) => any = () => undefined,
  post_func: (node: NodeWithParent) => any = () => undefined,
): void {
  ForEachChild(root, node => {
    pre_func(node);
    if ("children" in node) {
      ForEachChildRecursive(node, pre_func, post_func);
    }
    post_func(node);
  });
}

export async function ForEachChildRecursiveAsync(
  root: NodeWithChildren,
  pre_func: (node: NodeWithParent) => any = () => undefined,
  post_func: (node: NodeWithParent) => any = () => undefined,
): Promise<void> {
  await ForEachChildAsync(root, async node => {
    await pre_func(node);
    if ("children" in node) {
      await ForEachChildRecursiveAsync(node, pre_func, post_func);
    }
    await post_func(node);
  });
}

export function GetNodeLeafs(node: NodeWithChildren): Node[] {
  const leafs: NodeWithParent[] = [];

  ForEachChildRecursive(
    node,
    node => {
      if (!("children" in node) || node.children.length === 0) {
        leafs.push(node);
      }
    }
  );

  return leafs;
}

export function FindAncestor(
  node: NodeWithParent,
  predicate: (node: Node) => boolean
): Node | undefined {
  let ancestor: Node = node;

  while (true) {
    if (predicate(ancestor)) {
      return ancestor;
    }

    if ("parent" in ancestor) {
      ancestor = ancestor.parent;
    } else {
      return undefined;
    }
  }
}

export function GetNearestToken(root: NodeWithChildren, position: Position): Node {
  const leafs = GetNodeLeafs(root);

  let last_leaf = leafs[0];
  for (const leaf of leafs) {
    if (
      leaf.range.start.line > position.line ||
      (
        leaf.range.start.line === position.line &&
        leaf.range.start.character > position.character
      )
    ) {
      break;
    } else {
      last_leaf = leaf;
    }
  }

  return last_leaf;
}

export function GetTokenAtPosition(root: NodeWithChildren, position: Position): Node | undefined {
  const leafs = GetNodeLeafs(root);

  for (const leaf of leafs) {
    if (
      leaf.range.start.line <= position.line &&
      position.line <= leaf.range.end.line &&
      leaf.range.start.character <= position.character &&
      position.character <= leaf.range.end.character
    ) {
      return leaf;
    }
  }

  return undefined;
}

export function FindSymbolDeclarationBlock(
  node: NodeWithParent,
  name: string
): StatementList | undefined {
  while (true) {
    const parent = FindAncestor(node, node => node.kind === SyntaxKind.StatementList) as StatementList | undefined;

    if (parent == undefined) {
      break;
    }

    if (parent.symbol_table[name] != undefined) {
      return parent;
    }

    if ("parent" in parent.parent) {
      node = parent.parent;
    } else {
      break;
    }
  }

  return undefined;
}

export async function ResolveSymbol(
  node: NodeWithParent,
  name: string
): Promise<Symbol | undefined> {
  const block = FindSymbolDeclarationBlock(node, name);

  if (block != undefined) {
    return block.symbol_table[name];
  } else {
    const script = FindAncestor(node, node => node.kind === SyntaxKind.Script)! as Script;
    return script.environment.global_symbol_table[name] ??
      await CreateGlobalFunctionSymbol(name.toLowerCase());
  }
}

export function FindAllOccurrencesOfText(
  root: NodeWithChildren,
  text: string
): Node[] {
  const occurrences: Node[] = [];
  const leafs = GetNodeLeafs(root);

  for (const leaf of leafs) {
    if ((leaf as Token).content === text) {
      occurrences.push(leaf);
    }
  }

  return occurrences;
}

export function FindAllReferences(
  scope: NodeWithParent,
  name: string
): Identifier[] {
  const block = FindSymbolDeclarationBlock(scope, name);

  if (block == undefined) {
    return [];
  }

  const refs: Identifier[] = [];
  const symbol = block.symbol_table[name];
  const leafs = GetNodeLeafs(block);

  for (const leaf of leafs) {
    if (leaf.kind === SyntaxKind.Identifier && leaf.symbol === symbol) {
      refs.push(leaf);
    }
  }

  return refs;
}

export function GetVisibleSymbols(node: NodeWithParent): SymbolTable {
  const symbol_table: SymbolTable = {};

  let last_node: Node = node;

  while (true) {
    const parent = FindAncestor(last_node, node => node.kind === SyntaxKind.StatementList) as StatementList | undefined;
    if (parent == undefined) {
      break;
    }
    Object.assign(symbol_table, parent.symbol_table);
    last_node = parent.parent;
    if (!("parent" in last_node)) {
      break;
    }
  }

  Object.assign(
    symbol_table,
    (last_node as Script).environment.global_symbol_table
  );

  return symbol_table;
}

export function GetExpressionType(node: Node): Type {
  if (node.expression_type != undefined) {
    return node.expression_type;
  }

  switch (node.kind) {
    case SyntaxKind.Number:
      if (node.content.includes(".")) {
        node.expression_type = Type.Float;
      } else {
        node.expression_type = Type.Integer;
      }

      return node.expression_type!;

    case SyntaxKind.String:
      node.expression_type = Type.String;
      return Type.String;

    case SyntaxKind.BinaryExpresison: {
      const lhs = GetExpressionType(node.children.lhs);
      const rhs = GetExpressionType(node.children.rhs);

      node.expression_type =
        lhs === Type.Ambiguous ? rhs :
          rhs === Type.Ambiguous ? lhs :
            lhs === rhs ? lhs :
              Type.Unknown;

      return node.expression_type!;
    }

    case SyntaxKind.Identifier:
    case SyntaxKind.FunctionExpression:
      node.expression_type = Type.Ambiguous;
      return Type.Ambiguous;

    default: return Type.Unknown;
  }
}

export function AssignNodeSymbol(
  node: Node,
  symbol_table: SymbolTable,
  global_symbol_table: SymbolTable,
): void {
  switch (node.kind) {
    case SyntaxKind.VariableDeclaration:
      symbol_table[node.children.variable.content] = {
        name: node.children.variable.content,
        kind: SymbolKind.Variable,
        declaration: node,
        type: Type.Ambiguous,
      };
      break;

    case SyntaxKind.Script:
      symbol_table[node.children.name.content] = {
        name: node.children.name.content,
        kind: SymbolKind.Script,
        declaration: node,
        type: Type.Ambiguous,
      };
      break;

    case SyntaxKind.BlocktypeFunction: {
      const parent = node.parent;
      if (parent.kind === SyntaxKind.BlocktypeExpression) {
        const script = parent.parent.parent;
        if (script.kind === SyntaxKind.Script) {
          global_symbol_table[script.children.name.content] = {
            name: script.children.name.content,
            kind: SymbolKind.Function,
            declaration: script,
            type: Type.Ambiguous,
          };
        }
      }
      break;
    }

    default:
      break;
  }
}

export function BuildScriptSymbolTables(script: Script) {
  let last_symbol_table: SymbolTable = script.environment.global_symbol_table;
  let last_symbol_table_saved: SymbolTable;

  ForEachChildRecursive(
    script,
    node => {
      last_symbol_table_saved = last_symbol_table;

      if (node.kind === SyntaxKind.StatementList) {
        last_symbol_table = node.symbol_table;
      } else {
        AssignNodeSymbol(
          node,
          last_symbol_table,
          script.environment.global_symbol_table
        );
      }
    },
    () => {
      last_symbol_table = last_symbol_table_saved;
    }
  );
}

export async function ValidateNode(node: Node, script: Script): Promise<void> {
  switch (node.kind) {
    case SyntaxKind.BinaryExpresison: {
      const lhs = GetExpressionType(node.children.lhs);
      const rhs = GetExpressionType(node.children.rhs);

      if (
        (lhs === rhs || lhs === Type.Ambiguous || rhs === Type.Ambiguous) &&
        lhs !== Type.Unknown &&
        rhs !== Type.Unknown
      ) {
        return;
      } else {
        script.diagnostics.push({
          message: `Unexpected operand types: "${GetTypeName(lhs)}" and "${GetTypeName(rhs)}"`,
          range: node.range
        });
      }

      break;
    }

    case SyntaxKind.Identifier:
      node.symbol = await ResolveSymbol(
        node,
        node.content
      );

      if (node.symbol == undefined) {
        script.semantic_tokens.push(node);
      }
  }
}

export async function ValidateScript(script: Script): Promise<void> {
  ForEachChildRecursiveAsync(
    script,
    async node => await ValidateNode(node, script)
  );
}

// debug TreeData stuff
export function NodeToTreeDataFull(node: Node): TreeData {  // TODO: add drawing data to the TreeData
  const tree_data: TreeData = new TreeData(
    (node as Token).content ?? node.constructor.name,
    [new TreeData("Range", [new TreeData(
      `(${node.range.start.line}; ${node.range.start.character}) - (${node.range.end.line}; ${node.range.end.character})`
    )])]
  );

  if ("children" in node) {
    ForEachChild(
      node,
      node => {
        tree_data.append(NodeToTreeDataFull(node));
      }
    );
  }

  return tree_data;
}

export function NodeToHTML(  // TODO: Integrate this to tree-view
  node: Node,
  doc: TextDocument,
): string {
  let cur_pos = 0;
  const text = doc.getText();

  function node_to_html(node: Node): string {
    if ("content" in node) {
      cur_pos += (doc.offsetAt(node.range.end) - doc.offsetAt(node.range.start));

      return `${node.content}`;
    }

    let html_buf = "";

    ForEachChild(
      node,
      node => {
        const start = doc.offsetAt(node.range.start);
        if (cur_pos < start) {
          let buf = "";
          while (cur_pos < start) {
            const char = text[cur_pos++];
            if (char === "\t") {
              buf += "";
            } else {
              buf += char;
            }
          }
          html_buf += `${buf}`;
        }

        const content = node_to_html(node);
        if (
          node.kind === SyntaxKind.StatementList &&
          node.parent?.kind !== SyntaxKind.Script
        ) {
          html_buf += "\t";
        }

        let class_ = node.constructor.name;

        if (class_.includes("Statement")) {
          class_ = "Statement";
        } else if (class_.includes("Expression")) {
          class_ = "Expression";
        }

        html_buf += `<span class="${class_}">${content}</span>`;
      }
    );

    return html_buf;
  }

  const style = "span { display: inline-block; border: black solid; } span.Statement { border: blue solid; } span.Expression { border: green solid; } span.Block { border: purple solid; } span.Branch { border: orange solid; } span.VariableDeclaration { border: brown solid; }";

  return `<style>${style}</style><pre><div>${node_to_html(node)}</div></pre>`;
}
