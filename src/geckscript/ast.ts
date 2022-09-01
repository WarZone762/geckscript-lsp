import { Position } from "vscode-languageserver-textdocument";
import { CreateGlobalFunctionSymbol } from "./function_data";
import { GetSyntaxKindName } from "./token_data";
import {
  SyntaxKind,
  BranchKeyword,
  Node,
  Token,
  Comment,
  StringLiteral,
  VariableDeclaration,
  UnaryExpression,
  BinaryExpression,
  ElementAccessExpression,
  FunctionExpression,
  LambdaInlineExpression,
  LambdaExpression,
  VariableDeclarationStatement,
  SetStatement,
  LetStatement,
  Block,
  BlocktypeExpression,
  BeginStatement,
  ForeachStatement,
  Branch,
  WhileStatement,
  IfStatement,
  Script,
  TreeData,
  Type,
  GetTypeName,
  Symbol,
  SymbolTable,
  SymbolKind,
  NumberLiteral,
  Identifier,
} from "./types";


export function ForEachChild(node: Node, func: (node: Node) => any): void {
  switch (node.kind) {
    case SyntaxKind.VariableDeclaration:
      func((node as VariableDeclaration).type);
      func((node as VariableDeclaration).variable);
      break;

    case SyntaxKind.UnaryExpression:
      func((node as UnaryExpression).op);
      func((node as UnaryExpression).operand);
      break;

    case SyntaxKind.BinaryExpresison:
      func((node as BinaryExpression).lhs);
      func((node as BinaryExpression).op);
      func((node as BinaryExpression).rhs);
      break;

    case SyntaxKind.ElementAccessExpression:
      func((node as ElementAccessExpression).lhs);
      func((node as ElementAccessExpression).left_op);
      func((node as ElementAccessExpression).rhs);
      func((node as ElementAccessExpression).right_op);
      break;

    case SyntaxKind.FunctionExpression:
      func((node as FunctionExpression).name);
      for (const v of (node as FunctionExpression).args) func(v);
      break;

    case SyntaxKind.LambdaInlineExpression:
      func((node as LambdaInlineExpression).lbracket);
      for (const v of (node as LambdaInlineExpression).params) func(v);
      func((node as LambdaInlineExpression).rbracket);
      func((node as LambdaInlineExpression).arrow);
      func((node as LambdaInlineExpression).expression);
      break;

    case SyntaxKind.LambdaExpression:
      func((node as LambdaExpression).begin);
      func((node as LambdaExpression).function);
      func((node as LambdaExpression).lbracket);
      for (const v of (node as LambdaExpression).params) func(v);
      func((node as LambdaExpression).rbracket);
      func((node as LambdaExpression).body);
      func((node as LambdaExpression).end);
      break;

    case SyntaxKind.VariableDeclarationStatement:
      func((node as VariableDeclarationStatement).variable);
      if ((node as VariableDeclarationStatement).op != undefined) {
        func((node as VariableDeclarationStatement).op!);
        func((node as VariableDeclarationStatement).expression!);
      }
      break;

    case SyntaxKind.SetStatement:
      func((node as SetStatement).set);
      func((node as SetStatement).variable);
      func((node as SetStatement).to);
      func((node as SetStatement).expression);
      break;

    case SyntaxKind.LetStatement:
      func((node as LetStatement).let);
      func((node as LetStatement).variable);
      func((node as LetStatement).op);
      func((node as LetStatement).expression);
      break;

    case SyntaxKind.Block:
      for (const v of (node as Block).children) func(v);
      break;

    case SyntaxKind.BlocktypeExpression:
      func((node as BlocktypeExpression).block_type);
      for (const v of (node as BlocktypeExpression).args) func(v);
      break;

    case SyntaxKind.BeginStatement:
      func((node as BeginStatement).begin);
      func((node as BeginStatement).block_type);
      func((node as BeginStatement).body);
      func((node as BeginStatement).end);
      break;

    case SyntaxKind.ForeachStatement:
      func((node as ForeachStatement).foreach);
      func((node as ForeachStatement).identifier);
      func((node as ForeachStatement).larrow);
      func((node as ForeachStatement).iterable);
      func((node as ForeachStatement).body);
      func((node as ForeachStatement).loop);
      break;

    case SyntaxKind.Branch:
      func((node as Branch<BranchKeyword>).keyword);
      func((node as Branch<BranchKeyword>).condition);
      func((node as Branch<BranchKeyword>).body);
      break;

    case SyntaxKind.WhileStatement:
      func((node as WhileStatement).branch);
      func((node as WhileStatement).loop);
      break;

    case SyntaxKind.IfStatement:
      for (const v of (node as IfStatement).branches) func(v);
      if ((node as IfStatement).else != undefined) {
        func((node as IfStatement).else!);
        func((node as IfStatement).else_statements!);
      }
      break;

    case SyntaxKind.Script:
      func((node as Script).name);
      func((node as Script).scriptname);
      func((node as Script).body);
      for (const v of Object.values((node as Script).comments)) func(v);
      break;

    default:
      break;
  }
}

