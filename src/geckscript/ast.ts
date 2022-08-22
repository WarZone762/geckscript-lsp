import { Diagnostic } from "vscode-languageserver";
import { GetSyntaxTypeName } from "./token_data";
import {
  SyntaxType,
  IsOperator,
  IsTypename,
  IsKeyword,
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
  CompoundStatement,
  BlocktypeExpression,
  BeginStatement,
  ForeachStatement,
  Branch,
  WhileStatement,
  IfStatement,
  Script,
  TreeData,
} from "./types";


export function ForEachChild(node: Node, func: (node: Node) => void): void {
  switch (node.type) {
    case SyntaxType.VariableDeclaration:
      func((node as VariableDeclaration).variable_type);
      func((node as VariableDeclaration).variable);
      break;

    case SyntaxType.UnaryExpression:
      func((node as UnaryExpression).op);
      func((node as UnaryExpression).operand);
      break;

    case SyntaxType.BinaryExpresison:
      func((node as BinaryExpression).lhs);
      func((node as BinaryExpression).op);
      func((node as BinaryExpression).rhs);
      break;

    case SyntaxType.ElementAccessExpression:
      func((node as ElementAccessExpression).lhs);
      func((node as ElementAccessExpression).left_op);
      func((node as ElementAccessExpression).rhs);
      func((node as ElementAccessExpression).right_op);
      break;

    case SyntaxType.FunctionExpression:
      func((node as FunctionExpression).name);
      (node as FunctionExpression).args.map(func);
      break;

    case SyntaxType.LambdaInlineExpression:
      func((node as LambdaInlineExpression).lbracket);
      (node as LambdaInlineExpression).params.map(func);
      func((node as LambdaInlineExpression).rbracket);
      func((node as LambdaInlineExpression).arrow);
      func((node as LambdaInlineExpression).expression);
      break;

    case SyntaxType.LambdaExpression:
      func((node as LambdaExpression).begin);
      func((node as LambdaExpression).function);
      func((node as LambdaExpression).lbracket);
      (node as LambdaExpression).params.map(func);
      func((node as LambdaExpression).rbracket);
      func((node as LambdaExpression).compound_statement);
      func((node as LambdaExpression).end);
      break;

    case SyntaxType.VariableDeclarationStatement:
      func((node as VariableDeclarationStatement).variable);
      if ((node as VariableDeclarationStatement).op != undefined) {
        func((node as VariableDeclarationStatement).op!);
        func((node as VariableDeclarationStatement).expression!);
      }
      break;

    case SyntaxType.SetStatement:
      func((node as SetStatement).set);
      func((node as SetStatement).variable);
      func((node as SetStatement).to);
      func((node as SetStatement).expression);
      break;

    case SyntaxType.LetStatement:
      func((node as LetStatement).let);
      func((node as LetStatement).variable);
      func((node as LetStatement).op);
      func((node as LetStatement).expression);
      break;

    case SyntaxType.CompoundStatement:
      (node as CompoundStatement).children.map(func);
      break;

    case SyntaxType.BlocktypeExpression:
      func((node as BlocktypeExpression).block_type);
      (node as BlocktypeExpression).args.map(func);
      break;

    case SyntaxType.BeginStatement:
      func((node as BeginStatement).begin);
      func((node as BeginStatement).block_type);
      func((node as BeginStatement).compound_statement);
      func((node as BeginStatement).end);
      break;

    case SyntaxType.ForeachStatement:
      func((node as ForeachStatement).foreach);
      func((node as ForeachStatement).identifier);
      func((node as ForeachStatement).larrow);
      func((node as ForeachStatement).iterable);
      func((node as ForeachStatement).compound_statement);
      func((node as ForeachStatement).loop);
      break;

    case SyntaxType.Branch:
      func((node as Branch<BranchKeyword>).keyword);
      func((node as Branch<BranchKeyword>).condition);
      func((node as Branch<BranchKeyword>).compound_statement);
      break;

    case SyntaxType.WhileStatement:
      func((node as WhileStatement).branch);
      func((node as WhileStatement).loop);
      break;

    case SyntaxType.IfStatement:
      (node as IfStatement).branches.map(func);
      if ((node as IfStatement).else != undefined) {
        func((node as IfStatement).else!);
        func((node as IfStatement).else_statements!);
      }
      break;

    case SyntaxType.Script:
      func((node as Script).name);
      func((node as Script).scriptname);
      func((node as Script).compound_statement);
      Object.values((node as Script).comments).map(func);
      break;

    default:
      break;
  }
}

