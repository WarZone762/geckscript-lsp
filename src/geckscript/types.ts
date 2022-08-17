import { Range } from "vscode-languageserver-textdocument";


export const enum SyntaxType {
  Unknown,

  EOF,
  Newline,
  Comment,

  Literal,
  Identifier,
  Typename,
  Keyword,
  Operator,
  BlockType,
  BlockTypeNode,
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

  // Typename
  Short,
  Int,
  Long,
  Float,
  Reference,
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

export class TreeData {
  name: string;
  children: TreeData[];

  constructor(name: string, children: TreeData[] = []) {
    this.name = name;
    this.children = children;
  }

  append(child: TreeData | undefined): void {
    if (child != undefined) this.children.push(child);
  }

  concat(children: TreeData[] | undefined): void {
    if (children != undefined)
      this.children = this.children.concat(children);
  }
}

export class Node {
  type: SyntaxType = SyntaxType.Unknown;
  subtype: SyntaxSubtype = SyntaxSubtype.Unknown;
  range!: Range;
}

export class Token<
  T extends SyntaxType = SyntaxType,
  ST extends SyntaxSubtype = SyntaxSubtype
  > extends Node {
  declare type: T;
  declare subtype: ST;

  content = "";

  constructor(type?: T, subtype?: ST) {
    super();

    this.type = type ?? SyntaxType.Unknown as T;
    this.subtype = subtype ?? SyntaxSubtype.Unknown as ST;
  }
}

export class CommentNode extends Node {
  type = SyntaxType.Comment;

  value!: string;
  text!: string;
}

export class Literal<T> extends Node {
  type = SyntaxType.Literal;

  value!: T;
  text!: string;
}

export class NumberNode extends Literal<number> {
  subtype = SyntaxSubtype.Number;
}

export class StringNode extends Literal<string> {
  subtype = SyntaxSubtype.String;
}

export class VariableDeclarationNode extends Node {
  type = SyntaxType.VariableDeclaration;

  variable_type!: Token<SyntaxType.Typename>;
  value!: ExpressionNode;
}

export class ExpressionNode extends Node {
  type = SyntaxType.Expression;
}

export class UnaryOpNode extends ExpressionNode {
  subtype = SyntaxSubtype.UnaryOp;

  op!: Token<SyntaxType.Operator>;
  operand!: ExpressionNode;
}

export class BinOpNode extends ExpressionNode {
  subtype = SyntaxSubtype.BinOp;

  lhs!: ExpressionNode;
  op!: Token<SyntaxType.Operator>;
  rhs!: ExpressionNode;
}

export class BinOpPairedNode extends ExpressionNode {
  subtype = SyntaxSubtype.BinOpPaired;

  lhs!: ExpressionNode;
  left_op!: Token<SyntaxType.Operator, SyntaxSubtype.LSQBracket>;
  rhs!: ExpressionNode;
  right_op!: Token<SyntaxType.Operator, SyntaxSubtype.RSQBracket>;
}

export class FunctionNode extends ExpressionNode {
  subtype = SyntaxSubtype.Function;

  name!: Token<SyntaxType.Identifier>;
  args: ExpressionNode[] = [];
}

export class LambdaInlineNode extends ExpressionNode {
  subtype = SyntaxSubtype.LambdaInline;

  lbracket!: Token<SyntaxType.Operator, SyntaxSubtype.LBracket>;
  params: ExpressionNode[] = [];
  rbracket!: Token<SyntaxType.Operator, SyntaxSubtype.RBracket>;
  arrow!: Token<SyntaxType.Operator, SyntaxSubtype.EqualsGreater>;

  expression!: ExpressionNode;
}

export class LambdaNode extends ExpressionNode {
  subtype = SyntaxSubtype.Lambda;

  begin!: Token<SyntaxType.Keyword, SyntaxSubtype.Begin>;
  function!: Token<SyntaxType.BlockType, SyntaxSubtype.Function>;
  lbracket!: Token<SyntaxType.Operator, SyntaxSubtype.LBracket>;
  params: ExpressionNode[] = [];
  rbracket!: Token<SyntaxType.Operator, SyntaxSubtype.RBracket>;

  compound_statement!: CompoundStatementNode;

  end!: Token<SyntaxType.Keyword, SyntaxSubtype.End>;
}

export class StatementNode extends Node {
  type = SyntaxType.Statement;
}

export class SetNode extends StatementNode {
  subtype = SyntaxSubtype.SetStatement;

  set!: Token<SyntaxType.Keyword, SyntaxSubtype.Set>;
  identifier!: Token<SyntaxType.Identifier>;
  to!: Token<SyntaxType.Keyword, SyntaxSubtype.To>;
  value!: ExpressionNode;
}

export class LetNode extends StatementNode {
  subtype = SyntaxSubtype.LetStatement;

  let!: Token<SyntaxType.Keyword, SyntaxSubtype.Let>;
  value!: ExpressionNode;
}

export class CompoundStatementNode extends Node {
  type = SyntaxType.CompoundStatement;

  children: StatementNode[] = [];
  symbol_table: Token<SyntaxType.Identifier>[] = [];
}

export class BlockTypeNode extends Node {
  type = SyntaxType.BlockTypeNode;

  block_type!: Token<SyntaxType.BlockType>;
  args: Token[] = [];
}

export class BeginBlockNode extends StatementNode {
  subtype = SyntaxSubtype.BeginStatement;

  begin!: Token<SyntaxType.Keyword, SyntaxSubtype.Begin>;
  block_type!: BlockTypeNode;
  compound_statement!: CompoundStatementNode;
  end!: Token<SyntaxType.Keyword, SyntaxSubtype.End>;
}

export class ForeachBlockNode extends StatementNode {
  subtype = SyntaxSubtype.Foreach;

  foreach!: Token<SyntaxType.Keyword, SyntaxSubtype.Foreach>;
  idetifier!: Token<SyntaxType.Identifier> | VariableDeclarationNode;
  larrow!: Token<SyntaxType.Operator, SyntaxSubtype.LArrow>;
  iterable!: ExpressionNode;

  statements!: CompoundStatementNode;

  loop!: Token<SyntaxType.Keyword, SyntaxSubtype.Loop>;
}

export class BranchNode<T extends SyntaxSubtype> extends Node {
  type = SyntaxType.Branch;

  keyword!: Token<SyntaxType.Keyword, T>;
  condition!: ExpressionNode;
  statements!: CompoundStatementNode;
}

export class WhileBlockNode extends StatementNode {
  subtype = SyntaxSubtype.WhileStatement;

  branch!: BranchNode<SyntaxSubtype.While>;
  loop!: Token<SyntaxType.Keyword, SyntaxSubtype.Loop>;
}

export class IfBlockNode extends StatementNode {
  subtype = SyntaxSubtype.IfStatement;

  branches: BranchNode<SyntaxSubtype.If | SyntaxSubtype.Elseif>[] = [];
  else?: Token<SyntaxType.Keyword, SyntaxSubtype.Else>;
  else_statements?: CompoundStatementNode;
  endif!: Token<SyntaxType.Keyword, SyntaxSubtype.Endif>;
}

export class ScriptNode extends Node {
  type = SyntaxType.Script;

  scriptname!: Token<SyntaxType.Keyword, SyntaxSubtype.ScriptName>;
  name!: Token<SyntaxType.Identifier>;
  statements!: CompoundStatementNode;
}
