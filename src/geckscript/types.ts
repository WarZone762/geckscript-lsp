import { CompletionItem, CompletionItemKind, Diagnostic } from "vscode-languageserver";
import { Range, TextDocument } from "vscode-languageserver-textdocument";
import * as AST from "./ast";
import * as Parser from "./parser";
import { TokenData } from "./token_data";


export const enum SyntaxKind {
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
  Block,

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

let SyntaxKindNames: { [key in SyntaxKind]?: string } = {};

for (const [k, v] of Object.entries(TokenData.All)) {
  SyntaxKindNames[v] = k;
}

SyntaxKindNames = Object.assign(SyntaxKindNames, {
  [SyntaxKind.Unknown]: "unknown",
  [SyntaxKind.EOF]: "end of file",
  [SyntaxKind.Newline]: "new line",
  [SyntaxKind.Comment]: "comment",
  [SyntaxKind.Number]: "number",
  [SyntaxKind.String]: "string",
  [SyntaxKind.Identifier]: "identifier",
  [SyntaxKind.BlocktypeToken]: "block type",
  [SyntaxKind.BlocktypeTokenFunction]: "function",
});

export function GetSyntaxKindName(kind: SyntaxKind): string {
  return SyntaxKindNames[kind] ?? `unable to find SyntaxType name (${kind})`;
}

export type TypenameSyntaxKind =
  SyntaxKind.Short |
  SyntaxKind.Int |
  SyntaxKind.Long |
  SyntaxKind.Float |
  SyntaxKind.Reference |
  SyntaxKind.StringVar |
  SyntaxKind.ArrayVar;

export type KeywordSynaxKind =
  SyntaxKind.ScriptName |
  SyntaxKind.Begin |
  SyntaxKind.End |
  SyntaxKind.If |
  SyntaxKind.Elseif |
  SyntaxKind.Else |
  SyntaxKind.Endif |
  SyntaxKind.While |
  SyntaxKind.Foreach |
  SyntaxKind.Loop |
  SyntaxKind.Continue |
  SyntaxKind.Break |
  SyntaxKind.Return |
  SyntaxKind.Set |
  SyntaxKind.To |
  SyntaxKind.Let;

export type BranchKeywordSyntaxKind = SyntaxKind.While | SyntaxKind.If | SyntaxKind.Elseif;

export type AssignmentOperatorSyntaxKind =
  SyntaxKind.Equals |
  SyntaxKind.ColonEquals |
  SyntaxKind.PlusEquals |
  SyntaxKind.MinusEquals |
  SyntaxKind.AsteriskEquals |
  SyntaxKind.SlashEquals |
  SyntaxKind.PercentEquals |
  SyntaxKind.CircumflexEquals |
  SyntaxKind.VBarEquals |
  SyntaxKind.AmpersandEquals;


export type OperatorSyntaxType =
  AssignmentOperatorSyntaxKind |
  SyntaxKind.Exclamation |
  SyntaxKind.DoubleVBar |
  SyntaxKind.DoubleAmpersand |
  SyntaxKind.DoubleEquals |
  SyntaxKind.ExclamationEquals |
  SyntaxKind.Greater |
  SyntaxKind.Less |
  SyntaxKind.GreaterEqulas |
  SyntaxKind.LessEqulas |
  SyntaxKind.Plus |
  SyntaxKind.Minus |
  SyntaxKind.Asterisk |
  SyntaxKind.Slash |
  SyntaxKind.Percent |
  SyntaxKind.Circumflex |
  SyntaxKind.VBar |
  SyntaxKind.Ampersand |
  SyntaxKind.DoubleLess |
  SyntaxKind.DoubleGreater |
  SyntaxKind.Dollar |
  SyntaxKind.Hash |
  SyntaxKind.LParen |
  SyntaxKind.RParen |
  SyntaxKind.LSQBracket |
  SyntaxKind.RSQBracket |
  SyntaxKind.LBracket |
  SyntaxKind.RBracket |
  SyntaxKind.Colon |
  SyntaxKind.LArrow |
  SyntaxKind.RArrow |
  SyntaxKind.Dot |
  SyntaxKind.DoubleColon |
  SyntaxKind.Comma |
  SyntaxKind.EqualsGreater;

export type AssignmentOperator = Token<OperatorSyntaxType>;
export type Operator = Token<OperatorSyntaxType>;
export type Keyword = Token<KeywordSynaxKind>
export type BranchKeyword = Token<BranchKeywordSyntaxKind>;
export type Typename = Token<TypenameSyntaxKind>

export type PrimaryExpression =
  StringLiteral |
  NumberLiteral |
  Identifier |
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
  Block |
  BeginStatement |
  ForeachStatement |
  WhileStatement |
  IfStatement |
  Expression;


export function IsTypename(kind: SyntaxKind): boolean {
  return SyntaxKind.TYPENAME_FIRST <= kind && kind <= SyntaxKind.TYPENAME_LAST;
}

export function IsKeyword(kin: SyntaxKind): boolean {
  return SyntaxKind.KEYWORD_FIRST <= kin && kin <= SyntaxKind.KEYWORD_LAST;
}

export function IsOperator(kind: SyntaxKind): boolean {
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
  declaration: Node;
  type: Type;
}

export type SymbolTable = { [key: string]: Symbol };

export class Node<T extends SyntaxKind = SyntaxKind> {
  kind: T;
  range!: Range;
  parent?: Node = undefined;

  expression_type?: Type;

  constructor(kind?: T) {
    this.kind = kind ?? SyntaxKind.Unknown as T;
  }
}

export class Token<T extends SyntaxKind = SyntaxKind> extends Node<T> {
  content = "";
}

export class TokenWithValue<T> extends Token {
  value!: T;
}

export class Comment extends TokenWithValue<string> {
  kind = SyntaxKind.Comment;
}

export class NumberLiteral extends TokenWithValue<number> {
  kind = SyntaxKind.Number;
}

export class StringLiteral extends TokenWithValue<string> {
  kind = SyntaxKind.String;
}

export class Identifier extends Token {
  kind = SyntaxKind.Identifier;

  symbol?: Symbol;
}

export class VariableDeclaration extends Node {
  kind = SyntaxKind.VariableDeclaration;

  type!: Typename;
  variable!: Identifier;
}

export class UnaryExpression extends Node {
  kind = SyntaxKind.UnaryExpression;

  op!: Operator;
  operand!: Expression;
}

export class BinaryExpression extends Node {
  kind = SyntaxKind.BinaryExpresison;

  lhs!: Expression;
  op!: Operator;
  rhs!: Expression;
}

export class ElementAccessExpression extends Node {
  kind = SyntaxKind.ElementAccessExpression;

  lhs!: Expression;
  left_op!: Token<SyntaxKind.LSQBracket>;
  rhs!: Expression;
  right_op!: Token<SyntaxKind.RSQBracket>;
}

export class FunctionExpression extends Node {
  kind = SyntaxKind.FunctionExpression;

  name!: Identifier;
  args: Expression[] = [];
}

export class LambdaInlineExpression extends Node {
  kind = SyntaxKind.LambdaInlineExpression;

  lbracket!: Token<SyntaxKind.LBracket>;
  params: (Identifier | VariableDeclaration)[] = [];
  rbracket!: Token<SyntaxKind.RBracket>;
  arrow!: Token<SyntaxKind.EqualsGreater>;

  expression!: Expression;
}

export class LambdaExpression extends Node {
  kind = SyntaxKind.LambdaExpression;

  begin!: Token<SyntaxKind.Begin>;
  function!: Token<SyntaxKind.BlocktypeTokenFunction>;
  lbracket!: Token<SyntaxKind.LBracket>;
  params: (Identifier | VariableDeclaration)[] = [];
  rbracket!: Token<SyntaxKind.RBracket>;

  body!: Block;

  end!: Token<SyntaxKind.End>;
}

export class VariableDeclarationStatement extends Node {
  kind = SyntaxKind.VariableDeclarationStatement;

  variable!: VariableDeclaration;
  op?: Operator;
  expression?: Expression;
}

export class SetStatement extends Node {
  kind = SyntaxKind.SetStatement;

  set!: Token<SyntaxKind.Set>;
  variable!: Identifier;
  to!: Token<SyntaxKind.To>;
  expression!: Expression;
}
export class LetStatement extends Node {
  kind = SyntaxKind.LetStatement;

  let!: Token<SyntaxKind.Let>;
  variable!: Identifier | VariableDeclaration;
  op!: Operator;
  expression!: Expression;
}

export class Block extends Node {
  kind = SyntaxKind.Block;

  children: Statement[] = [];
  symbol_table: SymbolTable = {};
}

export class BlocktypeExpression extends Node {
  kind = SyntaxKind.BlocktypeExpression;

  block_type!: Token<SyntaxKind.BlocktypeToken | SyntaxKind.BlocktypeTokenFunction>;
  args: Node[] = [];
}

export class BeginStatement extends Node {
  kind = SyntaxKind.BeginStatement;

  begin!: Token<SyntaxKind.Begin>;
  block_type!: BlocktypeExpression;
  body!: Block;
  end!: Token<SyntaxKind.End>;
}

export class ForeachStatement extends Node {
  kind = SyntaxKind.ForeachStatement;

  foreach!: Token<SyntaxKind.Foreach>;
  identifier!: Identifier | VariableDeclaration;
  larrow!: Token<SyntaxKind.LArrow>;
  iterable!: Expression;

  body!: Block;

  loop!: Token<SyntaxKind.Loop>;
}

export class Branch<T extends BranchKeyword> extends Node {
  kind = SyntaxKind.Branch;

  keyword!: T;
  condition!: Expression;
  body!: Block;
}

export class WhileStatement extends Node {
  kind = SyntaxKind.WhileStatement;

  branch!: Branch<Token<SyntaxKind.While>>;
  loop!: Token<SyntaxKind.Loop>;
}

export class IfStatement extends Node {
  kind = SyntaxKind.IfStatement;

  branches: Branch<Token<SyntaxKind.If> | Token<SyntaxKind.Elseif>>[] = [];
  else?: Token<SyntaxKind.Else>;
  else_statements?: Block;
  endif!: Token<SyntaxKind.Endif>;
}

export class Script extends Node {
  kind = SyntaxKind.Script;

  scriptname!: Token<SyntaxKind.ScriptName>;
  name!: Identifier;
  body!: Block;

  comments: Comment[] = [];

  diagnostics: Diagnostic[] = [];

  environment!: Environment;
}

export class Environment {
  map: { [key: string]: Script } = {};
  global_symbol_table: SymbolTable = {};

  processDocument(document: TextDocument): Script {
    return this.processScript(document.uri, document.getText());
  }

  processScript(name: string, text: string): Script {
    const script = Parser.Parse(text);

    script.environment = this;

    AST.BuildScriptSymbolTables(script);
    AST.ValidateScript(script);

    this.map[name] = script;

    return script;
  }
}

export const CompletionItems: CompletionItem[] = [];

Object.entries(TokenData.All).forEach(([k, v], i) => {
  CompletionItems[i] = {
    label: k,
    data: k,
    kind:
      IsTypename(v) ? CompletionItemKind.TypeParameter :
        IsKeyword(v) ? CompletionItemKind.Keyword :
          IsOperator(v) ? CompletionItemKind.Operator :
            CompletionItemKind.Constant,
  };
});

Object.entries(TokenData.Functions).forEach(([k, v], i) => {
  CompletionItems.push({
    label: k,
    data: k,
    kind: CompletionItemKind.Function,
  });
});
