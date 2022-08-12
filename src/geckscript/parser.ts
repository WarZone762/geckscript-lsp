import { Diagnostic, Range } from "vscode-languageserver";
import { Position } from "vscode-languageserver-textdocument";
import { Token, Lexer } from "./lexer";
import { TokenData, TokenSubtype } from "./token_data";
import { TokenType } from "./token_data";


export const enum NodeType {
  unknown,

  begin_block,
  bin_op,
  bin_op_paired,
  comment,
  compound_statement,
  conditional,
  foreach_block,
  function,
  identifier,
  if_block,
  keyword,
  lambda,
  lambda_inline,
  let,
  number,
  script,
  set,
  string,
  unary_op,
  variable_declaration,
  while_block,
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
  readonly type: NodeType = NodeType.unknown;
  range: Range = {
    start: {
      line: 0,
      character: 0
    },
    end: {
      line: 0,
      character: 0
    }
  };

  setRange(start?: Position, end?: Position): void {
    this.range.start = start ?? { line: 0, character: 0 };
    this.range.end = end ?? { line: 0, character: 0 };
  }
}

export class NumberNode extends Node {
  readonly type = NodeType.number;

  token?: Token;
  value?: number;
}

export class StringNode extends Node {
  readonly type = NodeType.string;

  token?: Token;
  value?: string;
}

export class CommentNode extends Node {
  readonly type = NodeType.comment;

  token?: Token;
  value?: string;
}

export class IdentifierNode extends Node {
  readonly type = NodeType.identifier;

  token?: Token;
  value?: string;
}

export class KeywordNode extends Node {
  readonly type = NodeType.keyword;

  token?: Token;
  value?: string;
}

export class VariableDeclarationNode extends Node {
  readonly type = NodeType.variable_declaration;

  type_token?: Token;
  variable_type?: string;
  value?: Node;
}

export class SetNode extends Node {
  readonly type = NodeType.set;

  set_token?: Token;
  identifier?: IdentifierNode;
  to_token?: Token;
  value?: Node;
}

export class LetNode extends Node {
  readonly type = NodeType.let;

  let_token?: Token;
  value?: Node;
}

export class UnaryOpNode extends Node {
  readonly type = NodeType.unary_op;

  op_token?: Token;
  op?: string;
  operand?: Node;
}

export class BinOpNode extends Node {
  readonly type = NodeType.bin_op;

  lhs?: Node;
  op?: string;
  op_token?: Token;
  rhs?: Node;
}

export class BinOpPairedNode extends Node {
  readonly type = NodeType.bin_op_paired;

  lhs?: Node;
  op?: string;
  left_op_token?: Token;
  rhs?: Node;
  right_op_token?: Token;
}

export class FunctionNode extends Node {
  readonly type = NodeType.function;

  token?: Token;
  name?: string;
  args: Node[] = [];
}

export class LambdaInlineNode extends Node {
  readonly type = NodeType.lambda_inline;

  lbracket_token?: Token;
  params: Node[] = [];
  rbracket_token?: Token;
  arrow_token?: Token;

  expression?: Node;
}

export class LambdaNode extends Node {
  readonly type = NodeType.lambda;

  begin_token?: Token;
  function_token?: Token;
  lbracket_token?: Token;
  params: Node[] = [];
  rbracket_token?: Token;

  compound_statement?: CompoundStatementNode;

  end_token?: Token;
}

export class CompoundStatementNode extends Node {
  readonly type = NodeType.compound_statement;

  children: Node[] = [];
  symbol_table: IdentifierNode[] = [];
}

export class BeginBlockNode extends Node {
  readonly type = NodeType.begin_block;

  begin_token?: Token;
  expression?: Node;
  compound_statement?: CompoundStatementNode;
  end_token?: Token;
}

export class ForeachBlockNode extends Node {
  readonly type = NodeType.foreach_block;

  foreach_token?: Token;
  idetifier?: IdentifierNode | VariableDeclarationNode;
  larrow_token?: Token;
  iterable?: Node;

  statements?: CompoundStatementNode;