export async function ForEachChildAsync(
  node: Node,
  func: (node: Node) => any
): Promise<void> {
  switch (node.kind) {
    case SyntaxKind.VariableDeclaration:
      await func((node as VariableDeclaration).type);
      await func((node as VariableDeclaration).variable);
      break;

    case SyntaxKind.UnaryExpression:
      await func((node as UnaryExpression).op);
      await func((node as UnaryExpression).operand);
      break;

    case SyntaxKind.BinaryExpresison:
      await func((node as BinaryExpression).lhs);
      await func((node as BinaryExpression).op);
      await func((node as BinaryExpression).rhs);
      break;

    case SyntaxKind.ElementAccessExpression:
      await func((node as ElementAccessExpression).lhs);
      await func((node as ElementAccessExpression).left_op);
      await func((node as ElementAccessExpression).rhs);
      await func((node as ElementAccessExpression).right_op);
      break;

    case SyntaxKind.FunctionExpression:
      await func((node as FunctionExpression).name);
      for (const v of (node as FunctionExpression).args) await func(v);
      break;

    case SyntaxKind.LambdaInlineExpression:
      await func((node as LambdaInlineExpression).lbracket);
      for (const v of (node as LambdaInlineExpression).params) await func(v);
      await func((node as LambdaInlineExpression).rbracket);
      await func((node as LambdaInlineExpression).arrow);
      await func((node as LambdaInlineExpression).expression);
      break;

    case SyntaxKind.LambdaExpression:
      await func((node as LambdaExpression).begin);
      await func((node as LambdaExpression).function);
      await func((node as LambdaExpression).lbracket);
      for (const v of (node as LambdaExpression).params) await func(v);
      await func((node as LambdaExpression).rbracket);
      await func((node as LambdaExpression).body);
      await func((node as LambdaExpression).end);
      break;

    case SyntaxKind.VariableDeclarationStatement:
      await func((node as VariableDeclarationStatement).variable);
      if ((node as VariableDeclarationStatement).op != undefined) {
        await func((node as VariableDeclarationStatement).op!);
        await func((node as VariableDeclarationStatement).expression!);
      }
      break;

    case SyntaxKind.SetStatement:
      await func((node as SetStatement).set);
      await func((node as SetStatement).variable);
      await func((node as SetStatement).to);
      await func((node as SetStatement).expression);
      break;

    case SyntaxKind.LetStatement:
      await func((node as LetStatement).let);
      await func((node as LetStatement).variable);
      await func((node as LetStatement).op);
      await func((node as LetStatement).expression);
      break;

    case SyntaxKind.Block:
      for (const v of (node as Block).children) await func(v);
      break;

    case SyntaxKind.BlocktypeExpression:
      await func((node as BlocktypeExpression).block_type);
      for (const v of (node as BlocktypeExpression).args) await func(v);
      break;

    case SyntaxKind.BeginStatement:
      await func((node as BeginStatement).begin);
      await func((node as BeginStatement).block_type);
      await func((node as BeginStatement).body);
      await func((node as BeginStatement).end);
      break;

    case SyntaxKind.ForeachStatement:
      await func((node as ForeachStatement).foreach);
      await func((node as ForeachStatement).identifier);
      await func((node as ForeachStatement).larrow);
      await func((node as ForeachStatement).iterable);
      await func((node as ForeachStatement).body);
      await func((node as ForeachStatement).loop);
      break;

    case SyntaxKind.Branch:
      await func((node as Branch<BranchKeyword>).keyword);
      await func((node as Branch<BranchKeyword>).condition);
      await func((node as Branch<BranchKeyword>).body);
      break;

    case SyntaxKind.WhileStatement:
      await func((node as WhileStatement).branch);
      await func((node as WhileStatement).loop);
      break;

    case SyntaxKind.IfStatement:
      for (const v of (node as IfStatement).branches) await func(v);
      if ((node as IfStatement).else != undefined) {
        await func((node as IfStatement).else!);
        await func((node as IfStatement).else_statements!);
      }
      break;

    case SyntaxKind.Script:
      await func((node as Script).name);
      await func((node as Script).scriptname);
      await func((node as Script).body);
      for (const v of Object.values((node as Script).comments)) await func(v);
      break;

    default:
      break;
  }
}

