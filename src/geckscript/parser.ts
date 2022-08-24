import { Position, Range } from "vscode-languageserver-textdocument";
import { Lexer } from "./lexer";
import { TokenData } from "./token_data";

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
  IsAssignmentOperator,
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
  GetSyntaxKindName,
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
function isAssignmentOperator(): boolean { return IsAssignmentOperator(cur_token.kind); }

function _skipToken(): void {
  if (moreData()) {
    last_token = cur_token;
    cur_token = lexer.lexToken();
  }
}

function skipToken(): void {
  _skipToken();

  while (cur_token.kind === SyntaxKind.Comment) parseComment();

  if (paren_level > 0) {
    while (cur_token.kind === SyntaxKind.Newline) skipToken();
  }
}

function nextToken<T extends SyntaxKind>(): Token<T> {
  const token = cur_token;

  skipToken();

  return token as Token<T>;
}

function nextTokenExpectType<T extends SyntaxKind>(kind: T): Token<T> {
  const token = cur_token;

  token.parent = last_parent;

  let skip_token = true;

  if (kind === SyntaxKind.RParen)
    --paren_level;

  if (token.kind !== kind) {
    reportParsingError(`expected "${GetSyntaxKindName(kind)}", got "${GetSyntaxKindName(token.kind)}"`);
    skip_token = cur_token.kind !== SyntaxKind.Newline;
  }

  if (skip_token)
    skipToken();

  return token as Token<T>;
}

