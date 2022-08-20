import { Diagnostic } from "vscode-languageserver";
import { SyntaxTypeMap } from "./token_data";
import {
  SyntaxType,
  Node,
  VariableDeclarationNode,
  UnaryOpNode,
  BinOpNode,
  BinOpPairedNode,
  FunctionNode,
  LambdaInlineNode,
  LambdaNode,
  SetNode,
  LetNode,
  CompoundStatementNode,
  BlockTypeNode,
  BeginBlockNode,
  ForeachBlockNode,
  BranchNode,
  Keyword,
  WhileBlockNode,
  IfBlockNode,
  ScriptNode,
  TreeData,
  Token,
  IsOperator,
  IsTypename,
  IsKeyword,
  CommentNode,
  NumberNode,
  StringNode
} from "./types";


export class NodeVisitor {
  static Functions: { [key in SyntaxType]?: (node: any, func: <T extends Node>(node: T) => void) => void } = {
    [SyntaxType.VariableDeclaration]: (node: VariableDeclarationNode, func) => {
      func(node.variable_type);
      func(node.value);
    },

    [SyntaxType.UnaryOp]: (node: UnaryOpNode, func) => {
      func(node.op);
      func(node.operand);
    },

    [SyntaxType.BinOp]: (node: BinOpNode, func) => {
      func(node.lhs);
      func(node.op);
      func(node.rhs);
    },

    [SyntaxType.BinOpPaired]: (node: BinOpPairedNode, func) => {
      func(node.lhs);
      func(node.left_op);
      func(node.rhs);
      func(node.right_op);
    },

    [SyntaxType.FunctionExpression]: (node: FunctionNode, func) => {
      func(node.name);
      node.args.map(func);
    },

    [SyntaxType.LambdaInline]: (node: LambdaInlineNode, func) => {
      func(node.lbracket);
      node.params.map(func);
      func(node.rbracket);
      func(node.arrow);
      func(node.expression);
    },

    [SyntaxType.Lambda]: (node: LambdaNode, func) => {
      func(node.begin);
      func(node.function);
      func(node.lbracket);
      node.params.map(func);
      func(node.rbracket);
      func(node.compound_statement);
      func(node.end);
    },

    [SyntaxType.SetStatement]: (node: SetNode, func) => {
      func(node.set);
      func(node.identifier);
      func(node.to);
      func(node.value);
    },

    [SyntaxType.LetStatement]: (node: LetNode, func) => {
      func(node.let);
      func(node.value);
    },

    [SyntaxType.CompoundStatement]: (node: CompoundStatementNode, func) => {
      node.children.map(func);
    },

    [SyntaxType.Blocktype]: (node: BlockTypeNode, func) => {
      func(node.block_type);
      node.args.map(func);
    },

    [SyntaxType.BeginStatement]: (node: BeginBlockNode, func) => {
      func(node.begin);
      func(node.block_type);
      func(node.compound_statement);
      func(node.end);
    },

    [SyntaxType.ForeachStatement]: (node: ForeachBlockNode, func) => {
      func(node.foreach);
      func(node.idetifier);
      func(node.larrow);
      func(node.iterable);
      func(node.statements);
      func(node.loop);
    },

    [SyntaxType.Branch]: (node: BranchNode<Keyword>, func) => {
      func(node.keyword);
      func(node.condition);
      func(node.statements);
    },

    [SyntaxType.WhileStatement]: (node: WhileBlockNode, func) => {
      func(node.branch);
      func(node.loop);
    },

    [SyntaxType.IfStatement]: (node: IfBlockNode, func) => {
      node.branches.map(func);
    },

    [SyntaxType.Script]: (node: ScriptNode, func) => {
      func(node.name);
      func(node.scriptname);
      func(node.statements);
      Object.values(node.comments).map(func);
    },
  };

  static VisitTree<T1 extends Node, T2 extends Node, T3 extends Node>(
    root: T1,
    pre_func: (node: T2) => void = () => undefined,
    post_func: (node: T3) => void = () => undefined,
  ): void {
    pre_func(root as any);
    if (root.type in NodeVisitor.Functions)
      NodeVisitor.Functions[root.type]!(
        root,
        (node) => { NodeVisitor.VisitTree(node, pre_func, post_func); }
      );
    post_func(root as any);
  }
}

