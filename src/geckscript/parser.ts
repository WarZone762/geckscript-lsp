import { GetTokens, Token, TokenPosition, TokensStorage } from "./lexer";
import { TokenSubtype } from "./tokens";
import { TokenType } from "./tokens";


export const enum NodeType {
  begin_block,
  bin_op,
  bin_op_paired,
  comment,
  compound_statement,
  conditional,
  empty,
  foreach_block,
  function,
  identifier,
  if_block,
  keyword,
  lambda,
  lambda_inline,
  let,
  numerical,
  script,
  set,
  string_literal,
  unary_op,
  variable_declaration,
  while_block,
}

export type Range = {
  start?: TokenPosition,
  end?: TokenPosition
}

export class Node {
  type: NodeType;
  range: Range;

  constructor(type: NodeType) {
    this.type = type;
    this.range = {};
  }
}

export class NumberNode extends Node {
  token?: Token;
  value?: number;

  constructor() {
    super(NodeType.numerical);
  }
}
export class StringNode extends Node {
  token?: Token;
  value?: string;

  constructor() {
    super(NodeType.string_literal);
  }
}

export class CommentNode extends Node {
  token?: Token;
  value?: string;

  constructor() {
    super(NodeType.comment);
  }
}

export class IdentifierNode extends Node {
  token?: Token;
  value?: string;

  constructor() {
    super(NodeType.identifier);
  }
}

export class KeywordNode extends Node {
  token?: Token;
  keyword?: string;

  constructor() {
    super(NodeType.keyword);
  }
}

export class VariableDeclarationNode extends Node {
  type_token?: Token;
  variable_type?: string;
  value?: Node;

  constructor() {
    super(NodeType.variable_declaration);
  }
}

export class SetNode extends Node {
  set_token?: Token;
  identifier?: IdentifierNode;
  to_token?: Token;
  value?: Node;

  constructor() {
    super(NodeType.set);
  }
}

export class LetNode extends Node {
  let_token?: Token;
  value?: Node;

  constructor() {
    super(NodeType.let);
  }
}

export class UnaryOpNode extends Node {
  op_token?: Token;
  op?: string;
  operand?: Node;

  constructor() {
    super(NodeType.unary_op);
  }
}

export class BinOpNode extends Node {
  lhs?: Node;
  op?: string;
  op_token?: Token;
  rhs?: Node;

  constructor() {
    super(NodeType.bin_op);
  }
}

export class BinOpPairedNode extends Node {
  lhs?: Node;
  op?: string;
  left_op_token?: Token;
  rhs?: Node;
  right_op_token?: Token;

  constructor() {
    super(NodeType.bin_op_paired);
  }
}

export class FunctionNode extends Node {
  token?: Token;
  name?: string;
  args: (Node | undefined)[];

  constructor() {
    super(NodeType.function);

    this.args = [];
  }
}

export class LambdaInlineNode extends Node {
  lbracket_token?: Token;
  params: Node[];
  rbracket_token?: Token;
  arrow_token?: Token;

  expression?: Node;

  constructor() {
    super(NodeType.lambda_inline);

    this.params = [];
  }
}

export class LambdaNode extends Node {
  begin_token?: Token;
  function_token?: Token;
  lbracket_token?: Token;
  params: Node[];
  rbracket_token?: Token;

  compound_statement?: CompoundStatementNode;

  end_token?: Token;

  constructor() {
    super(NodeType.lambda);

    this.params = [];
  }
}

export class CompoundStatementNode extends Node {
  children: (Node | undefined)[];
  symbol_table: IdentifierNode[];

  constructor() {
    super(NodeType.compound_statement);

    this.children = [];
    this.symbol_table = [];
  }
}

export class BeginBlockNode extends Node {
  begin_token?: Token;
  expression?: Node;
  compound_statement?: CompoundStatementNode;
  end_token?: Token;

  constructor() {
    super(NodeType.begin_block);
  }
}

export class ForeachBlockNode extends Node {
  foreach_token?: Token;
  idetifier?: IdentifierNode | VariableDeclarationNode;
  larrow_token?: Token;
  iterable?: Node;

  statements?: CompoundStatementNode;

  loop_token?: Token;

  constructor() {
    super(NodeType.foreach_block);
  }
}

export class ConditionalNode extends Node {
  token?: Token;
  condition?: Node;
  statements?: CompoundStatementNode;

