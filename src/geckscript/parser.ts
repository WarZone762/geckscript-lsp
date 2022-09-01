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
  Block,
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
} from "./types";


let lexer: Lexer;

let cur_token: Token;

let last_token: Token;

let last_parent: Node | undefined;

let paren_level = 0;

let script: Script;

function moreData(): boolean {
  return cur_token.kind !== SyntaxKind.EOF;
}

function isTypename(): boolean { return IsTypename(cur_token.kind); }
function isKeyword(): boolean { return IsKeyword(cur_token.kind); }
function isOperator(): boolean { return IsOperator(cur_token.kind); }
function isUnaryOperator(): boolean { return IsUnaryOperator(cur_token.kind); }
function isMultiplicativeOperator(): boolean { return IsMultiplicativeOperator(cur_token.kind); }
function isAdditiveOperator(): boolean { return IsAdditiveOperator(cur_token.kind); }
function isShiftOperator(): boolean { return IsShiftOperator(cur_token.kind); }
function isRelationalOperator(): boolean { return IsRelationalOperator(cur_token.kind); }
function isEqualityOperator(): boolean { return IsEqualityOperator(cur_token.kind); }
function isSliceMakePairOperator(): boolean { return IsSliceMakePairOperator(cur_token.kind); }
function isAssignmentOperator(): boolean { return IsAssignmentOperator(cur_token.kind); }
function isSimpleAssignmentOperator(): boolean { return IsSimpleAssignmentOperator(cur_token.kind); }

function skipToken(): void {
  if (moreData()) {
    last_token = cur_token;
    cur_token = lexer.lexToken();
  }
}

function nextToken<T extends SyntaxKind>(): Token<T> {
  const token = cur_token;

  token.parent = last_parent;

  if (token.kind === SyntaxKind.RParen)
    --paren_level;

  skipToken();

  if (paren_level > 0) {
    while (true) {
      switch (cur_token.kind) {
        case SyntaxKind.Comment: parseComment(); continue;
        case SyntaxKind.Newline: skipToken(); continue;
      }
      break;
    }
  } else {
    while (cur_token.kind === SyntaxKind.Comment) parseComment();
  }

  return token as Token<T>;
}

function nextTokenExpectType<T extends SyntaxKind>(kind: T): Token<T> {
  if (cur_token.kind !== kind) {
    reportParsingError(`expected "${GetSyntaxKindName(kind)}", got "${GetSyntaxKindName(cur_token.kind)}"`);

    return parseInvalidToken();
  }

  return nextToken();
}

function parseInvalidToken<T extends Node>(): T {
  if (
    cur_token.kind !== SyntaxKind.EOF &&
    cur_token.kind !== SyntaxKind.Newline
  ) {
    const token = nextToken();
    token.kind = SyntaxKind.Unknown;
    return token as unknown as T;
  }

  return cur_token as unknown as T;
}

function reportParsingError(message: string, range?: Range): void {
  script.diagnostics.push({
    message: `Parsing error: ${message}`,
    range: range ?? cur_token.range,
  });
}

function parseNode<T extends Node>(
  node: T,
  parse_function: (node: T) => void = () => undefined,
  start?: Position,
): T {
  const last_parent_saved = last_parent;

  node.parent = last_parent;
  last_parent = node;

  node.range = {
    start: start ?? cur_token.range.start,
    end: cur_token.range.start,
  };

  parse_function(node);

  node.range.end = last_token.range.end;

  last_parent = last_parent_saved;

  return node;
}

function parseBinOpLeft(
  parse_child: () => Expression,
  predicate: () => boolean
): Expression {
  let lhs = parse_child();

  while (predicate()) {
    lhs = parseNode(new BinaryExpression(), node => {
      node.lhs = lhs;
      node.op = parseOperator();
      node.rhs = parse_child();
    }, lhs.range.start);
  }

  return lhs;
}

function parseComment(): void {
  const last_non_comment_token = last_token;

  const node = parseNode(new Comment(), node => {
    node.content = cur_token.content;
    node.value = node.content.substring(1);
    skipToken();
  });

  script.comments[node.range.start.line] = node;

  last_token = last_non_comment_token;
}

function parseNumber(): NumberLiteral {
  return parseNode(new NumberLiteral(), node => {
    node.content = nextTokenExpectType(SyntaxKind.Number).content;
    if (node.content[0] === "0" && node.content[1]?.toLowerCase() === "x") {
      node.value = parseInt(node.content, 16);
    } else {
      node.value = parseFloat(node.content);
    }

    return node;
  });
}

function parseString(): StringLiteral {
  return parseNode(new StringLiteral(), node => {
    node.content = nextTokenExpectType(SyntaxKind.String).content;
    node.value = node.content.substring(1, node.content.length - 1);
  });
}