  loop_token?: Token;
}

export class BranchNode extends Node {
  readonly type = NodeType.conditional;

  token?: Token;
  condition?: Node;
  statements?: CompoundStatementNode;
}

export class WhileBlockNode extends Node {
  readonly type = NodeType.while_block;

  while_node?: BranchNode;
  loop_token?: Token;
}

export class IfBlockNode extends Node {
  readonly type = NodeType.if_block;

  branches: BranchNode[] = [];
  else_token?: Token;
  else_statements?: CompoundStatementNode;
  endif_token?: Token;
}

export class ScriptNode extends Node {
  readonly type = NodeType.script;

  scriptname_token?: Token;
  name?: IdentifierNode;
  statements?: CompoundStatementNode;
}

export class UnexpectedTokenError<T> extends Error {
  parsed_token?: Token;
  expected?: T;
  parsed?: T;

  constructor(expected?: T, parsed?: T, parsed_token?: Token) {
    super();
    this.expected = expected;
    this.parsed = parsed;
    this.parsed_token = parsed_token;
  }
}

export class UnexpectedTokenTypeError extends UnexpectedTokenError<TokenType> { }
export class UnexpectedTokenSubtypeError extends UnexpectedTokenError<TokenSubtype> { }

export class Parser {
  tokens: Token[];

  cur_pos = 0;

  cur_token: Token;

  diagnostics: Diagnostic[] = [];

  constructor(data: Token[]) {
    this.tokens = data;

    this.cur_token = data[0];
  }

  skipToken(): void {
    this.cur_token = this.tokens[++this.cur_pos];
  }

  nextToken(): Token {
    const token = this.cur_token;
    this.skipToken();

    return token;
  }

  nextTokenExpectType(type: TokenType): Token {
    const token = this.cur_token;

    if (token.type !== type)
      throw new UnexpectedTokenTypeError(type, token.type, token);
    this.skipToken();

    return token;
  }

  nextTokenExpectSubtype(subtype: TokenSubtype): Token {
    const token = this.cur_token;

    if (token.subtype !== subtype)
      throw new UnexpectedTokenSubtypeError(subtype, token.subtype, token);
    this.skipToken();

    return token;
  }

  moreData(): boolean {
    return this.cur_token.type !== TokenType.EOF;
  }

  lookBehind(offset: number): Token | undefined {
    return this.tokens[this.cur_pos + offset];
  }

  lookAhead(offset: number): Token | undefined {
    return this.tokens[this.cur_pos - offset];
  }

  reportParsingError(message: string): void {
    const token = this.cur_token;

    this.diagnostics.push({
      message: `Parsing error: ${message}`,
      range: {
        start: {
          line: token.position.line,
          character: token.position.character,
        },
        end: {
          line: token.getLastPos().line,
          character: token.getLastPos().character + 1,
        }
      },
    });
  }

  tryParse<T extends Node>(node: T, parse_function: (node: T) => void): T {
    try {
      node.range.start = this.cur_token.position;
      parse_function(node);
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) {
        throw e;
      } else {
        this.reportParsingError(
          "expected " +
          `"${TokenData.subtype_index[e.expected]?.[1] ?? e.expected}", ` +
          `got "${e.parsed_token?.content}"`
        );
      }
    }

