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
  ASSIGNMENT_OPERATOR_START,
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
  ASSIGNMENT_OPERATOR_END,
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
  LambdaExpression,
  LambdaInlineExpression,
  UnaryExpression,
  BinaryExpresison,
  ElementAccessExpression,
  FunctionExpression,

  BlocktypeExpression,
  Branch,

  // Statement
  VariableDeclarationStatement,
  SetStatement,
  LetStatement,
  BeginStatement,
  IfStatement,
  WhileStatement,
  ForeachStatement,
  CompoundStatement,

  Script,
}

export type TypenameSyntaxType =
  SyntaxType.Short |
  SyntaxType.Int |
  SyntaxType.Long |
  SyntaxType.Float |
  SyntaxType.Reference |
  SyntaxType.StringVar |
  SyntaxType.ArrayVar;

export type KeywordSyntaxType =
  SyntaxType.ScriptName |
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

export type BranchKeywordSyntaxType = SyntaxType.While | SyntaxType.If | SyntaxType.Elseif;

export type AssignmentOperatorSyntaxType =
  SyntaxType.Equals |
  SyntaxType.ColonEquals |
  SyntaxType.PlusEquals |
  SyntaxType.MinusEquals |
  SyntaxType.AsteriskEquals |
  SyntaxType.SlashEquals |
  SyntaxType.PercentEquals |
  SyntaxType.CircumflexEquals |
  SyntaxType.VBarEquals |
  SyntaxType.AmpersandEquals;


export type OperatorSyntaxType =
  AssignmentOperatorSyntaxType |
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

export type AssignmentOperator = Token<OperatorSyntaxType>;
export type Operator = Token<OperatorSyntaxType>;
export type Keyword = Token<KeywordSyntaxType>
export type BranchKeyword = Token<BranchKeywordSyntaxType>;
export type Typename = Token<TypenameSyntaxType>

export type PrimaryExpression =
  StringLiteral |
  NumberLiteral |
  Token<SyntaxType.Identifier> |
  FunctionExpression |
  LambdaExpression |
  LambdaInlineExpression;

export type Expression =
  PrimaryExpression |
  UnaryExpression |
  BinaryExpression |
  ElementAccessExpression;

export type Statement =
  Keyword |
  VariableDeclarationStatement |
  SetStatement |
  LetStatement |
  CompoundStatement |
  BeginStatement |
  ForeachStatement |
  WhileStatement |
  IfStatement |
  Expression;


export function IsTypename(type: SyntaxType): boolean {
  return SyntaxType.TYPENAME_START < type && type < SyntaxType.TYPENAME_END;
}

export function IsKeyword(type: SyntaxType): boolean {
  return SyntaxType.KEYWORD_START < type && type < SyntaxType.KEYWORD_END;
}

export function IsOperator(type: SyntaxType): boolean {
  return SyntaxType.OPERATOR_START < type && type < SyntaxType.OPERATOR_END;
}

