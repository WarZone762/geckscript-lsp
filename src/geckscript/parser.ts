import { Position, Range } from "vscode-languageserver-textdocument";
import { Lexer } from "./lexer";
import { TokenData, SyntaxTypeMap } from "./token_data";

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
  NumberNode,
  StringNode,
  BeginBlockNode,
  BinOpNode,
  BinOpPairedNode,
  BranchNode,
  CommentNode,
  CompoundStatementNode,
  ForeachBlockNode,
  FunctionNode,
  IfBlockNode,
  LambdaInlineNode,
  LambdaNode,
  VariableDeclarationStatementNode,
  SetNode,
  LetNode,
  UnaryOpNode,
  VariableDeclarationNode,
  WhileBlockNode,
  BlockTypeNode,
  ScriptNode,
} from "./types";


let lexer: Lexer;

let cur_token: Token;
let last_token: Token;

let paren_level = 0;

let script: ScriptNode;

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
    reportParsingError(`expected "${SyntaxTypeMap.All[type]}", got "${SyntaxTypeMap.All[token.type]}"`);
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
    cur_token.type !== SyntaxType.RParen
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
  node.range = {
    start: start ?? cur_token.range.start,
    end: cur_token.range.start,
  };
  parse_function(node);
  node.range.end = last_token.range.end;

  return node;
}

