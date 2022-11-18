import { Position, Range } from "vscode-languageserver-textdocument";
import { GetFunctionInfo } from "./function_data";
import { Lexer } from "./lexer";
import { GetSyntaxKindName } from "./token_data";
import {
  SyntaxKind,
  BranchKeywordSyntaxKind,
  Typename,
  Keyword,
  AssignmentOperator,
  Operator,
  Expression,
  Statement,
  IsTypename,
  IsKeyword,
  IsOperator,
  IsUnaryOperator,
  IsAdditiveOperator,
  IsEqualityOperator,
  IsMultiplicativeOperator,
  IsRelationalOperator,
  IsShiftOperator,
  IsSliceMakePairOperator,
  IsAssignmentOperator,
  IsSimpleAssignmentOperator,
  Node,
  Token,
  NumberLiteral,
  StringLiteral,
  Identifier,
  BeginStatement,
  BinaryExpression,
  ElementAccessExpression,
  Branch,
  Comment,
  StatementList,
  ForeachStatement,
  FunctionExpression,
  IfStatement,
  LambdaInlineExpression,
  LambdaExpression,
  VariableDeclarationStatement,
  SetStatement,
  LetStatement,
  UnaryExpression,
  VariableDeclaration,
  WhileStatement,
  BlocktypeExpression,
  Script,
  TokenSyntaxKind,
  InvalidStatement,
  ExpressionList,
  VariableList,
  PrimaryExpressionList,
  PrimaryExpression,
  BranchList,
  NodeWithChildren,
  NodeWithParent,
  NodeList,
} from "./types";


// TODO: rewrite parser to treat whitespace as tokens
let lexer: Lexer;

let cur_token: Token;
// let last_token: Token;

let paren_level = 0;

let script: Script;

function moreData(): boolean {
  return cur_token.kind !== SyntaxKind.EOF;
}

function isTypename(): boolean {
  return IsTypename(cur_token.kind);
}
function isKeyword(): boolean {
  return IsKeyword(cur_token.kind);
}
function isOperator(): boolean {
  return IsOperator(cur_token.kind);
}
function isUnaryOperator(): boolean {
  return IsUnaryOperator(cur_token.kind);
}
function isMultiplicativeOperator(): boolean {
  return IsMultiplicativeOperator(cur_token.kind);
}
function isAdditiveOperator(): boolean {
  return IsAdditiveOperator(cur_token.kind);
}
function isShiftOperator(): boolean {
  return IsShiftOperator(cur_token.kind);
}
function isRelationalOperator(): boolean {
  return IsRelationalOperator(cur_token.kind);
}
function isEqualityOperator(): boolean {
  return IsEqualityOperator(cur_token.kind);
}
function isSliceMakePairOperator(): boolean {
  return IsSliceMakePairOperator(cur_token.kind);
}
function isAssignmentOperator(): boolean {
  return IsAssignmentOperator(cur_token.kind);
}
function isSimpleAssignmentOperator(): boolean {
  return IsSimpleAssignmentOperator(cur_token.kind);
}

function skipToken(): void {
  if (moreData()) {
    // last_token = cur_token;
    cur_token = lexer.lexToken();
  }
}

function nextToken<T extends TokenSyntaxKind>(): Token<T> {
  const token = cur_token;

  if (token.kind === SyntaxKind.RParen) {
    --paren_level;
  }

  skipToken();

  if (paren_level > 0) {
    while (cur_token.kind === SyntaxKind.Newline) {
      skipToken();
    }
  }

  return token as Token<T>;
}

function nextTokenExpectType<T extends TokenSyntaxKind>(kind: T): Token<T> {
  if (cur_token.kind !== kind) {
    reportParsingError(`expected "${GetSyntaxKindName(kind)}", got "${GetSyntaxKindName(cur_token.kind)}"`);

    return parseInvalidToken();
  }

  return nextToken();
}

function reportParsingError(message: string, range?: Range): void {
  script.diagnostics.push({
    message: `Parsing error: ${message}`,
    range: range ?? cur_token.range,
  });
}

function mkChild<T extends NodeWithChildren, K extends keyof T["children"]>(
  node: T,
  child_value: T["children"][K],
  child_key: K,
): void;
function mkChild<T extends NodeList>(
  node: T,
  child_value: T["children"][keyof T["children"]],
): void;