export function VisitNode(
  node: Node,
  func: (node: Node) => void = () => undefined,
  pre_func: (node: Node) => void = () => undefined,
  post_func: (node: Node) => void = () => undefined,
): void {
  pre_func(node);
  ForEachChild(node, func);
  post_func(node);
}

export function TraverseTree(
  root: Node,
  pre_func: (node: Node) => void = () => undefined,
  post_func: (node: Node) => void = () => undefined,
): void {
  VisitNode(
    root,
    (node) => TraverseTree(node, pre_func, post_func),
    pre_func,
    post_func,
  );
}

export const enum ExpressionType {
  Unknown,
  Any,
  Integer,
  Float,
  String,
  Reference,
  Array,
}

export const ExpressionTypeMap = {
  [ExpressionType.Unknown]: "unknown",
  [ExpressionType.Any]: "any",
  [ExpressionType.Integer]: "integer",
  [ExpressionType.Float]: "float",
  [ExpressionType.String]: "string",
  [ExpressionType.Reference]: "reference",
  [ExpressionType.Array]: "array",
};

export function GetExpressionType(node: Node): ExpressionType {
  switch (node.type) {
    case SyntaxType.Number: return ExpressionType.Integer;
    case SyntaxType.String: return ExpressionType.String;

    case SyntaxType.BinaryExpresison: {
      const lhs = GetExpressionType((node as BinaryExpression).lhs);
      const rhs = GetExpressionType((node as BinaryExpression).rhs);

      if (lhs === ExpressionType.Any) return rhs;
      else if (rhs === ExpressionType.Any) return lhs;
      else if (lhs === rhs) return lhs;
      else return ExpressionType.Unknown;
    }

    case SyntaxType.Identifier:
    case SyntaxType.FunctionExpression:
      return ExpressionType.Any;

    default: return ExpressionType.Unknown;
  }
}

export function ValidateNode(node: Node): Diagnostic[] {
  switch (node.type) {
    case SyntaxType.BinaryExpresison: {
      const lhs = GetExpressionType((node as BinaryExpression).lhs);
      const rhs = GetExpressionType((node as BinaryExpression).rhs);

      if (
        (lhs === rhs || lhs === ExpressionType.Any || rhs === ExpressionType.Any) &&
        lhs !== ExpressionType.Unknown &&
        rhs !== ExpressionType.Unknown
      ) return [];
      else return [{
        message: `Unexpected operand types: "${ExpressionTypeMap[lhs]}" and "${ExpressionTypeMap[rhs]}"`,
        range: node.range
      }];
    }

    default:
      return [];
    // if (node.type === SyntaxType.Unknown)
    //   return [{
    //     message: node.content ?? TokenSyntaxTypeMap.All[node.type] ?? "Unknown",
    //     range: node.range
    //   }];
    // else
    //   return [];
  }
}

export function AppendNodeSymbol(
  node: Node,
  symbol_table: Record<string, Token<SyntaxType.Identifier>>
): void {
  switch (node.type) {
    case SyntaxType.VariableDeclaration:
      symbol_table[(node as VariableDeclaration).variable.content] = (node as VariableDeclaration).variable;
  }
}

export function ValidateTree(node: Node): Diagnostic[] {
  let diagnositcs: Diagnostic[] = [];
  const symbol_table: Record<string, Token<SyntaxType.Identifier>> = {};

  TraverseTree(
    node,
    (node) => {
      AppendNodeSymbol(node, symbol_table);
      diagnositcs = diagnositcs.concat(ValidateNode(node));
    }
  );

  return diagnositcs;
}

