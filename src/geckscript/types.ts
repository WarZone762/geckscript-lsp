import { Diagnostic } from "vscode-languageserver";
import { Range } from "vscode-languageserver-textdocument";


export const enum SyntaxType {
  Unknown,

  EOF,
  Newline,
  Comment,

  Number,
  String,
  Identifier,
  BlocktypeToken,
  BlocktypeTokenFunction,

  // Typename
  TYPENAME_START,
  Short,
  Int,
  Long,
  Float,
  Reference,
  StringVar,
  ArrayVar,
  TYPENAME_END,

  // Keyword
  KEYWORD_START,
  ScriptName,
  Begin,
  End,
  If,
  Elseif,
  Else,
  Endif,
  While,
  Foreach,
  Loop,
  Continue,
  Break,
  Return,
  Set,
  To,
  Let,
  KEYWORD_END,

  // Operator
  OPERATOR_START,
  Equals,
  ColonEquals,
  PlusEquals,
  MinusEquals,
  AsteriskEquals,
  SlashEquals,
  PercentEquals,
  CircumflexEquals,
  VBarEquals,
  AmpersandEquals,
  Exclamation,
  DoubleVBar,
  DoubleAmpersand,
  DoubleEquals,
  ExclamationEquals,
  Greater,
  Less,
  GreaterEqulas,
  LessEqulas,
  Plus,
  Minus,
  Asterisk,
  Slash,
  Percent,
  Circumflex,
  VBar,
  Ampersand,
  DoubleLess,
  DoubleGreater,
  Dollar,
  Hash,
  LParen,
  RParen,
  LSQBracket,
  RSQBracket,
  LBracket,
  RBracket,
  Colon,
  LArrow,
  RArrow,
  Dot,
  DoubleColon,
  Comma,
  EqualsGreater,
  OPERATOR_END,

  VariableDeclaration,

  // Expression
  Lambda,
  LambdaInline,
  UnaryOp,
  BinOp,
  BinOpPaired,
  FunctionExpression,

  Blocktype,
  Branch,

  // Statement
  SetStatement,
  LetStatement,
  BeginStatement,
  IfStatement,
  WhileStatement,
  ForeachStatement,
  CompoundStatement,

  Script,
}

export type Typename = SyntaxType.Short |
  SyntaxType.Int |
  SyntaxType.Long |
  SyntaxType.Float |
  SyntaxType.Reference |
  SyntaxType.StringVar |
  SyntaxType.ArrayVar;

export type Keyword = SyntaxType.ScriptName |
  SyntaxType.Begin |
  SyntaxType.End |
  SyntaxType.If |
  SyntaxType.Elseif |
  SyntaxType.Else |
  SyntaxType.Endif |
  SyntaxType.While |
  SyntaxType.Foreach |
  SyntaxType.Loop |
  SyntaxType.Continue |
  SyntaxType.Break |
  SyntaxType.Return |
  SyntaxType.Set |
  SyntaxType.To |
  SyntaxType.Let;


export type Operator = SyntaxType.Equals |
  SyntaxType.ColonEquals |
  SyntaxType.PlusEquals |
  SyntaxType.MinusEquals |
  SyntaxType.AsteriskEquals |
  SyntaxType.SlashEquals |
  SyntaxType.PercentEquals |
  SyntaxType.CircumflexEquals |
  SyntaxType.VBarEquals |
  SyntaxType.AmpersandEquals |
  SyntaxType.Exclamation |
  SyntaxType.DoubleVBar |
  SyntaxType.DoubleAmpersand |
  SyntaxType.DoubleEquals |
  SyntaxType.ExclamationEquals |
  SyntaxType.Greater |
  SyntaxType.Less |
  SyntaxType.GreaterEqulas |
  SyntaxType.LessEqulas |
  SyntaxType.Plus |
  SyntaxType.Minus |
  SyntaxType.Asterisk |
  SyntaxType.Slash |
  SyntaxType.Percent |
  SyntaxType.Circumflex |
  SyntaxType.VBar |
  SyntaxType.Ampersand |
  SyntaxType.DoubleLess |
  SyntaxType.DoubleGreater |
  SyntaxType.Dollar |
  SyntaxType.Hash |
  SyntaxType.LParen |
  SyntaxType.RParen |
  SyntaxType.LSQBracket |
  SyntaxType.RSQBracket |
  SyntaxType.LBracket |
  SyntaxType.RBracket |
  SyntaxType.Colon |
  SyntaxType.LArrow |
  SyntaxType.RArrow |
  SyntaxType.Dot |
  SyntaxType.DoubleColon |
  SyntaxType.Comma |
  SyntaxType.EqualsGreater;

export function IsTypename(type: SyntaxType): boolean {
  return SyntaxType.TYPENAME_START < type && type < SyntaxType.TYPENAME_END;
}

export function IsKeyword(type: SyntaxType): boolean {
  return SyntaxType.KEYWORD_START < type && type < SyntaxType.KEYWORD_END;
}

export function IsOperator(type: SyntaxType): boolean {
  return SyntaxType.OPERATOR_START < type && type < SyntaxType.OPERATOR_END;
}

export class TreeData {
  name: string;
  children: TreeData[];

  constructor(name: string, children: TreeData[] = []) {
    this.name = name;
    this.children = children;
  }