function mkChild<T extends NodeWithChildren, K extends keyof T["children"]>(
  node: T,
  child_value: T["children"][NonNullable<K>] & NodeWithParent,
  child_key?: K,
): void {
  child_value.parent = node;

  if ("children" in child_value) {
    const children = Object.values(child_value.children);

    if (children.length === 0) {
      return;
    }

    child_value.range = {
      start: children[0].range.start,
      end: children.at(-1)!.range.end,
    };
  }

  if (Array.isArray(node.children)) {
    const children = node.children as Node[];

    children.push(child_value);
    while (cur_token.kind === SyntaxKind.CommentToken) {
      const comment = parseComment();
      comment.parent = node;

      children.push(comment);
    }
  } else {
    const children = node.children as Record<string, Node>;

    children[child_key as string] = child_value;
    while (cur_token.kind === SyntaxKind.CommentToken) {
      const comment = parseComment();
      comment.parent = node;

      children[`comment_${Object.values(children).length - 1}`] = comment;
    }
  }
}

function parseInvalidToken<T extends Node>(): T {
  if (
    cur_token.kind !== SyntaxKind.EOF &&
    cur_token.kind !== SyntaxKind.Newline
  ) {
    const token = nextToken();
    token.kind = SyntaxKind.UnknownToken;
    return token as unknown as T;
  }

  return cur_token as unknown as T;
}

function parseComment(): Comment {
  const node = new Comment();

  node.range = cur_token.range;

  node.content = cur_token.content;
  node.value = node.content.substring(1);
  skipToken();

  return node;
}

function parseBinOpLeft(  // TODO: handle via precedence
  parse_child: () => Expression,
  predicate: () => boolean
): Expression {
  let lhs = parse_child();

  while (predicate()) {
    const new_lhs = new BinaryExpression();

    mkChild(new_lhs, lhs, "lhs");
    mkChild(new_lhs, parseOperator(), "op");
    mkChild(new_lhs, parse_child(), "rhs");

    lhs = new_lhs;
  }

  return lhs;
}

// TODO: prepare leaf tokens on the lexer's side so we can replace
//       these by nextToken() or nextTokenExpectType()

function parseNumber(): NumberLiteral {
  const node = new NumberLiteral();

  node.range = cur_token.range;

  node.content = nextTokenExpectType(SyntaxKind.Number).content;

  if (node.content[0] === "0" && node.content[1]?.toLowerCase() === "x") {
    node.value = parseInt(node.content, 16);
  } else {
    node.value = parseFloat(node.content);
  }

  return node;
}

function parseString(): StringLiteral {
  const node = new StringLiteral();

  node.range = cur_token.range;

  node.content = nextTokenExpectType(SyntaxKind.String).content;
  node.value = node.content.substring(1, node.content.length - 1);

  return node;
}

function parseIdentifier(): Identifier {
  const node = new Identifier();

  node.range = cur_token.range;
  node.content = nextTokenExpectType(SyntaxKind.IdentifierToken).content;

  return node;
}

function parseTypename(): Typename {
  if (isTypename()) {
    return nextToken();
  } else {
    reportParsingError("expected a typename");
    return parseInvalidToken();
  }
}

function parseKeyword(): Keyword {
  if (isKeyword()) {
    return nextToken();
  } else {
    reportParsingError("expected a keyword");
    return parseInvalidToken();
  }
}

function parseOperator(): Operator {
  if (isOperator()) {
    return nextToken();
  } else {
    reportParsingError("expected an operator");
    return parseInvalidToken();
  }
}

function parseAssignmentOperator(): AssignmentOperator {
  if (isAssignmentOperator()) {
    return nextToken();
  } else {
    reportParsingError("expected an assignment operator");
    return parseInvalidToken();
  }
}

function parseVariableOrVariableDeclaration(): Identifier | VariableDeclaration {
  if (cur_token.kind === SyntaxKind.IdentifierToken) {
    return parseIdentifier();  // FIXME: chekcing kind 2 times
  } else if (isTypename()) {
    return parseVariableDeclaration();
  } else {
    reportParsingError("expected a variable or a variable declaration");
    return parseInvalidToken();
  }
}