function parseIdentifier(): Identifier {
  return nextTokenExpectType(SyntaxKind.Identifier);
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
  if (cur_token.kind === SyntaxKind.Identifier)
    return nextToken();
  else if (isTypename())
    return parseVariableDeclaration();
  else {
    reportParsingError("expected a variable or a variable declaration");
    return parseInvalidToken();
  }
}

function parseFunction(): FunctionExpression {
  return parseNode(new FunctionExpression(), node => {
    node.name = parseIdentifier();

    while (moreData() && cur_token.kind !== SyntaxKind.Newline) {
      if (isOperator()) {
        if (cur_token.kind === SyntaxKind.Comma) {
          nextToken();
          continue;
        } else if (cur_token.kind !== SyntaxKind.LParen) {
          break;
        }
      }

      node.args.push(parseOr());
    }
  });
}

function parseLambdaInline(): LambdaInlineExpression {
  return parseNode(new LambdaInlineExpression(), node => {
    node.lbracket = nextTokenExpectType(SyntaxKind.LBracket);

    while (
      moreData() &&
      cur_token.kind !== SyntaxKind.RBracket &&
      cur_token.kind !== SyntaxKind.Newline
    ) {
      if (cur_token.kind === SyntaxKind.Comma) nextToken();

      node.params.push(parseVariableOrVariableDeclaration());
    }

    node.rbracket = nextTokenExpectType(SyntaxKind.RBracket);
    node.arrow = nextTokenExpectType(SyntaxKind.EqualsGreater);
    node.expression = parseExpression();
  });
}

function parseLambda(): LambdaExpression {
  return parseNode(new LambdaExpression(), node => {
    node.begin = nextTokenExpectType(SyntaxKind.Begin);
    node.function = nextTokenExpectType(SyntaxKind.BlocktypeTokenFunction);
    node.lbracket = nextTokenExpectType(SyntaxKind.LBracket);

    while (
      moreData() &&
      cur_token.kind !== SyntaxKind.RBracket &&  // TODO: come up with a better solution (keep track of the context?)
      cur_token.kind !== SyntaxKind.Newline
    ) {
      if (cur_token.kind === SyntaxKind.Comma) nextToken();

      node.params.push(parseVariableOrVariableDeclaration());
    }

    node.rbracket = nextTokenExpectType(SyntaxKind.RBracket);
    nextTokenExpectType(SyntaxKind.Newline);
    node.body = parseCompoundStatement({
      [SyntaxKind.End]: true
    });
    node.end = nextTokenExpectType(SyntaxKind.End);
  });
}

function parsePrimaryExpression(): Expression {
  switch (cur_token.kind) {
    case SyntaxKind.String:
      return parseString();

    case SyntaxKind.Number:
      return parseNumber();

    case SyntaxKind.Identifier:
      if (GetFunctionInfo(cur_token.content.toLowerCase()) != undefined)
        return parseFunction();
      else
        return parseIdentifier();

    case SyntaxKind.LParen:
      nextToken();
      if (cur_token.kind as unknown === SyntaxKind.Begin) {
        return parseNode(parseLambda(), () => {
          nextTokenExpectType(SyntaxKind.RParen);
        });
      } else {
        ++paren_level;

        return parseNode(parseExpression(), () => {
          nextTokenExpectType(SyntaxKind.RParen);
        });
      }

    case SyntaxKind.LBracket:
      return parseLambdaInline();

    default:
      reportParsingError(`expected expression, got "${GetSyntaxKindName(cur_token.kind)}"`);

      return parseInvalidToken();
  }
}

function parseMemeberSquareBrackets(lhs: Expression): Expression {
  return parseMember(parseNode(new ElementAccessExpression(), node => {
    node.lhs = lhs;
    node.left_op = nextTokenExpectType(SyntaxKind.LSQBracket);
    node.rhs = parseExpression();
    node.right_op = nextTokenExpectType(SyntaxKind.RSQBracket);
  }));
}

function parseMemberRArrow(lhs: Expression): Expression {
  return parseMember(parseNode(new BinaryExpression(), node => {
    node.lhs = lhs;
    node.op = nextTokenExpectType(SyntaxKind.LArrow);

    if (
      cur_token.kind !== SyntaxKind.String &&
      cur_token.kind !== SyntaxKind.Number &&
      cur_token.kind !== SyntaxKind.Identifier
    ) {
      node.rhs = parseInvalidToken();
    } else {
      node.rhs = parsePrimaryExpression();
    }
  }));
}

function parseMemberDot(lhs: Expression): Expression {
  return parseMember(parseNode(new BinaryExpression(), node => {
    node.lhs = lhs;
    node.op = nextTokenExpectType(SyntaxKind.Dot);

    if (cur_token.kind !== SyntaxKind.Identifier) {
      node.rhs = parseInvalidToken();
    } else {
      node.rhs = parsePrimaryExpression();
    }
  }));
}