export function ForEachChildRecursive(
  root: Node,
  pre_func: (node: Node) => any = () => undefined,
  post_func: (node: Node) => any = () => undefined,
): void {
  pre_func(root);
  ForEachChild(root, node => ForEachChildRecursive(node, pre_func, post_func));
  post_func(root);
}

export async function ForEachChildRecursiveAsync(
  root: Node,
  pre_func: (node: Node) => any = () => undefined,
  post_func: (node: Node) => any = () => undefined,
): Promise<void> {
  await pre_func(root);
  await ForEachChildAsync(root, async node => await ForEachChildRecursiveAsync(node, pre_func, post_func));
  await post_func(root);
}

export function GetNodeChildren(node: Node): Node[] {
  const children: Node[] = [];
  ForEachChild(node, node => children.push(node));

  return children;
}

export function GetNodeLeafs(node: Node): Node[] {
  const leafs: Node[] = [];

  ForEachChildRecursive(
    node,
    node => {
      const children = GetNodeChildren(node);
      if (children.length === 0) leafs.push(node);
    }
  );

  return leafs;
}

export function FindAncestor(
  node: Node | undefined,
  predicate: (node: Node) => boolean
): Node | undefined {
  while (node != undefined) {
    if (predicate(node)) return node;
    node = node.parent;
  }

  return undefined;
}

export function GetTokenAtPosition(node: Node, position: Position): Node | undefined {
  const leafs = GetNodeLeafs(node);

  for (const leaf of leafs) {
    if (
      leaf.range.start.line <= position.line &&
      position.line <= leaf.range.end.line &&
      leaf.range.start.character <= position.character &&
      position.character <= leaf.range.end.character
    )
      return leaf;
  }

  return undefined;
}

export function FindSymbolDeclarationBlock(
  node: Node,
  name: string
): Block | undefined {
  while (true) {
    const parent = FindAncestor(node, node => node.kind === SyntaxKind.Block);
    if (parent != undefined) {
      if ((parent as Block).symbol_table[name] != undefined)
        return parent as Block;
      node = parent.parent!;
    } else {
      return undefined;
    }
  }
}

export async function ResolveSymbol(
  node: Node,
  name: string
): Promise<Symbol | undefined> {
  const block = FindSymbolDeclarationBlock(node, name);

  if (block != undefined) return block.symbol_table[name];
  else {
    const script = FindAncestor(node, node => node.kind === SyntaxKind.Script)!;
    return (script as Script).environment.global_symbol_table[name] ??
      await CreateGlobalFunctionSymbol(name.toLowerCase());
  }
}

export function FindAllOccurrencesOfText(
  node: Node,
  text: string
): Node[] {
  const occurrences: Node[]= [];
  const leafs = GetNodeLeafs(node);

  for (const leaf of leafs) {
    if ((leaf as Token).content === text) occurrences.push(leaf);
  }

  return occurrences;
}

export function FindAllReferences(
  node: Node,
  name: string
): Node[] {
  const block = FindSymbolDeclarationBlock(node, name);

  if (block == undefined) return [];

  const refs: Node[] = [];
  const symbol = block.symbol_table[name];
  const leafs = GetNodeLeafs(block);

  for (const leaf of leafs) {
    if (leaf.kind === SyntaxKind.Identifier && (leaf as Identifier).symbol === symbol)
      refs.push(leaf);
  }

  return refs;
}