function parseBinOpRight(
  parse_child: () => Expression,
  valid_tokens: { [key in SyntaxType]?: boolean }
): Expression {
  let lhs = parse_child();

  if (cur_token.type in valid_tokens) {
    let last_node = parseNode(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op = parseOperator();
      node.rhs = parse_child();
    });

    lhs = last_node;

    while (cur_token.type in valid_tokens) {
      const node = parseNode(new BinOpNode(), node => {
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
    lhs = parseNode(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op = parseOperator();
      node.rhs = parse_child();
    }, lhs.range.start);
  }

  return lhs;
}

function parseComment(): void {
  const node = parseNode(new CommentNode(), node => {
    node.content = cur_token.content;
    node.value = node.content.substring(1);
    _skipToken();
  });

  script.comments[node.range.start.line] = node;
}

function parseNumber(): NumberNode {
  return parseNode(new NumberNode(), node => {
    node.content = nextTokenExpectType(SyntaxType.Number).content;
    if (node.content[0] === "0" && node.content[1]?.toLowerCase() === "x") {
      node.value = parseInt(node.content, 16);
    } else {
      node.value = parseFloat(node.content);
    }

    return node;
  });
}

function parseString(): StringNode {
  return parseNode(new StringNode(), node => {
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

function parseVariableOrVariableDeclaration(): Token<SyntaxType.Identifier> | VariableDeclarationNode {
  if (cur_token.type === SyntaxType.Identifier)
    return nextToken();
  else if (isTypename())
    return parseVariableDeclaration();
  else {
    reportParsingError("expected a variable or a variable declaration");
    return createMissingNode(new Node()) as Token<SyntaxType.Identifier>;
  }
}

function parseFunction(): FunctionNode {
  return parseNode(new FunctionNode(), node => {
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

function parseLambdaInline(): LambdaInlineNode {
  return parseNode(new LambdaInlineNode(), node => {
    node.lbracket = nextTokenExpectType(SyntaxType.LBracket);

    while (
      moreData() && cur_token.type !== SyntaxType.RBracket
    ) {
      if (cur_token.type === SyntaxType.Comma) skipToken();

      node.params.push(parseVariableOrVariableDeclaration());
    }

    node.rbracket = nextTokenExpectType(SyntaxType.RBracket);
    node.arrow = nextTokenExpectType(SyntaxType.EqualsGreater);
    node.expression = parseExpression();
  });
}

function parseLambda(): LambdaNode {
  return parseNode(new LambdaNode(), node => {
    node.begin = nextTokenExpectType(SyntaxType.Begin);
    node.function = nextTokenExpectType(SyntaxType.BlocktypeTokenFunction);
    node.lbracket = nextTokenExpectType(SyntaxType.LBracket);

    while (moreData() && cur_token.type !== SyntaxType.RBracket) {
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
    reportParsingError("expected expression");

    return createMissingNode(new Node()) as Expression;
  }
}

function parseMemeberSquareBrackets(lhs: Expression): Expression {
  return parseMember(parseNode(new BinOpPairedNode(), node => {
    node.lhs = lhs;
    node.left_op = nextTokenExpectType(SyntaxType.LSQBracket);
    node.rhs = parseExpression();
    node.right_op = nextTokenExpectType(SyntaxType.RSQBracket);
  }));
}

function parseMemberRArrow(lhs: Expression): Expression {
  return parseMember(parseNode(new BinOpNode(), node => {
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
  return parseMember(parseNode(new BinOpNode(), node => {
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

  return parseNode(new UnaryOpNode(), node => {
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

  return parseNode(new UnaryOpNode(), node => {
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
  } else if (isKeyword()) {
    node = parseKeyword();
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
  } else {
    node = parseExpression();
  }

  if (cur_token.type !== SyntaxType.EOF) {
    nextTokenExpectType(SyntaxType.Newline);
  }

  return node;
}

function parseCompoundStatement(terminator_tokens: { [key in SyntaxType]?: boolean }): CompoundStatementNode {
  return parseNode(new CompoundStatementNode(), node => {
    while (moreData() && !(cur_token.type in terminator_tokens)) {
      const statement = parseStatement();

      if (statement.type !== SyntaxType.Unknown)
        node.children.push(statement);
    }
  });
}

function parseVariableDeclaration(): VariableDeclarationNode {
  return parseNode(new VariableDeclarationNode(), node => {
    node.variable_type = parseTypename();
    node.variable = parseIdentifier();
  });
}

function parseVariableDeclarationStatement(): VariableDeclarationStatementNode {
  return parseNode(new VariableDeclarationStatementNode(), node => {
    node.variable = parseVariableDeclaration();
    if (isAssignmentOperator()) {
      node.op = parseOperator();
      node.expression = parseExpression();
    }
  });
}

function parseSet(): SetNode {
  return parseNode(new SetNode(), node => {
    node.set = nextTokenExpectType(SyntaxType.Set);
    node.identifier = parseIdentifier();
    node.to = nextTokenExpectType(SyntaxType.To);
    node.value = parseLogicalOr();
  });
}

function parseLet(): LetNode {
  return parseNode(new LetNode(), node => {
    node.let = nextTokenExpectType(SyntaxType.Let);
    node.variable = parseVariableOrVariableDeclaration();
    node.op = parseAssignmentOperator();
    node.expression = parseExpression();
  });
}

function parseBlockType(): BlockTypeNode {
  return parseNode(new BlockTypeNode(), node => {
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

function parseBeginBlock(): BeginBlockNode {
  return parseNode(new BeginBlockNode(), node => {
    node.begin = nextTokenExpectType(SyntaxType.Begin);
    node.block_type = parseBlockType();
    nextTokenExpectType(SyntaxType.Newline);

    node.compound_statement = parseCompoundStatement({
      [SyntaxType.End]: true
    });

    node.end = nextTokenExpectType(SyntaxType.End);
  });
}

function parseForeachBlock(): ForeachBlockNode {
  return parseNode(new ForeachBlockNode(), node => {
    node.foreach = nextTokenExpectType(SyntaxType.Foreach);

    node.idetifier = parseVariableOrVariableDeclaration();

    node.larrow = nextTokenExpectType(SyntaxType.LArrow);
    node.iterable = parseExpression();
    nextTokenExpectType(SyntaxType.Newline);

    node.statements = parseCompoundStatement({
      [SyntaxType.Loop]: true
    });

    node.loop = nextTokenExpectType(SyntaxType.Loop);
  });
}

function parseBranch<T extends BranchKeywordSyntaxType>(
  branch_keyword: T,
  terminator_tokens: { [key in SyntaxType]?: boolean }
): BranchNode<Token<T>> {
  return parseNode(new BranchNode(), node => {
    node.keyword = nextTokenExpectType(branch_keyword);
    node.condition = parseExpression();
    nextTokenExpectType(SyntaxType.Newline);

    node.statements = parseCompoundStatement(terminator_tokens);
  });
}

function parseWhileBlock(): WhileBlockNode {
  return parseNode(new WhileBlockNode(), node => {
    node.branch = parseBranch(SyntaxType.While, {
      [SyntaxType.Loop]: true
    });

    node.loop = nextTokenExpectType(SyntaxType.Loop);
  });
}

function parseIfBlock(): IfBlockNode {
  return parseNode(new IfBlockNode(), node => {
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

function parseScriptCompoundStatement(): CompoundStatementNode {
  return parseNode(new CompoundStatementNode(), node => {
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

function parseScript(): ScriptNode {
  return parseNode(script, node => {
    while (moreData()) {
      if (cur_token.type === SyntaxType.Comment) parseComment();
      else if (cur_token.type === SyntaxType.Newline) skipToken();
      else break;
    }

    node.scriptname = nextTokenExpectType(SyntaxType.ScriptName);
    node.name = parseIdentifier();
    nextTokenExpectType(SyntaxType.Newline);
    node.statements = parseScriptCompoundStatement();
  });
}

export function Parse(text: string): ScriptNode {
  lexer = new Lexer(text);

  cur_token = lexer.lexToken();
  last_token = cur_token;

  script = new ScriptNode();

  return parseScript();
}