  append(child: TreeData): void {
    this.children.push(child);
  }

  concat(children: TreeData[]): void {
    this.children = this.children.concat(children);
  }
}

export class Node<T extends SyntaxType = SyntaxType> {
  type: T;
  range!: Range;

  constructor(type?: T) {
    this.type = type ?? SyntaxType.Unknown as T;
  }
}

export class Token<T extends SyntaxType = SyntaxType> extends Node<T> {
  content = "";
}

export class CommentNode extends Node {
  type = SyntaxType.Comment;

  value!: string;
  content!: string;
}

export class Literal<T> extends Node {
  value!: T;
  content!: string;
}

export class NumberNode extends Literal<number> {
  type = SyntaxType.Number;
}

export class StringNode extends Literal<string> {
  type = SyntaxType.String;
}

export class VariableDeclarationNode extends Node {
  type = SyntaxType.VariableDeclaration;

  variable_type!: Token<Typename>;
  value!: ExpressionNode;
}

export class ExpressionNode extends Node {
}

export class UnaryOpNode extends ExpressionNode {
  type = SyntaxType.UnaryOp;

  op!: Token<Operator>;
  operand!: ExpressionNode;
}

export class BinOpNode extends ExpressionNode {
  type = SyntaxType.BinOp;

  lhs!: ExpressionNode;
  op!: Token<Operator>;
  rhs!: ExpressionNode;
}

export class BinOpPairedNode extends ExpressionNode {
  type = SyntaxType.BinOpPaired;

  lhs!: ExpressionNode;
  left_op!: Token<SyntaxType.LSQBracket>;
  rhs!: ExpressionNode;
  right_op!: Token<SyntaxType.RSQBracket>;
}

export class FunctionNode extends ExpressionNode {
  type = SyntaxType.FunctionExpression;

  name!: Token<SyntaxType.Identifier>;
  args: ExpressionNode[] = [];
}

export class LambdaInlineNode extends ExpressionNode {
  type = SyntaxType.LambdaInline;

  lbracket!: Token<SyntaxType.LBracket>;
  params: ExpressionNode[] = [];
  rbracket!: Token<SyntaxType.RBracket>;
  arrow!: Token<SyntaxType.EqualsGreater>;

  expression!: ExpressionNode;
}

export class LambdaNode extends ExpressionNode {
  type = SyntaxType.Lambda;

  begin!: Token<SyntaxType.Begin>;
  function!: Token<SyntaxType.BlocktypeTokenFunction>;
  lbracket!: Token<SyntaxType.LBracket>;
  params: ExpressionNode[] = [];
  rbracket!: Token<SyntaxType.RBracket>;

  compound_statement!: CompoundStatementNode;

  end!: Token<SyntaxType.End>;
}

export class StatementNode extends Node {
}

export class SetNode extends StatementNode {
  type = SyntaxType.SetStatement;

  set!: Token<SyntaxType.Set>;
  identifier!: Token<SyntaxType.Identifier>;
  to!: Token<SyntaxType.To>;
  value!: ExpressionNode;
}

export class LetNode extends StatementNode {
  type = SyntaxType.LetStatement;

  let!: Token<SyntaxType.Let>;
  value!: ExpressionNode;
}

export class CompoundStatementNode extends Node {
  type = SyntaxType.CompoundStatement;

  children: StatementNode[] = [];
}

export class BlockTypeNode extends Node {
  type = SyntaxType.Blocktype;

  block_type!: Token<SyntaxType.BlocktypeToken>;
  args: Node[] = [];
}

export class BeginBlockNode extends StatementNode {
  type = SyntaxType.BeginStatement;

  begin!: Token<SyntaxType.Begin>;
  block_type!: BlockTypeNode;
  compound_statement!: CompoundStatementNode;
  end!: Token<SyntaxType.End>;
}

export class ForeachBlockNode extends StatementNode {
  type = SyntaxType.Foreach;

  foreach!: Token<SyntaxType.Foreach>;
  idetifier!: Token<SyntaxType.Identifier> | VariableDeclarationNode;
  larrow!: Token<SyntaxType.LArrow>;
  iterable!: ExpressionNode;

  statements!: CompoundStatementNode;

  loop!: Token<SyntaxType.Loop>;
}

export class BranchNode<T extends Keyword> extends Node {
  type = SyntaxType.Branch;

  keyword!: Token<T>;
  condition!: ExpressionNode;
  statements!: CompoundStatementNode;
}

export class WhileBlockNode extends StatementNode {
  type = SyntaxType.WhileStatement;

  branch!: BranchNode<SyntaxType.While>;
  loop!: Token<SyntaxType.Loop>;
}

export class IfBlockNode extends StatementNode {
  type = SyntaxType.IfStatement;

  branches: BranchNode<SyntaxType.If | SyntaxType.Elseif>[] = [];
  else?: Token<SyntaxType.Else>;
  else_statements?: CompoundStatementNode;
  endif!: Token<SyntaxType.Endif>;
}

export class ScriptNode extends Node {
  type = SyntaxType.Script;

  scriptname!: Token<SyntaxType.ScriptName>;
  name!: Token<SyntaxType.Identifier>;
  statements!: CompoundStatementNode;

  comments: CommentNode[] = [];

  diagnostics: Diagnostic[] = [];
}
