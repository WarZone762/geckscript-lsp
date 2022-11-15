import { Diagnostic } from "vscode-languageserver";
import { Range, TextDocument } from "vscode-languageserver-textdocument";
import * as AST from "./ast";
import * as Parser from "./parser";


export const enum SyntaxKind {
  UnknownToken,

  EOF,
  Newline,
  CommentToken,

  Number,
  String,
  IdentifierToken,
  Blocktype,
  BlocktypeFunction,

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
  Equals,            // assignment, simple assignment
  ColonEquals,       // assignment last
  PlusEquals,
  MinusEquals,
  AsteriskEquals,
  SlashEquals,
  PercentEquals,
  CircumflexEquals,
  VBarEquals,
  AmpersandEquals,   // assignment last
  Exclamation,
  Circumflex,
  Plus,              // additive
  Minus,             // additive last, unary
  Dollar,
  Hash,
  Ampersand,
  Asterisk,          // unary last, multiplicative
  Slash,
  Percent,           // multiplicative last
  DoubleLess,        // shift
  DoubleGreater,     // shift last
  VBar,
  Greater,           // relational
  Less,
  GreaterEqulas,
  LessEqulas,        // relational last
  DoubleEquals,      // equality
  ExclamationEquals, // equality last
  Colon,             // slice and make pair
  DoubleColon,       // slice and make pair last
  DoubleAmpersand,
  DoubleVBar,
  LParen,
  RParen,
  LSQBracket,
  RSQBracket,
  LBracket,
  RBracket,
  LArrow,
  RArrow,
  Dot,
  Comma,
  EqualsGreater,

  Unknown,
  Comment,
  NumberLiteral,
  StringLiteral,
  Identifier,
  VariableDeclaration,

  // Lists
  VariableList,
  PrimaryExpressionList,
  ExpressionList,
  BranchList,
  StatementList,

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

  Script,

  // Markers
  TYPENAME_FIRST = Short,
  TYPENAME_LAST = ArrayVar,

  KEYWORD_FIRST = ScriptName,
  KEYWORD_LAST = Let,

  OPERATOR_FIRST = Equals,
  OPERATOR_LAST = EqualsGreater,

  UNARY_OPERATOR_FIRST = Minus,
  UNARY_OPERATOR_LAST = Asterisk,

  MULTIPLICATIVE_OPERATOR_FIRST = Asterisk,
  MULTIPLICATIVE_OPERATOR_LAST = Percent,

  ADDITIVE_OPERATOR_FIRST = Plus,
  ADDITIVE_OPERATOR_LAST = Minus,

  SHIFT_OPERATOR_FIRST = DoubleLess,
  SHIFT_OPERATOR_LAST = DoubleGreater,

  RELATIONAL_OPERATOR_FIRST = Greater,
  RELATIONAL_OPERATOR_LAST = LessEqulas,

  EQUALITY_OPERATOR_FIRST = DoubleEquals,
  EQUALITY_OPERATOR_LAST = ExclamationEquals,

  SLICE_MAKE_PAIR_OPERATOR_FIRST = Colon,
  SLICE_MAKE_PAIR_OPERATOR_LAST = DoubleColon,

  ASSIGNMENT_OPERATOR_FIRST = Equals,
  ASSIGNMENT_OPERATOR_LAST = AmpersandEquals,

  SIMPLE_ASSIGNMENT_OPERATOR_FIRST = Equals,
  SIMPLE_ASSIGNMENT_OPERATOR_LAST = ColonEquals,
}

export type TypenameSyntaxKind =
  | SyntaxKind.Short
  | SyntaxKind.Int
  | SyntaxKind.Long
  | SyntaxKind.Float
  | SyntaxKind.Reference
  | SyntaxKind.StringVar
  | SyntaxKind.ArrayVar
  ;

export type KeywordSynaxKind =
  | SyntaxKind.ScriptName
  | SyntaxKind.Begin
  | SyntaxKind.End
  | SyntaxKind.If
  | SyntaxKind.Elseif
  | SyntaxKind.Else
  | SyntaxKind.Endif
  | SyntaxKind.While
  | SyntaxKind.Foreach
  | SyntaxKind.Loop
  | SyntaxKind.Continue
  | SyntaxKind.Break
  | SyntaxKind.Return
  | SyntaxKind.Set
  | SyntaxKind.To
  | SyntaxKind.Let
  ;