function parseMember(lhs?: Expression): Expression {
  lhs = lhs ?? parsePrimaryExpression();

  if (isOperator()) return lhs;

  const kind = cur_token.kind;

  if (kind === SyntaxKind.LSQBracket) {
    return parseMemeberSquareBrackets(lhs);
  } else if (kind === SyntaxKind.RArrow) {
    return parseMemberRArrow(lhs);
  } else if (kind === SyntaxKind.Dot) {
    return parseMemberDot(lhs);
  } else {
    return lhs;
  }
}

function parseLogicalNot(): Expression {
  if (cur_token.kind !== SyntaxKind.Exclamation)
    return parseMember();

  return parseNode(new UnaryExpression(), node => {
    node.op = parseOperator();
    node.operand = parseLogicalNot();
  });
}

function parseUnary(): Expression {
  if (!isUnaryOperator()) return parseLogicalNot();

  return parseNode(new UnaryExpression(), node => {
    node.op = parseOperator();
    node.operand = parseUnary();
  });
}

function parseExponential(): Expression {
  return parseBinOpLeft(
    () => parseUnary(),
    () => cur_token.kind === SyntaxKind.Circumflex
  );
}

function parseMultiplicative(): Expression {
  return parseBinOpLeft(
    () => parseExponential(),
    isMultiplicativeOperator
  );
}

function parseAdditive(): Expression {
  return parseBinOpLeft(
    () => parseMultiplicative(),
    isAdditiveOperator
  );
}

function parseShift(): Expression {
  return parseBinOpLeft(
    () => parseAdditive(),
    isShiftOperator
  );
}

function parseAnd(): Expression {
  return parseBinOpLeft(
    () => parseShift(),
    () => cur_token.kind === SyntaxKind.Ampersand
  );
}

function parseOr(): Expression {
  return parseBinOpLeft(
    () => parseAnd(),
    () => cur_token.kind === SyntaxKind.VBar
  );
}

function parseRelational(): Expression {
  return parseBinOpLeft(
    () => parseOr(),
    isRelationalOperator
  );
}

function parseEquality(): Expression {
  return parseBinOpLeft(
    () => parseRelational(),
    isEqualityOperator
  );
}

function parseSliceMakePair(): Expression {
  return parseBinOpLeft(
    () => parseEquality(),
    isSliceMakePairOperator
  );
}

function parseLogicalAnd(): Expression {
  return parseBinOpLeft(
    () => parseSliceMakePair(),
    () => cur_token.kind === SyntaxKind.DoubleAmpersand
  );
}

function parseLogicalOr(): Expression {
  return parseBinOpLeft(
    () => parseLogicalAnd(),
    () => cur_token.kind === SyntaxKind.DoubleVBar
  );
}

function parseAssignment(): Expression {
  let lhs = parseLogicalOr();

  if (isSimpleAssignmentOperator()) {
    let last_node = parseNode(new BinaryExpression(), node => {
      lhs.parent = node;
      node.lhs = lhs;
      node.op = parseOperator();
      node.rhs = parseLogicalOr();
    });

    lhs = last_node;

    while (isSimpleAssignmentOperator()) {
      const node = parseNode(new BinaryExpression(), node => {
        lhs.parent = node;
        node.lhs = last_node.rhs;
        node.op = parseOperator();
        node.rhs = parseLogicalOr();
      });

      last_node.rhs = node;
      last_node = node;
    }
  }

  return lhs;
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
      node = parseBeginBlock();

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

  if (cur_token.kind !== SyntaxKind.EOF)
    nextTokenExpectType(SyntaxKind.Newline);

  return node;
}

function parseCompoundStatement(terminator_tokens: { [key in SyntaxKind]?: boolean }): Block {
  return parseNode(new Block(), node => {
    while (moreData() && !(cur_token.kind in terminator_tokens)) {
      const statement = parseStatement();

      if (statement.kind !== SyntaxKind.Unknown)
        node.children.push(statement);
    }
  });
}

function parseVariableDeclaration(): VariableDeclaration {
  return parseNode(new VariableDeclaration(), node => {
    node.type = parseTypename();
    node.variable = parseIdentifier();
  });
}

function parseVariableDeclarationStatement(): VariableDeclarationStatement {
  return parseNode(new VariableDeclarationStatement(), node => {
    node.variable = parseVariableDeclaration();
    if (isAssignmentOperator()) {
      node.op = parseOperator();
      node.expression = parseExpression();
    }
  });
}

