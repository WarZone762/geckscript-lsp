import { Position, Range } from "vscode-languageserver-textdocument";


export const enum SyntaxType {
  Unknown,

  Newline,
  EOF,
  Comment,

  Literal,
  Identifier,
  Typename,
  Keyword,
  Operator,
  BlockType,
  VariableDeclaration,
  Branch,
  Expression,
  Statement,
  CompoundStatement,
  Script,
}

export const enum SyntaxSubtype {
  Unknown,

  // Literal
  Number,
  String,

  // Identifier
  VariableIdentifier,
  FunctionIdentifier,

  // Typename
  Short,
  Int,
  Long,
  Float,
  Ref,
  StringVar,
  ArrayVar,

  // Keyword
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

  // Operator
  Equals,
  ColonEquals,
  PlusEquals,
  MinusEquals,
  AsteriskEquals,
  SlashEquals,
  PercentEquals,
  CircumflexEquals,
  VbarEquals,
  AmpersandEquals,
  Exclamation,
  DoubleVbar,
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
  Vbar,
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
  Rarrow,
  Dot,
  DoubleColon,
  Comma,
  EqualsGreater,

  // Expression
  Lambda,
  LambdaInline,
  UnaryOp,
  BinOp,
  BinOpPaired,
  Function,

  // Statement
  LetStatement,
  SetStatement,
  BeginStatement,
  IfStatement,
  WhileStatement,
  ForeachStatement,
}

export interface Node {
  type: SyntaxType;
  subtype: SyntaxSubtype;
  range: Range;
}

export interface Token<T extends SyntaxType, ST extends SyntaxSubtype = SyntaxSubtype> extends Node {
  type: T;
  subtype: ST;

  content: string;
}

export interface CommentNode extends Node {
  type: SyntaxType.Comment;

  value: string;
  text: string;
}

export interface NumberNode extends Node {
  type: SyntaxType.Literal;
  subtype: SyntaxSubtype.Number;

  value: number;
}

export interface StringNode extends Node {
  type: SyntaxType.Literal;
  subtype: SyntaxSubtype.String;

  value: string;
  text: string;
}

export interface VariableDeclarationNode extends Node {
  type: SyntaxType.VariableDeclaration;

  variable_type: Token<SyntaxType.Typename>;
  value: ExpressionNode;
}

export interface ExpressionNode extends Node {
  type: SyntaxType.Expression;
}

export interface UnaryOpNode extends ExpressionNode {
  subtype: SyntaxSubtype.UnaryOp;

  op: Token<SyntaxType.Operator>;
  operand: ExpressionNode;
}

export interface BinOpNode extends ExpressionNode {
  subtype: SyntaxSubtype.BinOp;

  lhs: ExpressionNode;
  op: Token<SyntaxType.Operator>;
  rhs: ExpressionNode;
}

export interface BinOpPairedNode extends ExpressionNode {
  subtype: SyntaxSubtype.BinOpPaired;

  lhs: ExpressionNode;
  left_op: Token<SyntaxType.Operator, SyntaxSubtype.LSQBracket>;
  rhs: ExpressionNode;
  right_op: Token<SyntaxType.Operator, SyntaxSubtype.RSQBracket>;
}

export interface FunctionNode extends ExpressionNode {
  subtype: SyntaxSubtype.Function;

  name: Token<SyntaxType.Identifier, SyntaxSubtype.FunctionIdentifier>;
  args: ExpressionNode[];
}

export interface LambdaInlineNode extends ExpressionNode {
  subtype: SyntaxSubtype.LambdaInline;

  lbracket: Token<SyntaxType.Operator, SyntaxSubtype.LSQBracket>;
  params: ExpressionNode[];
  rbracket: Token<SyntaxType.Operator, SyntaxSubtype.LSQBracket>;
  arrow_token: Token<SyntaxType.Operator, SyntaxSubtype.LArrow>;

  expression: ExpressionNode;
}

export interface LambdaNode extends ExpressionNode {
  subtype: SyntaxSubtype.Lambda;

  begin: Token<SyntaxType.Keyword, SyntaxSubtype.Begin>;
  function: Token<SyntaxType.BlockType, SyntaxSubtype.Function>;
  lbracket: Token<SyntaxType.Operator, SyntaxSubtype.LBracket>;
  params: ExpressionNode[];
  rbracket: Token<SyntaxType.Operator, SyntaxSubtype.RBracket>;

  compound_statement: CompoundStatementNode;

  end: Token<SyntaxType.Keyword, SyntaxSubtype.End>;
}

export interface StatementNode extends Node {
  type: SyntaxType.Statement;
}

export interface SetNode extends StatementNode {
  subtype: SyntaxSubtype.SetStatement;

  set: Token<SyntaxType.Keyword, SyntaxSubtype.Set>;
  identifier: Token<SyntaxType.Identifier, SyntaxSubtype.VariableIdentifier>;
  to: Token<SyntaxType.Keyword, SyntaxSubtype.To>;
  value: ExpressionNode;
}

export interface LetNode extends StatementNode {
  subtype: SyntaxSubtype.LetStatement;

  let: Token<SyntaxType.Keyword, SyntaxSubtype.Let>;
  value: ExpressionNode;
}

export interface CompoundStatementNode extends Node {
  type: SyntaxType.CompoundStatement;

  children: StatementNode[];
  symbol_table: Token<SyntaxType.Identifier, SyntaxSubtype.VariableIdentifier>[];
}

export interface BeginBlockNode extends StatementNode {
  subtype: SyntaxSubtype.BeginStatement;

  begin: Token<SyntaxType.Keyword, SyntaxSubtype.Begin>;
  expression: ExpressionNode;
  compound_statement: CompoundStatementNode;
  end: Token<SyntaxType.Keyword, SyntaxSubtype.End>;
}

export interface ForeachBlockNode extends StatementNode {
  subtype: SyntaxSubtype.Foreach;

  foreach: Token<SyntaxType.Keyword, SyntaxSubtype.Foreach>;
  idetifier: Token<SyntaxType.Identifier, SyntaxSubtype.VariableIdentifier> | VariableDeclarationNode;
  larrow: Token<SyntaxType.Operator, SyntaxSubtype.LArrow>;
  iterable: ExpressionNode;

  statements: CompoundStatementNode;

  loop: Token<SyntaxType.Keyword, SyntaxSubtype.Loop>;
}

export interface BranchNode<T extends SyntaxSubtype> extends Node {
  type: SyntaxType.Branch;

  keyword: Token<SyntaxType.Keyword, T>;
  condition: ExpressionNode;
  statements: CompoundStatementNode;
}

export interface WhileBlockNode extends StatementNode {
  subtype: SyntaxSubtype.WhileStatement;

  branch: BranchNode<SyntaxSubtype.While>;
  loop: Token<SyntaxType.Keyword, SyntaxSubtype.Loop>;
}

export interface IfBlockNode extends StatementNode {
  subtype: SyntaxSubtype.IfStatement;

  branches: BranchNode<SyntaxSubtype.If | SyntaxSubtype.Elseif>[];
  else: Token<SyntaxType.Keyword, SyntaxSubtype.Else>;
  else_statements: CompoundStatementNode;
  endif: Token<SyntaxType.Keyword, SyntaxSubtype.Endif>;
}

export interface ScriptNode extends Node {
  type: SyntaxType.Script;

  scriptname: Token<SyntaxType.Keyword, SyntaxSubtype.ScriptName>;
  name: Token<SyntaxType.Identifier, SyntaxSubtype.FunctionIdentifier>;
  statements: CompoundStatementNode;
}