    return node;
  }

  parseBinOpRight(
    parse_child: () => Node | undefined,
    valid_tokens: { [key in TokenSubtype]?: boolean }
  ): Node | undefined {
    let lhs = parse_child();

    if ((this.cur_token.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
      let last_node = this.tryParse(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op_token = this.nextToken();
        node.op = node.op_token.content;
        node.rhs = parse_child();

        node.setRange(lhs?.range.start, node.rhs?.range.end);
      });

      lhs = last_node;

      while ((this.cur_token.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
        const node = this.tryParse(new BinOpNode(), node => {
          node.lhs = last_node.rhs;
          node.op_token = this.nextToken();
          node.op = node.op_token.content;
          node.rhs = parse_child();

          node.setRange(lhs?.range.start, node.rhs?.range.end);
        });

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

    while ((this.cur_token.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
      lhs = this.tryParse(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op_token = this.nextToken();
        node.op = node.op_token.content;
        node.rhs = parse_child();

        node.setRange(lhs?.range.start, node.rhs?.range.end);
      });
    }

    return lhs;
  }

  parseComment(): CommentNode {
    return this.tryParse(new CommentNode(), node => {
      node.token = this.nextTokenExpectType(TokenType.COMMENT);
      node.value = node.token.content.substring(1);

      node.setRange(node.token.position, node.token.getLastPos());
    });
  }

  parseNumber(): NumberNode {
    return this.tryParse(new NumberNode(), node => {
      node.token = this.nextTokenExpectType(TokenType.NUMBER);
      node.value = node.token.subtype === TokenSubtype.HEX ?
        parseInt(node.token.content) :
        parseFloat(node.token.content);

      node.setRange(node.token.position, node.token.getLastPos());
    });
  }

  parseString(): StringNode {
    return this.tryParse(new StringNode(), node => {
      node.token = this.nextTokenExpectType(TokenType.STRING);
      node.value = node.token.content.substring(1, node.token.length - 1);
    });
  }

  parseIdentifier(): IdentifierNode {
    return this.tryParse(new IdentifierNode(), node => {
      node.token = this.nextTokenExpectType(TokenType.ID);
      node.value = node.token.content;

      node.setRange(node.token.position, node.token.getLastPos());
    });
  }

  parseKeyword(): KeywordNode {
    return this.tryParse(new KeywordNode(), node => {
      node.token = this.nextTokenExpectType(TokenType.KEYWORD);
      node.value = node.token.content;

      node.setRange(node.token.position, node.token.getLastPos());
    });
  }

  parseFunction(): FunctionNode {
    return this.tryParse(new FunctionNode(), node => {
      node.token = this.nextTokenExpectType(TokenType.FUNCTION)!;
      node.name = node.token.content;

      while (this.moreData() && this.cur_token.type !== TokenType.NEWLINE) {
        if (this.cur_token.type === TokenType.OPERATOR) {
          if (this.cur_token.subtype === TokenSubtype.COMMA) {
            this.skipToken();
            continue;
          } else if (this.cur_token.subtype !== TokenSubtype.LPAREN) {
            break;
          }
        }

        const arg = this.parseSliceMakePair();
        if (arg != undefined)
          node.args.push(arg);
        else
          break;
      }

      node.setRange(
        node.token.position,
        node.args[node.args.length - 1]?.range.end ?? node.token.getLastPos()
      );
    });
  }

  parseLambdaInline(): LambdaInlineNode {
    return this.tryParse(new LambdaInlineNode(), node => {
      node.lbracket_token = this.nextTokenExpectSubtype(TokenSubtype.LBRACKET);

      while (
        this.moreData() && this.cur_token.subtype !== TokenSubtype.RBRACKET
      ) {
        if (this.cur_token.type === TokenType.TYPENAME)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === TokenType.ID)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket_token = this.nextTokenExpectSubtype(TokenSubtype.RBRACKET);
      node.arrow_token = this.nextTokenExpectSubtype(TokenSubtype.EQUALS_GREATER);
      node.expression = this.parseExpression();

      node.setRange(node.lbracket_token.position, node.expression?.range.end);
    });
  }

  parseLambda(): LambdaNode {
    return this.tryParse(new LambdaNode(), node => {
      node.begin_token = this.nextTokenExpectSubtype(TokenSubtype.BEGIN);
      node.function_token = this.nextTokenExpectSubtype(TokenSubtype.FUNCTION);
      node.lbracket_token = this.nextTokenExpectSubtype(TokenSubtype.LBRACKET);

      while (
        this.moreData() &&
        this.cur_token.subtype !== TokenSubtype.RBRACKET
      ) {
        if (this.cur_token.type === TokenType.TYPENAME)
          node.params.push(this.parseVariableDeclaration());
        else if (this.cur_token.type === TokenType.ID)
          node.params.push(this.parseIdentifier());
        else
          this.skipToken();
      }

      node.rbracket_token = this.nextTokenExpectSubtype(TokenSubtype.RBRACKET);
      node.compound_statement = this.parseCompoundStatement();
      node.end_token = this.nextTokenExpectSubtype(TokenSubtype.END);

      node.setRange(node.begin_token.position, node.end_token.getLastPos());
    });
  }

  parsePrimaryExpression(): Node | undefined {
    if (this.cur_token.type === TokenType.STRING) {
      return this.parseString();
    } else if (this.cur_token.type === TokenType.NUMBER) {
      return this.parseNumber();
    } else if (this.cur_token.type === TokenType.ID) {
      return this.parseIdentifier();
    } else if (this.cur_token.type === TokenType.FUNCTION) {
      return this.parseFunction();
    } else if (this.cur_token.subtype === TokenSubtype.LPAREN) {
      this.skipToken();

      const expression = this.parseExpression();
      if (expression != undefined) {
        return this.tryParse(expression, node => {
          this.nextTokenExpectSubtype(TokenSubtype.RPAREN);
        });
      } else {
        return undefined;
      }
    } else if (this.cur_token.subtype === TokenSubtype.LBRACKET) {
      return this.parseLambdaInline();
    } else if (this.cur_token.subtype === TokenSubtype.BEGIN) {
      return this.parseLambda();
    } else if (this.cur_token.type === TokenType.COMMENT) {
      this.skipToken();
      return undefined;
    } else {
      this.reportParsingError("expected expression");

      this.skipToken();
      return undefined;
    }
  }

  parseMemeberSquareBrackets(lhs?: Node): Node | undefined {
    return this.parseMember(this.tryParse(new BinOpPairedNode(), node => {
      node.lhs = lhs;
      node.left_op_token = this.nextToken();
      node.op = "[]";
      node.rhs = this.parseExpression();
      node.right_op_token = this.nextTokenExpectSubtype(TokenSubtype.RSQ_BRACKET);

      node.setRange(node.lhs?.range.start, node.right_op_token.getLastPos());
    }));
  }

  parseMemberRArrow(lhs?: Node): Node | undefined {
    return this.parseMember(this.tryParse(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op_token = this.nextToken();
      node.op = node.op_token.content;

      const type = this.cur_token.type;
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

      node.setRange(lhs?.range.start, node.rhs?.range.end);
    }));
  }

  parseMemberDot(lhs?: Node): Node | undefined {
    return this.parseMember(this.tryParse(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op_token = this.nextToken();
      node.op = node.op_token.content;

      const type = this.cur_token.type;
      if (type !== TokenType.ID && type !== TokenType.FUNCTION) {
        node.rhs = undefined;
        this.skipToken();
      } else {
        node.rhs = this.parsePrimaryExpression();
      }

      node.setRange(lhs?.range.start, node.rhs?.range.end);
    }));
  }

  parseMember(lhs?: Node): Node | undefined {
    lhs = lhs ?? this.parsePrimaryExpression();

    if (this.cur_token.type !== TokenType.OPERATOR) return lhs;

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
    if (this.cur_token.subtype !== TokenSubtype.EXCLAMATION)
      return this.parseMember();

    return this.tryParse(new UnaryOpNode(), node => {
      node.op_token = this.nextToken();
      node.op = node.op_token.content;
      node.operand = this.parseLogicalNot();

      node.setRange(node.op_token.position, node.operand?.range.end);
    });
  }

  parseUnary(): Node | undefined {
    if (this.cur_token.type !== TokenType.OPERATOR) return this.parseLogicalNot();

    const subtype = this.cur_token.subtype;
    if (
      subtype !== TokenSubtype.MINUS &&
      subtype !== TokenSubtype.DOLLAR &&
      subtype !== TokenSubtype.HASH &&
      subtype !== TokenSubtype.ASTERISK &&
      subtype !== TokenSubtype.AMPERSAND
    ) return this.parseLogicalNot();

    return this.tryParse(new UnaryOpNode(), node => {
      node.op_token = this.nextToken();
      node.op = node.op_token.content;
      node.operand = this.parseUnary();

      node.setRange(node.op_token.position, node.operand?.range.end);
    });
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
    return this.tryParse(new VariableDeclarationNode(), node => {
      node.type_token = this.nextTokenExpectType(TokenType.TYPENAME);
      node.variable_type = node.type_token.content;
      node.value = this.parseAssignment();

      node.setRange(node.type_token.position, node.value?.range.end);
    });
  }

  parseSet(): SetNode {
    return this.tryParse(new SetNode(), node => {
      node.set_token = this.nextTokenExpectSubtype(TokenSubtype.SET);
      node.identifier = this.parseIdentifier();
      node.to_token = this.nextTokenExpectSubtype(TokenSubtype.TO);
      node.value = this.parseLogicalOr();

      node.setRange(node.set_token.position, node.value?.range.end);
    });
  }

  parseLet(): LetNode {
    return this.tryParse(new LetNode(), node => {
      node.let_token = this.nextToken();
      node.value = this.cur_token.type === TokenType.TYPENAME ?
        this.parseVariableDeclaration() :
        this.parseExpression();

      node.setRange(node.let_token.position, node.value?.range.end);
    });
  }

  parseCompoundStatement(): CompoundStatementNode {
    return this.tryParse(new CompoundStatementNode(), node => {
      while (
        this.moreData() &&
        this.cur_token.subtype !== TokenSubtype.END &&
        this.cur_token.subtype !== TokenSubtype.ELSEIF &&
        this.cur_token.subtype !== TokenSubtype.ELSE &&
        this.cur_token.subtype !== TokenSubtype.ENDIF &&
        this.cur_token.subtype !== TokenSubtype.LOOP
      ) {
        const statement = this.parseStatement();

        if (statement != undefined)
          node.children.push(statement);
      }

      node.setRange(
        node.children[0]?.range.start,
        node.children[node.children.length - 1]?.range.end
      );
    });
  }

  parseBlockType(): FunctionNode {
    return this.tryParse(new FunctionNode(), node => {
      node.token = this.nextTokenExpectType(TokenType.BLOCK_TYPE);
      node.name = node.token.content;

      while (this.moreData() && this.cur_token.type !== TokenType.NEWLINE) {
        const arg = this.parsePrimaryExpression();

        if (arg != undefined)
          node.args.push(arg);
        else
          break;
      }

      node.setRange(
        node.token.position,
        node.args[node.args.length - 1]?.range.end ?? node.token.getLastPos()
      );
    });
  }

  parseBeginBlock(): BeginBlockNode {
    return this.tryParse(new BeginBlockNode(), node => {
      node.begin_token = this.nextTokenExpectSubtype(TokenSubtype.BEGIN);
      node.expression = this.parseBlockType();
      this.nextTokenExpectType(TokenType.NEWLINE);

      node.compound_statement = this.parseCompoundStatement();

      node.end_token = this.nextTokenExpectSubtype(TokenSubtype.END);

      node.setRange(node.begin_token.position, node.end_token.getLastPos());
    });
  }

  parseForeachBlock(): ForeachBlockNode {
    return this.tryParse(new ForeachBlockNode(), node => {
      node.foreach_token = this.nextTokenExpectSubtype(TokenSubtype.FOREACH);

      node.idetifier = this.cur_token.type === TokenType.TYPENAME ?
        this.parseVariableDeclaration() :
        this.parseIdentifier();

      node.larrow_token = this.nextTokenExpectSubtype(TokenSubtype.LARROW);
      node.iterable = this.parseExpression();
      this.nextTokenExpectType(TokenType.NEWLINE);

      node.statements = this.parseCompoundStatement();

      node.loop_token = this.nextTokenExpectSubtype(TokenSubtype.LOOP);

      node.setRange(node.foreach_token.position, node.loop_token.getLastPos());
    });
  }

  parseBranch(type: TokenSubtype): BranchNode {
    return this.tryParse(new BranchNode(), node => {
      node.token = this.nextTokenExpectSubtype(type);
      node.condition = this.parseExpression();
      this.nextTokenExpectType(TokenType.NEWLINE);

      node.statements = this.parseCompoundStatement();

      node.setRange(node.token.position, node.statements.range.end);
    });
  }

  parseWhileBlock(): WhileBlockNode {
    return this.tryParse(new WhileBlockNode(), node => {
      node.while_node = this.parseBranch(TokenSubtype.WHILE);

      node.loop_token = this.nextTokenExpectSubtype(TokenSubtype.LOOP);

      node.setRange(node.while_node.range.start, node.loop_token.getLastPos());
    });
  }

  parseIfBlock(): IfBlockNode {
    return this.tryParse(new IfBlockNode(), node => {
      node.branches[0] = this.parseBranch(TokenSubtype.IF);

      while (this.cur_token.subtype === TokenSubtype.ELSEIF) {
        node.branches.push(this.parseBranch(TokenSubtype.ELSEIF));
      }

      if (this.cur_token.subtype === TokenSubtype.ELSE) {
        node.else_token = this.nextToken();
        this.nextTokenExpectType(TokenType.NEWLINE);
        node.else_statements = this.parseCompoundStatement();
      }

      node.endif_token = this.nextTokenExpectSubtype(TokenSubtype.ENDIF);

      node.setRange(node.branches[0].range.start, node.endif_token.getLastPos());
    });
  }

  parseStatement(): Node | undefined {
    let node: Node | undefined;

    const subtype = this.cur_token.subtype;
    const type = this.cur_token.type;

    if (subtype === TokenSubtype.SET) {
      node = this.parseSet();
    } else if (subtype === TokenSubtype.LET) {
      node = this.parseLet();
    } else if (subtype === TokenSubtype.BEGIN) {
      node = this.parseBeginBlock();
    } else if (subtype === TokenSubtype.WHILE) {
      node = this.parseWhileBlock();
    } else if (subtype === TokenSubtype.FOREACH) {
      node = this.parseForeachBlock();
    } else if (subtype === TokenSubtype.IF) {
      node = this.parseIfBlock();
    } else if (type === TokenType.COMMENT) {
      node = this.parseComment();
    } else if (type === TokenType.TYPENAME) {
      node = this.parseVariableDeclaration();
    } else if (type === TokenType.KEYWORD) {
      node = this.parseKeyword();
    } else {
      node = this.parseExpression();
    }

    if (this.cur_token.type !== TokenType.EOF) {
      if (this.cur_token.type !== TokenType.NEWLINE)
        this.reportParsingError("expected a new line");

      this.skipToken();
    }

    return node;
  }

  parseScript(): ScriptNode {
    return this.tryParse(new ScriptNode(), node => {
      node.scriptname_token = this.nextTokenExpectSubtype(TokenSubtype.SCN);
      node.name = this.parseIdentifier();
      this.nextTokenExpectType(TokenType.NEWLINE);
      node.statements = this.parseCompoundStatement();

      node.setRange(node.scriptname_token.position, node.statements.range.end);
    });
  }

  static Parse(text: string): AST {
    const parser = new Parser(Lexer.Lex(text));

    const ast = new AST(parser.parseScript());
    ast.diagnostics = parser.diagnostics;

    return ast;
  }
}