function parseSet(): SetStatement {
  return parseNode(new SetStatement(), node => {
    node.set = nextTokenExpectType(SyntaxKind.Set);
    node.variable = parseIdentifier();
    node.to = nextTokenExpectType(SyntaxKind.To);
    node.expression = parseLogicalOr();
  });
}

function parseLet(): LetStatement {
  return parseNode(new LetStatement(), node => {
    node.let = nextTokenExpectType(SyntaxKind.Let);
    node.variable = parseVariableOrVariableDeclaration();
    node.op = parseAssignmentOperator();
    node.expression = parseExpression();
  });
}

function parseBlockType(): BlocktypeExpression {
  return parseNode(new BlocktypeExpression(), node => {
    node.block_type = nextTokenExpectType(SyntaxKind.BlocktypeToken);

    while (
      moreData() &&
      cur_token.kind !== SyntaxKind.Newline &&
      (
        cur_token.kind === SyntaxKind.Identifier ||
        cur_token.kind === SyntaxKind.Number
      )
    ) {
      const arg = parsePrimaryExpression();

      node.args.push(arg);
    }
  });
}

function parseBeginBlock(): BeginStatement {
  return parseNode(new BeginStatement(), node => {
    node.begin = nextTokenExpectType(SyntaxKind.Begin);
    node.block_type = parseBlockType();
    nextTokenExpectType(SyntaxKind.Newline);

    node.body = parseCompoundStatement({
      [SyntaxKind.End]: true
    });

    node.end = nextTokenExpectType(SyntaxKind.End);
  });
}

function parseForeachBlock(): ForeachStatement {
  return parseNode(new ForeachStatement(), node => {
    node.foreach = nextTokenExpectType(SyntaxKind.Foreach);

    node.identifier = parseVariableOrVariableDeclaration();

    node.larrow = nextTokenExpectType(SyntaxKind.LArrow);
    node.iterable = parseExpression();
    nextTokenExpectType(SyntaxKind.Newline);

    node.body = parseCompoundStatement({
      [SyntaxKind.Loop]: true
    });

    node.loop = nextTokenExpectType(SyntaxKind.Loop);
  });
}

function parseBranch<T extends BranchKeywordSyntaxKind>(
  branch_keyword: T,
  terminator_tokens: { [key in SyntaxKind]?: boolean }
): Branch<Token<T>> {
  return parseNode(new Branch(), node => {
    node.keyword = nextTokenExpectType(branch_keyword);
    node.condition = parseExpression();
    nextTokenExpectType(SyntaxKind.Newline);

    node.body = parseCompoundStatement(terminator_tokens);
  });
}

function parseWhileBlock(): WhileStatement {
  return parseNode(new WhileStatement(), node => {
    node.branch = parseBranch(SyntaxKind.While, {
      [SyntaxKind.Loop]: true
    });

    node.loop = nextTokenExpectType(SyntaxKind.Loop);
  });
}

function parseIfBlock(): IfStatement {
  return parseNode(new IfStatement(), node => {
    node.branches[0] = parseBranch(SyntaxKind.If, {
      [SyntaxKind.Elseif]: true,
      [SyntaxKind.Else]: true,
      [SyntaxKind.Endif]: true,
    });

    while (cur_token.kind === SyntaxKind.Elseif) {
      node.branches.push(parseBranch(SyntaxKind.Elseif, {
        [SyntaxKind.Elseif]: true,
        [SyntaxKind.Else]: true,
        [SyntaxKind.Endif]: true,
      }));
    }

    if (cur_token.kind === SyntaxKind.Else) {
      node.else = nextTokenExpectType(SyntaxKind.Else);
      nextTokenExpectType(SyntaxKind.Newline);
      node.else_statements = parseCompoundStatement({
        [SyntaxKind.Endif]: true
      });
    }

    node.endif = nextTokenExpectType(SyntaxKind.Endif);
  });
}

function parseScriptCompoundStatement(): Block {
  return parseNode(new Block(), node => {
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

      if (cur_token.kind !== SyntaxKind.EOF)
        nextTokenExpectType(SyntaxKind.Newline);

      node.children.push(statement);
    }
  });
}

function parseScript(): Script {
  return parseNode(script, node => {
    while (moreData()) {
      switch (cur_token.kind) {
        case SyntaxKind.Comment: parseComment(); continue;
        case SyntaxKind.Newline: nextToken(); continue;
      }
      break;
    }

    node.scriptname = nextTokenExpectType(SyntaxKind.ScriptName);
    node.name = parseIdentifier();
    nextTokenExpectType(SyntaxKind.Newline);
    node.body = parseScriptCompoundStatement();
  });
}

export function Parse(text: string): Script {
  lexer = new Lexer(text);

  cur_token = lexer.lexToken();
  last_token = cur_token;

  script = new Script();

  return parseScript();
}