function parseExpressionList(): ExpressionList {
  const node = new ExpressionList();

  while (moreData() && cur_token.kind !== SyntaxKind.Newline) {
    if (isOperator()) {
      if (cur_token.kind === SyntaxKind.Comma) {
        nextToken();
        continue;
      } else if (cur_token.kind !== SyntaxKind.LParen) {
        break;
      }
    }

    mkChild(node, parseOr());
  }

  return node;
}

function parseFunction(): FunctionExpression {
  const node = new FunctionExpression();

  mkChild(node, parseIdentifier(), "name");
  mkChild(node, parseExpressionList(), "args");

  return node;
}

function parseVariableList(): VariableList {
  const node = new VariableList();

  while (
    moreData() &&
    cur_token.kind !== SyntaxKind.RBracket &&  // TODO: come up with a better solution (keep track of the context?)
    cur_token.kind !== SyntaxKind.Newline
  ) {
    if (cur_token.kind === SyntaxKind.Comma) {
      nextToken();
    }

    mkChild(node, parseVariableOrVariableDeclaration());
  }

  return node;
}

function parseLambdaInline(): LambdaInlineExpression {
  const node = new LambdaInlineExpression();

  mkChild(node, nextTokenExpectType(SyntaxKind.LBracket), "lbracket");

  mkChild(node, parseVariableList(), "params");

  mkChild(node, nextTokenExpectType(SyntaxKind.RBracket), "rbracket");
  mkChild(node, nextTokenExpectType(SyntaxKind.EqualsGreater), "arrow");
  mkChild(node, parseExpression(), "expression");

  return node;
}

function parseLambda(): LambdaExpression {
  const node = new LambdaExpression();

  mkChild(node, nextTokenExpectType(SyntaxKind.Begin), "begin");
  mkChild(node, nextTokenExpectType(SyntaxKind.BlockTypeFunction), "function");
  mkChild(node, nextTokenExpectType(SyntaxKind.LBracket), "lbracket");

  mkChild(node, parseVariableList(), "params");

  mkChild(node, nextTokenExpectType(SyntaxKind.RBracket), "rbracket");

  nextTokenExpectType(SyntaxKind.Newline);

  mkChild(node, parseStatementList({ [SyntaxKind.End]: true }), "body");
  mkChild(node, nextTokenExpectType(SyntaxKind.End), "end");

  return node;
}

function parsePrimaryExpression(): Expression {
  switch (cur_token.kind) {
    case SyntaxKind.String:
      return parseString();

    case SyntaxKind.Number:
      return parseNumber();

    case SyntaxKind.IdentifierToken:
      if (GetFunctionInfo(cur_token.content.toLowerCase()) != undefined) {
        return parseFunction();
      } else {
        return parseIdentifier();
      }

    case SyntaxKind.LParen:
      nextToken();
      if (cur_token.kind as unknown === SyntaxKind.Begin) {
        const node = parseLambda();
        nextTokenExpectType(SyntaxKind.RParen);

        return node;
      } else {
        ++paren_level;

        const node = parseExpression();
        nextTokenExpectType(SyntaxKind.RParen);

        return node;
      }

    case SyntaxKind.LBracket:
      return parseLambdaInline();

    default:
      reportParsingError(`expected expression, got "${GetSyntaxKindName(cur_token.kind)}"`);

      return parseInvalidToken();
  }
}

function parseMemeberSquareBrackets(lhs: Expression): Expression {
  const node = new ElementAccessExpression();

  mkChild(node, lhs, "lhs");
  mkChild(node, nextTokenExpectType(SyntaxKind.LSQBracket), "left_op");
  mkChild(node, parseExpression(), "rhs");
  mkChild(node, nextTokenExpectType(SyntaxKind.RSQBracket), "right_op");

  return parseMember(node);
}

function parseMemberRArrow(lhs: Expression): Expression {
  const node = new BinaryExpression();

  mkChild(node, lhs, "lhs");
  mkChild(node, nextTokenExpectType(SyntaxKind.LArrow), "op");

  if (
    cur_token.kind !== SyntaxKind.String &&
    cur_token.kind !== SyntaxKind.Number &&
    cur_token.kind !== SyntaxKind.IdentifierToken
  ) {
    mkChild(node, parseInvalidToken(), "rhs");
  } else {
    mkChild(node, parsePrimaryExpression(), "rhs");
  }

  return parseMember(node);
}

