import { Diagnostic } from "vscode-languageserver";
import { Token, TokenPosition, Lexer } from "./lexer";
import { TokenSubtype } from "./token_data";
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

export type Range = {
  start?: TokenPosition,
  end?: TokenPosition
}

export class Node {
  type: NodeType = NodeType.unknown;
  range: Range = {};
}

export class NumberNode extends Node {
  type = NodeType.number;

  token?: Token;
  value?: number;
}

export class StringNode extends Node {
  type = NodeType.string;

  token?: Token;
  value?: string;
}

export class CommentNode extends Node {
  type = NodeType.comment;

  token?: Token;
  value?: string;
}

export class IdentifierNode extends Node {
  type = NodeType.identifier;

  token?: Token;
  value?: string;
}

export class KeywordNode extends Node {
  type = NodeType.keyword;

  token?: Token;
  value?: string;
}

export class VariableDeclarationNode extends Node {
  type = NodeType.variable_declaration;

  type_token?: Token;
  variable_type?: string;
  value?: Node;
}

export class SetNode extends Node {
  type = NodeType.set;

  set_token?: Token;
  identifier?: IdentifierNode;
  to_token?: Token;
  value?: Node;
}

export class LetNode extends Node {
  type = NodeType.let;

  let_token?: Token;
  value?: Node;
}

export class UnaryOpNode extends Node {
  type = NodeType.unary_op;

  op_token?: Token;
  op?: string;
  operand?: Node;
}

export class BinOpNode extends Node {
  type = NodeType.bin_op;

  lhs?: Node;
  op?: string;
  op_token?: Token;
  rhs?: Node;
}

export class BinOpPairedNode extends Node {
  type = NodeType.bin_op_paired;

  lhs?: Node;
  op?: string;
  left_op_token?: Token;
  rhs?: Node;
  right_op_token?: Token;
}

export class FunctionNode extends Node {
  type = NodeType.function;

  token?: Token;
  name?: string;
  args: Node[] = [];
}

export class LambdaInlineNode extends Node {
  type = NodeType.lambda_inline;

  lbracket_token?: Token;
  params: Node[] = [];
  rbracket_token?: Token;
  arrow_token?: Token;

  expression?: Node;
}

export class LambdaNode extends Node {
  type = NodeType.lambda;

  begin_token?: Token;
  function_token?: Token;
  lbracket_token?: Token;
  params: Node[] = [];
  rbracket_token?: Token;

  compound_statement?: CompoundStatementNode;

  end_token?: Token;
}

export class CompoundStatementNode extends Node {
  type = NodeType.compound_statement;

  children: Node[] = [];
  symbol_table: IdentifierNode[] = [];
}

export class BeginBlockNode extends Node {
  type = NodeType.begin_block;

  begin_token?: Token;
  expression?: Node;
  compound_statement?: CompoundStatementNode;
  end_token?: Token;
}

export class ForeachBlockNode extends Node {
  type = NodeType.foreach_block;

  foreach_token?: Token;
  idetifier?: IdentifierNode | VariableDeclarationNode;
  larrow_token?: Token;
  iterable?: Node;

  statements?: CompoundStatementNode;

  loop_token?: Token;
}

export class ConditionalNode extends Node {
  type = NodeType.conditional;

  token?: Token;
  condition?: Node;
  statements?: CompoundStatementNode;
}

export class WhileBlockNode extends Node {
  type = NodeType.while_block;

  while_node?: ConditionalNode;
  loop_token?: Token;
}

export class IfBlockNode extends Node {
  type = NodeType.if_block;

  branches: ConditionalNode[] = [];
  else_token?: Token;
  else_branch?: CompoundStatementNode;
  endif_token?: Token;
}

export class ScriptNode extends Node {
  type = NodeType.script;

  scriptname_token?: Token;
  name?: IdentifierNode;
  statements?: CompoundStatementNode;
}

export class UnexpectedTokenError<T> extends Error {
  expected?: T;
  parsed?: T;

  constructor(expected?: T, parsed?: T) {
    super();
    this.expected = expected;
    this.parsed = parsed;
  }
}

export class UnexpectedTokenTypeError extends UnexpectedTokenError<TokenType> { }
export class UnexpectedTokenSubtypeError extends UnexpectedTokenError<TokenSubtype> { }

export class Parser {
  data: Token[][];
  variables: IdentifierNode[] = [];

  cur_x = 0;
  cur_ln = 0;

  cur_token: Token | undefined;

  constructor(data: Token[][]) {
    this.data = data;

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

    if (token?.type !== type)
      throw new UnexpectedTokenTypeError(type, token?.type);
    this.skipToken();

    return token;
  }

  nextTokenOfSubtype(subtype: TokenSubtype): Token {
    const token = this.cur_token;

    if (token?.subtype !== subtype)
      throw new UnexpectedTokenSubtypeError(subtype, token?.subtype);
    this.skipToken();

    return token;
  }

  peekTokenOnLine(offset: number): Token | undefined {
    return this.data[this.cur_ln][this.cur_x + offset];
  }