export type BranchKeywordSyntaxKind = SyntaxKind.While | SyntaxKind.If | SyntaxKind.Elseif;

export type AssignmentOperatorSyntaxKind =
  | SyntaxKind.Equals
  | SyntaxKind.ColonEquals
  | SyntaxKind.PlusEquals
  | SyntaxKind.MinusEquals
  | SyntaxKind.AsteriskEquals
  | SyntaxKind.SlashEquals
  | SyntaxKind.PercentEquals
  | SyntaxKind.CircumflexEquals
  | SyntaxKind.VBarEquals
  | SyntaxKind.AmpersandEquals
  ;


export type OperatorSyntaxKind =
  | AssignmentOperatorSyntaxKind
  | SyntaxKind.Exclamation
  | SyntaxKind.DoubleVBar
  | SyntaxKind.DoubleAmpersand
  | SyntaxKind.DoubleEquals
  | SyntaxKind.ExclamationEquals
  | SyntaxKind.Greater
  | SyntaxKind.Less
  | SyntaxKind.GreaterEqulas
  | SyntaxKind.LessEqulas
  | SyntaxKind.Plus
  | SyntaxKind.Minus
  | SyntaxKind.Asterisk
  | SyntaxKind.Slash
  | SyntaxKind.Percent
  | SyntaxKind.Circumflex
  | SyntaxKind.VBar
  | SyntaxKind.Ampersand
  | SyntaxKind.DoubleLess
  | SyntaxKind.DoubleGreater
  | SyntaxKind.Dollar
  | SyntaxKind.Hash
  | SyntaxKind.LParen
  | SyntaxKind.RParen
  | SyntaxKind.LSQBracket
  | SyntaxKind.RSQBracket
  | SyntaxKind.LBracket
  | SyntaxKind.RBracket
  | SyntaxKind.Colon
  | SyntaxKind.LArrow
  | SyntaxKind.RArrow
  | SyntaxKind.Dot
  | SyntaxKind.DoubleColon
  | SyntaxKind.Comma
  | SyntaxKind.EqualsGreater
  ;

export type TokenSyntaxKind =
  | SyntaxKind.UnknownToken
  | SyntaxKind.EOF
  | SyntaxKind.Newline
  | SyntaxKind.CommentToken
  | SyntaxKind.Number
  | SyntaxKind.String
  | SyntaxKind.IdentifierToken
  | OperatorSyntaxKind
  | TypenameSyntaxKind
  | KeywordSynaxKind
  | BranchKeywordSyntaxKind
  | SyntaxKind.BlocktypeFunction
  | SyntaxKind.Blocktype
  ;

export type AssignmentOperator = Token<OperatorSyntaxKind>;
export type Operator = Token<OperatorSyntaxKind>;
export type Keyword = Token<KeywordSynaxKind>
export type BranchKeyword = Token<BranchKeywordSyntaxKind>;
export type Typename = Token<TypenameSyntaxKind>

export type PrimaryExpression =
  | StringLiteral
  | NumberLiteral
  | Identifier
  | FunctionExpression
  | LambdaExpression
  | LambdaInlineExpression
  ;

export type Expression =
  | PrimaryExpression
  | UnaryExpression
  | BinaryExpression
  | ElementAccessExpression
  ;

export type Statement =
  | InvalidStatement
  | Keyword
  | VariableDeclarationStatement
  | SetStatement
  | LetStatement
  | StatementList
  | BeginStatement
  | ForeachStatement
  | WhileStatement
  | IfStatement
  | Expression
  ;

export type NodeList =
  | ExpressionList
  | VariableList
  | StatementList
  | PrimaryExpressionList
  | BranchList
  ;

export type RootNode = Script

