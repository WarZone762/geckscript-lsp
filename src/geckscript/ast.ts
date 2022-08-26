import { Position } from "vscode-languageserver-textdocument";
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


export function ForEachChild(node: Node, func: (node: Node) => void): void {
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
      (node as FunctionExpression).args.map(func);
      break;

    case SyntaxKind.LambdaInlineExpression:
      func((node as LambdaInlineExpression).lbracket);
      (node as LambdaInlineExpression).params.map(func);
      func((node as LambdaInlineExpression).rbracket);
      func((node as LambdaInlineExpression).arrow);
      func((node as LambdaInlineExpression).expression);
      break;

    case SyntaxKind.LambdaExpression:
      func((node as LambdaExpression).begin);
      func((node as LambdaExpression).function);
      func((node as LambdaExpression).lbracket);
      (node as LambdaExpression).params.map(func);
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
      (node as Block).children.map(func);
      break;

    case SyntaxKind.BlocktypeExpression:
      func((node as BlocktypeExpression).block_type);
      (node as BlocktypeExpression).args.map(func);
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
      (node as IfStatement).branches.map(func);
      if ((node as IfStatement).else != undefined) {
        func((node as IfStatement).else!);
        func((node as IfStatement).else_statements!);
      }
      break;

    case SyntaxKind.Script:
      func((node as Script).name);
      func((node as Script).scriptname);
      func((node as Script).body);
      Object.values((node as Script).comments).map(func);
      break;

    default:
      break;
  }
}

export function ForEachChildRecursive(
  root: Node,
  pre_func: (node: Node) => void = () => undefined,
  post_func: (node: Node) => void = () => undefined,
): void {
  pre_func(root);
  ForEachChild(root, node => ForEachChildRecursive(node, pre_func, post_func));
  post_func(root);
}

export function GetNodeChildren(node: Node): Node[] {
  const children: Node[] = [];
  ForEachChild(node, (node) => children.push(node));

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

export function ResolveSymbol(
  node: Node,
  name: string
): Symbol | undefined {
  while (true) {
    const parent = FindAncestor(node, node => node.kind === SyntaxKind.Block);
    if (parent != undefined) {
      if ((parent as Block).symbol_table[name] != undefined)
        return (parent as Block).symbol_table[name];
      node = parent.parent!;
    } else {
      node = FindAncestor(node, node => node.kind === SyntaxKind.Script)!;
      return (node as Script).environment.global_symbol_table[name];
    }
  }
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

export function ValidateNode(node: Node, script: Script): void {
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
      (node as Identifier).symbol = ResolveSymbol(
        node,
        (node as Identifier).content
      );
      if ((node as Identifier).symbol == undefined)
        script.semantic_tokens.push(node);
  }
}

export function ValidateScript(script: Script): void {
  ForEachChildRecursive(
    script,
    node => ValidateNode(node, script)
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
      stack.push(new TreeData((node as Token).content ?? node.constructor.name));
    },
    () => {
      if (stack.length > 1)
        stack[stack.length - 2].append(stack.pop()!);
    }
  );

  return stack.pop()!;
}