export class ToTreeVisitor {
  static Functions: { [key in SyntaxType]?: (node: any) => TreeData } = {
    [SyntaxType.Unknown]: (node: Token) => {
      if (
        node.type === SyntaxType.Continue ||
        node.type === SyntaxType.Break ||
        node.type === SyntaxType.Return
      )
        return new TreeData(`Keyword: ${SyntaxTypeMap.All[node.type]}`);
      else if (
        IsOperator(node.type) ||
        IsTypename(node.type) ||
        IsKeyword(node.type)
      )
        return new TreeData("NULL");
      else
        return new TreeData(`Token: ${SyntaxTypeMap.All[node.type]}`);
    },
    [SyntaxType.Comment]: (node: CommentNode) => {
      return new TreeData(`${node.range.start.line}: ${node.content}`);
    },
    [SyntaxType.Number]: (node: NumberNode) => {
      return new TreeData(`${node.value}`);
    },
    [SyntaxType.String]: (node: StringNode) => {
      return new TreeData(`"${node.value}"`);
    },
    [SyntaxType.Identifier]: (node: Token) => {
      return new TreeData(`${node.content}`);
    },
    [SyntaxType.BlocktypeToken]: (node: Token) => {
      return new TreeData(`${node.content}`);
    },
    [SyntaxType.BlocktypeTokenFunction]: (node: Token) => {
      return new TreeData(`${node.content}`);
    },
    [SyntaxType.VariableDeclaration]: (node: VariableDeclarationNode) => {
      return new TreeData(`${node.variable_type.content}`);
    },
    [SyntaxType.UnaryOp]: (node: UnaryOpNode) => {
      return new TreeData(`${node.op.content}`);
    },
    [SyntaxType.BinOp]: (node: BinOpNode) => {
      return new TreeData(`${node.op.content}`);
    },
    [SyntaxType.BinOpPaired]: (node: BinOpPairedNode) => {
      return new TreeData(`${node.left_op}${node.right_op}`);
    },
    [SyntaxType.FunctionExpression]: (node: FunctionNode) => {
      return new TreeData(`${node.name.content}`);
    },
    [SyntaxType.LambdaInline]: (node: LambdaInlineNode) => {
      return new TreeData("Inline Lambda");
    },
    [SyntaxType.Lambda]: (node: LambdaNode) => {
      return new TreeData("Lambda");
    },
    [SyntaxType.SetStatement]: (node: SetNode) => {
      return new TreeData("set");
    },
    [SyntaxType.LetStatement]: (node: LetNode) => {
      return new TreeData("let");
    },
    [SyntaxType.CompoundStatement]: (node: CompoundStatementNode) => {
      return new TreeData("Compound Statement");
    },
    [SyntaxType.Blocktype]: (node: BlockTypeNode) => {
      return new TreeData(`${node.block_type.content}`);
    },
    [SyntaxType.BeginStatement]: (node: BeginBlockNode) => {
      return new TreeData("begin");
    },
    [SyntaxType.ForeachStatement]: (node: ForeachBlockNode) => {
      return new TreeData("foreach");
    },
    [SyntaxType.Branch]: (node: BranchNode<Keyword>) => {
      return new TreeData("Branch");
    },
    [SyntaxType.WhileStatement]: (node: WhileBlockNode) => {
      return new TreeData("while");
    },
    [SyntaxType.IfStatement]: (node: IfBlockNode) => {
      return new TreeData("if");
    },
    [SyntaxType.Script]: (node: ScriptNode) => {
      return new TreeData("Script");
    },
  };

  static ToTree(node: Node): TreeData {
    const stack: TreeData[] = [];

    NodeVisitor.VisitTree(
      node,
      (node) => {
        const func = ToTreeVisitor.Functions[node.type] ?? ToTreeVisitor.Functions[SyntaxType.Unknown]!;
        stack.push(func(node));
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

export class ValidateVisitor {
  static TypeFunctions: { [key in SyntaxType]?: (node: any) => ExpressionType } = {
    [SyntaxType.Unknown]: () => ExpressionType.Unknown,
    [SyntaxType.Number]: () => ExpressionType.Integer,
    [SyntaxType.String]: () => ExpressionType.String,
    [SyntaxType.Identifier]: () => ExpressionType.Any,
    [SyntaxType.BinOp]: (node: BinOpNode) => {
      const lhs = ValidateVisitor.GetType(node.lhs);
      const rhs = ValidateVisitor.GetType(node.rhs);

      if (lhs === ExpressionType.Any) return rhs;
      else if (rhs === ExpressionType.Any) return lhs;
      else if (lhs === rhs) return lhs;
      else return ExpressionType.Unknown;
    },
    [SyntaxType.FunctionExpression]: () => ExpressionType.Any,
  };

  static GetType(node: Node): ExpressionType {
    const func = ValidateVisitor.TypeFunctions[node.type] ?? ValidateVisitor.TypeFunctions[SyntaxType.Unknown]!;

    return func(node);
  }

  static ValidateFunctions: { [key in SyntaxType]?: (node: any) => Diagnostic[] } = {
    [SyntaxType.Unknown]: () => [],
    // [SyntaxType.Unknown]: (node: Token) => {
    //   if (node.type === SyntaxType.Unknown)
    //     return [{
    //       message: node.content ?? TokenSyntaxTypeMap.All[node.type] ?? "Unknown",
    //       range: node.range
    //     }];
    //   else
    //     return [];
    // },
    [SyntaxType.BinOp]: (node: BinOpNode) => {
      const lhs = ValidateVisitor.GetType(node.lhs);
      const rhs = ValidateVisitor.GetType(node.rhs);


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
  };

  static Validate(node: Node): Diagnostic[] {
    let diagnositcs: Diagnostic[] = [];

    NodeVisitor.VisitTree(
      node,
      (node) => {
        const func = ValidateVisitor.ValidateFunctions[node.type] ?? ValidateVisitor.ValidateFunctions[SyntaxType.Unknown]!;

        diagnositcs = diagnositcs.concat(func(node));
      }
    );

    return diagnositcs;
  }
}