export function GetExpressionType(node: Node): Type {
  if (node.expression_type != undefined) return node.expression_type;

  switch (node.kind) {
    case SyntaxKind.Number:
      if ((node as NumberLiteral).content.includes("."))
        node.expression_type = Type.Float;
      else
        node.expression_type = Type.Integer;

      return (node as NumberLiteral).expression_type!;

    case SyntaxKind.String:
      node.expression_type = Type.String;
      return Type.String;

    case SyntaxKind.BinaryExpresison: {
      const lhs = GetExpressionType((node as BinaryExpression).lhs);
      const rhs = GetExpressionType((node as BinaryExpression).rhs);

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
      symbol_table[(node as VariableDeclaration).variable.content] = {
        name: (node as VariableDeclaration).variable.content,
        kind: SymbolKind.Variable,
        declaration: node,
        type: Type.Ambiguous,
      };
      break;

    case SyntaxKind.Script:
      symbol_table[(node as Script).name.content] = {
        name: (node as Script).name.content,
        kind: SymbolKind.Script,
        declaration: node,
        type: Type.Ambiguous,
      };
      break;

    case SyntaxKind.BlocktypeTokenFunction: {
      const parent = (node as Token).parent;
      if (parent?.kind === SyntaxKind.BlocktypeExpression) {
        const script = parent.parent?.parent;
        if (script?.kind === SyntaxKind.Script)
          global_symbol_table[(script as Script).name.content] = {
            name: (script as Script).name.content,
            kind: SymbolKind.Function,
            declaration: script,
            type: Type.Ambiguous,
          };
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

      if (node.kind === SyntaxKind.Block)
        last_symbol_table = (node as Block).symbol_table;
      else
        AssignNodeSymbol(
          node,
          last_symbol_table,
          script.environment.global_symbol_table
        );
    },
    () => { last_symbol_table = last_symbol_table_saved; }
  );
}

export async function ValidateNode(node: Node, script: Script): Promise<void> {
  switch (node.kind) {
    case SyntaxKind.BinaryExpresison: {
      const lhs = GetExpressionType((node as BinaryExpression).lhs);
      const rhs = GetExpressionType((node as BinaryExpression).rhs);

      if (
        (lhs === rhs || lhs === Type.Ambiguous || rhs === Type.Ambiguous) &&
        lhs !== Type.Unknown &&
        rhs !== Type.Unknown
      ) return;
      else script.diagnostics.push({
        message: `Unexpected operand types: "${GetTypeName(lhs)}" and "${GetTypeName(rhs)}"`,
        range: node.range
      });

      break;
    }

    case SyntaxKind.Identifier:
      (node as Identifier).symbol = await ResolveSymbol(
        node,
        (node as Identifier).content
      );

      if ((node as Identifier).symbol == undefined)
        script.semantic_tokens.push(node);
  }
}

export async function ValidateScript(script: Script): Promise<void> {
  ForEachChildRecursiveAsync(
    script,
    async node => await ValidateNode(node, script)
  );
}

// debug TreeData stuff
export function NodeToTreeData(node: Node): TreeData {
  switch (node.kind) {
    case SyntaxKind.Comment:
      return new TreeData(`${node.range.start.line}: ${(node as Comment).content}`);

    case SyntaxKind.String:
      return new TreeData(`"${(node as StringLiteral).value}"`);

    case SyntaxKind.Number:
    case SyntaxKind.Identifier:
    case SyntaxKind.BlocktypeToken:
    case SyntaxKind.BlocktypeTokenFunction:
      return new TreeData(`${(node as Token).content}`);

    case SyntaxKind.Continue:
    case SyntaxKind.Break:
    case SyntaxKind.Return:
      return new TreeData(`Keyword: ${(node as Token).content}`);

    case SyntaxKind.VariableDeclaration:
      return new TreeData(
        `${(node as VariableDeclaration).type.content}`,
        [NodeToTreeData((node as VariableDeclaration).variable)]
      );

    case SyntaxKind.UnaryExpression:
      return new TreeData(
        `${(node as UnaryExpression).op.content}`,
        [NodeToTreeData((node as UnaryExpression).operand)]
      );

    case SyntaxKind.BinaryExpresison:
      return new TreeData(
        `${(node as BinaryExpression).op.content}`,
        [
          NodeToTreeData((node as BinaryExpression).lhs),
          NodeToTreeData((node as BinaryExpression).rhs)
        ]
      );

    case SyntaxKind.ElementAccessExpression:
      return new TreeData(
        `${(node as ElementAccessExpression).left_op}${(node as ElementAccessExpression).right_op}`,
        [
          NodeToTreeData((node as ElementAccessExpression).lhs),
          NodeToTreeData((node as ElementAccessExpression).rhs)
        ]
      );

    case SyntaxKind.FunctionExpression:
      return new TreeData(
        `${(node as FunctionExpression).name.content}`,
        (node as FunctionExpression).args.map(NodeToTreeData)
      );

    case SyntaxKind.LambdaInlineExpression:
      return new TreeData(
        "Inline Lambda",
        (node as LambdaInlineExpression).params.map(NodeToTreeData).concat([
          NodeToTreeData((node as LambdaInlineExpression).expression)
        ])
      );

    case SyntaxKind.LambdaExpression:
      return new TreeData(
        "Lambda",
        (node as LambdaExpression).params.map(NodeToTreeData).concat([
          NodeToTreeData((node as LambdaExpression).body)
        ])
      );

    case SyntaxKind.VariableDeclarationStatement: {
      const tree = new TreeData(
        "Variable Declaration",
        [
          NodeToTreeData((node as VariableDeclarationStatement).variable)
        ]
      );

      if ((node as VariableDeclarationStatement).op != undefined) {
        tree.name = tree.name + ` (${(node as VariableDeclarationStatement).op!.content})`;

        tree.append(NodeToTreeData((node as VariableDeclarationStatement).expression!));
      }

      return tree;
    }

    case SyntaxKind.SetStatement:
      return new TreeData(
        "set",
        [
          NodeToTreeData((node as SetStatement).variable),
          NodeToTreeData((node as SetStatement).expression),
        ]
      );

    case SyntaxKind.LetStatement:
      return new TreeData(
        "let",
        [
          NodeToTreeData((node as SetStatement).variable),
          NodeToTreeData((node as SetStatement).expression),
        ]
      );

    case SyntaxKind.Block:
      return new TreeData(
        "Compound Statement",
        (node as Block).children.map(NodeToTreeData)
      );

    case SyntaxKind.BlocktypeExpression:
      return new TreeData(
        `${(node as BlocktypeExpression).block_type.content}`,
        (node as BlocktypeExpression).args.map(NodeToTreeData)
      );

    case SyntaxKind.BeginStatement:
      return new TreeData(
        "begin",
        [
          NodeToTreeData((node as BeginStatement).block_type),
          NodeToTreeData((node as BeginStatement).body),
        ]
      );

    case SyntaxKind.ForeachStatement:
      return new TreeData(
        "foreach",
        [
          NodeToTreeData((node as ForeachStatement).identifier),
          NodeToTreeData((node as ForeachStatement).iterable),
          NodeToTreeData((node as ForeachStatement).body),
        ]
      );

    case SyntaxKind.Branch:
      return new TreeData(
        `${(node as Branch<BranchKeyword>).keyword.content}`,
        [
          NodeToTreeData((node as Branch<BranchKeyword>).body)
        ]
      );

    case SyntaxKind.WhileStatement:
      return NodeToTreeData((node as WhileStatement).branch);

    case SyntaxKind.IfStatement: {
      const tree = new TreeData(
        "If Statement",
        (node as IfStatement).branches.map(NodeToTreeData)
      );

      if ((node as IfStatement).else != undefined)
        tree.append(new TreeData(
          "else",
          [
            NodeToTreeData((node as IfStatement).else_statements!)
          ]
        ));

      return tree;
    }

    case SyntaxKind.Script: {
      const tree = new TreeData(
        "Script",
        [
          NodeToTreeData((node as Script).name),
          NodeToTreeData((node as Script).body),
        ]
      );

      tree.append(new TreeData(
        "Comments",
        Object.values((node as Script).comments).map(NodeToTreeData)
      ));

      return tree;
    }

    default:
      return new TreeData(`Token: "${GetSyntaxKindName(node.kind)}"`);
  }
}

export function NodeToTreeDataFull(node: Node): TreeData {
  const stack: TreeData[] = [];

  ForEachChildRecursive(
    node,
    (node) => {
      stack.push(new TreeData(
        (node as Token).content ?? node.constructor.name,
        [new TreeData("Range", [new TreeData(
          `(${node.range.start.line}; ${node.range.start.character}) - (${node.range.end.line}; ${node.range.end.character})`
        )])]
      ));
    },
    () => {
      if (stack.length > 1)
        stack[stack.length - 2].append(stack.pop()!);
    }
  );

  return stack.pop()!;
}