export type BranchNode =
  | NodeList
  | InvalidStatement
  | VariableDeclaration
  | UnaryExpression
  | BinaryExpression
  | ElementAccessExpression
  | ExpressionList
  | FunctionExpression
  | LambdaExpression
  | LambdaInlineExpression
  | VariableDeclarationStatement
  | SetStatement
  | LetStatement
  | BlocktypeExpression
  | BeginStatement
  | ForeachStatement
  | Branch
  | WhileStatement
  | IfStatement
  ;

export type LeafNode =
  | Token
  | Comment
  | NumberLiteral
  | StringLiteral
  | Identifier
  ;

export type NodeWithParent = BranchNode | LeafNode;
export type NodeWithChildren = BranchNode | RootNode;

export type Node = NodeWithChildren | NodeWithParent;

export function IsTypename(kind: SyntaxKind): kind is TypenameSyntaxKind {
  return SyntaxKind.TYPENAME_FIRST <= kind && kind <= SyntaxKind.TYPENAME_LAST;
}

export function IsKeyword(kind: SyntaxKind): kind is KeywordSynaxKind {
  return SyntaxKind.KEYWORD_FIRST <= kind && kind <= SyntaxKind.KEYWORD_LAST;
}

export function IsOperator(kind: SyntaxKind): kind is OperatorSyntaxKind {
  return SyntaxKind.OPERATOR_FIRST <= kind && kind <= SyntaxKind.OPERATOR_LAST;
}

export function IsUnaryOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.UNARY_OPERATOR_FIRST <= kind && kind <= SyntaxKind.UNARY_OPERATOR_LAST;
}

export function IsMultiplicativeOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.MULTIPLICATIVE_OPERATOR_FIRST <= kind && kind <= SyntaxKind.MULTIPLICATIVE_OPERATOR_LAST;
}

export function IsAdditiveOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.ADDITIVE_OPERATOR_FIRST <= kind && kind <= SyntaxKind.ADDITIVE_OPERATOR_LAST;
}

export function IsShiftOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.SHIFT_OPERATOR_FIRST <= kind && kind <= SyntaxKind.SHIFT_OPERATOR_LAST;
}

export function IsRelationalOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.RELATIONAL_OPERATOR_FIRST <= kind && kind <= SyntaxKind.RELATIONAL_OPERATOR_LAST;
}

export function IsEqualityOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.EQUALITY_OPERATOR_FIRST <= kind && kind <= SyntaxKind.EQUALITY_OPERATOR_LAST;
}

export function IsSliceMakePairOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.SLICE_MAKE_PAIR_OPERATOR_FIRST <= kind && kind <= SyntaxKind.SLICE_MAKE_PAIR_OPERATOR_LAST;
}

export function IsAssignmentOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.ASSIGNMENT_OPERATOR_FIRST <= kind && kind <= SyntaxKind.ASSIGNMENT_OPERATOR_LAST;
}