export class AST {
  root: Node;
  diagnostics: Diagnostic[] = [];

  static ToTreeFunctions: { [key in NodeType]: (node: any) => TreeData } = {
    [NodeType.unknown]: (node: Node) => {
      return new TreeData("Node");
    },
    [NodeType.number]: (node: NumberNode) => {
      return new TreeData(`${String(node.value)}`);
    },
    [NodeType.string]: (node: StringNode) => {
      return new TreeData(`"${String(node.value)}"`);
    },
    [NodeType.comment]: (node: CommentNode) => {
      return new TreeData(`;${String(node.value)}`);
    },
    [NodeType.identifier]: (node: IdentifierNode) => {
      return new TreeData(String(node.value));
    },
    [NodeType.keyword]: (node: KeywordNode) => {
      return new TreeData(`Keyword ${node.value}`);
    },
    [NodeType.variable_declaration]: (node: VariableDeclarationNode) => {
      const tree = new TreeData(`Type: ${node.variable_type}`);

      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [NodeType.set]: (node: SetNode) => {
      const tree = new TreeData("set");

      tree.append(AST.ToTree(node.identifier));
      tree.append(new TreeData("to"));
      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [NodeType.let]: (node: LetNode) => {
      const tree = new TreeData("let");

      tree.append(AST.ToTree(node.value));

      return tree;
    },
    [NodeType.unary_op]: (node: UnaryOpNode) => {
      const tree = new TreeData(String(node.op));

      tree.append(AST.ToTree(node.operand));

      return tree;
    },
    [NodeType.bin_op]: (node: BinOpNode) => {
      const tree = new TreeData(String(node.op));

      tree.append(AST.ToTree(node.lhs));
      tree.append(AST.ToTree(node.rhs));

      return tree;
    },
    [NodeType.bin_op_paired]: (node: BinOpPairedNode) => {
      const tree = new TreeData(String(node.op));

      tree.append(AST.ToTree(node.lhs));
      tree.append(AST.ToTree(node.rhs));

      return tree;
    },
    [NodeType.function]: (node: FunctionNode) => {
      const tree = new TreeData(String(node.name));

      tree.concat(node.args.map(AST.ToTree) as TreeData[]);

      return tree;
    },
    [NodeType.lambda_inline]: (node: LambdaInlineNode) => {
      const tree = new TreeData("Inline Lambda");

      tree.concat(node.params.map(AST.ToTree) as TreeData[]);
      tree.append(AST.ToTree(node.expression));

      return tree;
    },
    [NodeType.lambda]: (node: LambdaNode) => {
      const tree = new TreeData("Lambda");

      tree.concat(node.params.map(AST.ToTree) as TreeData[]);
      tree.append(AST.ToTree(node.compound_statement));

      return tree;
    },
    [NodeType.compound_statement]: (node: CompoundStatementNode) => {
      const tree = new TreeData(
        "Compound Statement",
        node.children.map(AST.ToTree) as TreeData[]
      );

      tree.append(new TreeData(
        "Symbol Table",
        node.symbol_table.map(AST.ToTree) as TreeData[]
      ));

      return tree;
    },
    [NodeType.begin_block]: (node: BeginBlockNode) => {
      const tree = new TreeData("begin");

      tree.append(AST.ToTree(node.expression));
      tree.append(AST.ToTree(node.compound_statement));

      return tree;
    },
    [NodeType.foreach_block]: (node: ForeachBlockNode) => {
      const tree = new TreeData("foreach");

      tree.append(AST.ToTree(node.idetifier));
      tree.append(AST.ToTree(node.iterable));
      tree.append(AST.ToTree(node.statements));

      return tree;
    },
    [NodeType.conditional]: (node: BranchNode) => {
      const tree = new TreeData("Conditional");

      tree.append(AST.ToTree(node.condition));
      tree.append(AST.ToTree(node.statements));

      return tree;
    },
    [NodeType.while_block]: (node: WhileBlockNode) => {
      const tree = new TreeData("while");

      tree.append(AST.ToTree(node.while_node));

      return tree;
    },
    [NodeType.if_block]: (node: IfBlockNode) => {
      const tree = new TreeData("if");

      tree.concat(node.branches.map(AST.ToTree) as TreeData[]);
      tree.append(AST.ToTree(node.else_statements));

      return tree;
    },
    [NodeType.script]: (node: ScriptNode) => {
      const tree = new TreeData("Script");

      tree.append(AST.ToTree(node.name));
      tree.append(AST.ToTree(node.statements));

      return tree;
    }
  };

  constructor(root: Node) {
    this.root = root;
  }

  toTree(): TreeData | undefined {
    return AST.ToTreeFunctions[this.root.type](this.root);
  }

  validate(): Diagnostic[] { return []; }

  static ToTree(node: Node | undefined): TreeData | undefined {
    if (node == undefined) return undefined;

    return AST.ToTreeFunctions[node.type](node);
  }
}