export function IsAssignmentOperator(type: SyntaxType): boolean {
  return SyntaxType.ASSIGNMENT_OPERATOR_START < type && type < SyntaxType.ASSIGNMENT_OPERATOR_END;
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

export class TokenWithValue<T> extends Token {
  value!: T;
}

export class Comment extends TokenWithValue<string> {
  type = SyntaxType.Comment;
}

export class NumberLiteral extends TokenWithValue<number> {
  type = SyntaxType.Number;
}

export class StringLiteral extends TokenWithValue<string> {
  type = SyntaxType.String;
}

export class VariableDeclaration extends Node {
  type = SyntaxType.VariableDeclaration;

  variable_type!: Typename;
  variable!: Token<SyntaxType.Identifier>;
}

export class UnaryExpression extends Node {
  type = SyntaxType.UnaryExpression;

  op!: Operator;
  operand!: Expression;
}

export class BinaryExpression extends Node {
  type = SyntaxType.BinaryExpresison;

  lhs!: Expression;
  op!: Operator;
  rhs!: Expression;
}

export class ElementAccessExpression extends Node {
  type = SyntaxType.ElementAccessExpression;

  lhs!: Expression;
  left_op!: Token<SyntaxType.LSQBracket>;
  rhs!: Expression;
  right_op!: Token<SyntaxType.RSQBracket>;
}

export class FunctionExpression extends Node {
  type = SyntaxType.FunctionExpression;

  name!: Token<SyntaxType.Identifier>;
  args: Expression[] = [];
}

export class LambdaInlineExpression extends Node {
  type = SyntaxType.LambdaInlineExpression;

  lbracket!: Token<SyntaxType.LBracket>;
  params: (Token<SyntaxType.Identifier> | VariableDeclaration)[] = [];
  rbracket!: Token<SyntaxType.RBracket>;
  arrow!: Token<SyntaxType.EqualsGreater>;

  expression!: Expression;
}

export class LambdaExpression extends Node {
  type = SyntaxType.LambdaExpression;

  begin!: Token<SyntaxType.Begin>;
  function!: Token<SyntaxType.BlocktypeTokenFunction>;
  lbracket!: Token<SyntaxType.LBracket>;
  params: (Token<SyntaxType.Identifier> | VariableDeclaration)[] = [];
  rbracket!: Token<SyntaxType.RBracket>;

  compound_statement!: CompoundStatement;

  end!: Token<SyntaxType.End>;
}

export class VariableDeclarationStatement extends Node {
  type = SyntaxType.VariableDeclarationStatement;

  variable!: VariableDeclaration;
  op?: Operator;
  expression?: Expression;
}

export class SetStatement extends Node {
  type = SyntaxType.SetStatement;

  set!: Token<SyntaxType.Set>;
  variable!: Token<SyntaxType.Identifier>;
  to!: Token<SyntaxType.To>;
  expression!: Expression;
}
export class LetStatement extends Node {
  type = SyntaxType.LetStatement;

  let!: Token<SyntaxType.Let>;
  variable!: Token<SyntaxType.Identifier> | VariableDeclaration;
  op!: Operator;
  expression!: Expression;
}

export class CompoundStatement extends Node {
  type = SyntaxType.CompoundStatement;

  children: Statement[] = [];
}

export class BlocktypeExpression extends Node {
  type = SyntaxType.BlocktypeExpression;

  block_type!: Token<SyntaxType.BlocktypeToken>;
  args: Node[] = [];
}

export class BeginStatement extends Node {
  type = SyntaxType.BeginStatement;

  begin!: Token<SyntaxType.Begin>;
  block_type!: BlocktypeExpression;
  compound_statement!: CompoundStatement;
  end!: Token<SyntaxType.End>;
}

export class ForeachStatement extends Node {
  type = SyntaxType.ForeachStatement;

  foreach!: Token<SyntaxType.Foreach>;
  identifier!: Token<SyntaxType.Identifier> | VariableDeclaration;
  larrow!: Token<SyntaxType.LArrow>;
  iterable!: Expression;

  compound_statement!: CompoundStatement;

  loop!: Token<SyntaxType.Loop>;
}

export class Branch<T extends BranchKeyword> extends Node {
  type = SyntaxType.Branch;

  keyword!: T;
  condition!: Expression;
  compound_statement!: CompoundStatement;
}

export class WhileStatement extends Node {
  type = SyntaxType.WhileStatement;

  branch!: Branch<Token<SyntaxType.While>>;
  loop!: Token<SyntaxType.Loop>;
}

export class IfStatement extends Node {
  type = SyntaxType.IfStatement;

  branches: Branch<Token<SyntaxType.If> | Token<SyntaxType.Elseif>>[] = [];
  else?: Token<SyntaxType.Else>;
  else_statements?: CompoundStatement;
  endif!: Token<SyntaxType.Endif>;
}

export class Script extends Node {
  type = SyntaxType.Script;

  scriptname!: Token<SyntaxType.ScriptName>;
  name!: Token<SyntaxType.Identifier>;
  compound_statement!: CompoundStatement;

  comments: Comment[] = [];

  diagnostics: Diagnostic[] = [];
}