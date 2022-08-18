import { Diagnostic } from "vscode-languageserver";
import { Range } from "vscode-languageserver-textdocument";


export const enum TokenType {
  Unknown,

  Typename,
  Keyword,
  Operator,
  Blocktype,
}

export const enum SyntaxType {
  Unknown,

  EOF,
  Newline,
  Comment,

  Identifier,
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

  // Special
  VariableDeclaration,
  Blocktype,
  Branch,
  Script,

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
  CompoundStatement,
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

export class Token<
  TT extends TokenType = TokenType,
  ST extends SyntaxType = SyntaxType
  > extends Node<ST> {
  declare token_type: TT;

  content = "";

  constructor(token_type?: TT, type?: ST) {
    super(type);

    this.token_type = token_type ?? TokenType.Unknown as TT;
  }
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

  variable_type!: Token<TokenType.Typename>;
  value!: ExpressionNode;
}

export class ExpressionNode extends Node {
}

export class UnaryOpNode extends ExpressionNode {
  type = SyntaxType.UnaryOp;

  op!: Token<TokenType.Operator>;
  operand!: ExpressionNode;
}

export class BinOpNode extends ExpressionNode {
  type = SyntaxType.BinOp;

  lhs!: ExpressionNode;
  op!: Token<TokenType.Operator>;
  rhs!: ExpressionNode;
}

export class BinOpPairedNode extends ExpressionNode {
  type = SyntaxType.BinOpPaired;

  lhs!: ExpressionNode;
  left_op!: Token<TokenType, SyntaxType.LSQBracket>;
  rhs!: ExpressionNode;
  right_op!: Token<TokenType, SyntaxType.RSQBracket>;
}

export class FunctionNode extends ExpressionNode {
  type = SyntaxType.Function;

  name!: Token<TokenType, SyntaxType.Identifier>;
  args: ExpressionNode[] = [];
}

export class LambdaInlineNode extends ExpressionNode {
  type = SyntaxType.LambdaInline;

  lbracket!: Token<TokenType, SyntaxType.LBracket>;
  params: ExpressionNode[] = [];
  rbracket!: Token<TokenType, SyntaxType.RBracket>;
  arrow!: Token<TokenType, SyntaxType.EqualsGreater>;

  expression!: ExpressionNode;
}

export class LambdaNode extends ExpressionNode {
  type = SyntaxType.Lambda;

  begin!: Token<TokenType, SyntaxType.Begin>;
  function!: Token<TokenType, SyntaxType.Function>;
  lbracket!: Token<TokenType, SyntaxType.LBracket>;
  params: ExpressionNode[] = [];
  rbracket!: Token<TokenType, SyntaxType.RBracket>;

  compound_statement!: CompoundStatementNode;

  end!: Token<TokenType, SyntaxType.End>;
}

export class StatementNode extends Node {
}

export class SetNode extends StatementNode {
  type = SyntaxType.SetStatement;

  set!: Token<TokenType, SyntaxType.Set>;
  identifier!: Token<TokenType, SyntaxType.Identifier>;
  to!: Token<TokenType, SyntaxType.To>;
  value!: ExpressionNode;
}

export class LetNode extends StatementNode {
  type = SyntaxType.LetStatement;

  let!: Token<TokenType, SyntaxType.Let>;
  value!: ExpressionNode;
}

export class CompoundStatementNode extends Node {
  type = SyntaxType.CompoundStatement;

  children: StatementNode[] = [];
}

export class BlockTypeNode extends Node {
  type = SyntaxType.Blocktype;

  block_type!: Token<TokenType.Blocktype>;
  args: Node[] = [];
}

export class BeginBlockNode extends StatementNode {
  type = SyntaxType.BeginStatement;

  begin!: Token<TokenType, SyntaxType.Begin>;
  block_type!: BlockTypeNode;
  compound_statement!: CompoundStatementNode;
  end!: Token<TokenType, SyntaxType.End>;
}

export class ForeachBlockNode extends StatementNode {
  type = SyntaxType.Foreach;

  foreach!: Token<TokenType, SyntaxType.Foreach>;
  idetifier!: Token<TokenType, SyntaxType.Identifier> | VariableDeclarationNode;
  larrow!: Token<TokenType, SyntaxType.LArrow>;
  iterable!: ExpressionNode;

  statements!: CompoundStatementNode;

  loop!: Token<TokenType, SyntaxType.Loop>;
}

export class BranchNode<T extends SyntaxType> extends Node {
  type = SyntaxType.Branch;

  keyword!: Token<TokenType, T>;
  condition!: ExpressionNode;
  statements!: CompoundStatementNode;
}

export class WhileBlockNode extends StatementNode {
  type = SyntaxType.WhileStatement;

  branch!: BranchNode<SyntaxType.While>;
  loop!: Token<TokenType, SyntaxType.Loop>;
}

export class IfBlockNode extends StatementNode {
  type = SyntaxType.IfStatement;

  branches: BranchNode<SyntaxType.If | SyntaxType.Elseif>[] = [];
  else?: Token<TokenType, SyntaxType.Else>;
  else_statements?: CompoundStatementNode;
  endif!: Token<TokenType, SyntaxType.Endif>;
}

export class ScriptNode extends Node {
  type = SyntaxType.Script;

  scriptname!: Token<TokenType, SyntaxType.ScriptName>;
  name!: Token<TokenType, SyntaxType.Identifier>;
  statements!: CompoundStatementNode;

  comments: CommentNode[] = [];

  diagnostics: Diagnostic[] = [];
}
