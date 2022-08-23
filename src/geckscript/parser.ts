import { Position, Range } from "vscode-languageserver-textdocument";
import { Lexer } from "./lexer";
import { TokenData, GetSyntaxTypeName } from "./token_data";

import {
  SyntaxType,
  BranchKeywordSyntaxType,
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
  BeginStatement,
  BinaryExpression,
  ElementAccessExpression,
  Branch,
  Comment,
  CompoundStatement,
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
let last_node: Node | undefined;

let paren_level = 0;

let script: Script;

function moreData(): boolean {
  return cur_token.type !== SyntaxType.EOF;
}

function isTypename(): boolean { return IsTypename(cur_token.type); }
function isKeyword(): boolean { return IsKeyword(cur_token.type); }
function isOperator(): boolean { return IsOperator(cur_token.type); }
function isAssignmentOperator(): boolean { return IsAssignmentOperator(cur_token.type); }

function _skipToken(): void {
  if (moreData()) {
    last_token = cur_token;
    cur_token = lexer.lexToken();
  }
}

function skipToken(): void {
  _skipToken();

  while (cur_token.type === SyntaxType.Comment) parseComment();

  if (paren_level > 0) {
    while (cur_token.type === SyntaxType.Newline) skipToken();
  }
}

function nextToken<T extends SyntaxType>(): Token<T> {
  const token = cur_token;

  skipToken();

  return token as Token<T>;
}

function nextTokenExpectType<T extends SyntaxType>(type: T): Token<T> {
  const token = cur_token;

  let skip_token = true;

  if (type === SyntaxType.RParen)
    --paren_level;

  if (token.type !== type) {
    reportParsingError(`expected "${GetSyntaxTypeName(type)}", got "${GetSyntaxTypeName(token.type)}"`);
    skip_token = cur_token.type !== SyntaxType.Newline;
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
  if (
    cur_token.type !== SyntaxType.EOF &&
    cur_token.type !== SyntaxType.Newline &&
    cur_token.type !== SyntaxType.RParen &&
    cur_token.type !== SyntaxType.RBracket
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
  parse_function: (node: T) => void,
  start?: Position,
): T {
  const last_node_saved = last_node;
  node.parent = last_node;
  last_node = node;

  node.range = {
    start: start ?? cur_token.range.start,
    end: cur_token.range.start,
  };

  parse_function(node);

  node.range.end = last_token.range.end;

  last_node = last_node_saved;

  return node;
}

function parseBinOpRight(
  parse_child: () => Expression,
  valid_tokens: { [key in SyntaxType]?: boolean }
): Expression {
  let lhs = parse_child();

  if (cur_token.type in valid_tokens) {
    let last_node = parseNode(new BinaryExpression(), node => {
      node.lhs = lhs;
      node.op = parseOperator();
      node.rhs = parse_child();
    });

    lhs = last_node;

    while (cur_token.type in valid_tokens) {
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
  valid_tokens: { [key in SyntaxType]?: boolean }
): Expression {
  let lhs = parse_child();

  while (cur_token.type in valid_tokens) {
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
    node.content = nextTokenExpectType(SyntaxType.Number).content;
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
    node.content = nextTokenExpectType(SyntaxType.String).content;
    node.value = node.content.substring(1, node.content.length - 1);
  });
}

function parseIdentifier(): Token<SyntaxType.Identifier> {
  return nextTokenExpectType(SyntaxType.Identifier);
}

function parseTypename(): Typename {
  const token = cur_token;

  if (!isTypename()) reportParsingError("expected a typename");

  createMissingNode(new Node());

  return token as Typename;
}

function parseKeyword(): Keyword {
  const token = cur_token;

  if (!isKeyword()) reportParsingError("expected a keyword");

  createMissingNode(new Node());

  return token as Keyword;
}

function parseOperator(): Operator {
  const token = cur_token;

  if (!isOperator()) reportParsingError("expected an operator");

  createMissingNode(new Node());

  return token as Operator;
}

function parseAssignmentOperator(): AssignmentOperator {
  const token = cur_token;

  if (!isAssignmentOperator()) reportParsingError("expected an assignment operator");

  createMissingNode(new Node());

  return token as AssignmentOperator;
}

function parseVariableOrVariableDeclaration(): Token<SyntaxType.Identifier> | VariableDeclaration {
  if (cur_token.type === SyntaxType.Identifier)
    return nextToken();
  else if (isTypename())
    return parseVariableDeclaration();
  else {
    reportParsingError("expected a variable or a variable declaration");
    return createMissingNode(new Node()) as Token<SyntaxType.Identifier>;
  }
}

function parseFunction(): FunctionExpression {
  return parseNode(new FunctionExpression(), node => {
    node.name = nextTokenExpectType(SyntaxType.Identifier)!;

    while (moreData() && cur_token.type !== SyntaxType.Newline) {
      if (isOperator()) {
        if (cur_token.type === SyntaxType.Comma) {
          skipToken();
          continue;
        } else if (cur_token.type !== SyntaxType.LParen) {
          break;
        }
      }

      node.args.push(parseOr());
    }
  });
}

function parseLambdaInline(): LambdaInlineExpression {
  return parseNode(new LambdaInlineExpression(), node => {
    node.lbracket = nextTokenExpectType(SyntaxType.LBracket);

    while (
      moreData() &&
      cur_token.type !== SyntaxType.RBracket &&
      cur_token.type !== SyntaxType.RParen &&
      cur_token.type !== SyntaxType.Newline
    ) {
      if (cur_token.type === SyntaxType.Comma) skipToken();

      node.params.push(parseVariableOrVariableDeclaration());
    }

    node.rbracket = nextTokenExpectType(SyntaxType.RBracket);
    node.arrow = nextTokenExpectType(SyntaxType.EqualsGreater);
    node.expression = parseExpression();
  });
}

function parseLambda(): LambdaExpression {
  return parseNode(new LambdaExpression(), node => {
    node.begin = nextTokenExpectType(SyntaxType.Begin);
    node.function = nextTokenExpectType(SyntaxType.BlocktypeTokenFunction);
    node.lbracket = nextTokenExpectType(SyntaxType.LBracket);

    while (
      moreData() &&
      cur_token.type !== SyntaxType.RBracket &&
      cur_token.type !== SyntaxType.RParen &&  // TODO: come up with a better solution (keep trach of the context?)
      cur_token.type !== SyntaxType.Newline
    ) {
      if (cur_token.type === SyntaxType.Comma) skipToken();

      node.params.push(parseVariableOrVariableDeclaration());
    }

    node.rbracket = nextTokenExpectType(SyntaxType.RBracket);
    nextTokenExpectType(SyntaxType.Newline);
    node.compound_statement = parseCompoundStatement({
      [SyntaxType.End]: true
    });
    node.end = nextTokenExpectType(SyntaxType.End);
  });
}

function parsePrimaryExpression(): Expression {
  if (cur_token.type === SyntaxType.String) {
    return parseString();
  } else if (cur_token.type === SyntaxType.Number) {
    return parseNumber();
  } else if (cur_token.type === SyntaxType.Identifier) {
    if (cur_token.content.toLowerCase() in TokenData.Functions)
      return parseFunction();
    else
      return parseIdentifier();
  } else if (cur_token.type === SyntaxType.LParen) {
    skipToken();
    if (cur_token.type as unknown === SyntaxType.Begin) {
      return parseNode(parseLambda(), () => {
        nextTokenExpectType(SyntaxType.RParen);
      });
    } else {
      ++paren_level;

      return parseNode(parseExpression(), () => {
        nextTokenExpectType(SyntaxType.RParen);
      });
    }
  } else if (cur_token.type === SyntaxType.LBracket) {
    return parseLambdaInline();
  } else {
    reportParsingError(`expected expression, got "${GetSyntaxTypeName(cur_token.type)}"`);

    return createMissingNode(new Node()) as Expression;
  }
}

function parseMemeberSquareBrackets(lhs: Expression): Expression {
  return parseMember(parseNode(new ElementAccessExpression(), node => {
    node.lhs = lhs;
    node.left_op = nextTokenExpectType(SyntaxType.LSQBracket);
    node.rhs = parseExpression();
    node.right_op = nextTokenExpectType(SyntaxType.RSQBracket);
  }));
}

function parseMemberRArrow(lhs: Expression): Expression {
  return parseMember(parseNode(new BinaryExpression(), node => {
    node.lhs = lhs;
    node.op = nextTokenExpectType(SyntaxType.LArrow);

    if (
      cur_token.type !== SyntaxType.String &&
      cur_token.type !== SyntaxType.Number &&
      cur_token.type !== SyntaxType.Identifier
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
    node.op = nextTokenExpectType(SyntaxType.Dot);

    if (cur_token.type !== SyntaxType.Identifier) {
      node.rhs = createMissingNode(new Node()) as Expression;
    } else {
      node.rhs = parsePrimaryExpression();
    }
  }));
}

function parseMember(lhs?: Expression): Expression {
  lhs = lhs ?? parsePrimaryExpression();

  if (isOperator()) return lhs;

  const subtype = cur_token.type;

  if (subtype === SyntaxType.LSQBracket) {
    return parseMemeberSquareBrackets(lhs);
  } else if (subtype === SyntaxType.RArrow) {
    return parseMemberRArrow(lhs);
  } else if (subtype === SyntaxType.Dot) {
    return parseMemberDot(lhs);
  } else {
    return lhs;
  }
}

function parseLogicalNot(): Expression {
  if (cur_token.type !== SyntaxType.Exclamation)
    return parseMember();

  return parseNode(new UnaryExpression(), node => {
    node.op = parseOperator();
    node.operand = parseLogicalNot();
  });
}

function parseUnary(): Expression {
  if (isOperator()) return parseLogicalNot();

  const subtype = cur_token.type;
  if (
    subtype !== SyntaxType.Minus &&
    subtype !== SyntaxType.Dollar &&
    subtype !== SyntaxType.Hash &&
    subtype !== SyntaxType.Asterisk &&
    subtype !== SyntaxType.Ampersand
  ) return parseLogicalNot();

  return parseNode(new UnaryExpression(), node => {
    node.op = parseOperator();
    node.operand = parseUnary();
  });
}

function parseExponential(): Expression {
  return parseBinOpLeft(
    () => parseUnary(),
    { [SyntaxType.Circumflex]: true }
  );
}

function parseMultiplicative(): Expression {
  return parseBinOpLeft(
    () => parseExponential(),
    {
      [SyntaxType.Asterisk]: true,
      [SyntaxType.Slash]: true,
      [SyntaxType.Percent]: true,
    }
  );
}

function parseAdditive(): Expression {
  return parseBinOpLeft(
    () => parseMultiplicative(),
    {
      [SyntaxType.Plus]: true,
      [SyntaxType.Minus]: true,
    }
  );
}

function parseShift(): Expression {
  return parseBinOpLeft(
    () => parseAdditive(),
    {
      [SyntaxType.DoubleLess]: true,
      [SyntaxType.DoubleGreater]: true,
    }
  );
}

function parseAnd(): Expression {
  return parseBinOpLeft(
    () => parseShift(),
    { [SyntaxType.Ampersand]: true }
  );
}

function parseOr(): Expression {
  return parseBinOpLeft(
    () => parseAnd(),
    { [SyntaxType.VBar]: true }
  );
}

function parseRelational(): Expression {
  return parseBinOpLeft(
    () => parseOr(),
    {
      [SyntaxType.Greater]: true,
      [SyntaxType.GreaterEqulas]: true,
      [SyntaxType.Less]: true,
      [SyntaxType.LessEqulas]: true,
    }
  );
}

function parseEquality(): Expression {
  return parseBinOpLeft(
    () => parseRelational(),
    {
      [SyntaxType.DoubleEquals]: true,
      [SyntaxType.ExclamationEquals]: true,
    }
  );
}

function parseSliceMakePair(): Expression {
  return parseBinOpLeft(
    () => parseEquality(),
    {
      [SyntaxType.Colon]: true,
      [SyntaxType.DoubleColon]: true,
    }
  );
}

function parseLogicalAndCompoundAssignment(): Expression {
  return parseBinOpLeft(
    () => parseSliceMakePair(),
    {
      [SyntaxType.DoubleAmpersand]: true,
      [SyntaxType.PlusEquals]: true,
      [SyntaxType.MinusEquals]: true,
      [SyntaxType.AsteriskEquals]: true,
      [SyntaxType.SlashEquals]: true,
      [SyntaxType.CircumflexEquals]: true,
      [SyntaxType.VBarEquals]: true,
      [SyntaxType.AmpersandEquals]: true,
      [SyntaxType.PercentEquals]: true,
    }
  );
}

function parseLogicalOr(): Expression {
  return parseBinOpLeft(
    () => parseLogicalAndCompoundAssignment(),
    { [SyntaxType.DoubleVBar]: true }
  );
}

function parseAssignment(): Expression {  // TODO: parse according to grammar.txt
  return parseBinOpRight(
    () => parseLogicalOr(),
    {
      [SyntaxType.Equals]: true,
      [SyntaxType.ColonEquals]: true
    }
  );
}

function parseExpression(): Expression {
  return parseAssignment();
}

function parseStatement(): Statement {
  let node: Statement;

  const type = cur_token.type;

  if (type === SyntaxType.Set) {  // TODO: replace with switch-case
    node = parseSet();
  } else if (type === SyntaxType.Let) {
    node = parseLet();
  } else if (isTypename()) {
    node = parseVariableDeclarationStatement();
  } else if (type === SyntaxType.If) {
    node = parseIfBlock();
  } else if (type === SyntaxType.While) {
    node = parseWhileBlock();
  } else if (type === SyntaxType.Foreach) {
    node = parseForeachBlock();
  } else if (type === SyntaxType.Newline) {
    skipToken();
    return parseStatement();
  } else if (type === SyntaxType.Begin) {
    node = parseBeginBlock();

    reportParsingError(
      "nested begin blocks not allowed",
      node.range
    );

    node.type = SyntaxType.Unknown;
  } else if (isKeyword()) {
    if (
      cur_token.type === SyntaxType.Continue ||
      cur_token.type === SyntaxType.Break ||
      cur_token.type === SyntaxType.Return
    ) {
      node = parseKeyword();
    } else {
      reportParsingError(`unexpected keyword "${GetSyntaxTypeName(cur_token.type)}"`);

      node = createMissingNode(new Node() as Statement);
    }

  } else {
    node = parseExpression();
  }

  if (cur_token.type !== SyntaxType.EOF) {
    nextTokenExpectType(SyntaxType.Newline);
  }

  return node;
}

function parseCompoundStatement(terminator_tokens: { [key in SyntaxType]?: boolean }): CompoundStatement {
  return parseNode(new CompoundStatement(), node => {
    while (moreData() && !(cur_token.type in terminator_tokens)) {
      const statement = parseStatement();

      if (statement.type !== SyntaxType.Unknown)
        node.children.push(statement);
    }
  });
}

function parseVariableDeclaration(): VariableDeclaration {
  return parseNode(new VariableDeclaration(), node => {
    node.variable_type = parseTypename();
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
    node.set = nextTokenExpectType(SyntaxType.Set);
    node.variable = parseIdentifier();
    node.to = nextTokenExpectType(SyntaxType.To);
    node.expression = parseLogicalOr();
  });
}

function parseLet(): LetStatement {
  return parseNode(new LetStatement(), node => {
    node.let = nextTokenExpectType(SyntaxType.Let);
    node.variable = parseVariableOrVariableDeclaration();
    node.op = parseAssignmentOperator();
    node.expression = parseExpression();
  });
}

function parseBlockType(): BlocktypeExpression {
  return parseNode(new BlocktypeExpression(), node => {
    node.block_type = nextTokenExpectType(SyntaxType.BlocktypeToken);

    while (
      moreData() &&
      cur_token.type !== SyntaxType.Newline &&
      (
        cur_token.type === SyntaxType.Identifier ||
        cur_token.type === SyntaxType.Number
      )
    ) {
      const arg = parsePrimaryExpression();

      node.args.push(arg);
    }
  });
}

function parseBeginBlock(): BeginStatement {
  return parseNode(new BeginStatement(), node => {
    node.begin = nextTokenExpectType(SyntaxType.Begin);
    node.block_type = parseBlockType();
    nextTokenExpectType(SyntaxType.Newline);

    node.compound_statement = parseCompoundStatement({
      [SyntaxType.End]: true
    });

    node.end = nextTokenExpectType(SyntaxType.End);
  });
}

function parseForeachBlock(): ForeachStatement {
  return parseNode(new ForeachStatement(), node => {
    node.foreach = nextTokenExpectType(SyntaxType.Foreach);

    node.identifier = parseVariableOrVariableDeclaration();

    node.larrow = nextTokenExpectType(SyntaxType.LArrow);
    node.iterable = parseExpression();
    nextTokenExpectType(SyntaxType.Newline);

    node.compound_statement = parseCompoundStatement({
      [SyntaxType.Loop]: true
    });

    node.loop = nextTokenExpectType(SyntaxType.Loop);
  });
}

function parseBranch<T extends BranchKeywordSyntaxType>(
  branch_keyword: T,
  terminator_tokens: { [key in SyntaxType]?: boolean }
): Branch<Token<T>> {
  return parseNode(new Branch(), node => {
    node.keyword = nextTokenExpectType(branch_keyword);
    node.condition = parseExpression();
    nextTokenExpectType(SyntaxType.Newline);

    node.compound_statement = parseCompoundStatement(terminator_tokens);
  });
}

function parseWhileBlock(): WhileStatement {
  return parseNode(new WhileStatement(), node => {
    node.branch = parseBranch(SyntaxType.While, {
      [SyntaxType.Loop]: true
    });

    node.loop = nextTokenExpectType(SyntaxType.Loop);
  });
}

function parseIfBlock(): IfStatement {
  return parseNode(new IfStatement(), node => {
    node.branches[0] = parseBranch(SyntaxType.If, {
      [SyntaxType.Elseif]: true,
      [SyntaxType.Else]: true,
      [SyntaxType.Endif]: true,
    });

    while (cur_token.type === SyntaxType.Elseif) {
      node.branches.push(parseBranch(SyntaxType.Elseif, {
        [SyntaxType.Elseif]: true,
        [SyntaxType.Else]: true,
        [SyntaxType.Endif]: true,
      }));
    }

    if (cur_token.type === SyntaxType.Else) {
      node.else = nextTokenExpectType(SyntaxType.Else);
      nextTokenExpectType(SyntaxType.Newline);
      node.else_statements = parseCompoundStatement({
        [SyntaxType.Endif]: true
      });
    }

    node.endif = nextTokenExpectType(SyntaxType.Endif);
  });
}

function parseScriptCompoundStatement(): CompoundStatement {
  return parseNode(new CompoundStatement(), node => {
    while (moreData()) {
      let statement: Statement;

      const type = cur_token.type;

      if (type === SyntaxType.Set) {
        statement = parseSet();
      } else if (type === SyntaxType.Let) {
        statement = parseLet();
      } else if (isTypename()) {
        statement = parseVariableDeclarationStatement();
      } else if (type === SyntaxType.Begin) {
        statement = parseBeginBlock();
      } else if (type === SyntaxType.Newline) {
        skipToken();
        continue;
      } else {
        reportParsingError(
          "unexpected statement in outer scope",
          parseStatement().range
        );
        continue;
      }

      if (cur_token.type !== SyntaxType.EOF) {
        nextTokenExpectType(SyntaxType.Newline);
      }

      node.children.push(statement);
    }
  });
}

function parseScript(): Script {
  return parseNode(script, node => {
    while (moreData()) {
      if (cur_token.type === SyntaxType.Comment) parseComment();
      else if (cur_token.type === SyntaxType.Newline) skipToken();
      else break;
    }

    node.scriptname = nextTokenExpectType(SyntaxType.ScriptName);
    node.name = parseIdentifier();
    nextTokenExpectType(SyntaxType.Newline);
    node.compound_statement = parseScriptCompoundStatement();
  });
}

export function Parse(text: string): Script {
  lexer = new Lexer(text);

  cur_token = lexer.lexToken();
  last_token = cur_token;

  script = new Script();

  return parseScript();
}