export function NodeToTreeData(node: Node): TreeData {
  switch (node.type) {
    case SyntaxType.Comment:
      return new TreeData(`${node.range.start.line}: ${(node as Comment).content}`);

    case SyntaxType.String:
      return new TreeData(`"${(node as StringLiteral).value}"`);

    case SyntaxType.Number:
    case SyntaxType.Identifier:
    case SyntaxType.BlocktypeToken:
    case SyntaxType.BlocktypeTokenFunction:
      return new TreeData(`${(node as Token).content}`);

    case SyntaxType.Continue:
    case SyntaxType.Break:
    case SyntaxType.Return:
      return new TreeData(`Keyword: ${(node as Token).content}`);

    case SyntaxType.VariableDeclaration:
      return new TreeData(
        `${(node as VariableDeclaration).variable_type.content}`,
        [NodeToTreeData((node as VariableDeclaration).variable)]
      );

    case SyntaxType.UnaryExpression:
      return new TreeData(
        `${(node as UnaryExpression).op.content}`,
        [NodeToTreeData((node as UnaryExpression).operand)]
      );

    case SyntaxType.BinaryExpresison:
      return new TreeData(
        `${(node as BinaryExpression).op.content}`,
        [
          NodeToTreeData((node as BinaryExpression).lhs),
          NodeToTreeData((node as BinaryExpression).rhs)
        ]
      );

    case SyntaxType.ElementAccessExpression:
      return new TreeData(
        `${(node as ElementAccessExpression).left_op}${(node as ElementAccessExpression).right_op}`,
        [
          NodeToTreeData((node as ElementAccessExpression).lhs),
          NodeToTreeData((node as ElementAccessExpression).rhs)
        ]
      );

    case SyntaxType.FunctionExpression:
      return new TreeData(
        `${(node as FunctionExpression).name.content}`,
        (node as FunctionExpression).args.map(NodeToTreeData)
      );

    case SyntaxType.LambdaInlineExpression:
      return new TreeData(
        "Inline Lambda",
        (node as LambdaInlineExpression).params.map(NodeToTreeData).concat([
          NodeToTreeData((node as LambdaInlineExpression).expression)
        ])
      );

    case SyntaxType.LambdaExpression:
      return new TreeData(
        "Lambda",
        (node as LambdaExpression).params.map(NodeToTreeData).concat([
          NodeToTreeData((node as LambdaExpression).compound_statement)
        ])
      );

    case SyntaxType.VariableDeclarationStatement: {
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

    case SyntaxType.SetStatement:
      return new TreeData(
        "set",
        [
          NodeToTreeData((node as SetStatement).variable),
          NodeToTreeData((node as SetStatement).expression),
        ]
      );

    case SyntaxType.LetStatement:
      return new TreeData(
        "let",
        [
          NodeToTreeData((node as SetStatement).variable),
          NodeToTreeData((node as SetStatement).expression),
        ]
      );

    case SyntaxType.CompoundStatement:
      return new TreeData(
        "Compound Statement",
        (node as CompoundStatement).children.map(NodeToTreeData)
      );

    case SyntaxType.BlocktypeExpression:
      return new TreeData(
        `${(node as BlocktypeExpression).block_type.content}`,
        (node as BlocktypeExpression).args.map(NodeToTreeData)
      );

    case SyntaxType.BeginStatement:
      return new TreeData(
        "begin",
        [
          NodeToTreeData((node as BeginStatement).block_type),
          NodeToTreeData((node as BeginStatement).compound_statement),
        ]
      );

    case SyntaxType.ForeachStatement:
      return new TreeData(
        "foreach",
        [
          NodeToTreeData((node as ForeachStatement).identifier),
          NodeToTreeData((node as ForeachStatement).iterable),
          NodeToTreeData((node as ForeachStatement).compound_statement),
        ]
      );

    case SyntaxType.Branch:
      return new TreeData(
        `${(node as Branch<BranchKeyword>).keyword.content}`,
        [
          NodeToTreeData((node as Branch<BranchKeyword>).compound_statement)
        ]
      );

    case SyntaxType.WhileStatement:
      return NodeToTreeData((node as WhileStatement).branch);

    case SyntaxType.IfStatement: {
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

    case SyntaxType.Script: {
      const tree = new TreeData(
        "Script",
        [
          NodeToTreeData((node as Script).name),
          NodeToTreeData((node as Script).compound_statement),
        ]
      );

      tree.append(new TreeData(
        "Comments",
        Object.values((node as Script).comments).map(NodeToTreeData)
      ));

      return tree;
    }

    default:
      return new TreeData(`Token: "${GetSyntaxTypeName(node.type)}"`);
  }
}

export function NodeToTreeDataFull(node: Node): TreeData {
  const stack: TreeData[] = [];

  TraverseTree(
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