function parseMemberDot(lhs: Expression): Expression {
  const node = new BinaryExpression();

  mkChild(node, lhs, "lhs");
  mkChild(node, nextTokenExpectType(SyntaxKind.Dot), "op");

  if (cur_token.kind !== SyntaxKind.IdentifierToken) {
    mkChild(node, parseInvalidToken(), "rhs");
  } else {
    mkChild(node, parsePrimaryExpression(), "rhs");
  }

  return parseMember(node);
}

function parseMember(lhs?: Expression): Expression {
  lhs = lhs ?? parsePrimaryExpression();

  if (isOperator()) {
    return lhs;
  }

  switch (cur_token.kind) {
    case SyntaxKind.LSQBracket:
      return parseMemeberSquareBrackets(lhs);

    case SyntaxKind.RArrow:
      return parseMemberRArrow(lhs);

    case SyntaxKind.Dot:
      return parseMemberDot(lhs);

    default:
      return lhs;
  }
}

function parseLogicalNot(): Expression {
  if (cur_token.kind !== SyntaxKind.Exclamation) {
    return parseMember();
  }

  const node = new UnaryExpression();

  mkChild(node, parseOperator(), "op");
  mkChild(node, parseLogicalNot(), "operand");

  return node;
}

function parseUnary(): Expression {
  if (!isUnaryOperator()) {
    return parseLogicalNot();
  }

  const node = new UnaryExpression();

  mkChild(node, parseOperator(), "op");
  mkChild(node, parseUnary(), "operand");

  return node;
}

function parseExponential(): Expression {
  return parseBinOpLeft(
    parseUnary,
    () => cur_token.kind === SyntaxKind.Circumflex
  );
}

function parseMultiplicative(): Expression {
  return parseBinOpLeft(
    parseExponential,
    isMultiplicativeOperator
  );
}

function parseAdditive(): Expression {
  return parseBinOpLeft(
    parseMultiplicative,
    isAdditiveOperator
  );
}

function parseShift(): Expression {
  return parseBinOpLeft(
    parseAdditive,
    isShiftOperator
  );
}

function parseAnd(): Expression {
  return parseBinOpLeft(
    parseShift,
    () => cur_token.kind === SyntaxKind.Ampersand
  );
}

function parseOr(): Expression {
  return parseBinOpLeft(
    parseAnd,
    () => cur_token.kind === SyntaxKind.VBar
  );
}

function parseRelational(): Expression {
  return parseBinOpLeft(
    parseOr,
    isRelationalOperator
  );
}

function parseEquality(): Expression {
  return parseBinOpLeft(
    parseRelational,
    isEqualityOperator
  );
}

function parseSliceMakePair(): Expression {
  return parseBinOpLeft(
    parseEquality,
    isSliceMakePairOperator
  );
}

function parseLogicalAnd(): Expression {
  return parseBinOpLeft(
    parseSliceMakePair,
    () => cur_token.kind === SyntaxKind.DoubleAmpersand
  );
}

function parseLogicalOr(): Expression {
  return parseBinOpLeft(
    parseLogicalAnd,
    () => cur_token.kind === SyntaxKind.DoubleVBar
  );
}

function parseAssignment(): Expression {
  let root_node = parseLogicalOr();

  if (!isSimpleAssignmentOperator()) {
    return root_node;
  }

  let last_node = new BinaryExpression();

  mkChild(last_node, root_node, "lhs");
  mkChild(last_node, parseOperator(), "op");
  mkChild(last_node, parseLogicalOr(), "rhs");

  root_node = last_node;

  while (isSimpleAssignmentOperator()) {
    const node = new BinaryExpression();

    mkChild(node, last_node.children.rhs, "lhs");
    mkChild(node, parseOperator(), "op");
    mkChild(node, parseLogicalOr(), "rhs");

    mkChild(last_node, node, "rhs");
    last_node = node;
  }

  return root_node;
}

function parseExpression(): Expression {
  return parseAssignment();
}