  constructor() {
    super(NodeType.conditional);
  }
}

export class WhileBlockNode extends Node {
  while_node?: ConditionalNode;
  loop_token?: Token;

  constructor() {
    super(NodeType.while_block);
  }
}

export class IfBlockNode extends Node {
  branches: ConditionalNode[];
  else_token?: Token;
  else_branch?: CompoundStatementNode;
  endif_token?: Token;

  constructor() {
    super(NodeType.if_block);

    this.branches = [];
  }
}

export class Script extends Node {
  scriptname_token?: Token;
  name?: IdentifierNode;
  statements?: CompoundStatementNode;

  constructor() {
    super(NodeType.script);
  }
}

export class UnexpectedTokenError extends Error {
  expected_type?: any;
  parsed_type?: any;
}

export class UnexpectedTokenTypeError extends UnexpectedTokenError {
  declare expected_type?: TokenType;
  declare parsed_type?: TokenType;
}

export class UnexpectedTokenSubtypeError extends UnexpectedTokenError {
  declare expected_type?: TokenSubtype;
  declare parsed_type?: TokenSubtype;
}

export class Parser {
  data: Token[][];
  variables: IdentifierNode[];

  cur_x: number;
  cur_ln: number;

  cur_token: Token | undefined;

  constructor(data: Token[][]) {
    this.data = data;
    this.variables = [];

    this.cur_x = 0;
    this.cur_ln = 0;

    this.cur_token = data[0][0];

    while (this.cur_token == undefined) {
      this.skipToken();
    }
  }

  skipLine(): void {
    this.cur_x = 0;
    this.cur_token = this.data?.[++this.cur_ln]?.[0];
  }

  skipTokenOnLine(): void {
    this.cur_token = this.data?.[this.cur_ln]?.[++this.cur_x];
  }

  skipToken(): void {
    this.skipTokenOnLine();
    if (this.cur_token == undefined) this.skipLine();
  }

  nextToken(): Token | undefined {
    const token = this.cur_token;
    this.skipToken();

    return token;
  }

  nextTokenOfType(type: TokenType): Token {
    const token = this.cur_token;

    if (token?.type !== type) throw new UnexpectedTokenTypeError();
    this.skipToken();

    return token;
  }

  nextTokenOfSubtype(subtype: TokenSubtype): Token {
    const token = this.cur_token;

    if (token?.subtype !== subtype) throw new UnexpectedTokenSubtypeError();
    this.skipToken();

    return token;
  }

  peekTokenOnLine(offset: number): Token | undefined {
    return this.data[this.cur_ln][this.cur_x + offset];
  }