export function IsSimpleAssignmentOperator(kind: SyntaxKind): boolean {
  return SyntaxKind.SIMPLE_ASSIGNMENT_OPERATOR_FIRST <= kind && kind <= SyntaxKind.SIMPLE_ASSIGNMENT_OPERATOR_LAST;
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

export const enum Type {
  Unknown,
  Ambiguous,
  Integer,
  Float,
  Form,
  Reference,
  String,
  Array,
}

const TypeNames: { [key in Type]?: string } = {
  [Type.Unknown]: "unknown",
  [Type.Ambiguous]: "ambiguous",
  [Type.Integer]: "integer",
  [Type.Float]: "float",
  [Type.Form]: "form",
  [Type.Reference]: "reference",
  [Type.String]: "string",
  [Type.Array]: "array",
};

export function GetTypeName(type: Type): string {
  return TypeNames[type] ?? "unable to find Type name";
}

export const enum SymbolKind {
  Unknown,

  Variable,
  Function,
  Script,
}

export interface Symbol {
  name: string;
  kind: SymbolKind;
  declaration?: Node;
  type: Type;
}

export type SymbolTable = { [key: string]: Symbol };

export type Constructor = new (...args: any[]) => {};

function MixinParent<TBase extends Constructor>(Base: TBase) {  // TODO: replace with normal classes?
  return class _ extends Base {
    parent!: NodeWithChildren;
  };
}

function MixinChildren<TBase extends Constructor>(Base: TBase) {
  return class _ extends Base {
    children: { [key: string]: NodeWithParent | undefined } | NodeWithParent[] = {};
  };
}

export class INode {
  range!: Range;

  expression_type?: Type;
}

export class ILeafNode extends MixinParent(INode) { }
export class IRootNode extends MixinChildren(INode) { }
export class IBranchNode extends MixinParent(IRootNode) { }

export class IToken extends ILeafNode {
  content = "";
}

export class Token<T extends TokenSyntaxKind = TokenSyntaxKind> extends IToken {
  kind: T;

  constructor(kind?: T) {
    super();

    this.kind = kind ?? SyntaxKind.UnknownToken as T;
  }
}

export class TokenWithValue<T> extends IToken {
  value!: T;
}

export class Comment extends TokenWithValue<string> {
  kind = SyntaxKind.Comment as const;
}

export class NumberLiteral extends TokenWithValue<number> {
  kind = SyntaxKind.NumberLiteral as const;
}

export class StringLiteral extends TokenWithValue<string> {
  kind = SyntaxKind.StringLiteral as const;
}

export class Identifier extends IToken {
  kind = SyntaxKind.Identifier as const;

  symbol?: Symbol;
}

export class VariableDeclaration extends IBranchNode {
  kind = SyntaxKind.VariableDeclaration as const;

  declare children: {
    type: Typename,
    variable: Identifier,

    [key: string]: NodeWithParent,
  };
}

export class UnaryExpression extends IBranchNode {
  kind = SyntaxKind.UnaryExpression as const;

  declare children: {
    op: Operator,
    operand: Expression,

    [key: string]: NodeWithParent,
  };
}

export class BinaryExpression extends IBranchNode {
  kind = SyntaxKind.BinaryExpresison as const;

  declare children: {
    lhs: Expression,
    op: Operator,
    rhs: Expression,

    [key: string]: NodeWithParent,
  };
}

export class ElementAccessExpression extends IBranchNode {
  kind = SyntaxKind.ElementAccessExpression as const;

  declare children: {
    lhs: Expression,
    left_op: Token<SyntaxKind.LSQBracket>,
    rhs: Expression,
    right_op: Token<SyntaxKind.RSQBracket>,

    [key: string]: NodeWithParent,
  };
}

export class ExpressionList extends IBranchNode {
  kind = SyntaxKind.ExpressionList as const;

  children: (Expression | Comment)[] = [];
}

export class FunctionExpression extends IBranchNode {
  kind = SyntaxKind.FunctionExpression as const;

  declare children: {
    name: Identifier,
    args: ExpressionList,

    [key: string]: NodeWithParent,
  };
}

export class VariableList extends IBranchNode {
  kind = SyntaxKind.VariableList as const;

  children: (Identifier | VariableDeclaration | Comment)[] = [];
}

export class LambdaInlineExpression extends IBranchNode {
  kind = SyntaxKind.LambdaInlineExpression as const;

  declare children: {
    lbracket: Token<SyntaxKind.LBracket>,
    params: VariableList,
    rbracket: Token<SyntaxKind.RBracket>,
    arrow: Token<SyntaxKind.EqualsGreater>,

    expression: Expression,

    [key: string]: NodeWithParent,
  };
}

export class LambdaExpression extends IBranchNode {
  kind = SyntaxKind.LambdaExpression as const;

  declare children: {
    begin: Token<SyntaxKind.Begin>,
    function: Token<SyntaxKind.BlocktypeFunction>,
    lbracket: Token<SyntaxKind.LBracket>,
    params: VariableList,
    rbracket: Token<SyntaxKind.RBracket>,

    body: StatementList,

    end: Token<SyntaxKind.End>,

    [key: string]: NodeWithParent,
  };
}

export class InvalidStatement extends IBranchNode {
  kind = SyntaxKind.Unknown as const;
}

export class VariableDeclarationStatement extends IBranchNode {
  kind = SyntaxKind.VariableDeclarationStatement as const;

  declare children: {
    variable: VariableDeclaration,
    op?: Operator,
    expression?: Expression,

    [key: string]: NodeWithParent | undefined,
  };
}

export class SetStatement extends IBranchNode {
  kind = SyntaxKind.SetStatement as const;

  declare children: {
    set: Token<SyntaxKind.Set>,
    variable: Identifier,
    to: Token<SyntaxKind.To>,
    expression: Expression,

    [key: string]: NodeWithParent,
  };
}
export class LetStatement extends IBranchNode {
  kind = SyntaxKind.LetStatement as const;

  declare children: {
    let: Token<SyntaxKind.Let>,
    variable: Identifier | VariableDeclaration,
    op: Operator,
    expression: Expression,

    [key: string]: NodeWithParent,
  };
}

export class StatementList extends IBranchNode {
  kind = SyntaxKind.StatementList as const;

  children: (Statement | Comment)[] = [];
  symbol_table: SymbolTable = {};
}

export class PrimaryExpressionList extends IBranchNode {
  kind = SyntaxKind.PrimaryExpressionList as const;

  children: (PrimaryExpression | Comment)[] = [];
}

export class BlocktypeExpression extends IBranchNode {
  kind = SyntaxKind.BlocktypeExpression as const;
  declare parent: StatementList;

  declare children: {
    block_type: Token<SyntaxKind.Blocktype | SyntaxKind.BlocktypeFunction>,
    args: PrimaryExpressionList,

    [key: string]: NodeWithParent,
  };
}

export class BeginStatement extends IBranchNode {
  kind = SyntaxKind.BeginStatement as const;

  declare children: {
    begin: Token<SyntaxKind.Begin>,
    block_type: BlocktypeExpression,
    body: StatementList,
    end: Token<SyntaxKind.End>,

    [key: string]: NodeWithParent,
  };
}

export class ForeachStatement extends IBranchNode {
  kind = SyntaxKind.ForeachStatement as const;

  declare children: {
    foreach: Token<SyntaxKind.Foreach>,
    identifier: Identifier | VariableDeclaration,
    larrow: Token<SyntaxKind.LArrow>,
    iterable: Expression,

    body: StatementList,

    loop: Token<SyntaxKind.Loop>,

    [key: string]: NodeWithParent,
  };
}

export class Branch<T extends BranchKeywordSyntaxKind = BranchKeywordSyntaxKind> extends IBranchNode {
  kind = SyntaxKind.Branch as const;

  declare children: {
    keyword: Token<T>,
    condition: Expression,
    body: StatementList,

    [key: string]: NodeWithParent,
  };
}

export class WhileStatement extends IBranchNode {
  kind = SyntaxKind.WhileStatement as const;

  declare children: {
    branch: Branch<SyntaxKind.While>;
    loop: Token<SyntaxKind.Loop>;

    [key: string]: NodeWithParent,
  };
}

export class BranchList extends IBranchNode {
  kind = SyntaxKind.BranchList as const;

  children: (Branch<SyntaxKind.If | SyntaxKind.Elseif> | Comment)[] = [];
}

export class IfStatement extends IBranchNode {
  kind = SyntaxKind.IfStatement as const;

  declare children: {
    branches: BranchList,
    else?: Token<SyntaxKind.Else>,
    else_statements?: StatementList,
    endif: Token<SyntaxKind.Endif>,

    [key: string]: NodeWithParent | undefined,
  };
}

export class Script extends IRootNode {
  kind = SyntaxKind.Script as const;

  declare children: {
    scriptname: Token<SyntaxKind.ScriptName>,
    name: Identifier,
    body: StatementList,

    [key: string]: NodeWithParent,
  };

  diagnostics: Diagnostic[] = [];
  semantic_tokens: Node[] = [];

  environment!: Environment;
}

export class Environment {
  map: { [key: string]: Script } = {};
  global_symbol_table: SymbolTable = {};

  async processDocument(document: TextDocument): Promise<Script> {
    return await this.processScript(document.uri, document.getText());
  }

  async processScript(name: string, text: string): Promise<Script> {
    const script = Parser.Parse(text);

    script.environment = this;

    AST.BuildScriptSymbolTables(script);
    await AST.ValidateScript(script);

    this.map[name] = script;

    return script;
  }
}