function parseStatement(): Statement {
  let node: Statement;

  switch (cur_token.kind) {
    case SyntaxKind.Set:
      node = parseSet();
      break;

    case SyntaxKind.Let:
      node = parseLet();
      break;

    case SyntaxKind.If:
      node = parseIfBlock();
      break;

    case SyntaxKind.While:
      node = parseWhileBlock();
      break;

    case SyntaxKind.Foreach:
      node = parseForeachBlock();
      break;

    case SyntaxKind.Newline:
      nextToken();
      return parseStatement();

    case SyntaxKind.Begin:
      node = parseBeginBlock() as BeginStatement | InvalidStatement;

      reportParsingError(
        "nested begin blocks not allowed",
        node.range
      );

      node.kind = SyntaxKind.Unknown;
      break;

    default:
      if (isKeyword()) {
        if (
          cur_token.kind === SyntaxKind.Continue ||
          cur_token.kind === SyntaxKind.Break ||
          cur_token.kind === SyntaxKind.Return
        ) {
          node = parseKeyword();
        } else {
          reportParsingError(`unexpected keyword "${GetSyntaxKindName(cur_token.kind)}"`);

          node = parseInvalidToken();
        }
      } else if (isTypename()) {
        node = parseVariableDeclarationStatement();
      } else {
        node = parseExpression();
      }
  }

  if (cur_token.kind !== SyntaxKind.EOF) {
    nextTokenExpectType(SyntaxKind.Newline);
  }

  return node;
}

function parseStatementList(terminator_tokens: { [key in SyntaxKind]?: boolean }): StatementList {
  const node = new StatementList();

  while (moreData() && !(cur_token.kind in terminator_tokens)) {
    const statement = parseStatement();

    if (statement.kind !== SyntaxKind.Unknown) {
      mkChild(node, statement);
    }
  }

  return node;
}

function parseVariableDeclaration(): VariableDeclaration {
  const node = new VariableDeclaration();

  mkChild(node, parseTypename(), "type");
  mkChild(node, parseIdentifier(), "variable");

  return node;
}

type PartialSome<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type UnfinishedChild<T extends NodeWithParent> = PartialSome<T, "parent" | "kind">;

function parseVariableDeclarationStatement(): VariableDeclarationStatement {  // TODO: use UnfinishedChild type
  const node = new VariableDeclarationStatement();

  mkChild(node, parseVariableDeclaration(), "variable");

  if (isAssignmentOperator()) {
    mkChild(node, parseOperator(), "op");
    mkChild(node, parseExpression(), "expression");
  }

  return node;
}

function parseSet(): SetStatement {
  const node = new SetStatement();

  mkChild(node, nextTokenExpectType(SyntaxKind.Set), "set");
  mkChild(node, parseIdentifier(), "variable");
  mkChild(node, nextTokenExpectType(SyntaxKind.To), "to");
  mkChild(node, parseLogicalOr(), "expression");

  return node;
}

function parseLet(): LetStatement {
  const node = new LetStatement();

  mkChild(node, nextTokenExpectType(SyntaxKind.Let), "let");
  mkChild(node, parseVariableOrVariableDeclaration(), "variable");
  mkChild(node, parseAssignmentOperator(), "op");
  mkChild(node, parseExpression(), "expression");

  return node;
}

function parsePrimaryExpressionList(): PrimaryExpressionList {
  const node = new PrimaryExpressionList();

  while (
    moreData() &&
    cur_token.kind !== SyntaxKind.Newline &&
    (
      cur_token.kind === SyntaxKind.IdentifierToken ||
      cur_token.kind === SyntaxKind.Number
    )
  ) {
    const arg = parsePrimaryExpression() as PrimaryExpression;

    mkChild(node, arg);
  }

  return node;
}

function parseBlockType(): BlocktypeExpression {
  const node = new BlocktypeExpression();

  mkChild(node, nextTokenExpectType(SyntaxKind.BlockType), "block_type");
  mkChild(node, parsePrimaryExpressionList(), "args");

  return node;
}

function parseBeginBlock(): BeginStatement {
  const node = new BeginStatement();

  mkChild(node, nextTokenExpectType(SyntaxKind.Begin), "begin");
  mkChild(node, parseBlockType(), "block_type");
  nextTokenExpectType(SyntaxKind.Newline);

  mkChild(node, parseStatementList({
    [SyntaxKind.End]: true
  }), "body");

  mkChild(node, nextTokenExpectType(SyntaxKind.End), "end");

  return node;
}