  parseBinOpRight(
    parse_child: () => Node | undefined,
    valid_tokens: { [key in TokenSubtype]?: boolean }
  ): Node | undefined {
    let lhs = parse_child();

    if ((this.cur_token?.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
      let last_node = new BinOpNode();
      last_node.lhs = lhs;
      last_node.op_token = this.nextToken();
      last_node.op = last_node.op_token?.content;
      last_node.rhs = parse_child();

      last_node.range.start = lhs?.range.start;
      last_node.range.end = last_node.rhs?.range.end;

      lhs = last_node;

      while ((this.cur_token?.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
        const node = new BinOpNode();

        node.lhs = last_node.rhs;
        node.op_token = this.nextToken();
        node.op = node.op_token?.content;
        node.rhs = parse_child();

        node.range.start = lhs?.range.start;
        node.range.end = node.rhs?.range.end;

        last_node.rhs = node;
        last_node = node;
      }
    }

    return lhs;
  }

  parseBinOpLeft(
    parse_child: () => Node | undefined,
    valid_tokens: { [key in TokenSubtype]?: boolean }
  ): Node | undefined {
    let lhs = parse_child();

    while ((this.cur_token?.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
      const node = new BinOpNode();

      node.lhs = lhs;
      node.op_token = this.nextToken();
      node.op = node.op_token?.content;
      node.rhs = parse_child();

      node.range.start = lhs?.range.start;
      node.range.end = node.rhs?.range.end;

      lhs = node;
    }

    return lhs;
  }

  parseComment(): CommentNode {
    const node = new CommentNode();

    try {
      node.token = this.nextTokenOfType(TokenType.COMMENT);
      node.value = node.token.content.substring(1);

      node.range.start = node.token.position;
      node.range.end = node.token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseNumber(): NumberNode {
    const node = new NumberNode();

    try {
      node.token = this.nextTokenOfType(TokenType.NUMBER);
      node.value = node.token.subtype === TokenSubtype.HEX ?
        parseInt(node.token.content) :
        parseFloat(node.token.content);

      node.range.start = node.token.position;
      node.range.end = node.token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseString(): StringNode {
    const node = new StringNode();

    try {
      node.token = this.nextTokenOfType(TokenType.STRING);
      node.value = node.token.content.substring(1, node.token.length - 1);
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseIdentifier(): IdentifierNode {
    const node = new IdentifierNode();

    try {
      node.token = this.nextTokenOfType(TokenType.ID);
      node.value = node.token.content;

      node.range.start = node.token.position;
      node.range.end = node.token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseKeyword(): KeywordNode {
    const node = new KeywordNode();

    try {
      node.token = this.nextTokenOfType(TokenType.KEYWORD);
      node.keyword = node.token.content;

      node.range.start = node.token.position;
      node.range.end = node.token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseFunction(): FunctionNode {
    const node = new FunctionNode();

    try {
      node.token = this.nextTokenOfType(TokenType.FUNCTION)!;
      node.name = node.token.content;

      while (this.cur_token != undefined && this.cur_x !== 0) {
        if (this.cur_token.type === TokenType.OPERATOR) {
          if (this.cur_token.subtype === TokenSubtype.COMMA) {
            this.skipToken();
            continue;
          } else if (
            this.cur_token.subtype !== TokenSubtype.LPAREN &&
            this.cur_token.subtype !== TokenSubtype.LBRACKET
          ) {
            break;
          }
        }

        node.args.push(this.parseSliceMakePair());
      }

      node.range.start = node.token.position;
      node.range.end = node.args[node.args.length - 1]?.range.end ?? node.token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseLambdaInline(): LambdaInlineNode {
    const node = new LambdaInlineNode();

    try {
      node.lbracket_token = this.nextTokenOfSubtype(TokenSubtype.LBRACKET);

      while (
        this.cur_token != undefined &&
        this.cur_token.subtype !== TokenSubtype.RBRACKET
      ) {
        if (this.cur_token.type === TokenType.TYPENAME)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === TokenType.ID)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket_token = this.nextTokenOfSubtype(TokenSubtype.RBRACKET);
      node.arrow_token = this.nextTokenOfSubtype(TokenSubtype.EQUALS_GREATER);
      node.expression = this.parseExpression();

      node.range.start = node.lbracket_token.position;
      node.range.end = node.expression?.range.end;
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseLambda(): LambdaNode {
    const node = new LambdaNode();

    try {
      node.begin_token = this.nextTokenOfSubtype(TokenSubtype.BEGIN);
      node.function_token = this.nextTokenOfSubtype(TokenSubtype.FUNCTION);
      node.lbracket_token = this.nextTokenOfSubtype(TokenSubtype.LBRACKET);

      while (
        this.cur_token != undefined &&
        this.cur_token.subtype !== TokenSubtype.RBRACKET
      ) {
        if (this.cur_token.type === TokenType.TYPENAME)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === TokenType.ID)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket_token = this.nextTokenOfSubtype(TokenSubtype.RBRACKET);
      node.compound_statement = this.parseCompoundStatement(
        t => t.subtype === TokenSubtype.END
      );
      node.end_token = this.nextTokenOfSubtype(TokenSubtype.END);

      node.range.start = node.begin_token.position;
      node.range.end = node.end_token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;

  }

  parsePrimaryExpression(): Node | undefined {
    if (this.cur_token?.type === TokenType.STRING) {
      return this.parseString();
    } else if (this.cur_token?.type === TokenType.NUMBER) {
      return this.parseNumber();
    } else if (this.cur_token?.type === TokenType.ID) {
      return this.parseIdentifier();
    } else if (this.cur_token?.type === TokenType.FUNCTION) {
      return this.parseFunction();
    } else if (this.cur_token?.subtype === TokenSubtype.LPAREN) {
      this.skipToken();

      const node = this.parseExpression();

      try {
        this.nextTokenOfSubtype(TokenSubtype.RPAREN);
      } catch (e) {
        if (!(e instanceof UnexpectedTokenError)) throw e;
      }

      return node;
    } else if (this.cur_token?.subtype === TokenSubtype.LBRACKET) {
      return this.parseLambdaInline();
    } else if (this.cur_token?.subtype === TokenSubtype.BEGIN) {
      return this.parseLambda();
    } else {
      this.skipToken();
      return undefined;
    }
  }

  parseMemeberSquareBrackets(lhs?: Node): Node | undefined {
    const node = new BinOpPairedNode();

    try {
      node.lhs = lhs;
      node.left_op_token = this.nextToken();
      node.op = "[]";
      node.rhs = this.parseExpression();
      node.right_op_token = this.nextTokenOfSubtype(TokenSubtype.RSQ_BRACKET);

      node.range.start = node.lhs?.range.start;
      node.range.end = node.right_op_token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return this.parseMember(node);
  }

  parseMemberRArrow(lhs?: Node): Node | undefined {
    const node = new BinOpNode();

    node.lhs = lhs;
    node.op_token = this.nextToken();
    node.op = node.op_token?.content;

    const type = this.cur_token?.type;
    if (
      type !== TokenType.STRING &&
      type !== TokenType.NUMBER &&
      type !== TokenType.ID &&
      type !== TokenType.FUNCTION
    ) {
      node.rhs = undefined;
      this.skipToken();
    } else {
      node.rhs = this.parsePrimaryExpression();
    }

    node.range.start = lhs?.range.start;
    node.range.end = node.rhs?.range.end;

    return this.parseMember(node);
  }

  parseMemberDot(lhs?: Node): Node | undefined {
    const node = new BinOpNode();

    node.lhs = lhs;
    node.op_token = this.nextToken();
    node.op = node.op_token?.content;

    const type = this.cur_token?.type;
    if (
      type !== TokenType.ID &&
      type !== TokenType.FUNCTION
    ) {
      node.rhs = undefined;
      this.skipToken();
    } else {
      node.rhs = this.parsePrimaryExpression();
    }

    node.range.start = lhs?.range.start;
    node.range.end = node.rhs?.range.end;

    return this.parseMember(node);
  }

  parseMember(lhs?: Node): Node | undefined {
    lhs = lhs ?? this.parsePrimaryExpression();

    if (this.cur_token?.type !== TokenType.OPERATOR) return lhs;

    const subtype = this.cur_token.subtype;

    if (subtype === TokenSubtype.LSQ_BRACKET) {
      return this.parseMemeberSquareBrackets(lhs);
    } else if (subtype === TokenSubtype.RARROW) {
      return this.parseMemberRArrow(lhs);
    } else if (subtype === TokenSubtype.DOT) {
      return this.parseMemberDot(lhs);
    } else {
      return lhs;
    }
  }

  parseLogicalNot(): Node | undefined {
    if (this.cur_token?.subtype !== TokenSubtype.EXCLAMATION)
      return this.parseMember();

    const node = new UnaryOpNode();

    node.op_token = this.nextToken();
    node.op = node.op_token?.content;
    node.operand = this.parseMember();

    node.range.start = node.op_token?.position;
    node.range.end = node.operand?.range.end;

    return node;
  }

  parseUnary(): Node | undefined {
    if (this.cur_token?.type !== TokenType.OPERATOR) return this.parseLogicalNot();

    const subtype = this.cur_token?.subtype;
    if (
      subtype !== TokenSubtype.MINUS &&
      subtype !== TokenSubtype.DOLLAR &&
      subtype !== TokenSubtype.HASH &&
      subtype !== TokenSubtype.ASTERISK &&
      subtype !== TokenSubtype.AMPERSAND
    ) return this.parseLogicalNot();

    const node = new UnaryOpNode();

    node.op_token = this.nextToken();
    node.op = node.op_token?.content;
    node.operand = this.parseLogicalNot();

    node.range.start = node.op_token?.position;
    node.range.end = node.operand?.range.end;

    return node;
  }

  parseExponential(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseUnary(),
      { [TokenSubtype.CIRCUMFLEX]: true }
    );
  }

  parseMultiplicative(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseExponential(),
      {
        [TokenSubtype.ASTERISK]: true,
        [TokenSubtype.SLASH]: true,
        [TokenSubtype.PERCENT]: true,
      }
    );
  }

  parseAdditive(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseMultiplicative(),
      {
        [TokenSubtype.PLUS]: true,
        [TokenSubtype.MINUS]: true,
      }
    );
  }

  parseShift(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseAdditive(),
      {
        [TokenSubtype.DOUBLE_LESS]: true,
        [TokenSubtype.DOUBLE_GREATER]: true,
      }
    );
  }

  parseAnd(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseShift(),
      { [TokenSubtype.AMPERSAND]: true }
    );
  }

  parseOr(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseAnd(),
      { [TokenSubtype.VBAR]: true }
    );
  }

  parseRelational(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseOr(),
      {
        [TokenSubtype.GREATER]: true,
        [TokenSubtype.GREATER_EQULAS]: true,
        [TokenSubtype.LESS]: true,
        [TokenSubtype.LESS_EQULAS]: true,
      }
    );
  }

  parseEquality(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseRelational(),
      {
        [TokenSubtype.DOUBLE_EQUALS]: true,
        [TokenSubtype.EXCLAMATION_EQUALS]: true,
      }
    );
  }

  parseSliceMakePair(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseEquality(),
      {
        [TokenSubtype.COLON]: true,
        [TokenSubtype.DOUBLE_COLON]: true,
      }
    );
  }

  parseLogicalAndCompoundAssignment(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseSliceMakePair(),
      {
        [TokenSubtype.DOUBLE_AMPERSAND]: true,
        [TokenSubtype.PLUS_EQUALS]: true,
        [TokenSubtype.MINUS_EQUALS]: true,
        [TokenSubtype.ASTERISK_EQUALS]: true,
        [TokenSubtype.SLASH_EQUALS]: true,
        [TokenSubtype.CIRCUMFLEX_EQUALS]: true,
        [TokenSubtype.VBAR_EQUALS]: true,
        [TokenSubtype.AMPERSAND_EQUALS]: true,
        [TokenSubtype.PERCENT_EQUALS]: true,
      }
    );
  }

  parseLogicalOr(): Node | undefined {
    return this.parseBinOpLeft(
      () => this.parseLogicalAndCompoundAssignment(),
      { [TokenSubtype.DOUBLE_VBAR]: true }
    );
  }

  parseAssignment(): Node | undefined {
    return this.parseBinOpRight(
      () => this.parseLogicalOr(),
      {
        [TokenSubtype.EQUALS]: true,
        [TokenSubtype.COLON_EQUALS]: true
      }
    );
  }

  parseExpression(): Node | undefined {
    return this.parseAssignment();
  }

  parseVariableDeclaration(): VariableDeclarationNode {
    const node = new VariableDeclarationNode();

    try {
      node.type_token = this.nextTokenOfType(TokenType.TYPENAME);
      node.variable_type = node.type_token.content;
      node.value = this.parseAssignment();

      node.range.start = node.type_token.position;
      node.range.end = node.value?.range.end;
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseSet(): SetNode {
    const node = new SetNode();

    try {
      node.set_token = this.nextTokenOfSubtype(TokenSubtype.SET);
      node.identifier = this.parseIdentifier();
      node.to_token = this.nextTokenOfSubtype(TokenSubtype.TO);
      node.value = this.parseLogicalOr();

      node.range.start = node.set_token.position;
      node.range.end = node.value?.range.end;
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseLet(): LetNode {
    const node = new LetNode();

    try {
      node.let_token = this.nextToken();
      node.value = this.cur_token?.type === TokenType.TYPENAME ?
        this.parseVariableDeclaration() :
        this.parseExpression();

      node.range.start = node.let_token?.position;
      node.range.end = node.value?.range.end;
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseCompoundStatement(
    terminator_predicate: (token: Token) => boolean = () => false
  ): CompoundStatementNode {
    const node = new CompoundStatementNode();

    while (
      this.cur_token != undefined &&
      !terminator_predicate(this.cur_token)
    ) {
      node.children.push(this.parseStatement());
    }

    node.range.start = node.children[0]?.range.start;
    node.range.start = node.children[node.children.length - 1]?.range.end;

    return node;
  }

  parseBeginBlock(): BeginBlockNode {
    const node = new BeginBlockNode();

    try {
      node.begin_token = this.nextTokenOfSubtype(TokenSubtype.BEGIN);
      node.expression = this.parsePrimaryExpression();

      node.compound_statement = this.parseCompoundStatement(t =>
        t.subtype === TokenSubtype.END
      );

      node.end_token = this.nextTokenOfSubtype(TokenSubtype.END);

      node.range.start = node.begin_token.position;
      node.range.end = node.end_token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseForeachBlock(): ForeachBlockNode {
    const node = new ForeachBlockNode();

    try {
      node.foreach_token = this.nextTokenOfSubtype(TokenSubtype.FOREACH);

      node.idetifier = this.cur_token?.type === TokenType.TYPENAME ?
        this.parseVariableDeclaration() :
        this.parseIdentifier();

      node.larrow_token = this.nextTokenOfSubtype(TokenSubtype.LARROW);
      node.iterable = this.parseExpression();

      node.statements = this.parseCompoundStatement(
        t => t.subtype === TokenSubtype.LOOP
      );

      node.loop_token = this.nextTokenOfSubtype(TokenSubtype.LOOP);

      node.range.start = node.foreach_token.position;
      node.range.end = node.loop_token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseConditional(
    type: TokenSubtype,
    terminator_predicate: (t: Token) => boolean = () => false
  ): ConditionalNode {
    const node = new ConditionalNode();

    try {
      node.token = this.nextTokenOfSubtype(type);
      node.condition = this.parseExpression();
      node.statements = this.parseCompoundStatement(terminator_predicate);

      node.range.start = node.token.position;
      node.range.end = node.statements.range.end;
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseWhileBlock(): WhileBlockNode {
    const node = new WhileBlockNode();

    try {
      node.while_node = this.parseConditional(
        TokenSubtype.WHILE, t => t.subtype === TokenSubtype.LOOP
      );

      node.loop_token = this.nextTokenOfSubtype(TokenSubtype.LOOP);

      node.range.start = node.while_node.range.start;
      node.range.end = node.loop_token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseIfBlock(): IfBlockNode {
    const node = new IfBlockNode();

    try {
      node.branches[0] = this.parseConditional(TokenSubtype.IF, t =>
        t.subtype === TokenSubtype.ELSEIF ||
        t.subtype === TokenSubtype.ELSE ||
        t.subtype === TokenSubtype.ENDIF
      );

      while (this.cur_token?.subtype === TokenSubtype.ELSEIF) {
        node.branches.push(this.parseConditional(TokenSubtype.ELSEIF, t =>
          t.subtype === TokenSubtype.ELSEIF ||
          t.subtype === TokenSubtype.ELSE ||
          t.subtype === TokenSubtype.ENDIF
        ));
      }

      if (this.cur_token?.subtype === TokenSubtype.ELSE) {
        node.else_token = this.nextToken();
        node.else_branch = this.parseCompoundStatement(t => t.subtype === TokenSubtype.ENDIF);
      }

      node.endif_token = this.nextTokenOfSubtype(TokenSubtype.ENDIF);

      node.range.start = node.branches[0].range.start;
      node.range.end = node.endif_token.getLastPos();
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }

  parseStatement(): Node | undefined {
    const subtype = this.cur_token?.subtype;

    if (subtype === TokenSubtype.SET) {
      return this.parseSet();
    } else if (subtype === TokenSubtype.LET) {
      return this.parseLet();
    } else if (subtype === TokenSubtype.BEGIN) {
      return this.parseBeginBlock();
    } else if (subtype === TokenSubtype.WHILE) {
      return this.parseWhileBlock();
    } else if (subtype === TokenSubtype.FOREACH) {
      return this.parseForeachBlock();
    } else if (subtype === TokenSubtype.IF) {
      return this.parseIfBlock();
    }

    const type = this.cur_token?.type;

    if (type === TokenType.COMMENT) {
      return this.parseComment();
    } else if (type === TokenType.TYPENAME) {
      return this.parseVariableDeclaration();
    } else if (type === TokenType.KEYWORD) {
      return this.parseKeyword();
    } else {
      return this.parseExpression();
    }
  }

  parse(): Script {
    const node = new Script();

    try {
      node.scriptname_token = this.nextTokenOfSubtype(TokenSubtype.SCN);
      node.name = this.parseIdentifier();
      node.statements = this.parseCompoundStatement();

      node.range.start = node.scriptname_token.position;
      node.range.end = node.statements.range.end;
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) throw e;
    }

    return node;
  }
}

export function GetAST(text: string): Script {
  const parser = new Parser(GetTokens(text).data);

  return parser.parse();
}