  tryParse<T>(node: T, parse_function: (node: T) => void): T {
    try {
      parse_function(node);
    } catch (e) {
      if (!(e instanceof UnexpectedTokenError)) {
        throw e;
      } else {
        console.log(e);
      }
    }

    return node;
  }

  parseBinOpRight(
    parse_child: () => Node | undefined,
    valid_tokens: { [key in TokenSubtype]?: boolean }
  ): Node | undefined {
    let lhs = parse_child();

    if ((this.cur_token?.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
      let last_node = this.tryParse(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op_token = this.nextToken();
        node.op = node.op_token?.content;
        node.rhs = parse_child();

        node.range.start = lhs?.range.start;
        node.range.end = node.rhs?.range.end;
      });

      lhs = last_node;

      while ((this.cur_token?.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
        const node = this.tryParse(new BinOpNode(), node => {
          node.lhs = last_node.rhs;
          node.op_token = this.nextToken();
          node.op = node.op_token?.content;
          node.rhs = parse_child();

          node.range.start = lhs?.range.start;
          node.range.end = node.rhs?.range.end;
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

    while ((this.cur_token?.subtype ?? TokenSubtype.UNKNOWN) in valid_tokens) {
      lhs = this.tryParse(new BinOpNode(), node => {
        node.lhs = lhs;
        node.op_token = this.nextToken();
        node.op = node.op_token?.content;
        node.rhs = parse_child();

        node.range.start = lhs?.range.start;
        node.range.end = node.rhs?.range.end;
      });
    }

    return lhs;
  }

  parseComment(): CommentNode {
    return this.tryParse(new CommentNode(), node => {
      node.token = this.nextTokenOfType(TokenType.COMMENT);
      node.value = node.token.content.substring(1);

      node.range.start = node.token.position;
      node.range.end = node.token.getLastPos();
    });
  }

  parseNumber(): NumberNode {
    return this.tryParse(new NumberNode(), node => {
      node.token = this.nextTokenOfType(TokenType.NUMBER);
      node.value = node.token.subtype === TokenSubtype.HEX ?
        parseInt(node.token.content) :
        parseFloat(node.token.content);

      node.range.start = node.token.position;
      node.range.end = node.token.getLastPos();
    });
  }

  parseString(): StringNode {
    return this.tryParse(new StringNode(), node => {
      node.token = this.nextTokenOfType(TokenType.STRING);
      node.value = node.token.content.substring(1, node.token.length - 1);
    });
  }

  parseIdentifier(): IdentifierNode {
    return this.tryParse(new IdentifierNode(), node => {
      node.token = this.nextTokenOfType(TokenType.ID);
      node.value = node.token.content;

      node.range.start = node.token.position;
      node.range.end = node.token.getLastPos();
    });
  }

  parseKeyword(): KeywordNode {
    return this.tryParse(new KeywordNode(), node => {
      node.token = this.nextTokenOfType(TokenType.KEYWORD);
      node.value = node.token.content;

      node.range.start = node.token.position;
      node.range.end = node.token.getLastPos();
    });
  }

  parseFunction(): FunctionNode {
    return this.tryParse(new FunctionNode(), node => {
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

        const arg = this.parseSliceMakePair();
        if (arg != undefined)
          node.args.push(arg);
        else
          break;
      }

      node.range.start = node.token.position;
      node.range.end = node.args[node.args.length - 1]?.range.end ?? node.token.getLastPos();
    });
  }

  parseLambdaInline(): LambdaInlineNode {
    return this.tryParse(new LambdaInlineNode(), node => {
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
    });
  }

  parseLambda(): LambdaNode {
    return this.tryParse(new LambdaNode(), node => {
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
    });
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

      return this.tryParse(this.parseExpression(), node => {
        this.nextTokenOfSubtype(TokenSubtype.RPAREN);
      });
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
    return this.parseMember(this.tryParse(new BinOpPairedNode(), node => {
      node.lhs = lhs;
      node.left_op_token = this.nextToken();
      node.op = "[]";
      node.rhs = this.parseExpression();
      node.right_op_token = this.nextTokenOfSubtype(TokenSubtype.RSQ_BRACKET);

      node.range.start = node.lhs?.range.start;
      node.range.end = node.right_op_token.getLastPos();
    }));
  }

  parseMemberRArrow(lhs?: Node): Node | undefined {
    return this.parseMember(this.tryParse(new BinOpNode(), node => {
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
    }));
  }

  parseMemberDot(lhs?: Node): Node | undefined {
    return this.parseMember(this.tryParse(new BinOpNode(), node => {
      node.lhs = lhs;
      node.op_token = this.nextToken();
      node.op = node.op_token?.content;

      const type = this.cur_token?.type;
      if (type !== TokenType.ID && type !== TokenType.FUNCTION) {
        node.rhs = undefined;
        this.skipToken();
      } else {
        node.rhs = this.parsePrimaryExpression();
      }

      node.range.start = lhs?.range.start;
      node.range.end = node.rhs?.range.end;
    }));
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

    return this.tryParse(new UnaryOpNode(), node => {
      node.op_token = this.nextToken();
      node.op = node.op_token?.content;
      node.operand = this.parseMember();

      node.range.start = node.op_token?.position;
      node.range.end = node.operand?.range.end;
    });
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

    return this.tryParse(new UnaryOpNode(), node => {
      node.op_token = this.nextToken();
      node.op = node.op_token?.content;
      node.operand = this.parseLogicalNot();

      node.range.start = node.op_token?.position;
      node.range.end = node.operand?.range.end;
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
      node.type_token = this.nextTokenOfType(TokenType.TYPENAME);
      node.variable_type = node.type_token.content;
      node.value = this.parseAssignment();

      node.range.start = node.type_token.position;
      node.range.end = node.value?.range.end;
    });
  }

  parseSet(): SetNode {
    return this.tryParse(new SetNode(), node => {
      node.set_token = this.nextTokenOfSubtype(TokenSubtype.SET);
      node.identifier = this.parseIdentifier();
      node.to_token = this.nextTokenOfSubtype(TokenSubtype.TO);
      node.value = this.parseLogicalOr();

      node.range.start = node.set_token.position;
      node.range.end = node.value?.range.end;
    });
  }

  parseLet(): LetNode {
    return this.tryParse(new LetNode(), node => {
      node.let_token = this.nextToken();
      node.value = this.cur_token?.type === TokenType.TYPENAME ?
        this.parseVariableDeclaration() :
        this.parseExpression();

      node.range.start = node.let_token?.position;
      node.range.end = node.value?.range.end;
    });
  }

  parseCompoundStatement(
    terminator_predicate: (token: Token) => boolean = () => false
  ): CompoundStatementNode {
    return this.tryParse(new CompoundStatementNode(), node => {
      while (
        this.cur_token != undefined &&
        !terminator_predicate(this.cur_token)
      ) {
        const statement = this.parseStatement();

        if (statement != undefined)
          node.children.push(statement);
      }

      node.range.start = node.children[0]?.range.start;
      node.range.start = node.children[node.children.length - 1]?.range.end;
    });
  }

  parseBlockType(): FunctionNode {
    return this.tryParse(new FunctionNode(), node => {
      node.token = this.nextTokenOfType(TokenType.BLOCK_TYPE);
      node.name = node.token.content;

      while (this.cur_token != undefined && this.cur_x !== 0) {
        const arg = this.parsePrimaryExpression();

        if (arg != undefined)
          node.args.push(arg);
        else
          break;
      }

      node.range.start = node.token.position;
      node.range.end = node.args[node.args.length - 1]?.range.end ?? node.token.getLastPos();
    });
  }

  parseBeginBlock(): BeginBlockNode {
    return this.tryParse(new BeginBlockNode(), node => {
      node.begin_token = this.nextTokenOfSubtype(TokenSubtype.BEGIN);
      node.expression = this.parseBlockType();

      node.compound_statement = this.parseCompoundStatement(t =>
        t.subtype === TokenSubtype.END
      );

      node.end_token = this.nextTokenOfSubtype(TokenSubtype.END);

      node.range.start = node.begin_token.position;
      node.range.end = node.end_token.getLastPos();
    });
  }

  parseForeachBlock(): ForeachBlockNode {
    return this.tryParse(new ForeachBlockNode(), node => {
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
    });
  }

  parseConditional(
    type: TokenSubtype,
    terminator_predicate: (t: Token) => boolean = () => false
  ): ConditionalNode {
    return this.tryParse(new ConditionalNode(), node => {
      node.token = this.nextTokenOfSubtype(type);
      node.condition = this.parseExpression();
      node.statements = this.parseCompoundStatement(terminator_predicate);

      node.range.start = node.token.position;
      node.range.end = node.statements.range.end;
    });
  }

  parseWhileBlock(): WhileBlockNode {
    return this.tryParse(new WhileBlockNode(), node => {
      node.while_node = this.parseConditional(
        TokenSubtype.WHILE, t => t.subtype === TokenSubtype.LOOP
      );

      node.loop_token = this.nextTokenOfSubtype(TokenSubtype.LOOP);

      node.range.start = node.while_node.range.start;
      node.range.end = node.loop_token.getLastPos();
    });
  }

  parseIfBlock(): IfBlockNode {
    return this.tryParse(new IfBlockNode(), node => {
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
    });
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

  parseScript(): ScriptNode {
    return this.tryParse(new ScriptNode(), node => {
      node.scriptname_token = this.nextTokenOfSubtype(TokenSubtype.SCN);
      node.name = this.parseIdentifier();
      node.statements = this.parseCompoundStatement();

      node.range.start = node.scriptname_token.position;
      node.range.end = node.statements.range.end;
    });
  }

  static Parse(text: string): AST {
    return new AST(new Parser(Lexer.Lex(text)).parseScript());
  }
}

export class AST {
  root: Node;

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
    [NodeType.conditional]: (node: ConditionalNode) => {
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
      tree.append(AST.ToTree(node.else_branch));

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