function parseForeachBlock(): ForeachStatement {
  const node = new ForeachStatement();

  mkChild(node, nextTokenExpectType(SyntaxKind.Foreach), "foreach");

  mkChild(node, parseVariableOrVariableDeclaration(), "identifier");

  mkChild(node, nextTokenExpectType(SyntaxKind.LArrow), "larrow");
  mkChild(node, parseExpression(), "iterable");
  nextTokenExpectType(SyntaxKind.Newline);

  mkChild(node, parseStatementList({
    [SyntaxKind.Loop]: true
  }), "body");

  mkChild(node, nextTokenExpectType(SyntaxKind.Loop), "loop");

  return node;
}

function parseBranch<T extends BranchKeywordSyntaxKind>(
  branch_keyword: T,
  terminator_tokens: { [key in TokenSyntaxKind]?: boolean }
): Branch<T> {
  const node = new Branch<T>();

  mkChild(node, nextTokenExpectType(branch_keyword), "keyword");
  mkChild(node, parseExpression(), "condition");
  nextTokenExpectType(SyntaxKind.Newline);

  mkChild(node, parseStatementList(terminator_tokens), "body");

  return node;
}

function parseWhileBlock(): WhileStatement {
  const node = new WhileStatement();

  mkChild(node, parseBranch(SyntaxKind.While, {
    [SyntaxKind.Loop]: true
  }), "branch");

  mkChild(node, nextTokenExpectType(SyntaxKind.Loop), "loop");

  return node;
}

function parseBranchList(): BranchList {
  const node = new BranchList();

  mkChild(node, parseBranch(SyntaxKind.If, {
    [SyntaxKind.Elseif]: true,
    [SyntaxKind.Else]: true,
    [SyntaxKind.Endif]: true,
  }));

  while (cur_token.kind === SyntaxKind.Elseif) {
    mkChild(node, parseBranch(SyntaxKind.Elseif, {
      [SyntaxKind.Elseif]: true,
      [SyntaxKind.Else]: true,
      [SyntaxKind.Endif]: true,
    }));
  }

  return node;
}

function parseIfBlock(): IfStatement {
  const node = new IfStatement();

  mkChild(node, parseBranchList(), "branches");

  if (cur_token.kind === SyntaxKind.Else) {
    mkChild(node, nextTokenExpectType(SyntaxKind.Else), "else");
    nextTokenExpectType(SyntaxKind.Newline);
    mkChild(node, parseStatementList({
      [SyntaxKind.Endif]: true
    }), "else_statements");
  }

  mkChild(node, nextTokenExpectType(SyntaxKind.Endif), "endif");

  return node;
}

function parseScriptCompoundStatement(): StatementList {
  const node = new StatementList();

  let statement: Statement;

  while (moreData()) {
    switch (cur_token.kind) {
      case SyntaxKind.Set:
        statement = parseSet();
        break;

      case SyntaxKind.Let:
        statement = parseLet();
        break;

      case SyntaxKind.Begin:
        statement = parseBeginBlock();
        break;

      case SyntaxKind.Newline:
        nextToken();
        continue;

      default:
        if (isTypename()) {
          statement = parseVariableDeclarationStatement();
        } else {
          reportParsingError(
            "unexpected statement in outer scope",
            parseStatement().range
          );
          continue;
        }
    }

    if (cur_token.kind !== SyntaxKind.EOF) {
      nextTokenExpectType(SyntaxKind.Newline);
    }

    mkChild(node, statement);
  }

  return node;
}

function parseScript(): Script {
  script = new Script();

  while (moreData() && cur_token.kind !== SyntaxKind.ScriptName) {
    mkChild(script as any, nextToken(), `newline_${Object.values(script.children).length - 1}`);  // FIXME: remove this hack
  }

  mkChild(script, nextTokenExpectType(SyntaxKind.ScriptName), "scriptname");
  mkChild(script, parseIdentifier(), "name");
  nextTokenExpectType(SyntaxKind.Newline);
  mkChild(script, parseScriptCompoundStatement(), "body");

  const children = Object.values(script.children);

  script.range = {
    start: children[0].range.start,
    end: children.at(-1)!.range.end,
  };

  return script;
}

export function Parse(text: string): Script {
  lexer = new Lexer(text);

  cur_token = lexer.lexToken();

  return parseScript();
}