function createMissingNode<T extends Node>(node: T): T {
  node.range = {
    start: cur_token.range.start,
    end: cur_token.range.start
  };

  node.parent = last_parent;

  if (
    cur_token.kind !== SyntaxKind.EOF &&
    cur_token.kind !== SyntaxKind.Newline &&
    cur_token.kind !== SyntaxKind.RParen &&
    cur_token.kind !== SyntaxKind.RBracket
  )
    skipToken();

  return node;
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

function parseBinOpRight(
  parse_child: () => Expression,
  valid_tokens: { [key in SyntaxKind]?: boolean }
): Expression {
  let lhs = parse_child();

  if (cur_token.kind in valid_tokens) {
    let last_node = parseNode(new BinaryExpression(), node => {
      node.lhs = lhs;
      node.op = parseOperator();
      node.rhs = parse_child();
    });

    lhs = last_node;

    while (cur_token.kind in valid_tokens) {
      const node = parseNode(new BinaryExpression(), node => {
        node.lhs = last_node.rhs;
        node.op = parseOperator();
        node.rhs = parse_child();
      });

      last_node.rhs = node;
      last_node = node;
    }
  }

  return lhs;
}

function parseBinOpLeft(
  parse_child: () => Expression,
  valid_tokens: { [key in SyntaxKind]?: boolean }
): Expression {
  let lhs = parse_child();

  while (cur_token.kind in valid_tokens) {
    lhs = parseNode(new BinaryExpression(), node => {
      node.lhs = lhs;
      node.op = parseOperator();
      node.rhs = parse_child();
    }, lhs.range.start);
  }

  return lhs;
}

function parseComment(): void {
  const node = parseNode(new Comment(), node => {
    node.content = cur_token.content;
    node.value = node.content.substring(1);
    _skipToken();
  });

  script.comments[node.range.start.line] = node;
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

  return parseNode(cur_token, node => {
    if (node.kind != SyntaxKind.Identifier) {
      reportParsingError("expected an identifier");
      createMissingNode(new Node());
    }
  });
}

function parseTypename(): Typename {
  return parseNode(cur_token, () => {
    if (!isTypename()) reportParsingError("expected a typename");
    createMissingNode(new Node());
  }) as Typename;
}

function parseKeyword(): Keyword {
  return parseNode(cur_token, () => {
    if (!isKeyword()) reportParsingError("expected a keyword");
    createMissingNode(new Node());
  }) as Keyword;
}

function parseOperator(): Operator {
  return parseNode(cur_token, () => {
    if (!isOperator()) reportParsingError("expected an operator");
    createMissingNode(new Node());
  }) as Operator;
}

function parseAssignmentOperator(): AssignmentOperator {
  return parseNode(cur_token, () => {
    if (!isAssignmentOperator()) reportParsingError("expected an assignment operator");
    createMissingNode(new Node());
  }) as AssignmentOperator;
}

function parseVariableOrVariableDeclaration(): Identifier | VariableDeclaration {
  if (cur_token.kind === SyntaxKind.Identifier)
    return parseNode(nextToken());
  else if (isTypename())
    return parseVariableDeclaration();
  else {
    reportParsingError("expected a variable or a variable declaration");
    return createMissingNode(new Node()) as Identifier;
  }
}

function parseFunction(): FunctionExpression {
  return parseNode(new FunctionExpression(), node => {
    node.name = parseIdentifier();

    while (moreData() && cur_token.kind !== SyntaxKind.Newline) {
      if (isOperator()) {
        if (cur_token.kind === SyntaxKind.Comma) {
          skipToken();
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
      cur_token.kind !== SyntaxKind.RParen &&
      cur_token.kind !== SyntaxKind.Newline
    ) {
      if (cur_token.kind === SyntaxKind.Comma) skipToken();

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
      cur_token.kind !== SyntaxKind.RBracket &&
      cur_token.kind !== SyntaxKind.RParen &&  // TODO: come up with a better solution (keep trach of the context?)
      cur_token.kind !== SyntaxKind.Newline
    ) {
      if (cur_token.kind === SyntaxKind.Comma) skipToken();

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
  if (cur_token.kind === SyntaxKind.String) {
    return parseString();
  } else if (cur_token.kind === SyntaxKind.Number) {
    return parseNumber();
  } else if (cur_token.kind === SyntaxKind.Identifier) {
    if (cur_token.content.toLowerCase() in TokenData.Functions)
      return parseFunction();
    else
      return parseIdentifier();
  } else if (cur_token.kind === SyntaxKind.LParen) {
    skipToken();
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
  } else if (cur_token.kind === SyntaxKind.LBracket) {
    return parseLambdaInline();
  } else {
    reportParsingError(`expected expression, got "${GetSyntaxKindName(cur_token.kind)}"`);

    return createMissingNode(new Node()) as Expression;
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
      node.rhs = createMissingNode(new Node()) as Expression;
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
      node.rhs = createMissingNode(new Node()) as Expression;
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
  if (isOperator()) return parseLogicalNot();

  const kind = cur_token.kind;
  if (
    kind !== SyntaxKind.Minus &&
    kind !== SyntaxKind.Dollar &&
    kind !== SyntaxKind.Hash &&
    kind !== SyntaxKind.Asterisk &&
    kind !== SyntaxKind.Ampersand
  ) return parseLogicalNot();

  return parseNode(new UnaryExpression(), node => {
    node.op = parseOperator();
    node.operand = parseUnary();
  });
}

function parseExponential(): Expression {
  return parseBinOpLeft(
    () => parseUnary(),
    { [SyntaxKind.Circumflex]: true }
  );
}

function parseMultiplicative(): Expression {
  return parseBinOpLeft(
    () => parseExponential(),
    {
      [SyntaxKind.Asterisk]: true,
      [SyntaxKind.Slash]: true,
      [SyntaxKind.Percent]: true,
    }
  );
}

function parseAdditive(): Expression {
  return parseBinOpLeft(
    () => parseMultiplicative(),
    {
      [SyntaxKind.Plus]: true,
      [SyntaxKind.Minus]: true,
    }
  );
}

function parseShift(): Expression {
  return parseBinOpLeft(
    () => parseAdditive(),
    {
      [SyntaxKind.DoubleLess]: true,
      [SyntaxKind.DoubleGreater]: true,
    }
  );
}

function parseAnd(): Expression {
  return parseBinOpLeft(
    () => parseShift(),
    { [SyntaxKind.Ampersand]: true }
  );
}

function parseOr(): Expression {
  return parseBinOpLeft(
    () => parseAnd(),
    { [SyntaxKind.VBar]: true }
  );
}

function parseRelational(): Expression {
  return parseBinOpLeft(
    () => parseOr(),
    {
      [SyntaxKind.Greater]: true,
      [SyntaxKind.GreaterEqulas]: true,
      [SyntaxKind.Less]: true,
      [SyntaxKind.LessEqulas]: true,
    }
  );
}

function parseEquality(): Expression {
  return parseBinOpLeft(
    () => parseRelational(),
    {
      [SyntaxKind.DoubleEquals]: true,
      [SyntaxKind.ExclamationEquals]: true,
    }
  );
}

function parseSliceMakePair(): Expression {
  return parseBinOpLeft(
    () => parseEquality(),
    {
      [SyntaxKind.Colon]: true,
      [SyntaxKind.DoubleColon]: true,
    }
  );
}

function parseLogicalAndCompoundAssignment(): Expression {
  return parseBinOpLeft(
    () => parseSliceMakePair(),
    {
      [SyntaxKind.DoubleAmpersand]: true,
      [SyntaxKind.PlusEquals]: true,
      [SyntaxKind.MinusEquals]: true,
      [SyntaxKind.AsteriskEquals]: true,
      [SyntaxKind.SlashEquals]: true,
      [SyntaxKind.CircumflexEquals]: true,
      [SyntaxKind.VBarEquals]: true,
      [SyntaxKind.AmpersandEquals]: true,
      [SyntaxKind.PercentEquals]: true,
    }
  );
}

function parseLogicalOr(): Expression {
  return parseBinOpLeft(
    () => parseLogicalAndCompoundAssignment(),
    { [SyntaxKind.DoubleVBar]: true }
  );
}

function parseAssignment(): Expression {  // TODO: parse according to grammar.txt
  return parseBinOpRight(
    () => parseLogicalOr(),
    {
      [SyntaxKind.Equals]: true,
      [SyntaxKind.ColonEquals]: true
    }
  );
}

function parseExpression(): Expression {
  return parseAssignment();
}

function parseStatement(): Statement {
  let node: Statement;

  const kind = cur_token.kind;

  if (kind === SyntaxKind.Set) {  // TODO: replace with switch-case
    node = parseSet();
  } else if (kind === SyntaxKind.Let) {
    node = parseLet();
  } else if (isTypename()) {
    node = parseVariableDeclarationStatement();
  } else if (kind === SyntaxKind.If) {
    node = parseIfBlock();
  } else if (kind === SyntaxKind.While) {
    node = parseWhileBlock();
  } else if (kind === SyntaxKind.Foreach) {
    node = parseForeachBlock();
  } else if (kind === SyntaxKind.Newline) {
    skipToken();
    return parseStatement();
  } else if (kind === SyntaxKind.Begin) {
    node = parseBeginBlock();

    reportParsingError(
      "nested begin blocks not allowed",
      node.range
    );

    node.kind = SyntaxKind.Unknown;
  } else if (isKeyword()) {
    if (
      cur_token.kind === SyntaxKind.Continue ||
      cur_token.kind === SyntaxKind.Break ||
      cur_token.kind === SyntaxKind.Return
    ) {
      node = parseKeyword();
    } else {
      reportParsingError(`unexpected keyword "${GetSyntaxKindName(cur_token.kind)}"`);

      node = createMissingNode(new Node() as Statement);
    }

  } else {
    node = parseExpression();
  }

  if (cur_token.kind !== SyntaxKind.EOF) {
    nextTokenExpectType(SyntaxKind.Newline);
  }

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
    while (moreData()) {
      let statement: Statement;

      const kind = cur_token.kind;

      if (kind === SyntaxKind.Set) {
        statement = parseSet();
      } else if (kind === SyntaxKind.Let) {
        statement = parseLet();
      } else if (isTypename()) {
        statement = parseVariableDeclarationStatement();
      } else if (kind === SyntaxKind.Begin) {
        statement = parseBeginBlock();
      } else if (kind === SyntaxKind.Newline) {
        skipToken();
        continue;
      } else {
        reportParsingError(
          "unexpected statement in outer scope",
          parseStatement().range
        );
        continue;
      }

      if (cur_token.kind !== SyntaxKind.EOF) {
        nextTokenExpectType(SyntaxKind.Newline);
      }

      node.children.push(statement);
    }
  });
}

function parseScript(): Script {
  return parseNode(script, node => {
    while (moreData()) {
      if (cur_token.kind === SyntaxKind.Comment) parseComment();
      else if (cur_token.kind === SyntaxKind.Newline) skipToken();
      else break;
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
