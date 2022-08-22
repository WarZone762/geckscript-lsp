import { Diagnostic } from "vscode-languageserver";
import { SyntaxTypeMap } from "./token_data";
import {
  SyntaxType,
  IsOperator,
  IsTypename,
  IsKeyword,
  BranchKeyword,
  Node,
  Token,
  CommentNode,
  StringNode,
  VariableDeclarationNode,
  UnaryOpNode,
  BinOpNode,
  BinOpPairedNode,
  FunctionNode,
  LambdaInlineNode,
  LambdaNode,
  VariableDeclarationStatementNode,
  SetNode,
  LetNode,
  CompoundStatementNode,
  BlockTypeNode,
  BeginBlockNode,
  ForeachBlockNode,
  BranchNode,
  WhileBlockNode,
  IfBlockNode,
  ScriptNode,
  TreeData,
} from "./types";


export function ForEachChild(node: Node, func: (node: Node) => void): void {
  switch (node.type) {
    case SyntaxType.VariableDeclaration:
      func((node as VariableDeclarationNode).variable_type);
      func((node as VariableDeclarationNode).variable);
      break;

    case SyntaxType.UnaryOp:
      func((node as UnaryOpNode).op);
      func((node as UnaryOpNode).operand);
      break;

    case SyntaxType.BinOp:
      func((node as BinOpNode).lhs);
      func((node as BinOpNode).op);
      func((node as BinOpNode).rhs);
      break;

    case SyntaxType.BinOpPaired:
      func((node as BinOpPairedNode).lhs);
      func((node as BinOpPairedNode).left_op);
      func((node as BinOpPairedNode).rhs);
      func((node as BinOpPairedNode).right_op);
      break;

    case SyntaxType.FunctionExpression:
      func((node as FunctionNode).name);
      (node as FunctionNode).args.map(func);
      break;

    case SyntaxType.LambdaInline:
      func((node as LambdaInlineNode).lbracket);
      (node as LambdaInlineNode).params.map(func);
      func((node as LambdaInlineNode).rbracket);
      func((node as LambdaInlineNode).arrow);
      func((node as LambdaInlineNode).expression);
      break;

    case SyntaxType.Lambda:
      func((node as LambdaNode).begin);
      func((node as LambdaNode).function);
      func((node as LambdaNode).lbracket);
      (node as LambdaNode).params.map(func);
      func((node as LambdaNode).rbracket);
      func((node as LambdaNode).compound_statement);
      func((node as LambdaNode).end);
      break;

    case SyntaxType.VariableDeclarationStatement:
      func((node as VariableDeclarationStatementNode).variable);
      if ((node as VariableDeclarationStatementNode).op != undefined) {
        func((node as VariableDeclarationStatementNode).op!);
        func((node as VariableDeclarationStatementNode).expression!);
      }
      break;

    case SyntaxType.SetStatement:
      func((node as SetNode).set);
      func((node as SetNode).identifier);
      func((node as SetNode).to);
      func((node as SetNode).value);
      break;

    case SyntaxType.LetStatement:
      func((node as LetNode).let);
      func((node as LetNode).variable);
      func((node as LetNode).op);
      func((node as LetNode).expression);
      break;

    case SyntaxType.CompoundStatement:
      (node as CompoundStatementNode).children.map(func);
      break;

    case SyntaxType.Blocktype:
      func((node as BlockTypeNode).block_type);
      (node as BlockTypeNode).args.map(func);
      break;

    case SyntaxType.BeginStatement:
      func((node as BeginBlockNode).begin);
      func((node as BeginBlockNode).block_type);
      func((node as BeginBlockNode).compound_statement);
      func((node as BeginBlockNode).end);
      break;

    case SyntaxType.ForeachStatement:
      func((node as ForeachBlockNode).foreach);
      func((node as ForeachBlockNode).idetifier);
      func((node as ForeachBlockNode).larrow);
      func((node as ForeachBlockNode).iterable);
      func((node as ForeachBlockNode).statements);
      func((node as ForeachBlockNode).loop);
      break;

    case SyntaxType.Branch:
      func((node as BranchNode<BranchKeyword>).keyword);
      func((node as BranchNode<BranchKeyword>).condition);
      func((node as BranchNode<BranchKeyword>).statements);
      break;

    case SyntaxType.WhileStatement:
      func((node as WhileBlockNode).branch);
      func((node as WhileBlockNode).loop);
      break;

    case SyntaxType.IfStatement:
      (node as IfBlockNode).branches.map(func);
      if ((node as IfBlockNode).else != undefined) {
        func((node as IfBlockNode).else!);
        func((node as IfBlockNode).else_statements!);
      }
      break;

    case SyntaxType.Script:
      func((node as ScriptNode).name);
      func((node as ScriptNode).scriptname);
      func((node as ScriptNode).statements);
      Object.values((node as ScriptNode).comments).map(func);
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

export function NodeToTreeData(node: Node): TreeData {
  switch (node.type) {
    case SyntaxType.Comment:
      return new TreeData(`${node.range.start.line}: ${(node as CommentNode).content}`);

    case SyntaxType.String:
      return new TreeData(`"${(node as StringNode).value}"`);

    case SyntaxType.Number:
    case SyntaxType.Identifier:
    case SyntaxType.BlocktypeToken:
    case SyntaxType.BlocktypeTokenFunction:
      return new TreeData(`${(node as Token).content}`);

    case SyntaxType.Continue:
    case SyntaxType.Break:
    case SyntaxType.Return:
      return new TreeData(`Keyword: ${SyntaxTypeMap.All[node.type]}`);

    case SyntaxType.VariableDeclaration:
      return new TreeData(`${(node as VariableDeclarationNode).variable_type.content}`);

    case SyntaxType.UnaryOp:
    case SyntaxType.BinOp:
      return new TreeData(`${(node as UnaryOpNode).op.content}`);

    case SyntaxType.BinOpPaired:
      return new TreeData(`${(node as BinOpPairedNode).left_op}${(node as BinOpPairedNode).right_op}`);

    case SyntaxType.FunctionExpression:
      return new TreeData(`${(node as FunctionNode).name.content}`);

    case SyntaxType.LambdaInline:
      return new TreeData("Inline Lambda");

    case SyntaxType.Lambda:
      return new TreeData("Lambda");

    case SyntaxType.VariableDeclarationStatement:
      return new TreeData("Variable Declaration");

    case SyntaxType.SetStatement:
      return new TreeData("set");

    case SyntaxType.LetStatement:
      return new TreeData("let");

    case SyntaxType.CompoundStatement:
      return new TreeData("Compound Statement");

    case SyntaxType.Blocktype:
      return new TreeData(`${(node as BlockTypeNode).block_type.content}`);

    case SyntaxType.BeginStatement:
      return new TreeData("begin");

    case SyntaxType.ForeachStatement:
      return new TreeData("foreach");

    case SyntaxType.Branch:
      return new TreeData("Branch");

    case SyntaxType.WhileStatement:
      return new TreeData("while");

    case SyntaxType.IfStatement:
      return new TreeData("if");

    case SyntaxType.Script:
      return new TreeData("Script");

    default:
      if (
        IsOperator(node.type) ||
        IsTypename(node.type) ||
        IsKeyword(node.type)
      )
        return new TreeData("NULL");
      else
        return new TreeData(`Token: ${SyntaxTypeMap.All[node.type]}`);
  }
}

export function TreeToTreeData(node: Node): TreeData {
  const stack: TreeData[] = [];

  TraverseTree(
    node,
    (node) => {
      stack.push(NodeToTreeData(node));
    },
    () => {
      if (stack[stack.length - 1].name === "NULL")
        stack.pop();
      else if (stack.length > 1) {
        stack[stack.length - 2].append(stack.pop()!);
      }
    }
  );

  return stack.pop()!;
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

    case SyntaxType.BinOp: {
      const lhs = GetExpressionType((node as BinOpNode).lhs);
      const rhs = GetExpressionType((node as BinOpNode).rhs);

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
    case SyntaxType.BinOp: {
      const lhs = GetExpressionType((node as BinOpNode).lhs);
      const rhs = GetExpressionType((node as BinOpNode).rhs);

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

// export function AppendNodeSymbol(
//   node: Node,
//   symbol_table: Record<string, Token<SyntaxType.Identifier>>
// ): { [key: string]: Token<SyntaxType.Identifier> } | void {
//   switch (node.type) {
//     case SyntaxType.VariableDeclaration:
//       symbol_table[(node as VariableDeclarationNode).] = node;

//     default:
//       return;
//   }
// }

export function ValidateTree(node: Node): Diagnostic[] {
  let diagnositcs: Diagnostic[] = [];

  TraverseTree(
    node,
    (node) => {
      diagnositcs = diagnositcs.concat(ValidateNode(node));
    }
  );

  return diagnositcs;
}
